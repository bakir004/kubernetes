const express = require("express");
const cors = require("cors");
const winston = require("winston");

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

// In-memory storage for todos
let todos = [
  { id: 1, title: "Nigga Kubernetes", completed: false },
  { id: 2, title: "Build React app", completed: true },
  { id: 3, title: "Deploy to cluster", completed: false },
];
let nextId = 4;

// Health check endpoint
app.get("/health", (req, res) => {
  logger.info("Health check requested");
  res.json({ status: "ok", message: "Backend is healthy" });
});

// GET /todos - Get all todos
app.get("/todos", (req, res) => {
  logger.info("Fetching all todos", { count: todos.length });
  res.json(todos);
});

// GET /todos/:id - Get a specific todo
app.get("/todos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  logger.debug("Fetching todo", { todoId: id });

  const todo = todos.find((t) => t.id === id);

  if (!todo) {
    logger.warn("Todo not found", { todoId: id });
    return res.status(404).json({ error: "Todo not found" });
  }

  logger.info("Todo retrieved", { todoId: id, title: todo.title });
  res.json(todo);
});

// POST /todos - Create a new todo
app.post("/todos", (req, res) => {
  const { title, completed = false } = req.body;

  if (!title) {
    logger.warn("Todo creation failed: title missing", { body: req.body });
    return res.status(400).json({ error: "Title is required" });
  }

  const newTodo = {
    id: nextId++,
    title,
    completed: Boolean(completed),
  };

  todos.push(newTodo);
  logger.info("Todo created", {
    todoId: newTodo.id,
    title: newTodo.title,
    completed: newTodo.completed,
  });
  res.status(201).json(newTodo);
});

// PUT /todos/:id - Update a todo
app.put("/todos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  logger.debug("Updating todo", { todoId: id, updates: req.body });

  const todoIndex = todos.findIndex((t) => t.id === id);

  if (todoIndex === -1) {
    logger.warn("Todo not found for update", { todoId: id });
    return res.status(404).json({ error: "Todo not found" });
  }

  const oldTodo = { ...todos[todoIndex] };
  const { title, completed } = req.body;

  if (title !== undefined) {
    todos[todoIndex].title = title;
  }

  if (completed !== undefined) {
    todos[todoIndex].completed = Boolean(completed);
  }

  logger.info("Todo updated", {
    todoId: id,
    oldTitle: oldTodo.title,
    newTitle: todos[todoIndex].title,
    oldCompleted: oldTodo.completed,
    newCompleted: todos[todoIndex].completed,
  });
  res.json(todos[todoIndex]);
});

// DELETE /todos/:id - Delete a todo
app.delete("/todos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  logger.debug("Deleting todo", { todoId: id });

  const todoIndex = todos.findIndex((t) => t.id === id);

  if (todoIndex === -1) {
    logger.warn("Todo not found for deletion", { todoId: id });
    return res.status(404).json({ error: "Todo not found" });
  }

  const deletedTodo = todos[todoIndex];
  todos.splice(todoIndex, 1);
  logger.info("Todo deleted", { todoId: id, title: deletedTodo.title });
  res.status(204).send();
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

// Start server
app.listen(PORT, "0.0.0.0", () => {
  logger.info("Backend server started", {
    port: PORT,
    healthCheck: `http://localhost:${PORT}/health`,
    todosAPI: `http://localhost:${PORT}/todos`,
  });
});
