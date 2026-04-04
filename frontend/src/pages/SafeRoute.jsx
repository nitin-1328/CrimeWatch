// SafeRoute.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import API from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";

const SEVERITY_WEIGHTS = {
  "Homicide": 10, "Murder": 10, "Kidnapping": 9, "Assault": 7,
  "Robbery": 6, "Burglary": 5, "Theft": 3, "Vandalism": 2,
  "Identity Theft": 2, "Other": 1,
};
const TIME_FACTORS = { Day: 1.0, Evening: 1.2, Night: 1.5 };
const TRAVELER_FACTORS = { Male: 1.0, Female: 1.3 };

// ── Severity color system ──────────────────────────
const SEV_CONFIG = {
  5: { color: "#dc2626", border: "#991b1b", label: "Critical", size: 14 },
  4: { color: "#ea580c", border: "#9a3412", label: "High", size: 12 },
  3: { color: "#ca8a04", border: "#854d0e", label: "Medium", size: 10 },
  2: { color: "#16a34a", border: "#14532d", label: "Low", size: 8 },
  1: { color: "#2563eb", border: "#1e3a8a", label: "Minimal", size: 7 },
};

const getSevConfig = sev => SEV_CONFIG[Math.min(5, Math.max(1, Math.round(sev)))] || SEV_CONFIG[1];

// ── Colored circle icon ────────────────────────────
function makeCircleIcon(sev) {
  const cfg = getSevConfig(sev);
  const s = cfg.size;
  return L.divIcon({
    html: `<div style="
      width:${s}px;height:${s}px;
      border-radius:50%;
      background:${cfg.color};
      border:2px solid ${cfg.border};
      box-shadow:0 1px 4px rgba(0,0,0,0.5);
      cursor:pointer;
    "></div>`,
    className: "",
    iconAnchor: [s / 2, s / 2],
    iconSize: [s, s],
  });
}

const scoreColor = s => s >= 60 ? "#22c55e" : s >= 35 ? "#f59e0b" : "#ef4444";

const scoreLabel = s =>
  s >= 75 ? "Relatively Safe" :
    s >= 55 ? "Moderate Risk" :
      s >= 35 ? "High Risk" :
        s >= 15 ? "Very Dangerous" : "Extremely Dangerous";

const segColor = n => n === 0 ? "#22c55e" : n <= 2 ? "#f59e0b" : "#ef4444";

// ── FIXED: Log-scale scoring — no route ever scores 0 ──
function calcScore(crimes, lenKm, tod, trav) {
  if (!crimes.length) return { score: 100 };
  const tf = TIME_FACTORS[tod] || 1.0;
  const tr = TRAVELER_FACTORS[trav] || 1.0;

  let rawRisk = 0;
  crimes.forEach(c => {
    rawRisk += (SEVERITY_WEIGHTS[c.category] || c.severity || 1) * tf * tr;
  });

  const riskPerKm = rawRisk / Math.max(lenKm, 0.1);

  // Log scale: prevents extreme crime counts from collapsing score to 0
  // log1p(0) = 0 → score 100 (no crimes)
  // log1p(10) ≈ 2.4 → score ~57 (low density)
  // log1p(50) ≈ 3.9 → score ~30 (medium density)
  // log1p(200) ≈ 5.3 → score ~5 (very high density, min 5)
  const logRisk = Math.log1p(riskPerKm);
  const score = Math.max(5, Math.min(100, Math.round(100 - logRisk * 18)));

  return { score };
}

async function searchAddress(q) {
  if (!q || q.length < 3) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=in`,
    { headers: { "Accept-Language": "en" } }
  );
  return res.json();
}

async function geocode(address) {
  const r = await searchAddress(address);
  if (!r.length) throw new Error(`Could not find: ${address}`);
  return { lat: parseFloat(r[0].lat), lon: parseFloat(r[0].lon) };
}

async function getRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson&alternatives=true`;
  const data = await (await fetch(url)).json();
  if (!data.routes?.length) throw new Error("No route found");
  return data.routes;
}

// ── Address Autocomplete ───────────────────────────
function AddressInput({ label, value, onChange, onSelect }) {
  const [suggs, setSuggs] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrap = useRef(null);

  const handleChange = v => {
    onChange(v);
    clearTimeout(timer.current);
    if (v.length < 3) { setSuggs([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const r = await searchAddress(v);
      setSuggs(r); setOpen(r.length > 0);
    }, 400);
  };

  const pick = item => {
    onChange(item.display_name);
    onSelect({ lat: parseFloat(item.lat), lon: parseFloat(item.lon), display: item.display_name });
    setSuggs([]); setOpen(false);
  };

  useEffect(() => {
    const h = e => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={wrap} className="relative flex-1">
      <label className="text-xs text-[#9AA8B2] uppercase tracking-wider mb-1 block">{label}</label>
      <input value={value} onChange={e => handleChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}...`}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
      {open && suggs.length > 0 && (
        <div className="absolute z-[9999] top-full mt-1 w-full bg-[#0F1A26] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
          {suggs.map((s, i) => (
            <button key={i} onClick={() => pick(s)}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 border-b border-white/5 last:border-0 transition">
              <span className="text-blue-400 mr-2">📍</span>{s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Crime Layer with threshold filter ─────────────
function CrimeLayer({ allCrimes, showAll, minSeverity }) {
  const leafletMap = useMap();
  const layerRef = useRef(null);
  const rafRef = useRef(null);

  const renderVisible = useCallback(() => {
    if (!showAll || !allCrimes.length) {
      if (layerRef.current) { leafletMap.removeLayer(layerRef.current); layerRef.current = null; }
      return;
    }

    const zoom = leafletMap.getZoom();
    const bounds = leafletMap.getBounds().pad(0.1);
    const maxVisible = zoom <= 5 ? 300 : zoom <= 7 ? 800 : zoom <= 9 ? 2000 : 5000;

    const visible = [];
    for (let i = 0; i < allCrimes.length && visible.length < maxVisible; i++) {
      const c = allCrimes[i];
      const lat = parseFloat(c[0]);
      const lon = parseFloat(c[1]);
      if (isNaN(lat) || isNaN(lon)) continue;
      if (!bounds.contains([lat, lon])) continue;
      const sev = c[5] || Math.max(1, Math.round((parseFloat(c[2]) || 0.4) * 5));
      if (sev < minSeverity) continue;
      visible.push(c);
    }

    if (layerRef.current) { leafletMap.removeLayer(layerRef.current); layerRef.current = null; }

    const group = L.layerGroup();
    visible.forEach(c => {
      const lat = parseFloat(c[0]);
      const lon = parseFloat(c[1]);
      const sev = c[5] || Math.max(1, Math.round((parseFloat(c[2]) || 0.4) * 5));
      const cat = c[3] || "Other";
      const city = c[6] || "";
      const tp = c[7] || "";
      const dt = c[4];
      const cfg = getSevConfig(sev);

      const m = L.marker([lat, lon], { icon: makeCircleIcon(sev) });
      m.bindPopup(`
        <div style="font-family:system-ui;min-width:180px;padding:4px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#111">${cat}</div>
          <div style="display:inline-block;background:${cfg.color};color:white;border-radius:4px;padding:1px 8px;font-size:11px;margin-bottom:6px">${cfg.label} (${sev}/5)</div>
          <div style="font-size:12px;color:#555;line-height:1.9">
            ${city ? `<div>🏙️ City: ${city}</div>` : ""}
            ${tp ? `<div>🕐 Time: ${tp}</div>` : ""}
            <div>📅 ${dt ? new Date(dt).toLocaleDateString("en-IN") : "Unknown"}</div>
          </div>
        </div>
      `, { maxWidth: 220 });
      group.addLayer(m);
    });

    group.addTo(leafletMap);
    layerRef.current = group;
  }, [allCrimes, showAll, minSeverity, leafletMap]);

  useEffect(() => {
    const debounced = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(renderVisible);
    };
    leafletMap.on("moveend zoomend", debounced);
    renderVisible();
    return () => {
      leafletMap.off("moveend zoomend", debounced);
      if (layerRef.current) leafletMap.removeLayer(layerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [leafletMap, renderVisible]);

  return null;
}

// ── Route Layer ────────────────────────────────────
function RouteLayer({ routes, routeCrimes, showRoute, selectedRoute, minSeverity }) {
  const map = useMap();
  const layersRef = useRef([]);

  useEffect(() => {
    layersRef.current.forEach(l => { try { map.removeLayer(l); } catch (_) { } });
    layersRef.current = [];
    if (!routes.length) return;

    routes.forEach((route, idx) => {
      const isSel = idx === selectedRoute;
      const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
      const line = L.polyline(coords, {
        color: isSel ? (idx === 0 ? "#3b82f6" : "#a855f7") : "#6b7280",
        weight: isSel ? 7 : 3,
        opacity: isSel ? 1.0 : 0.4,
        dashArray: idx === 1 ? "8,6" : null,
      });
      line.addTo(map);
      layersRef.current.push(line);

      if (isSel && route.crimeSegments?.length) {
        route.crimeSegments.forEach(seg => {
          const sc = seg.coords.map(c => [c[1], c[0]]);
          if (sc.length < 2) return;
          const sl = L.polyline(sc, { color: seg.color, weight: 6, opacity: 0.75 });
          sl.addTo(map);
          layersRef.current.push(sl);
        });
      }
    });

    const r = routes[selectedRoute];
    if (r) {
      const sc = r.geometry.coordinates[0];
      const ec = r.geometry.coordinates[r.geometry.coordinates.length - 1];
      const mkIcon = (color, lbl) => L.divIcon({
        html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold">${lbl}</div>`,
        className: "", iconAnchor: [14, 14],
      });
      layersRef.current.push(
        L.marker([sc[1], sc[0]], { icon: mkIcon("#22c55e", "A"), zIndexOffset: 2000 }).bindPopup("<b>Start</b>").addTo(map),
        L.marker([ec[1], ec[0]], { icon: mkIcon("#ef4444", "B"), zIndexOffset: 2000 }).bindPopup("<b>Destination</b>").addTo(map),
      );
      map.fitBounds(L.latLngBounds(r.geometry.coordinates.map(c => [c[1], c[0]])), { padding: [50, 50] });
    }

    if (showRoute && routeCrimes.length) {
      routeCrimes
        .filter(crime => crime.severity >= minSeverity)
        .forEach(crime => {
          const m = L.marker([crime.lat, crime.lon], {
            icon: makeCircleIcon(crime.severity),
            zIndexOffset: 1500,
          });
          const cfg = getSevConfig(crime.severity);
          m.bindPopup(`
            <div style="font-family:system-ui;min-width:190px;padding:4px">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#111">${crime.category}</div>
              <div style="display:inline-block;background:${cfg.color};color:white;border-radius:4px;padding:1px 8px;font-size:11px;margin-bottom:6px">${cfg.label} (${crime.severity}/5)</div>
              <div style="background:#fef3c7;border-radius:6px;padding:3px 8px;margin-bottom:6px;font-size:11px;color:#92400e">⚡ Within 200m of your route</div>
              <div style="font-size:12px;color:#555;line-height:1.9">
                <div>📍 <b>${crime.distance}m</b> from route</div>
                ${crime.city ? `<div>🏙️ ${crime.city}</div>` : ""}
                ${crime.timePeriod ? `<div>🕐 ${crime.timePeriod}</div>` : ""}
                <div>📅 ${crime.time}</div>
              </div>
            </div>
          `, { maxWidth: 230 });
          m.addTo(map);
          layersRef.current.push(m);
        });
    }
  }, [routes, routeCrimes, showRoute, selectedRoute, minSeverity, map]);

  return null;
}

// ── Main Page ──────────────────────────────────────
export default function SafeRoute() {
  const [startVal, setStartVal] = useState("");
  const [destVal, setDestVal] = useState("");
  const [startGeo, setStartGeo] = useState(null);
  const [destGeo, setDestGeo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [routeCrimes, setRouteCrimes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [showAll, setShowAll] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState("Day");
  const [travType, setTravType] = useState("Male");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [allCrimes, setAllCrimes] = useState([]);
  const [minSeverity, setMinSeverity] = useState(3);

  useEffect(() => {
    API.get("/incidents/heatmap").then(res => {
      setAllCrimes(res.data.heatmap || []);
    }).catch(console.error);
  }, []);

  const analyzeRoutes = useCallback((osmRoutes, crimes, tod, trav) => {
    return osmRoutes.map(route => {
      const turfLine = turf.lineString(route.geometry.coordinates);
      const lenKm = (route.distance || 0) / 1000;

      // ── CHANGED: buffer reduced from 0.3 to 0.2 (200m) ──
      const buffered = turf.buffer(turfLine, 0.2, { units: "kilometers" });

      const nearbyCrimes = [];
      crimes.forEach(c => {
        const lat = parseFloat(c[0]), lon = parseFloat(c[1]);
        if (isNaN(lat) || isNaN(lon)) return;
        try {
          if (turf.booleanPointInPolygon(turf.point([lon, lat]), buffered)) {
            const near = turf.nearestPointOnLine(turfLine, turf.point([lon, lat]), { units: "meters" });
            nearbyCrimes.push({
              lat, lon,
              severity: c[5] || Math.max(1, Math.round((parseFloat(c[2]) || 0.4) * 5)),
              category: c[3] || "Other",
              time: c[4] ? new Date(c[4]).toLocaleDateString("en-IN") : "Unknown",
              distance: Math.round(near.properties.dist || 0),
              city: c[6] || "",
              timePeriod: c[7] || "",
            });
          }
        } catch (_) { }
      });
      nearbyCrimes.sort((a, b) => a.distance - b.distance);

      const { score } = calcScore(nearbyCrimes, lenKm, tod, trav);
      const coords = route.geometry.coordinates;
      const segSize = Math.max(2, Math.floor(coords.length / 12));
      const crimeSegments = [];
      for (let i = 0; i < coords.length - 1; i += segSize) {
        const sc = coords.slice(i, Math.min(i + segSize + 1, coords.length));
        if (sc.length < 2) continue;
        try {
          // ── CHANGED: segment buffer also 0.2 ──
          const sb = turf.buffer(turf.lineString(sc), 0.2, { units: "kilometers" });
          let cnt = 0;
          nearbyCrimes.forEach(c => { try { if (turf.booleanPointInPolygon(turf.point([c.lon, c.lat]), sb)) cnt++; } catch (_) { } });
          crimeSegments.push({ coords: sc, color: segColor(cnt) });
        } catch (_) { }
      }

      return {
        ...route, score, nearbyCrimes, crimeSegments,
        highSevCount: nearbyCrimes.filter(c => c.severity >= 4).length,
        closestCrime: nearbyCrimes[0] || null,
        distanceKm: Math.round(lenKm * 10) / 10,
        durationMin: Math.round((route.duration || 0) / 60),
      };
    });
  }, []);

  const handleFind = async () => {
    setError(""); setLoading(true); setRoutes([]); setResult(null);
    try {
      const sg = startGeo || await geocode(startVal);
      const dg = destGeo || await geocode(destVal);
      const osmRoutes = await getRoute(sg, dg);
      const analyzed = analyzeRoutes(osmRoutes, allCrimes, timeOfDay, travType);
      setRoutes(analyzed);
      setRouteCrimes(analyzed[0]?.nearbyCrimes || []);
      setSelectedRoute(0);
      setResult(analyzed[0]);
      // ── NEW: auto-hide all dataset pins when route is found ──
      setShowAll(false);
    } catch (err) { setError(err.message || "Failed to find route."); }
    setLoading(false);
  };

  const selectRoute = idx => {
    setSelectedRoute(idx);
    setRouteCrimes(routes[idx]?.nearbyCrimes || []);
    setResult(routes[idx]);
  };

  const swap = () => {
    setStartVal(destVal); setDestVal(startVal);
    setStartGeo(destGeo); setDestGeo(startGeo);
  };

  const sevLabel = v => ["", "All", "Low+", "Medium+", "High+", "Critical"][v] || "";
  const sevColor = v => [, "#2563eb", "#16a34a", "#ca8a04", "#ea580c", "#dc2626"][v] || "#ca8a04";

  return (
    <div className="min-h-screen bg-bg text-gray-200 p-6">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Safe Route Finder
          </h1>
          <p className="text-[#9AA8B2] mt-2">
            <strong className="text-white">{allCrimes.length.toLocaleString()}</strong> real crime points • zoom in to see individual pins
          </p>
        </div>

        {/* Input */}
        <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex gap-3 items-end mb-4">
            <AddressInput label="Start Address" value={startVal} onChange={setStartVal}
              onSelect={g => { setStartGeo(g); setStartVal(g.display); }} />
            <button onClick={swap} className="mb-0.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-lg">⇅</button>
            <AddressInput label="Destination" value={destVal} onChange={setDestVal}
              onSelect={g => { setDestGeo(g); setDestVal(g.display); }} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-[#9AA8B2] uppercase tracking-wider mb-2 block">🕐 Travel Time</label>
              <div className="flex gap-2">
                {["Day", "Evening", "Night"].map(t => (
                  <button key={t} onClick={() => setTimeOfDay(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${timeOfDay === t ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#9AA8B2] uppercase tracking-wider mb-2 block">👤 Traveler</label>
              <div className="flex gap-2">
                {["Male", "Female"].map(t => (
                  <button key={t} onClick={() => setTravType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${travType === t ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Severity Threshold Slider ── */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-[#9AA8B2] uppercase tracking-wider">⚠️ Show Crimes — Min Severity</label>
              <span className="text-sm font-bold px-3 py-0.5 rounded-full transition-all"
                style={{ background: sevColor(minSeverity) + "33", color: sevColor(minSeverity) }}>
                {minSeverity}/5 — {sevLabel(minSeverity)}
              </span>
            </div>
            <input
              type="range" min={1} max={5} step={1} value={minSeverity}
              onChange={e => setMinSeverity(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: sevColor(minSeverity) }}
            />
            <div className="flex justify-between text-xs mt-2">
              {[1, 2, 3, 4, 5].map(v => (
                <span key={v} style={{ color: v === minSeverity ? sevColor(v) : "#6b7280", fontWeight: v === minSeverity ? 700 : 400 }}>
                  ● {["", "All", "Low+", "Med+", "High+", "Critical"][v]}
                </span>
              ))}
            </div>
          </div>

          <button onClick={handleFind} disabled={loading || (!startVal && !startGeo) || (!destVal && !destGeo)}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="animate-spin inline-block">⟳</span> Analyzing...</> : <>🛡️ Find Safe Route</>}
          </button>
          {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}
        </div>

        {/* Route Options */}
        {routes.length > 1 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {routes.map((r, idx) => (
              <button key={idx} onClick={() => selectRoute(idx)}
                className={`p-4 rounded-xl border transition text-left ${selectedRoute === idx ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-[#0F1A26] hover:border-white/20"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{idx === 0 ? "🚀 Route A — Fastest" : "🛡️ Route B — Alternative"}</span>
                  <span className="text-lg font-bold" style={{ color: scoreColor(r.score) }}>{r.score}</span>
                </div>
                <div className="flex gap-4 text-xs text-[#9AA8B2]">
                  <span>📏 {r.distanceKm} km</span>
                  <span>⏱ {r.durationMin} min</span>
                  <span>⚠️ {r.nearbyCrimes?.length || 0} nearby</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl mb-6 relative">
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "60vh", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            <CrimeLayer allCrimes={allCrimes} showAll={showAll} minSeverity={minSeverity} />
            <RouteLayer routes={routes} routeCrimes={routeCrimes} showRoute={showRoute} selectedRoute={selectedRoute} minSeverity={minSeverity} />
          </MapContainer>

          {/* Toggles */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            <button onClick={() => setShowAll(!showAll)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg transition ${showAll ? "bg-blue-600/90 text-white" : "bg-gray-800/90 text-gray-400"}`}>
              {showAll ? "📍 Dataset Pins ON" : "📍 Dataset Pins OFF"}
            </button>
            {routeCrimes.length > 0 && (
              <button onClick={() => setShowRoute(!showRoute)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg transition ${showRoute ? "bg-red-500/90 text-white" : "bg-gray-800/90 text-gray-400"}`}>
                {showRoute ? `🔴 Route Crimes (${routeCrimes.filter(c => c.severity >= minSeverity).length})` : "🟡 Show Route Crimes"}
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-gray-900/90 rounded-lg p-3 text-xs space-y-1.5">
            <div className="text-gray-400 font-medium mb-2">Crime Severity</div>
            {[5, 4, 3, 2, 1].map(s => {
              const cfg = SEV_CONFIG[s];
              const hidden = s < minSeverity;
              return (
                <div key={s} className="flex items-center gap-2" style={{ opacity: hidden ? 0.3 : 1 }}>
                  <span style={{
                    display: "inline-block", width: cfg.size, height: cfg.size,
                    borderRadius: "50%", background: cfg.color,
                    border: `2px solid ${cfg.border}`, flexShrink: 0,
                  }}></span>
                  <span>{cfg.label} ({s}/5)</span>
                  {hidden && <span className="text-gray-500">hidden</span>}
                </div>
              );
            })}
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="text-gray-400 mb-1">Route Color</div>
              <div className="flex items-center gap-2"><span className="w-4 h-1.5 rounded bg-green-500 inline-block"></span> Safe</div>
              <div className="flex items-center gap-2"><span className="w-4 h-1.5 rounded bg-yellow-500 inline-block"></span> Moderate</div>
              <div className="flex items-center gap-2"><span className="w-4 h-1.5 rounded bg-red-500 inline-block"></span> Dangerous</div>
            </div>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-[#9AA8B2] text-sm mb-3">Safety Score</p>
                <div className="text-7xl font-bold mb-2" style={{ color: scoreColor(result.score) }}>{result.score}</div>
                <div className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
                  style={{ background: scoreColor(result.score) + "22", color: scoreColor(result.score) }}>
                  {scoreLabel(result.score)}
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${result.score}%`, background: "linear-gradient(90deg,#ef4444,#f59e0b,#22c55e)" }} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="font-bold text-lg">{result.distanceKm}</div>
                    <div className="text-[#9AA8B2] text-xs">km</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="font-bold text-lg">{result.durationMin}</div>
                    <div className="text-[#9AA8B2] text-xs">min</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold mb-4">📋 Route Analysis</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2"><span>⚠️</span><span><strong>{result.nearbyCrimes?.length || 0}</strong> crimes within 200m</span></li>
                  <li className="flex gap-2"><span>🔴</span><span><strong>{result.highSevCount || 0}</strong> high severity (4-5)</span></li>
                  <li className="flex gap-2"><span>🕐</span><span>Time: <strong>{timeOfDay}</strong>{timeOfDay === "Night" ? " (+50% risk)" : timeOfDay === "Evening" ? " (+20% risk)" : ""}</span></li>
                  <li className="flex gap-2"><span>👤</span><span>Traveler: <strong>{travType}</strong>{travType === "Female" ? " (+30% risk)" : ""}</span></li>
                  {result.closestCrime && (
                    <li className="flex gap-2"><span>📍</span><span>Nearest: <strong>{result.closestCrime.distance}m</strong> ({result.closestCrime.category})</span></li>
                  )}
                  {!result.nearbyCrimes?.length && <li className="flex gap-2"><span>✨</span><span>No crimes on this route!</span></li>}
                </ul>
              </div>

              <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold mb-4 flex items-center justify-between">
                  🗂️ Nearby Crimes
                  <span className="text-xs text-[#9AA8B2]">{result.nearbyCrimes?.length || 0} total</span>
                </h3>
                {result.nearbyCrimes?.length ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {result.nearbyCrimes.slice(0, 8).map((c, i) => {
                      const cfg = getSevConfig(c.severity);
                      return (
                        <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5">
                          <span style={{
                            display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                            background: cfg.color, border: `2px solid ${cfg.border}`, flexShrink: 0,
                          }}></span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{c.category}</div>
                            <div className="text-xs text-[#9AA8B2]">{c.distance}m • {c.city} • {c.timePeriod}</div>
                          </div>
                          <div className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: cfg.color + "33", color: cfg.color }}>
                            {cfg.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-[#9AA8B2] text-sm py-8">✅ No crimes nearby</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
