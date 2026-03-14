// Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";

const FEATURES = [
  { to: "/heatmap", title: "Crime Heatmap", desc: "Visualize areas with high crime intensity using real-time heat data.", icon: "🗺️", hoverBorder: "hover:border-green-500", hoverText: "group-hover:text-green-400" },
  { to: "/saferoute", title: "Safe Route Finder", desc: "Find the safest path between two locations using crime-aware routing.", icon: "🛡️", hoverBorder: "hover:border-blue-500", hoverText: "group-hover:text-blue-400" },
  { to: "/report", title: "Report Incident", desc: "Help the community stay safe by reporting suspicious or criminal activity.", icon: "📋", hoverBorder: "hover:border-yellow-500", hoverText: "group-hover:text-yellow-400" },
  { to: "/analytics", title: "Analytics", desc: "Explore crime trends, forecasts, and city-wise breakdowns.", icon: "📊", hoverBorder: "hover:border-purple-500", hoverText: "group-hover:text-purple-400" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    axios.get("/analytics/summary")
      .then(res => {
        setSummary(res.data);
        // Build city snapshot from top_cities
        const labels = res.data.top_cities?.labels || [];
        const values = res.data.top_cities?.values || [];
        const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-blue-400", "bg-purple-400"];
        setCities(labels.slice(0, 5).map((city, i) => ({
          city, count: values[i] || 0, color: colors[i],
        })));
        setLoading(false);
      })
      .catch(() => {
        // Fallback to individual endpoints
        Promise.all([
          axios.get("/analytics/severity_stats").catch(() => null),
          axios.get("/analytics/top_cities").catch(() => null),
        ]).then(([sevRes, citiesRes]) => {
          const sevVals = sevRes?.data?.values || [];
          const labels = citiesRes?.data?.labels || [];
          const values = citiesRes?.data?.values || [];
          const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-blue-400", "bg-purple-400"];
          setSummary({
            meta: {
              total_records: sevVals.reduce((a, b) => a + b, 0),
              high_risk_zones: (sevVals[3] || 0) + (sevVals[4] || 0),
              cities_covered: labels.length,
              case_closure_rate: 0,
            }
          });
          setCities(labels.slice(0, 5).map((city, i) => ({ city, count: values[i] || 0, color: colors[i] })));
          setLoading(false);
        });
      });
  }, []);

  const meta = summary?.meta || {};
  const sevVals = summary?.severity_stats?.values || [];
  const high = meta.high_risk_zones || (sevVals[3] || 0) + (sevVals[4] || 0);
  const medium = (sevVals[2] || 0);
  const low = (sevVals[0] || 0) + (sevVals[1] || 0);
  const total = meta.total_records || 0;
  const maxCity = cities[0]?.count || 1;

  // Live alerts based on top cities from real data
  const alerts = cities.slice(0, 3).map((c, i) => ({
    color: i === 0 ? "bg-red-500" : i === 1 ? "bg-orange-400" : "bg-green-400",
    text: i === 0 ? `High activity reported in ${c.city}` :
      i === 1 ? `Suspicious activity in ${c.city} area` :
        `Monitoring ${c.city} — ${c.count.toLocaleString()} incidents`,
  }));

  return (
    <div className="min-h-screen bg-[#0B1220] text-gray-200 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-4xl font-bold text-white">CrimeWatch Dashboard</h1>
            <p className="text-[#9AA8B2] mt-1">
              Monitor crime-prone areas, view heatmaps, get safe routes, and report incidents.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-semibold text-blue-400">
              {time.toLocaleTimeString()}
            </p>
            <p className="text-sm text-[#9AA8B2]">
              {time.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Stats — all from live API */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Records", value: loading ? "..." : total.toLocaleString(), color: "text-blue-400" },
            { label: "High Crime Zones", value: loading ? "..." : high.toLocaleString(), color: "text-red-400" },
            { label: "Medium Risk Zones", value: loading ? "..." : medium.toLocaleString(), color: "text-yellow-400" },
            { label: "Low Risk Zones", value: loading ? "..." : low.toLocaleString(), color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#0F1A26] border border-white/10 rounded-2xl p-5 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-[#9AA8B2] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(f => (
            <button key={f.to} onClick={() => navigate(f.to)}
              className={`bg-[#0F1A26] border border-white/10 p-6 rounded-2xl shadow-lg text-left transition-all duration-200 group hover:bg-white/5 ${f.hoverBorder} hover:shadow-xl hover:-translate-y-1`}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h2 className={`text-base font-semibold text-white mb-2 transition-colors ${f.hoverText}`}>{f.title}</h2>
              <p className="text-[#9AA8B2] text-sm leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>

        {/* Alerts + City Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Live Alerts */}
          <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Live Crime Alerts</h2>
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />Live
              </span>
            </div>
            <ul className="space-y-3">
              {(alerts.length ? alerts : [
                { color: "bg-red-500", text: "Loading alerts..." },
                { color: "bg-orange-400", text: "Loading alerts..." },
                { color: "bg-green-400", text: "Loading alerts..." },
              ]).map((a, i) => (
                <li key={i} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${a.color}`} />
                  {a.text}
                </li>
              ))}
            </ul>
          </div>

          {/* City Snapshot — from live API */}
          <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Cities Snapshot</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-6 bg-white/5 rounded-full animate-pulse" />
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {cities.map(c => (
                  <li key={c.city} className="flex items-center gap-3">
                    <span className="text-sm text-[#9AA8B2] w-24 shrink-0">{c.city}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full ${c.color}`}
                        style={{ width: `${(c.count / maxCity) * 100}%` }} />
                    </div>
                    <span className="text-xs text-[#9AA8B2] w-14 text-right">
                      {c.count.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => navigate("/analytics")}
              className="mt-5 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-[#9AA8B2] hover:text-white transition border border-white/10">
              View full analytics →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
