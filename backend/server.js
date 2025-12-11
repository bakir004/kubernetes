// Initialize OpenTelemetry BEFORE importing other modules
require("./instrumentation");

const express = require("express");
const cors = require("cors");
const winston = require("winston");
const { Pool } = require("pg");

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "backend" },
  transports: [
    new winston.transports.Console({
      format: winston.format.json(),
    }),
  ],
});

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "appdb",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "",
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create PostgreSQL connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on("error", (err) => {
  logger.error("Unexpected error on idle client", {
    error: err.message,
    stack: err.stack,
  });
});

// Initialize database schema
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on id for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_todos_id ON todos(id)
    `);

    logger.info("Database initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize database", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP request", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });

  next();
});

// Health check endpoint with database connectivity check
app.get("/health", async (req, res) => {
  logger.info("Health check requested");

  try {
    // Check database connection
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      message: "Backend is healthy",
      database: "connected",
    });
  } catch (error) {
    logger.error("Database health check failed", { error: error.message });
    res.status(503).json({
      status: "unhealthy",
      message: "Backend is unhealthy",
      database: "disconnected",
      error: error.message,
    });
  }
});

// GET /todos - Get all todos
app.get("/todos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, completed, created_at, updated_at FROM todos ORDER BY id ASC"
    );
    logger.info("Fetching all todos", { count: result.rows.length });
    res.json(result.rows);
  } catch (error) {
    logger.error("Failed to fetch todos", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

// GET /todos/:id - Get a specific todo
app.get("/todos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  logger.debug("Fetching todo", { todoId: id });

  try {
    const result = await pool.query(
      "SELECT id, title, completed, created_at, updated_at FROM todos WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn("Todo not found", { todoId: id });
      return res.status(404).json({ error: "Todo not found" });
    }

    logger.info("Todo retrieved", { todoId: id, title: result.rows[0].title });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Failed to fetch todo", {
      todoId: id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch todo" });
  }
});

// POST /todos - Create a new todo
app.post("/todos", async (req, res) => {
  const { title, completed = false } = req.body;

  if (!title) {
    logger.warn("Todo creation failed: title missing", { body: req.body });
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING id, title, completed, created_at, updated_at",
      [title, Boolean(completed)]
    );

    const newTodo = result.rows[0];
    logger.info("Todo created", {
      todoId: newTodo.id,
      title: newTodo.title,
      completed: newTodo.completed,
    });
    res.status(201).json(newTodo);
  } catch (error) {
    logger.error("Failed to create todo", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// PUT /todos/:id - Update a todo
app.put("/todos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  logger.debug("Updating todo", { todoId: id, updates: req.body });

  try {
    // First, get the existing todo
    const existingResult = await pool.query(
      "SELECT id, title, completed FROM todos WHERE id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      logger.warn("Todo not found for update", { todoId: id });
      return res.status(404).json({ error: "Todo not found" });
    }

    const oldTodo = existingResult.rows[0];
    const { title, completed } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }

    if (completed !== undefined) {
      updates.push(`completed = $${paramIndex++}`);
      values.push(Boolean(completed));
    }

    if (updates.length === 0) {
      // No updates provided, return existing todo
      const result = await pool.query(
        "SELECT id, title, completed, created_at, updated_at FROM todos WHERE id = $1",
        [id]
      );
      return res.json(result.rows[0]);
    }

    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id); // For WHERE clause

    const updateQuery = `
      UPDATE todos 
      SET ${updates.join(", ")} 
      WHERE id = $${paramIndex}
      RETURNING id, title, completed, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, values);

    logger.info("Todo updated", {
      todoId: id,
      oldTitle: oldTodo.title,
      newTitle: result.rows[0].title,
      oldCompleted: oldTodo.completed,
      newCompleted: result.rows[0].completed,
    });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Failed to update todo", {
      todoId: id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// DELETE /todos/:id - Delete a todo
app.delete("/todos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  logger.debug("Deleting todo", { todoId: id });

  try {
    // First check if todo exists
    const checkResult = await pool.query(
      "SELECT id, title FROM todos WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      logger.warn("Todo not found for deletion", { todoId: id });
      return res.status(404).json({ error: "Todo not found" });
    }

    const deletedTodo = checkResult.rows[0];
    await pool.query("DELETE FROM todos WHERE id = $1", [id]);

    logger.info("Todo deleted", { todoId: id, title: deletedTodo.title });
    res.status(204).send();
  } catch (error) {
    logger.error("Failed to delete todo", {
      todoId: id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ error: "Internal server error" });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await pool.end();
  process.exit(0);
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database schema
    await initializeDatabase();

    // Start server
    app.listen(PORT, "0.0.0.0", () => {
      logger.info("Backend server started", {
        port: PORT,
        healthCheck: `http://localhost:${PORT}/health`,
        todosAPI: `http://localhost:${PORT}/todos`,
        database: {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
        },
      });
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startServer();
