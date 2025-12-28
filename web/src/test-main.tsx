import React from "react";
import ReactDOM from "react-dom/client";

function SimpleTest() {
    return <div><h1>SIMPLE TEST WORKS!</h1></div>;
}

const rootEl = document.getElementById("root");
console.log("Root element:", rootEl);

if (rootEl) {
    console.log("Creating React root...");
    const root = ReactDOM.createRoot(rootEl);
    console.log("Rendering app...");
    root.render(<SimpleTest />);
    console.log("Render complete!");
} else {
    console.error("Root element not found!");
}
