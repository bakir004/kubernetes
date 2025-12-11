const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for todos
let todos = [
  { id: 1, title: "Nigga Kubernetes", completed: false },
  { id: 2, title: "Build React app", completed: true },
  { id: 3, title: "Deploy to cluster", completed: false },
];
let nextId = 4;

// Health check endpoint
app.get("/health", (req, res) => {
  console.log("Health check endpoint called");
  res.json({ status: "ok", message: "Backend is healthy" });
});

// GET /todos - Get all todos
app.get("/todos", (req, res) => {
  res.json(todos);
});

// GET /todos/:id - Get a specific todo
app.get("/todos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find((t) => t.id === id);

  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }

  res.json(todo);
});

// POST /todos - Create a new todo
app.post("/todos", (req, res) => {
  const { title, completed = false } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const newTodo = {
    id: nextId++,
    title,
    completed: Boolean(completed),
  };

  todos.push(newTodo);
  res.status(201).json(newTodo);
});

// PUT /todos/:id - Update a todo
app.put("/todos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const todoIndex = todos.findIndex((t) => t.id === id);

  if (todoIndex === -1) {
    return res.status(404).json({ error: "Todo not found" });
  }

  const { title, completed } = req.body;

  if (title !== undefined) {
    todos[todoIndex].title = title;
  }

  if (completed !== undefined) {
    todos[todoIndex].completed = Boolean(completed);
  }

  res.json(todos[todoIndex]);
});

// DELETE /todos/:id - Delete a todo
app.delete("/todos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const todoIndex = todos.findIndex((t) => t.id === id);

  if (todoIndex === -1) {
    return res.status(404).json({ error: "Todo not found" });
  }

  todos.splice(todoIndex, 1);
  res.status(204).send();
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Todos API: http://localhost:${PORT}/todos`);
});
