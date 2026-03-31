// Analytics.jsx
import { useEffect, useState, useCallback } from "react";
import axios from "../api/axios";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, LineElement, BarElement, ArcElement,
  CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler
} from "chart.js";

ChartJS.register(LineElement, BarElement, ArcElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const gridOpts = { color: "rgba(255,255,255,0.05)" };
const tickOpts = { color: "#9AA8B2", font: { size: 11 } };

const COLORS = ["#3B82F6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#f97316", "#ec4899", "#06b6d4", "#84cc16"];

function ChartCard({ title, subtitle, children, extra }) {
  return (
    <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-[#9AA8B2] mt-0.5">{subtitle}</p>}
        </div>
        {extra && <div className="ml-4 flex-shrink-0">{extra}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-5 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-[#9AA8B2] mt-1">{label}</p>
    </div>
  );
}

// ── Tab component ──────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-white/5 rounded-xl p-1">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition ${active === t ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}>{t}</button>
      ))}
    </div>
  );
}

// ── Multi-select dropdown ──────────────────────────
function MultiSelect({ options, selected, onChange, placeholder, max = 4 }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-left text-gray-300 hover:border-white/20 transition flex items-center justify-between min-w-[160px]">
        <span className="truncate">
          {selected.length === 0 ? placeholder : selected.join(", ")}
        </span>
        <span className="ml-2 text-gray-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[200px] bg-[#0F1A26] border border-white/15 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {options.map(opt => {
            const isSel = selected.includes(opt);
            const isDisabled = !isSel && selected.length >= max;
            return (
              <button key={opt} disabled={isDisabled}
                onClick={() => {
                  if (isSel) onChange(selected.filter(s => s !== opt));
                  else if (!isDisabled) onChange([...selected, opt]);
                }}
                className={`w-full text-left px-3 py-2 text-xs border-b border-white/5 last:border-0 flex items-center gap-2 transition ${isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"
                  }`}>
                <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${isSel ? "bg-blue-600 border-blue-600" : "border-gray-500"
                  }`}>
                  {isSel && <span className="text-white text-xs">✓</span>}
                </span>
                <span className={isSel ? "text-white" : "text-gray-400"}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Single select dropdown ─────────────────────────
function SingleSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-left text-gray-300 hover:border-white/20 transition flex items-center justify-between min-w-[140px]">
        <span className="truncate">{value || placeholder}</span>
        <span className="ml-2 text-gray-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[160px] bg-[#0F1A26] border border-white/15 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          <button onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs border-b border-white/5 text-gray-500 hover:bg-white/10">
            {placeholder}
          </button>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs border-b border-white/5 last:border-0 hover:bg-white/10 transition ${value === opt ? "text-blue-400 font-medium" : "text-gray-400"
                }`}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  // City comparison state
  const [selCities, setSelCities] = useState([]);
  const [cityData, setCityData] = useState(null);
  const [cityLoading, setCityLoading] = useState(false);

  // Weapon analysis state
  const [selWeapon, setSelWeapon] = useState("");
  const [weaponCity, setWeaponCity] = useState("");
  const [weaponData, setWeaponData] = useState(null);
  const [weaponLoad, setWeaponLoad] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get("/analytics/summary"),
      axios.get("/analytics/filters"),
    ]).then(([sumRes, filRes]) => {
      setData(sumRes.data);
      setFilters(filRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Fetch city comparison
  const fetchCityCompare = useCallback(async (cities) => {
    if (!cities.length) { setCityData(null); return; }
    setCityLoading(true);
    try {
      const res = await axios.get(`/analytics/compare_cities?cities=${cities.join(",")}`);
      setCityData(res.data);
    } catch (_) { }
    setCityLoading(false);
  }, []);

  const handleCityChange = (cities) => {
    setSelCities(cities);
    fetchCityCompare(cities);
  };

  // Fetch weapon analysis
  const fetchWeaponAnalysis = useCallback(async (weapon, city) => {
    if (!weapon) { setWeaponData(null); return; }
    setWeaponLoad(true);
    try {
      const params = new URLSearchParams();
      if (weapon) params.append("weapon", weapon);
      if (city) params.append("city", city);
      const res = await axios.get(`/analytics/weapon_analysis?${params}`);
      setWeaponData(res.data);
    } catch (_) { }
    setWeaponLoad(false);
  }, []);

  const handleWeaponChange = (w) => { setSelWeapon(w); fetchWeaponAnalysis(w, weaponCity); };
  const handleWeaponCity = (c) => { setWeaponCity(c); fetchWeaponAnalysis(selWeapon, c); };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#9AA8B2]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const meta = data?.meta || {};
  const trend = data?.monthly_trend;
  const cities = data?.top_cities;
  const cats = data?.category_stats;
  const timeS = data?.time_stats;
  const dayS = data?.day_stats;
  const sevS = data?.severity_stats;
  const closure = data?.closure_rate;
  const weaponS = data?.weapon_stats;

  const sevVals = sevS?.values || [];
  const highRisk = (sevVals[3] || 0) + (sevVals[4] || 0);
  const medRisk = sevVals[2] || 0;
  const lowRisk = (sevVals[0] || 0) + (sevVals[1] || 0);

  return (
    <div className="min-h-screen px-6 py-8 bg-[#0B1220] text-white">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
            <p className="text-[#9AA8B2] mt-1">Crime trends, hotspots, and patterns across Indian cities</p>
          </div>
          <div className="w-64">
            <Tabs tabs={["Overview", "City Compare", "Weapon Analysis"]} active={activeTab} onChange={setActiveTab} />
          </div>
        </div>

        {/* ══════════════════════════════════════
            TAB: OVERVIEW
        ══════════════════════════════════════ */}
        {activeTab === "Overview" && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Records" value={(meta.total_records || 0).toLocaleString()} color="text-blue-400" />
              <StatCard label="Cities Covered" value={`${meta.cities_covered || 0}+`} color="text-green-400" />
              <StatCard label="Case Closure Rate" value={`${meta.case_closure_rate || 0}%`} color="text-yellow-400" />
              <StatCard label="High Risk Zones" value={(meta.high_risk_zones || highRisk || 0).toLocaleString()} color="text-red-400" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0F1A26] border border-red-500/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{highRisk.toLocaleString()}</p>
                <p className="text-xs text-[#9AA8B2] mt-1">High Severity (4-5)</p>
              </div>
              <div className="bg-[#0F1A26] border border-yellow-500/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{medRisk.toLocaleString()}</p>
                <p className="text-xs text-[#9AA8B2] mt-1">Medium Severity (3)</p>
              </div>
              <div className="bg-[#0F1A26] border border-green-500/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{lowRisk.toLocaleString()}</p>
                <p className="text-xs text-[#9AA8B2] mt-1">Low Severity (1-2)</p>
              </div>
            </div>

            {/* Monthly Trend + Time of Day */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ChartCard title="Monthly Crime Trend + Forecast" subtitle="Historical data with 3-month forecast">
                  {trend && (
                    <div style={{ height: 280 }}>
                      <Line data={{
                        labels: [...trend.historical.labels, ...trend.forecast.labels],
                        datasets: [
                          { label: "Historical", data: trend.historical.values, borderColor: "#3B82F6", backgroundColor: "rgba(59,130,246,0.08)", tension: 0.4, fill: true, pointRadius: 2 },
                          { label: "Forecast", data: [...Array(trend.historical.values.length).fill(null), ...trend.forecast.values], borderColor: "#F59E0B", borderDash: [6, 4], backgroundColor: "rgba(245,158,11,0.08)", tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: "#F59E0B" },
                        ],
                      }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#9AA8B2", boxWidth: 12 } } }, scales: { x: { grid: gridOpts, ticks: tickOpts }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                    </div>
                  )}
                </ChartCard>
              </div>
              <ChartCard title="Crime by Time of Day" subtitle="When crimes happen most">
                <div style={{ height: 280 }}>
                  <Doughnut data={{
                    labels: timeS?.labels || [],
                    datasets: [{ data: timeS?.values || [], backgroundColor: ["#3C3489", "#3B82F6", "#9AA8B2", "#64748B"], borderWidth: 0 }],
                  }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: "#9AA8B2", boxWidth: 10, padding: 10 } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()}` } } } }} />
                </div>
              </ChartCard>
            </div>

            {/* Top Cities + Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Top 10 Cities by Crime Count" subtitle="Most affected cities">
                {cities && (
                  <div style={{ height: 320 }}>
                    <Bar data={{ labels: cities.labels, datasets: [{ label: "Crime Count", data: cities.values, backgroundColor: "rgba(59,130,246,0.7)", borderColor: "#3B82F6", borderWidth: 1, borderRadius: 4 }] }}
                      options={{ indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x.toLocaleString()}` } } }, scales: { x: { grid: gridOpts, ticks: tickOpts }, y: { grid: { display: false }, ticks: tickOpts } } }} />
                  </div>
                )}
              </ChartCard>
              <ChartCard title="Crime by Category" subtitle="Distribution of crime types">
                <div style={{ height: 320 }}>
                  <Bar data={{ labels: cats?.labels || [], datasets: [{ label: "Count", data: cats?.values || [], backgroundColor: ["rgba(239,68,68,0.7)", "rgba(245,158,11,0.7)", "rgba(34,197,94,0.7)", "rgba(59,130,246,0.7)", "rgba(168,85,247,0.7)", "rgba(20,184,166,0.7)", "rgba(249,115,22,0.7)", "rgba(100,116,139,0.7)"], borderRadius: 4 }] }}
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()}` } } }, scales: { x: { grid: { display: false }, ticks: { ...tickOpts, maxRotation: 30 } }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                </div>
              </ChartCard>
            </div>

            {/* Day + Severity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Crime by Day of Week" subtitle="Which days have highest activity">
                <div style={{ height: 240 }}>
                  <Bar data={{ labels: dayS?.labels || [], datasets: [{ label: "Crime Count", data: dayS?.values || [], backgroundColor: "rgba(168,85,247,0.7)", borderColor: "#A855F7", borderWidth: 1, borderRadius: 4 }] }}
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()}` } } }, scales: { x: { grid: { display: false }, ticks: tickOpts }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                </div>
              </ChartCard>
              <ChartCard title="Crime by Severity Level" subtitle="Level 1 (low) to Level 5 (high)">
                <div style={{ height: 240 }}>
                  <Bar data={{ labels: sevS?.labels || [], datasets: [{ label: "Count", data: sevS?.values || [], backgroundColor: ["rgba(34,197,94,0.7)", "rgba(59,130,246,0.7)", "rgba(245,158,11,0.7)", "rgba(249,115,22,0.7)", "rgba(239,68,68,0.7)"], borderRadius: 4 }] }}
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()}` } } }, scales: { x: { grid: { display: false }, ticks: tickOpts }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                </div>
              </ChartCard>
            </div>

            {/* Weapon Stats */}
            <ChartCard title="Crime by Weapon Used" subtitle="Which weapons are used most across all cities">
              <div style={{ height: 260 }}>
                <Bar data={{ labels: weaponS?.labels?.slice(0, 12) || [], datasets: [{ label: "Count", data: weaponS?.values?.slice(0, 12) || [], backgroundColor: (weaponS?.labels || []).slice(0, 12).map((_, i) => COLORS[i % COLORS.length] + "b3"), borderRadius: 4 }] }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()}` } } }, scales: { x: { grid: { display: false }, ticks: { ...tickOpts, maxRotation: 30 } }, y: { grid: gridOpts, ticks: tickOpts } } }} />
              </div>
            </ChartCard>

            {/* Closure Rate */}
            <ChartCard title="Case Closure Rate by City" subtitle="Percentage of cases solved per city (top 10)">
              <div style={{ height: 260 }}>
                <Bar data={{ labels: closure?.labels || [], datasets: [{ label: "Closure Rate %", data: closure?.values || [], backgroundColor: "rgba(20,184,166,0.7)", borderColor: "#14B8A6", borderWidth: 1, borderRadius: 4 }] }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}%` } } }, scales: { x: { grid: { display: false }, ticks: tickOpts }, y: { grid: gridOpts, ticks: { ...tickOpts, callback: v => `${v}%` }, min: 40, max: 60 } } }} />
              </div>
            </ChartCard>
          </>
        )}

        {/* ══════════════════════════════════════
            TAB: CITY COMPARE
        ══════════════════════════════════════ */}
        {activeTab === "City Compare" && (
          <div className="space-y-6">
            {/* City selector */}
            <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-3">Select Cities to Compare <span className="text-xs text-[#9AA8B2] font-normal">(max 4)</span></h3>
              <div className="flex flex-wrap gap-3 items-center">
                <MultiSelect
                  options={filters?.cities || []}
                  selected={selCities}
                  onChange={handleCityChange}
                  placeholder="Choose cities..."
                  max={4}
                />
                {selCities.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {selCities.map((c, i) => (
                      <span key={c} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white"
                        style={{ background: COLORS[i] + "33", border: `1px solid ${COLORS[i]}55` }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }}></span>
                        {c}
                        <button onClick={() => handleCityChange(selCities.filter(x => x !== c))} className="ml-1 text-gray-400 hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {selCities.length === 0 && (
                <p className="text-[#9AA8B2] text-sm mt-3">Select 2–4 cities to compare their crime patterns side by side.</p>
              )}
            </div>

            {cityLoading && (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[#9AA8B2] text-sm">Loading city data...</p>
              </div>
            )}

            {cityData && !cityLoading && (
              <>
                {/* Summary cards */}
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selCities.length}, 1fr)` }}>
                  {selCities.map((city, i) => {
                    const d = cityData[city];
                    if (!d) return null;
                    return (
                      <div key={city} className="bg-[#0F1A26] border rounded-2xl p-5"
                        style={{ borderColor: COLORS[i] + "44" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }}></span>
                          <h3 className="font-semibold text-white">{city}</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-[#9AA8B2]">Total crimes</span><span className="font-bold text-white">{d.total.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-[#9AA8B2]">Avg severity</span><span className="font-bold" style={{ color: COLORS[i] }}>{d.avg_severity}</span></div>
                          <div className="flex justify-between"><span className="text-[#9AA8B2]">Closure rate</span><span className="font-bold text-green-400">{d.closure_rate}%</span></div>
                          <div className="flex justify-between"><span className="text-[#9AA8B2]">Top weapon</span><span className="font-bold text-orange-400 text-xs">{d.top_weapon}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Crime Categories comparison */}
                <ChartCard title="Crime Categories — City Comparison" subtitle="Which crime types dominate in each city">
                  <div style={{ height: 320 }}>
                    <Bar data={{
                      labels: [...new Set(selCities.flatMap(c => cityData[c]?.categories?.labels || []))],
                      datasets: selCities.map((city, i) => ({
                        label: city,
                        data: (() => {
                          const allLabels = [...new Set(selCities.flatMap(c => cityData[c]?.categories?.labels || []))];
                          const cityLabels = cityData[city]?.categories?.labels || [];
                          const cityVals = cityData[city]?.categories?.values || [];
                          return allLabels.map(lbl => { const idx = cityLabels.indexOf(lbl); return idx >= 0 ? cityVals[idx] : 0; });
                        })(),
                        backgroundColor: COLORS[i] + "99",
                        borderColor: COLORS[i],
                        borderWidth: 1, borderRadius: 3,
                      })),
                    }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#9AA8B2", boxWidth: 12 } }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}` } } }, scales: { x: { grid: { display: false }, ticks: { ...tickOpts, maxRotation: 30 } }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                  </div>
                </ChartCard>

                {/* Time of day comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartCard title="Time of Day — Comparison" subtitle="When crimes peak in each city">
                    <div style={{ height: 260 }}>
                      <Bar data={{
                        labels: ["Morning", "Afternoon", "Evening", "Night"],
                        datasets: selCities.map((city, i) => ({
                          label: city,
                          data: ["Morning", "Afternoon", "Evening", "Night"].map(tp => {
                            const labels = cityData[city]?.time_of_day?.labels || [];
                            const vals = cityData[city]?.time_of_day?.values || [];
                            const idx = labels.indexOf(tp);
                            return idx >= 0 ? vals[idx] : 0;
                          }),
                          backgroundColor: COLORS[i] + "99",
                          borderColor: COLORS[i], borderWidth: 1, borderRadius: 3,
                        })),
                      }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#9AA8B2", boxWidth: 12 } } }, scales: { x: { grid: { display: false }, ticks: tickOpts }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                    </div>
                  </ChartCard>

                  <ChartCard title="Severity Distribution — Comparison" subtitle="Crime severity levels per city">
                    <div style={{ height: 260 }}>
                      <Bar data={{
                        labels: ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"],
                        datasets: selCities.map((city, i) => ({
                          label: city,
                          data: ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"].map(lv => {
                            const labels = cityData[city]?.severity?.labels || [];
                            const vals = cityData[city]?.severity?.values || [];
                            const idx = labels.indexOf(lv);
                            return idx >= 0 ? vals[idx] : 0;
                          }),
                          backgroundColor: COLORS[i] + "99",
                          borderColor: COLORS[i], borderWidth: 1, borderRadius: 3,
                        })),
                      }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#9AA8B2", boxWidth: 12 } } }, scales: { x: { grid: { display: false }, ticks: tickOpts }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                    </div>
                  </ChartCard>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: WEAPON ANALYSIS
        ══════════════════════════════════════ */}
        {activeTab === "Weapon Analysis" && (
          <div className="space-y-6">
            {/* Weapon selector */}
            <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-3">Select Weapon & Filter by City</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <label className="text-xs text-[#9AA8B2] uppercase tracking-wider mb-1 block">Weapon</label>
                  <SingleSelect
                    options={filters?.weapons || []}
                    value={selWeapon}
                    onChange={handleWeaponChange}
                    placeholder="Choose a weapon..."
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9AA8B2] uppercase tracking-wider mb-1 block">City (optional)</label>
                  <SingleSelect
                    options={filters?.cities || []}
                    value={weaponCity}
                    onChange={handleWeaponCity}
                    placeholder="All cities"
                  />
                </div>
                {selWeapon && (
                  <div className="flex items-end pb-0.5">
                    <span className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 rounded-xl text-orange-300 text-xs font-medium">
                      🔍 Analysing: {selWeapon}{weaponCity ? ` in ${weaponCity}` : ""}
                    </span>
                  </div>
                )}
              </div>
              {!selWeapon && (
                <p className="text-[#9AA8B2] text-sm mt-3">Select a weapon to see which crimes it's used in, which cities, what times, and severity patterns.</p>
              )}
            </div>

            {weaponLoad && (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[#9AA8B2] text-sm">Analysing weapon data...</p>
              </div>
            )}

            {weaponData && !weaponLoad && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#0F1A26] border border-orange-500/30 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-orange-400">{weaponData.total?.toLocaleString()}</p>
                    <p className="text-xs text-[#9AA8B2] mt-1">Total Incidents</p>
                  </div>
                  <div className="bg-[#0F1A26] border border-red-500/30 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-red-400">{weaponData.avg_severity}</p>
                    <p className="text-xs text-[#9AA8B2] mt-1">Avg Severity</p>
                  </div>
                  <div className="bg-[#0F1A26] border border-blue-500/30 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-blue-400">{weaponData.categories?.labels?.[0] || "—"}</p>
                    <p className="text-xs text-[#9AA8B2] mt-1">Top Crime Type</p>
                  </div>
                  <div className="bg-[#0F1A26] border border-purple-500/30 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-purple-400">{weaponData.cities?.labels?.[0] || "—"}</p>
                    <p className="text-xs text-[#9AA8B2] mt-1">Most Affected City</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Crime categories */}
                  <ChartCard title={`Crime Types — ${selWeapon}`} subtitle="Which crimes this weapon is used in most">
                    <div style={{ height: 280 }}>
                      <Bar data={{ labels: weaponData.categories?.labels || [], datasets: [{ label: "Incidents", data: weaponData.categories?.values || [], backgroundColor: (weaponData.categories?.labels || []).map((_, i) => COLORS[i % COLORS.length] + "99"), borderRadius: 4 }] }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()}` } } }, scales: { x: { grid: { display: false }, ticks: { ...tickOpts, maxRotation: 30 } }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                    </div>
                  </ChartCard>

                  {/* Cities */}
                  <ChartCard title={`Cities — ${selWeapon}`} subtitle="Where this weapon appears most">
                    <div style={{ height: 280 }}>
                      <Bar data={{ labels: weaponData.cities?.labels || [], datasets: [{ label: "Incidents", data: weaponData.cities?.values || [], backgroundColor: "rgba(249,115,22,0.7)", borderColor: "#f97316", borderWidth: 1, borderRadius: 4 }] }}
                        options={{ indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: gridOpts, ticks: tickOpts }, y: { grid: { display: false }, ticks: tickOpts } } }} />
                    </div>
                  </ChartCard>

                  {/* Time of day */}
                  <ChartCard title={`Time of Day — ${selWeapon}`} subtitle="When this weapon is used most">
                    <div style={{ height: 220 }}>
                      <Doughnut data={{ labels: weaponData.time_of_day?.labels || [], datasets: [{ data: weaponData.time_of_day?.values || [], backgroundColor: ["#3C3489", "#3B82F6", "#9AA8B2", "#64748B"], borderWidth: 0 }] }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#9AA8B2", boxWidth: 10, padding: 10 } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()}` } } } }} />
                    </div>
                  </ChartCard>

                  {/* Day of week */}
                  <ChartCard title={`Day of Week — ${selWeapon}`} subtitle="Which days see this weapon used most">
                    <div style={{ height: 220 }}>
                      <Bar data={{ labels: weaponData.day_of_week?.labels || [], datasets: [{ label: "Incidents", data: weaponData.day_of_week?.values || [], backgroundColor: "rgba(168,85,247,0.7)", borderColor: "#a855f7", borderWidth: 1, borderRadius: 4 }] }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: tickOpts }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                    </div>
                  </ChartCard>
                </div>

                {/* Severity */}
                <ChartCard title={`Severity Distribution — ${selWeapon}`} subtitle="How severe are crimes involving this weapon">
                  <div style={{ height: 200 }}>
                    <Bar data={{ labels: weaponData.severity?.labels || [], datasets: [{ label: "Count", data: weaponData.severity?.values || [], backgroundColor: ["rgba(34,197,94,0.7)", "rgba(59,130,246,0.7)", "rgba(245,158,11,0.7)", "rgba(249,115,22,0.7)", "rgba(239,68,68,0.7)"], borderRadius: 4 }] }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()}` } } }, scales: { x: { grid: { display: false }, ticks: tickOpts }, y: { grid: gridOpts, ticks: tickOpts } } }} />
                  </div>
                </ChartCard>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
