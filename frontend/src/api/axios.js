// src/api/axios.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// ── Auth interceptor → attach token automatically ──
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;


// ════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════
export const authAPI = {
  login: (email, password) =>
    API.post("/auth/login", { email, password }),

  register: (name, email, password) =>
    API.post("/auth/register", { name, email, password }),

  logout: () => {
    localStorage.removeItem("token");
  },
};


// ════════════════════════════════════════════════════
// INCIDENTS  (Report page)
// ════════════════════════════════════════════════════
export const incidentsAPI = {
  // Submit a new crime report
  report: (data) =>
    API.post("/incidents/report", data),

  // Get all incidents (with optional filters)
  getAll: (filters = {}) =>
    API.get("/incidents", { params: filters }),

  // Get single incident by id
  getById: (id) =>
    API.get(`/incidents/${id}`),
};


// ════════════════════════════════════════════════════
// HEATMAP
// ════════════════════════════════════════════════════
export const heatmapAPI = {
  // Get heatmap points — returns [{ lat, lon, weight }]
  getPoints: (filters = {}) =>
    API.get("/incidents/heatmap", { params: filters }),
};


// ════════════════════════════════════════════════════
// SAFE ROUTE
// ════════════════════════════════════════════════════
export const routeAPI = {
  // Find safest route between two addresses
  findSafeRoute: (startAddress, endAddress) =>
    API.post("/route/safe", {
      start_address: startAddress,
      end_address: endAddress,
    }),
};


// ════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════
export const analyticsAPI = {
  // Monthly crime trend + forecast
  getMonthlyTrend: () =>
    API.get("/analytics/monthly-trend"),

  // Crime breakdown by city
  getCityStats: () =>
    API.get("/analytics/city-stats"),

  // Crime breakdown by category
  getCategoryStats: () =>
    API.get("/analytics/category-stats"),

  // Crime by time of day
  getTimeStats: () =>
    API.get("/analytics/time-stats"),

  // Crime by day of week
  getDayStats: () =>
    API.get("/analytics/day-stats"),

  // Top hotspot areas
  getHotspots: () =>
    API.get("/analytics/hotspots"),
};


// ════════════════════════════════════════════════════
// ML PREDICTIONS  (new endpoints)
// ════════════════════════════════════════════════════
export const mlAPI = {
  // Predict crime category from description text
  // Returns: { category: "Robbery", probabilities: { Robbery: 0.82, ... } }
  predictCategory: (description) =>
    API.post("/predict/category", { description }),

  // Predict risk score for a location
  // Returns: { risk_score: 1842, risk_level: "High", risk_percent: 73.7 }
  predictRisk: ({
    lat,
    lon,
    severity = 3,
    victim_age = 30,
    weapon = "Unknown",
    victim_gender = "Unknown",
    crime_category = "Other",
    datetime_str = null,
    area_crime_count = 1000.0,
    area_avg_severity = 2.5,
  }) =>
    API.post("/predict/risk", {
      lat,
      lon,
      severity,
      victim_age,
      weapon,
      victim_gender,
      crime_category,
      datetime_str,
      area_crime_count,
      area_avg_severity,
    }),

  // Health check — are models loaded?
  getModelInfo: () =>
    API.get("/model-info"),
};


// ════════════════════════════════════════════════════
// HELPER — unified error message extractor
// ════════════════════════════════════════════════════
export const getErrorMessage = (error) => {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  );
};