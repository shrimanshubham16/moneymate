import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MatrixLoader } from "./components/MatrixLoader";
import "./design-system.css";
import "./styles.css";

// Register Service Worker for PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Register with cache-busting to ensure fresh SW
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none' // Always fetch fresh SW
        });
        
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Force update check immediately
        registration.update();
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New service worker available - auto-activate it
                  console.log('🔄 New service worker available, activating...');
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            });
          }
        });
        
        // Reload page when new SW takes control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            console.log('🔄 New service worker activated, refreshing...');
            window.location.reload();
          }
        });
        
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    });
  }
}

// Register service worker
registerServiceWorker();

// Extend window type to include our fallback function
declare global {
  interface Window {
    __hideAppFallback__?: () => void;
    __APP_LOADED__?: boolean;
  }
}

function Root() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hide the HTML fallback loading screen immediately when React mounts
    if (typeof window.__hideAppFallback__ === 'function') {
      window.__hideAppFallback__();
    }
    
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

