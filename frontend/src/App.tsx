import { useState, useEffect } from "react";
import "./App.css";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendUrl, setBackendUrl] = useState<string>("");

  // Form states
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [fetchId, setFetchId] = useState("");
  const [fetchedTodo, setFetchedTodo] = useState<Todo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Get backend URL from config or environment variable
  useEffect(() => {
    const config = (window as any).APP_CONFIG;
    const url =
      config?.backendUrl ||
      import.meta.env.VITE_BACKEND_URL ||
      "http://localhost:3000";
    setBackendUrl(url);
  }, []);

  // Fetch all todos from backend
  const fetchTodos = async () => {
    if (!backendUrl) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${backendUrl}/todos`);

      if (!response.ok) {
        throw new Error(`Failed to fetch todos: ${response.statusText}`);
      }

      const data = await response.json();
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching todos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [backendUrl]);

  // Create new todo
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      const response = await fetch(`${backendUrl}/todos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          completed: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create todo");
      }

      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      setNewTodoTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    }
  };

  // Fetch todo by ID
  const handleFetchById = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fetchId.trim()) return;

    try {
      setFetchError(null);
      const response = await fetch(`${backendUrl}/todos/${fetchId.trim()}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Todo not found");
        }
        throw new Error("Failed to fetch todo");
      }

      const todo = await response.json();
      setFetchedTodo(todo);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch todo"
      );
      setFetchedTodo(null);
    }
  };

  // Delete todo
  const handleDeleteTodo = async (id: number) => {
    if (!confirm("Are you sure you want to delete this todo?")) return;

    try {
      const response = await fetch(`${backendUrl}/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete todo");
      }

      setTodos(todos.filter((todo) => todo.id !== id));
      if (fetchedTodo?.id === id) {
        setFetchedTodo(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo");
    }
  };

  // Toggle todo completion
  const handleToggleComplete = async (todo: Todo) => {
    try {
      const response = await fetch(`${backendUrl}/todos/${todo.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: !todo.completed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update todo");
      }

      const updatedTodo = await response.json();
      setTodos(todos.map((t) => (t.id === todo.id ? updatedTodo : t)));
      if (fetchedTodo?.id === todo.id) {
        setFetchedTodo(updatedTodo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo");
    }
  };

  // Start editing
  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  // Save edit
  const handleSaveEdit = async (id: number) => {
    if (!editTitle.trim()) {
      cancelEdit();
      return;
    }

    try {
      const todo = todos.find((t) => t.id === id);
      const response = await fetch(`${backendUrl}/todos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          completed: todo?.completed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update todo");
      }

      const updatedTodo = await response.json();
      setTodos(todos.map((t) => (t.id === id ? updatedTodo : t)));
      if (fetchedTodo?.id === id) {
        setFetchedTodo(updatedTodo);
      }
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo");
    }
  };

  if (loading && todos.length === 0) {
    return (
      <div className="container">
        <div className="loading">Loading todos...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>✨ Todo App</h1>
        <div className="info-bar">
          <span className="info-item">Backend: {backendUrl}</span>
          <span className="info-item">Total: {todos.length}</span>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => fetchTodos()}>Retry</button>
        </div>
      )}

      <div className="content">
        {/* Create Todo Form */}
        <section className="card">
          <h2>➕ Add New Todo</h2>
          <form onSubmit={handleCreateTodo} className="form">
            <input
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="Enter todo title..."
              className="input"
            />
            <button type="submit" className="btn btn-primary">
              Add Todo
            </button>
          </form>
        </section>

        {/* Fetch by ID Form */}
        <section className="card">
          <h2>🔍 Fetch Todo by ID</h2>
          <form onSubmit={handleFetchById} className="form">
            <input
              type="number"
              value={fetchId}
              onChange={(e) => setFetchId(e.target.value)}
              placeholder="Enter todo ID..."
              className="input"
              min="1"
            />
            <button type="submit" className="btn btn-secondary">
              Fetch
            </button>
          </form>
          {fetchError && <div className="error-message">{fetchError}</div>}
          {fetchedTodo && (
            <div className="fetched-todo">
              <div className="todo-item">
                <span
                  className={`todo-title ${
                    fetchedTodo.completed ? "completed" : ""
                  }`}
                >
                  {fetchedTodo.title}
                </span>
                <span className="todo-status">
                  {fetchedTodo.completed ? "✓ Done" : "○ Pending"}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Todos List */}
        <section className="card">
          <h2>📋 All Todos ({todos.length})</h2>
          {todos.length === 0 ? (
            <div className="empty-state">
              No todos yet. Create one above! 🎉
            </div>
          ) : (
            <div className="todos-list">
              {todos.map((todo) => (
                <div key={todo.id} className="todo-item">
                  {editingId === todo.id ? (
                    <div className="edit-form">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="input input-inline"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(todo.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <button
                        onClick={() => handleSaveEdit(todo.id)}
                        className="btn btn-small btn-success"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="btn btn-small btn-danger"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="todo-content">
                        <span
                          className={`todo-title ${
                            todo.completed ? "completed" : ""
                          }`}
                          onClick={() => handleToggleComplete(todo)}
                        >
                          {todo.title}
                        </span>
                        <span className="todo-status">
                          {todo.completed ? "✓ Done" : "○ Pending"}
                        </span>
                      </div>
                      <div className="todo-actions">
                        <button
                          onClick={() => handleToggleComplete(todo)}
                          className="btn btn-small btn-toggle"
                          title={
                            todo.completed ? "Mark as pending" : "Mark as done"
                          }
                        >
                          {todo.completed ? "↩" : "✓"}
                        </button>
                        <button
                          onClick={() => startEdit(todo)}
                          className="btn btn-small btn-edit"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="btn btn-small btn-delete"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
