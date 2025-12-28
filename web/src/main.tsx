import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
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
      <App />
    </React.StrictMode>
  );
  console.log("Render initiated!");
} catch (error) {
  console.error("Error in main.tsx:", error);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Error loading app</h1><pre>${error}</pre></div>`;
}

