import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Leaflet
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

// Tailwind CSS
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
