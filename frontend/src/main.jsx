import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { setupLeafletHeat } from "./leafletHeat.js";

setupLeafletHeat(L);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);