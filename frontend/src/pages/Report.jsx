// Report.jsx
import { useState, useRef } from "react";
import API from "../api/axios";
import { mlAPI, getErrorMessage } from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

const PIN_ICON = L.divIcon({
  html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7))">📍</div>`,
  className: "", iconAnchor: [16, 32],
});

function MapClickHandler({ onSelect }) {
  useMapEvents({ click(e) { onSelect(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6)); } });
  return null;
}

const CRIME_TYPES = [
  { label: "Theft", icon: "💼", bg: "from-yellow-900/40 to-yellow-800/20", border: "border-yellow-500/50", text: "text-yellow-300" },
  { label: "Assault", icon: "⚡", bg: "from-red-900/40 to-red-800/20", border: "border-red-500/50", text: "text-red-300" },
  { label: "Robbery", icon: "🏃", bg: "from-orange-900/40 to-orange-800/20", border: "border-orange-500/50", text: "text-orange-300" },
  { label: "Burglary", icon: "🏠", bg: "from-purple-900/40 to-purple-800/20", border: "border-purple-500/50", text: "text-purple-300" },
  { label: "Vandalism", icon: "🔨", bg: "from-blue-900/40 to-blue-800/20", border: "border-blue-500/50", text: "text-blue-300" },
  { label: "Kidnapping", icon: "⛓️", bg: "from-pink-900/40 to-pink-800/20", border: "border-pink-500/50", text: "text-pink-300" },
  { label: "Identity Theft", icon: "💳", bg: "from-cyan-900/40 to-cyan-800/20", border: "border-cyan-500/50", text: "text-cyan-300" },
  { label: "Homicide", icon: "💀", bg: "from-red-950/60 to-red-900/30", border: "border-red-700/60", text: "text-red-400" },
  { label: "Other", icon: "❓", bg: "from-gray-800/40 to-gray-700/20", border: "border-gray-500/50", text: "text-gray-300" },
];

const WEAPONS = [
  { label: "None", icon: "🚫" }, { label: "Knife", icon: "🔪" },
  { label: "Firearm", icon: "🔫" }, { label: "Blunt Object", icon: "🪵" },
  { label: "Poison", icon: "☠️" }, { label: "Explosives", icon: "💣" },
  { label: "Bare Hands", icon: "✊" }, { label: "Other", icon: "❓" },
];

const SEV_CONFIG = [
  { label: "Minor", color: "#22c55e", bg: "bg-green-500" },
  { label: "Low", color: "#3b82f6", bg: "bg-blue-500" },
  { label: "Moderate", color: "#f59e0b", bg: "bg-yellow-500" },
  { label: "High", color: "#f97316", bg: "bg-orange-500" },
  { label: "Critical", color: "#ef4444", bg: "bg-red-500" },
];

const STEPS = [
  { num: 1, label: "Description", icon: "📝" },
  { num: 2, label: "Location", icon: "📍" },
  { num: 3, label: "Details", icon: "👤" },
  { num: 4, label: "Review", icon: "✅" },
];

function StepHeader({ step }) {
  return (
    <div className="flex items-center justify-between mb-8 relative">
      {STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <motion.div
              animate={{ scale: s.num === step ? 1.15 : 1 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${s.num < step ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30" :
                  s.num === step ? "bg-[#0F1A26] border-blue-400 text-blue-400 shadow-lg shadow-blue-400/20" :
                    "bg-[#0F1A26] border-white/15 text-gray-600"
                }`}>
              {s.num < step ? "✓" : s.icon}
            </motion.div>
            <span className={`text-xs mt-1.5 font-medium transition-colors ${s.num === step ? "text-blue-400" : s.num < step ? "text-blue-400/60" : "text-gray-600"
              }`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 mb-5 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full bg-blue-500 rounded-full"
                animate={{ width: s.num < step ? "100%" : "0%" }}
                transition={{ duration: 0.4 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[#9AA8B2] uppercase tracking-widest">{label}</label>
      {children}
      {hint && <p className="text-xs text-white/30 mt-1">{hint}</p>}
    </div>
  );
}

const inp = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-500 focus:bg-blue-500/5 transition-all";

function ReviewRow({ label, value, icon }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <span className="text-base w-6">{icon}</span>
      <span className="text-[#9AA8B2] text-sm w-28 flex-shrink-0">{label}</span>
      <span className="text-white text-sm break-words flex-1 font-medium">{value || "—"}</span>
    </div>
  );
}

function SuccessScreen({ category, onReset }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1, bounce: 0.5 }}
        className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <motion.path d="M5 13l4 4L19 7" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.6 }} />
        </svg>
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="text-3xl font-bold text-white mb-2">Report Submitted!</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-[#9AA8B2] mb-6">Thank you for keeping the community safe.</motion.p>
      {category && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-2xl px-5 py-3 mb-8">
          <span className="text-xs text-[#9AA8B2]">AI detected:</span>
          <span className="text-base font-bold text-blue-400">{category}</span>
        </motion.div>
      )}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        onClick={onReset}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-xl font-semibold transition-all shadow-lg">
        Report Another Incident
      </motion.button>
    </motion.div>
  );
}

export default function Report() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [predicted, setPredicted] = useState(null);
  const [geoLoad, setGeoLoad] = useState(false);
  const [aiLoad, setAiLoad] = useState(false);
  const [aiCat, setAiCat] = useState(null);
  const [aiProbs, setAiProbs] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const debounce = useRef(null);

  const [form, setForm] = useState({
    description: "", crime_type: "", latitude: "", longitude: "",
    victim_age: "", victim_gender: "", weapon_used: "", severity: 3, time_of_crime: "",
  });
  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const handleDesc = (v) => {
    set("description", v);
    clearTimeout(debounce.current);
    if (v.length > 15) {
      debounce.current = setTimeout(async () => {
        setAiLoad(true);
        try {
          const r = await mlAPI.predictCategory(v);
          setAiCat(r.data.category);
          setAiProbs(r.data.probabilities);
          set("crime_type", r.data.category);
        } catch { }
        setAiLoad(false);
      }, 700);
    }
  };

  const handleGeo = () => {
    if (!navigator.geolocation) return;
    setGeoLoad(true);
    navigator.geolocation.getCurrentPosition(
      p => {
        const lat = p.coords.latitude.toFixed(6), lon = p.coords.longitude.toFixed(6);
        set("latitude", lat); set("longitude", lon);
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        setGeoLoad(false);
      },
      () => { alert("Could not get location."); setGeoLoad(false); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 4) { setStep(s => s + 1); return; }
    setSubmitting(true);
    try {
      const r = await API.post("/incidents/report", {
        description: form.description,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        victim_age: form.victim_age ? parseInt(form.victim_age) : null,
        victim_gender: form.victim_gender,
        weapon_used: form.weapon_used,
      });
      setPredicted(r.data.predicted_category);
      setSuccess(true);
    } catch (err) { alert(getErrorMessage(err)); }
    setSubmitting(false);
  };

  const reset = () => {
    setSuccess(false); setStep(1); setAiCat(null); setAiProbs(null); setPredicted(null);
    setForm({ description: "", crime_type: "", latitude: "", longitude: "", victim_age: "", victim_gender: "", weapon_used: "", severity: 3, time_of_crime: "" });
  };

  const canNext = () => {
    if (step === 1) return form.description.trim().length > 10;
    if (step === 2) return !!form.latitude && !!form.longitude;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">

        {/* Page title */}
        {!success && (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Report an Incident
            </h1>
            <p className="text-[#9AA8B2] mt-2 text-sm">Help keep your community safe — every report matters</p>
          </div>
        )}

        {/* Card */}
        <div className="bg-[#0F1A26] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          {/* Top accent bar */}
          {!success && (
            <div className="h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
          )}

          <div className="p-8">
            {success ? (
              <SuccessScreen category={predicted} onReset={reset} />
            ) : (
              <>
                <StepHeader step={step} />

                <form onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">

                    {/* ═══ STEP 1 ═══ */}
                    {step === 1 && (
                      <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="space-y-6">

                        <Field label="Describe what happened" hint="Include time, place, number of people involved, and what occurred">
                          <div className="relative">
                            <textarea required rows={4} value={form.description}
                              onChange={e => handleDesc(e.target.value)}
                              placeholder="e.g. A man snatched my bag near the metro station at around 9pm..."
                              className={inp + " resize-none"} />
                            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                              {aiLoad && <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>}
                              <span className="text-xs text-white/25">{form.description.length} chars</span>
                            </div>
                          </div>
                        </Field>

                        {/* AI live card */}
                        <AnimatePresence>
                          {(aiCat || aiLoad) && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                              className="bg-gradient-to-br from-purple-900/30 to-blue-900/20 border border-purple-500/25 rounded-2xl p-4 overflow-hidden">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-purple-400">✨</span>
                                <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">AI Analysis</span>
                                {aiLoad && <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin ml-auto"></span>}
                              </div>
                              {aiCat && (
                                <>
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="text-xs text-white/50">Detected category:</span>
                                    <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-bold">{aiCat}</span>
                                  </div>
                                  {aiProbs && (
                                    <div className="space-y-2">
                                      {Object.entries(aiProbs).slice(0, 4).map(([cat, prob]) => (
                                        <div key={cat} className="flex items-center gap-2">
                                          <span className="text-xs text-white/40 w-24 truncate">{cat}</span>
                                          <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${(prob * 100).toFixed(0)}%` }}
                                              transition={{ duration: 0.6, delay: 0.1 }}
                                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                                          </div>
                                          <span className="text-xs text-white/40 w-8 text-right">{(prob * 100).toFixed(0)}%</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Crime type selector */}
                        <Field label="Crime Type">
                          <div className="grid grid-cols-3 gap-2">
                            {CRIME_TYPES.map(ct => (
                              <motion.button key={ct.label} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={() => set("crime_type", ct.label)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${form.crime_type === ct.label
                                    ? `bg-gradient-to-br ${ct.bg} ${ct.border} ${ct.text} shadow-md`
                                    : "border-white/8 bg-white/3 text-white/40 hover:border-white/20 hover:text-white/60"
                                  }`}>
                                <span className="text-base">{ct.icon}</span>{ct.label}
                              </motion.button>
                            ))}
                          </div>
                        </Field>

                        <Field label="When did it happen?">
                          <input type="datetime-local" value={form.time_of_crime}
                            onChange={e => set("time_of_crime", e.target.value)} className={inp} />
                        </Field>
                      </motion.div>
                    )}

                    {/* ═══ STEP 2 ═══ */}
                    {step === 2 && (
                      <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="space-y-4">

                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white/60">Click on the map to pin the exact crime location</p>
                          <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleGeo} disabled={geoLoad}
                            className="flex items-center gap-2 text-xs px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl transition">
                            {geoLoad ? <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span> : <span>📍</span>}
                            {geoLoad ? "Locating..." : "Use My Location"}
                          </motion.button>
                        </div>

                        {/* Map */}
                        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl" style={{ height: 300 }}>
                          <MapContainer center={mapCenter} zoom={form.latitude ? 14 : 5}
                            style={{ height: "100%", width: "100%" }} key={`${mapCenter[0]}-${mapCenter[1]}`}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                            <MapClickHandler onSelect={(lat, lon) => {
                              set("latitude", lat); set("longitude", lon);
                              setMapCenter([parseFloat(lat), parseFloat(lon)]);
                            }} />
                            {form.latitude && form.longitude && (
                              <Marker position={[parseFloat(form.latitude), parseFloat(form.longitude)]} icon={PIN_ICON} />
                            )}
                          </MapContainer>
                        </div>

                        {form.latitude && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-2.5">
                            <span className="text-green-400">✓</span>
                            <span className="text-green-300 text-sm font-medium">Location pinned: {form.latitude}, {form.longitude}</span>
                          </motion.div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Latitude">
                            <input required value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="28.7041" className={inp} />
                          </Field>
                          <Field label="Longitude">
                            <input required value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="77.1025" className={inp} />
                          </Field>
                        </div>
                      </motion.div>
                    )}

                    {/* ═══ STEP 3 ═══ */}
                    {step === 3 && (
                      <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="space-y-6">

                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Victim Age">
                            <input type="number" min="1" max="120" value={form.victim_age}
                              onChange={e => set("victim_age", e.target.value)}
                              placeholder="Optional" className={inp} />
                          </Field>
                          <Field label="Victim Gender">
                            <div className="flex gap-2 h-[46px]">
                              {[{ v: "M", l: "♂ Male" }, { v: "F", l: "♀ Female" }, { v: "X", l: "Other" }].map(g => (
                                <motion.button key={g.v} type="button" whileTap={{ scale: 0.95 }}
                                  onClick={() => set("victim_gender", g.v)}
                                  className={`flex-1 rounded-xl text-xs font-semibold border transition-all ${form.victim_gender === g.v ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/25"
                                    }`}>{g.l}</motion.button>
                              ))}
                            </div>
                          </Field>
                        </div>

                        {/* Severity */}
                        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                          <div className="flex justify-between mb-3">
                            <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Incident Severity</span>
                            <span className="text-sm font-bold" style={{ color: SEV_CONFIG[form.severity - 1].color }}>
                              {SEV_CONFIG[form.severity - 1].label} — Level {form.severity}
                            </span>
                          </div>
                          <div className="flex gap-2 mb-3">
                            {SEV_CONFIG.map((s, i) => (
                              <motion.button key={i} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => set("severity", i + 1)}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${form.severity === i + 1 ? `${s.bg} border-transparent text-white shadow-lg` : "bg-white/3 border-white/8 text-white/30 hover:border-white/20"
                                  }`}>{i + 1}</motion.button>
                            ))}
                          </div>
                          <div className="flex justify-between text-xs text-white/25">
                            <span>Minor</span><span>Critical</span>
                          </div>
                        </div>

                        {/* Weapon */}
                        <Field label="Weapon Used (if any)">
                          <div className="grid grid-cols-4 gap-2">
                            {WEAPONS.map(w => (
                              <motion.button key={w.label} type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                onClick={() => set("weapon_used", w.label)}
                                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${form.weapon_used === w.label ? "border-orange-500/60 bg-orange-500/15 text-orange-300 shadow-md shadow-orange-500/10" : "border-white/8 bg-white/3 text-white/35 hover:border-white/20 hover:text-white/60"
                                  }`}>
                                <span className="text-xl">{w.icon}</span>
                                <span className="leading-tight text-center text-xs">{w.label}</span>
                              </motion.button>
                            ))}
                          </div>
                        </Field>
                      </motion.div>
                    )}

                    {/* ═══ STEP 4 ═══ */}
                    {step === 4 && (
                      <motion.div key="s4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                          <h3 className="text-sm font-bold text-white mb-1">Review Your Report</h3>
                          <p className="text-xs text-white/35 mb-4">Please verify all details before submitting</p>
                          <ReviewRow icon="📝" label="Description" value={form.description.length > 90 ? form.description.slice(0, 90) + "…" : form.description} />
                          <ReviewRow icon="🏷️" label="Crime Type" value={form.crime_type || aiCat || "Not selected"} />
                          <ReviewRow icon="📍" label="Location" value={form.latitude ? `${form.latitude}, ${form.longitude}` : "Not set"} />
                          <ReviewRow icon="🕐" label="Time" value={form.time_of_crime ? new Date(form.time_of_crime).toLocaleString("en-IN") : "Not specified"} />
                          <ReviewRow icon="👤" label="Victim Age" value={form.victim_age || "Not specified"} />
                          <ReviewRow icon="⚧" label="Gender" value={form.victim_gender === "M" ? "Male" : form.victim_gender === "F" ? "Female" : form.victim_gender || "Not specified"} />
                          <ReviewRow icon="⚔️" label="Weapon" value={form.weapon_used || "None"} />
                          <ReviewRow icon="⚠️" label="Severity" value={`Level ${form.severity}/5 — ${SEV_CONFIG[form.severity - 1].label}`} />
                          <ReviewRow icon="✨" label="AI Category" value={aiCat || "Will be predicted on submit"} />
                        </div>

                        {form.latitude && form.longitude && (
                          <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 150 }}>
                            <MapContainer center={[parseFloat(form.latitude), parseFloat(form.longitude)]} zoom={14}
                              style={{ height: "100%", width: "100%" }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <Marker position={[parseFloat(form.latitude), parseFloat(form.longitude)]} icon={PIN_ICON} />
                            </MapContainer>
                          </div>
                        )}
                      </motion.div>
                    )}

                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/5">
                    <motion.button type="button" whileHover={{ scale: step > 1 ? 1.02 : 1 }} whileTap={{ scale: step > 1 ? 0.97 : 1 }}
                      onClick={() => setStep(s => Math.max(1, s - 1))}
                      className={`px-5 py-3 rounded-xl text-sm font-medium transition-all ${step === 1 ? "invisible" : "bg-white/5 hover:bg-white/10 text-[#9AA8B2] border border-white/10"
                        }`}>← Back</motion.button>

                    <div className="flex items-center gap-2">
                      {/* Step dots */}
                      {STEPS.map(s => (
                        <div key={s.num} className={`rounded-full transition-all duration-300 ${s.num === step ? "w-5 h-2 bg-blue-500" : s.num < step ? "w-2 h-2 bg-blue-500/50" : "w-2 h-2 bg-white/15"
                          }`} />
                      ))}
                    </div>

                    <motion.button type="submit" disabled={submitting || !canNext()}
                      whileHover={{ scale: canNext() ? 1.02 : 1 }} whileTap={{ scale: canNext() ? 0.97 : 1 }}
                      className="px-7 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-30 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                      {submitting
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Submitting…</>
                        : step < 4 ? "Continue →" : "✅ Submit Report"}
                    </motion.button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
