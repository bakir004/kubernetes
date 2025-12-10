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

  // Get backend URL from config or environment variable
  useEffect(() => {
    // Try to get from window.APP_CONFIG (for runtime config in Kubernetes)
    const config = (window as any).APP_CONFIG;
    const url =
      config?.backendUrl ||
      import.meta.env.VITE_BACKEND_URL ||
      "http://localhost:3000";
    setBackendUrl(url);
  }, []);

  // Fetch todos from backend
  useEffect(() => {
    if (!backendUrl) return;

    const fetchTodos = async () => {
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

    fetchTodos();
  }, [backendUrl]);

  if (loading) {
    return (
      <div className="container">
        <h1>Todo App</h1>
        <p>Loading todos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Todo App</h1>
        <div className="error">
          <p>Error: {error}</p>
          <p>Backend URL: {backendUrl}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Todo App</h1>
      <div className="info">
        <p>Backend: {backendUrl}</p>
        <p>Total todos: {todos.length}</p>
      </div>
      <div className="todos">
        {todos.length === 0 ? (
          <p>No todos found</p>
        ) : (
          <ul>
            {todos.map((todo) => (
              <li key={todo.id} className={todo.completed ? "completed" : ""}>
                <span>{todo.title}</span>
                <span className="status">
                  {todo.completed ? "✓ Done" : "○ Pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
