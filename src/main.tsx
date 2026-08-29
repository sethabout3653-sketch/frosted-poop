import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./styles.css";

// Register CKV Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/ckv.sw.js", {
        scope: "/",
      })
      .then((reg) => console.log("CKV Service Worker registered", reg))
      .catch((err) => console.error("CKV Service Worker registration failed", err));
  });
}

// Initialize Lumin Engine
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    const checkLumin = setInterval(() => {
      // The Lumin script often starts with a Proxy object that isn't a constructor.
      // We must wait until the real engine (which is a constructor/function) is loaded.
      if ((window as any).Lumin && typeof (window as any).Lumin === "function") {
        clearInterval(checkLumin);
        try {
          (window as any).LuminEngine = new (window as any).Lumin({
            provider: "gn-math-mirror",
            fallbackProxy: "https://cherrion.top",
            sandboxMode: false,
          });
          console.log("Lumin Engine initialized");
        } catch (err) {
          console.error("Failed to construct Lumin Engine:", err);
        }
      }
    }, 100);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
