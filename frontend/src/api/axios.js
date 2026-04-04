// src/api/axios.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
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
  report: (data) =>
    API.post("/incidents/report", data),

  getAll: (filters = {}) =>
    API.get("/incidents", { params: filters }),

  getById: (id) =>
    API.get(`/incidents/${id}`),
};


// ════════════════════════════════════════════════════
// HEATMAP
// ════════════════════════════════════════════════════
export const heatmapAPI = {
  getPoints: (filters = {}) =>
    API.get("/incidents/heatmap", { params: filters }),
};


// ════════════════════════════════════════════════════
// SAFE ROUTE
// ════════════════════════════════════════════════════
export const routeAPI = {
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
  getMonthlyTrend: () =>
    API.get("/analytics/monthly-trend"),

  getCityStats: () =>
    API.get("/analytics/city-stats"),

  getCategoryStats: () =>
    API.get("/analytics/category-stats"),

  getTimeStats: () =>
    API.get("/analytics/time-stats"),

  getDayStats: () =>
    API.get("/analytics/day-stats"),

  getHotspots: () =>
    API.get("/analytics/hotspots"),
};


// ════════════════════════════════════════════════════
// ML PREDICTIONS
// ════════════════════════════════════════════════════
export const mlAPI = {
  predictCategory: (description) =>
    API.post("/predict/category", { description }),

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

  getModelInfo: () =>
    API.get("/model-info"),
};


// ════════════════════════════════════════════════════
// HELPER
// ════════════════════════════════════════════════════
export const getErrorMessage = (error) => {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  );
};