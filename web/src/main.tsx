import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./design-system.css";
import "./styles.css";

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
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
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

