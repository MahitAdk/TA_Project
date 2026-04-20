import axios from "axios";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

axios.defaults.baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
