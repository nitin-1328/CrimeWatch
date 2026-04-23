import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";

const RADIUS_KM = 10;

const FEATURES = [
  {
    to: "/heatmap",
    title: "Crime Heatmap",
    desc: "Visualize areas with high crime intensity using real-time heat data.",
    icon: "🗺️",
    hoverBorder: "hover:border-green-500",
    hoverText: "group-hover:text-green-400",
  },
  {
    to: "/saferoute",
    title: "Safe Route Finder",
    desc: "Find the safest path between two locations using crime-aware routing.",
    icon: "🛡️",
    hoverBorder: "hover:border-blue-500",
    hoverText: "group-hover:text-blue-400",
  },
  {
    to: "/report",
    title: "Report Incident",
    desc: "Help the community stay safe by reporting suspicious or criminal activity.",
    icon: "📋",
    hoverBorder: "hover:border-yellow-500",
    hoverText: "group-hover:text-yellow-400",
  },
  {
    to: "/analytics",
    title: "Analytics",
    desc: "Explore crime trends, forecasts, and city-wise breakdowns.",
    icon: "📊",
    hoverBorder: "hover:border-purple-500",
    hoverText: "group-hover:text-purple-400",
  },
];

function pickAreaName(address = {}) {
  return (
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.town ||
    address.city ||
    address.village ||
    address.county ||
    ""
  );
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&zoom=14&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();
  const name = pickAreaName(data.address) || (data.display_name || "").split(",").slice(0, 2).join(",").trim();
  if (!name) throw new Error("No area name found");
  return name;
}

async function geocodeSearch(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Search geocoding failed");
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error("No results");

  const match = data[0];
  const lat = Number.parseFloat(match.lat);
  const lon = Number.parseFloat(match.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Invalid coordinates");

  const areaName =
    pickAreaName(match.address) ||
    (match.display_name || "").split(",").slice(0, 2).join(",").trim() ||
    `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

  return { lat, lon, areaName };
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  const [locationState, setLocationState] = useState("locating");
  const [activeArea, setActiveArea] = useState("");
  const [locationError, setLocationError] = useState("");
  const [manualLocation, setManualLocation] = useState("");

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadNearbyDashboard = async (lat, lon, fallbackAreaName = "") => {
    setLoading(true);
    setLocationError("");

    try {
      const [nearbyRes, reverseArea] = await Promise.all([
        axios.get("/analytics/dashboard_nearby", {
          params: { lat, lon, radius_km: RADIUS_KM },
        }),
        reverseGeocode(lat, lon).catch(() => ""),
      ]);

      const resolvedArea =
        reverseArea || fallbackAreaName || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
      setActiveArea(resolvedArea);
      setDashboardData(nearbyRes.data);
      setLocationState("ready");
    } catch (err) {
      setDashboardData(null);
      setLocationState("error");
      setLocationError("Unable to load local crime data right now. Please try another location.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      setLocationState("unsupported");
      setLocationError("Location is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        loadNearbyDashboard(coords.latitude, coords.longitude);
      },
      () => {
        setLoading(false);
        setLocationState("denied");
        setLocationError("Location access was denied.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 300000,
      }
    );
  }, []);

  const handleManualLocation = async (e) => {
    e.preventDefault();
    const query = manualLocation.trim();
    if (!query) {
      setLocationError("Please enter a location.");
      return;
    }

    setLocationState("manual_loading");
    setLocationError("");
    setLoading(true);

    try {
      const { lat, lon, areaName } = await geocodeSearch(query);
      await loadNearbyDashboard(lat, lon, areaName);
    } catch (err) {
      setLoading(false);
      setLocationState("denied");
      setLocationError("Could not find that location. Try locality, district, or city name.");
    }
  };

  const meta = dashboardData?.meta || {};
  const high = meta.high_risk_zones || 0;
  const medium = meta.medium_risk_zones || 0;
  const low = meta.low_risk_zones || 0;
  const total = meta.total_records || 0;

  const areas = useMemo(() => {
    const labels = dashboardData?.top_nearby_areas?.labels || [];
    const values = dashboardData?.top_nearby_areas?.values || [];
    const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-blue-400", "bg-purple-400"];
    return labels.slice(0, 5).map((area, i) => ({
      area,
      count: values[i] || 0,
      color: colors[i % colors.length],
    }));
  }, [dashboardData]);

  const alerts = dashboardData?.alerts || [];
  const maxArea = areas[0]?.count || 1;
  const showManualBox = ["denied", "unsupported", "error"].includes(locationState);

  return (
    <div className="min-h-screen bg-[#0B1220] text-gray-200 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-4xl font-bold text-white">CrimeWatch Dashboard</h1>
            <p className="text-[#9AA8B2] mt-1">
              Monitor crime-prone areas, view heatmaps, get safe routes, and report incidents.
            </p>
            {locationState === "ready" ? (
              <p className="text-sm text-blue-300 mt-2">
                📍 Showing data near {activeArea} - within {RADIUS_KM} km
              </p>
            ) : (
              <p className="text-sm text-yellow-300 mt-2">
                {locationState === "locating" || locationState === "manual_loading"
                  ? "Detecting your location to load nearby crime data..."
                  : "No active area selected. Enter your location to view local crime data."}
              </p>
            )}
            {locationError ? <p className="text-xs text-red-300 mt-1">{locationError}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-semibold text-blue-400">
              {time.toLocaleTimeString()}
            </p>
            <p className="text-sm text-[#9AA8B2]">
              {time.toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {showManualBox ? (
          <form
            onSubmit={handleManualLocation}
            className="bg-[#0F1A26] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row gap-3"
          >
            <input
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="Enter your location to view local crime data"
              className="flex-1 bg-[#111C29] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-100 placeholder:text-[#7D8A92] focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white"
            >
              Use location
            </button>
          </form>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Records", value: loading ? "..." : total.toLocaleString(), color: "text-blue-400" },
            { label: "High Crime Zones", value: loading ? "..." : high.toLocaleString(), color: "text-red-400" },
            { label: "Medium Risk Zones", value: loading ? "..." : medium.toLocaleString(), color: "text-yellow-400" },
            { label: "Low Risk Zones", value: loading ? "..." : low.toLocaleString(), color: "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="bg-[#0F1A26] border border-white/10 rounded-2xl p-5 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-[#9AA8B2] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <button
              key={f.to}
              onClick={() => navigate(f.to)}
              className={`bg-[#0F1A26] border border-white/10 p-6 rounded-2xl shadow-lg text-left transition-all duration-200 group hover:bg-white/5 ${f.hoverBorder} hover:shadow-xl hover:-translate-y-1`}
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h2 className={`text-base font-semibold text-white mb-2 transition-colors ${f.hoverText}`}>
                {f.title}
              </h2>
              <p className="text-[#9AA8B2] text-sm leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Live Crime Alerts</h2>
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            </div>
            <ul className="space-y-3">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-500" />
                    Loading nearby alerts...
                  </li>
                ))
              ) : alerts.length ? (
                alerts.map((a, i) => {
                  const color =
                    a.level === "high" ? "bg-red-500" : a.level === "medium" ? "bg-orange-400" : "bg-green-400";
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                      {a.text}
                    </li>
                  );
                })
              ) : (
                <li className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-green-400" />
                  No incidents reported within {RADIUS_KM} km.
                </li>
              )}
            </ul>
          </div>

          <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Nearby Areas</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-6 bg-white/5 rounded-full animate-pulse" />
                ))}
              </div>
            ) : areas.length ? (
              <ul className="space-y-3">
                {areas.map((a) => (
                  <li key={a.area} className="flex items-center gap-3">
                    <span className="text-sm text-[#9AA8B2] w-32 shrink-0 truncate">{a.area}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full ${a.color}`} style={{ width: `${(a.count / maxArea) * 100}%` }} />
                    </div>
                    <span className="text-xs text-[#9AA8B2] w-14 text-right">{a.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#9AA8B2]">No nearby area data found within {RADIUS_KM} km.</p>
            )}
            <button
              onClick={() => navigate("/analytics")}
              className="mt-5 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-[#9AA8B2] hover:text-white transition border border-white/10"
            >
              View full analytics -&gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
