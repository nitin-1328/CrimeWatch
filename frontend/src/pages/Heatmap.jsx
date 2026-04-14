// Heatmap.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import API from "../api/axios";
import HeatmapFilters from "../components/HeatmapFilters";
import HeatmapLegend from "../components/HeatmapLegend";
import FloatingStats from "../components/FloatingStats";
import { motion } from "framer-motion";

// ── Zoom-aware radius ──────────────────────────────
function getRadiusForZoom(zoom) {
  if (zoom <= 5) return 20;
  if (zoom <= 6) return 25;
  if (zoom <= 7) return 35;
  if (zoom <= 8) return 45;
  if (zoom <= 9) return 60;
  if (zoom <= 10) return 80;
  if (zoom <= 11) return 100;
  if (zoom <= 12) return 130;
  return 160;
}

// ── HeatLayer ──────────────────────────────────────
function HeatLayer({ points }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (!L.heatLayer) {
      console.error("heatLayer not available on L");
      return;
    }

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const heatPoints = points.map((p) => [
      parseFloat(p[0]),
      parseFloat(p[1]),
      parseFloat(p[2]) || 0.5,
    ]);

    layerRef.current = L.heatLayer(heatPoints, {
      radius: getRadiusForZoom(map.getZoom()),
      blur: 25,
      maxZoom: 17,
      minOpacity: 0.4,
      max: 1.0,
      gradient: {
        0.2: "#00ff00",
        0.4: "#ffff00",
        0.6: "#ff8000",
        0.8: "#ff4500",
        1.0: "#ff0000",
      },
    });

    layerRef.current.addTo(map);

    const onZoom = () => {
      if (layerRef.current) {
        layerRef.current.setOptions({ radius: getRadiusForZoom(map.getZoom()) });
        layerRef.current.redraw();
      }
    };
    map.on("zoomend", onZoom);

    return () => {
      map.off("zoomend", onZoom);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [points, map]);

  return null;
}

// ── Client-side filter ─────────────────────────────
function applyFilters(allPoints, filters) {
  let filtered = [...allPoints];

  if (filters.severity > 1) {
    const minWeight = filters.severity / 5;
    filtered = filtered.filter((p) => (p[2] || 0) >= minWeight);
  }
  if (filters.types && filters.types.length > 0) {
    filtered = filtered.filter((p) => filters.types.includes(p[3] || ""));
  }
  if (filters.timeRange && filters.timeRange !== "all") {
    const hours = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };
    const now = new Date();
    const cutoff = new Date(now - (hours[filters.timeRange] || 168) * 60 * 60 * 1000);
    filtered = filtered.filter((p) => {
      if (!p[4]) return true;
      return new Date(p[4]) >= cutoff;
    });
  }
  return filtered;
}

// ── Main Heatmap Page ──────────────────────────────
export default function Heatmap() {
  const [allPoints, setAllPoints] = useState([]);
  const [heatPoints, setHeatPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ types: [], timeRange: "all", severity: 1 });

  const loadHeatmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/incidents/heatmap");
      const raw = res.data.heatmap || [];
      setAllPoints(raw);
      setHeatPoints(raw);
    } catch (err) {
      console.error("Heatmap load error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadHeatmap(); }, [loadHeatmap]);

  const handleApply = (f) => { setFilters(f); setHeatPoints(applyFilters(allPoints, f)); };
  const handleReset = () => {
    const def = { types: [], timeRange: "all", severity: 1 };
    setFilters(def);
    setHeatPoints(allPoints);
  };

  const totalPoints = heatPoints.length;
  const avgSeverity = heatPoints.length
    ? heatPoints.reduce((s, p) => s + (p[2] || 0), 0) / heatPoints.length : 0;
  const hotspots = heatPoints.filter((p) => (p[2] || 0) >= 0.8).length;

  return (
    <div className="min-h-screen bg-bg text-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start gap-6">

          <HeatmapFilters onApply={handleApply} onReset={handleReset} initial={filters} />

          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-3xl font-bold">Crime Heatmap</h1>
              <p className="text-[#9AA8B2] mt-1">
                Visual representation of crime intensity across mapped regions.
                Hotter areas indicate higher crime density.
              </p>
            </div>

            {(filters.types.length > 0 || filters.severity > 1) && (
              <div className="mb-3 flex gap-2 flex-wrap items-center">
                <span className="text-xs text-[#9AA8B2]">Active:</span>
                {filters.types.map((t) => (
                  <span key={t} className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">{t}</span>
                ))}
                {filters.severity > 1 && (
                  <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full">
                    Severity ≥ {filters.severity}
                  </span>
                )}
                <span className="text-xs text-[#9AA8B2]">
                  — {heatPoints.length.toLocaleString()} / {allPoints.length.toLocaleString()} points
                </span>
              </div>
            )}

            <div className="relative">
              {loading && (
                <div className="text-center py-12">
                  <motion.div
                    className="w-full h-96 bg-white/5 rounded-xl"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  <p className="mt-3 text-sm text-[#9AA8B2]">Loading heatmap data...</p>
                </div>
              )}

              {!loading && (
                <div className="rounded-xl overflow-hidden border border-white/10 shadow-xl">
                  <MapContainer
                    center={[20.5937, 78.9629]}
                    zoom={5}
                    style={{ height: "72vh", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="© OpenStreetMap"
                    />
                    <HeatLayer points={heatPoints} />
                  </MapContainer>
                </div>
              )}

              {!loading && (
                <>
                  <HeatmapLegend />
                  <div className="absolute bottom-4 left-4 z-[1000]">
                    <FloatingStats total={totalPoints} hotspots={hotspots} avgSeverity={avgSeverity} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
