import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MatrixLoader } from "./components/MatrixLoader";
import "./design-system.css";
import "./styles.css";

function Root() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show Matrix loader for 1.5 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <MatrixLoader message="Initializing FinFlow..." fullScreen />;
  }

  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

console.log("main.tsx loading...");

try {
  const rootEl = document.getElementById("root");
  console.log("Root element:", rootEl);

  if (!rootEl) {
    throw new Error("Root element not found!");
  }

  console.log("Creating React root...");
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
  console.log("Render initiated!");
} catch (error) {
  console.error("Error in main.tsx:", error);
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = "padding: 20px; color: red; background: white;";
  errorDiv.innerHTML = `<h1>Error loading app</h1><pre>${error}</pre>`;
  document.body.appendChild(errorDiv);
}

