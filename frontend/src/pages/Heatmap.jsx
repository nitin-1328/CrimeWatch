import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet.heat";
import API from "../api/axios";
import HeatmapFilters from "../components/HeatmapFilters";
import HeatmapLegend from "../components/HeatmapLegend";
import FloatingStats from "../components/FloatingStats";
import { motion } from "framer-motion";

// ── Fix 1: Zoom-aware radius ───────────────────────
function getRadiusForZoom(zoom) {
  // As zoom increases (closer), radius grows so dots stay same visual size
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

function HeatLayer({ points }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  // ── Build / rebuild layer when points change ──
  useEffect(() => {
    if (!points || points.length === 0) return;

    // Remove old layer first
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    const heatPoints = points.map((p) => [p[0], p[1], p[2] || 0.5]);

    heatLayerRef.current = window.L.heatLayer(heatPoints, {
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

    heatLayerRef.current.addTo(map);

    // ── Fix 2: Update radius on every zoom ───────
    const onZoom = () => {
      if (heatLayerRef.current) {
        heatLayerRef.current.setOptions({
          radius: getRadiusForZoom(map.getZoom()),
        });
        heatLayerRef.current.redraw();
      }
    };

    map.on("zoomend", onZoom);

    return () => {
      map.off("zoomend", onZoom);
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [points, map]);

  return null;
}

// ── Fix 3: Filter data client-side reliably ───────
function applyFilters(allPoints, filters) {
  let filtered = [...allPoints];

  // Filter by severity (p[2] is 0–1 normalized, severity 1–5 → 0.2 steps)
  if (filters.severity > 1) {
    const minWeight = (filters.severity - 1) / 4; // 1→0, 2→0.25, 3→0.5, 4→0.75, 5→1
    filtered = filtered.filter((p) => (p[2] || 0) >= minWeight);
  }

  // Filter by crime types (p[3] holds category if present)
  if (filters.types && filters.types.length > 0) {
    filtered = filtered.filter((p) =>
      filters.types.some((t) =>
        (p[3] || "").toLowerCase().includes(t.toLowerCase())
      )
    );
  }

  // Filter by time range (p[4] holds date string if present)
  if (filters.timeRange && filters.timeRange !== "all") {
    const now = new Date();
    const daysMap = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[filters.timeRange] || 7;
    const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);

    filtered = filtered.filter((p) => {
      if (!p[4]) return true; // keep if no date info
      return new Date(p[4]) >= cutoff;
    });
  }

  return filtered;
}

export default function Heatmap() {
  const [allPoints, setAllPoints] = useState([]); // raw from API
  const [heatPoints, setHeatPoints] = useState([]); // after filters
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    types: [], timeRange: "7d", severity: 1,
  });

  // Load once on mount — store raw data
  const loadHeatmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/incidents/heatmap");
      const raw = res.data.heatmap || [];
      setAllPoints(raw);
      setHeatPoints(raw); // show all by default
    } catch (err) {
      console.error("Heatmap load error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  // ── Fix 4: Apply filters instantly client-side ─
  // No extra API call needed — just filter raw data
  function handleApply(f) {
    setFilters(f);
    setHeatPoints(applyFilters(allPoints, f));
  }

  function handleReset() {
    const def = { types: [], timeRange: "7d", severity: 1 };
    setFilters(def);
    setHeatPoints(allPoints); // restore all
  }

  // Stats based on filtered points
  const totalPoints = heatPoints.length;
  const avgSeverity = heatPoints.length
    ? heatPoints.reduce((s, p) => s + (p[2] || 0), 0) / heatPoints.length
    : 0;
  const hotspots = heatPoints.filter((p) => (p[2] || 0) > 0.7).length;

  return (
    <div className="min-h-screen bg-bg text-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start gap-6">
          <HeatmapFilters
            onApply={handleApply}
            onReset={handleReset}
            initial={filters}
          />

          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-3xl font-bold">Crime Heatmap</h1>
              <p className="text-muted mt-1">
                Visual representation of crime intensity across mapped regions.
                Hotter areas indicate higher crime density.
              </p>
            </div>

            <div className="relative">
              {loading && (
                <div className="text-center py-12">
                  <motion.div
                    className="inline-block w-full h-96 bg-gradient-to-r from-bg/60 via-bg/40 to-bg/60 rounded-lg"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  <div className="mt-3 text-sm text-muted">
                    Loading heatmap data...
                  </div>
                </div>
              )}

              {!loading && (
                <div className="rounded-xl overflow-hidden border border-bg/60 shadow-card-dark">
                  <MapContainer
                    center={[20.5937, 78.9629]} // center of India
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

              <HeatmapLegend />
              <div className="absolute bottom-6 left-6">
                <FloatingStats
                  total={totalPoints}
                  hotspots={hotspots}
                  avgSeverity={avgSeverity}
                />
              </div>
            </div>

            {/* Filter summary badge */}
            {(filters.types.length > 0 || filters.severity > 1) && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="text-xs text-muted">Active filters:</span>
                {filters.types.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full"
                  >
                    {t}
                  </span>
                ))}
                {filters.severity > 1 && (
                  <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full">
                    Severity ≥ {filters.severity}
                  </span>
                )}
                <span className="text-xs text-muted">
                  — showing {heatPoints.length.toLocaleString()} of{" "}
                  {allPoints.length.toLocaleString()} points
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}