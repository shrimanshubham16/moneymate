import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MatrixLoader } from "./components/MatrixLoader";
import "./design-system.css";
import "./styles.css";

// App version - bump this to force cache cleanup
const APP_VERSION = 'v1.4.0';

// Clear all caches and service workers (one-time cleanup per version)
async function cleanupOldCaches(): Promise<boolean> {
  const cleanupKey = `finflow-cleanup-${APP_VERSION}`;
  
  // Skip if already cleaned for this version
  if (localStorage.getItem(cleanupKey) === 'done') {
    return false;
  }
  
  console.log('🧹 Cleaning up old caches for', APP_VERSION);
  
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🗑️ Unregistered service worker:', registration.scope);
      }
    }
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        console.log('🗑️ Deleted cache:', name);
      }
    }
    
    // Mark cleanup as done for this version
    localStorage.setItem(cleanupKey, 'done');
    console.log('✅ Cache cleanup complete');
    return true;
  } catch (error) {
    console.error('❌ Cache cleanup failed:', error);
    return false;
  }
}

// Register Service Worker for PWA
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  
  // First, cleanup old caches
  const didCleanup = await cleanupOldCaches();
  if (didCleanup) {
    // If we cleaned up, reload to ensure fresh state
    console.log('🔄 Reloading after cache cleanup...');
    window.location.reload();
    return;
  }
  
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
}

// Register service worker after page load
window.addEventListener('load', () => registerServiceWorker());

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

