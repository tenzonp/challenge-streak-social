import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeNativeApp } from "./utils/nativeApp";

// Initialize native app features (status bar, keyboard, back button, etc.)
initializeNativeApp();

createRoot(document.getElementById("root")!).render(<App />);
