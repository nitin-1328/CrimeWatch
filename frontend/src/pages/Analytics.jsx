// Analytics.jsx
import { useEffect, useState } from "react";
import axios from "../api/axios";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement, BarElement, ArcElement,
  CategoryScale, LinearScale, PointElement,
  Tooltip, Legend, Filler
} from "chart.js";

ChartJS.register(
  LineElement, BarElement, ArcElement,
  CategoryScale, LinearScale, PointElement,
  Tooltip, Legend, Filler
);

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-[#0F1A26] border border-white/10 rounded-2xl p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-sm text-[#9AA8B2] mt-1 mb-2">{subtitle}</p>}
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

const gridOpts = { color: "rgba(255,255,255,0.05)" };
const tickOpts = { color: "#9AA8B2", font: { size: 11 } };

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Single request to get everything
    axios.get("/analytics/summary")
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => {
        // Fallback: fetch individually
        Promise.all([
          axios.get("/analytics/monthly_trend"),
          axios.get("/analytics/top_cities"),
          axios.get("/analytics/category_stats").catch(() => null),
          axios.get("/analytics/time_stats").catch(() => null),
          axios.get("/analytics/day_stats").catch(() => null),
          axios.get("/analytics/severity_stats").catch(() => null),
          axios.get("/analytics/closure_rate").catch(() => null),
        ]).then(([t, c, cat, time, day, sev, closure]) => {
          setData({
            monthly_trend: t.data,
            top_cities: c.data,
            category_stats: cat?.data,
            time_stats: time?.data,
            day_stats: day?.data,
            severity_stats: sev?.data,
            closure_rate: closure?.data,
            meta: { total_records: 0, cities_covered: 0, high_risk_zones: 0, case_closure_rate: 0 }
          });
          setLoading(false);
        });
      });
  }, []);

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

  // Compute high/medium/low from severity stats
  const sevVals = sevS?.values || [];
  const highRisk = (sevVals[3] || 0) + (sevVals[4] || 0);
  const medRisk = sevVals[2] || 0;
  const lowRisk = (sevVals[0] || 0) + (sevVals[1] || 0);

  return (
    <div className="min-h-screen px-6 py-8 bg-[#0B1220] text-white">
      <div className="max-w-7xl mx-auto space-y-8">

        <div>
          <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
          <p className="text-[#9AA8B2] mt-1">Crime trends, hotspots, and patterns across Indian cities</p>
        </div>

        {/* ── Stat Cards — all from live API ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Records"
            value={(meta.total_records || 0).toLocaleString()}
            color="text-blue-400"
          />
          <StatCard
            label="Cities Covered"
            value={`${meta.cities_covered || 0}+`}
            color="text-green-400"
          />
          <StatCard
            label="Case Closure Rate"
            value={`${meta.case_closure_rate || 0}%`}
            color="text-yellow-400"
          />
          <StatCard
            label="High Risk Zones"
            value={(meta.high_risk_zones || highRisk || 0).toLocaleString()}
            color="text-red-400"
          />
        </div>

        {/* ── Severity breakdown row ── */}
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

        {/* ── Monthly Trend + Time of Day ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard title="Monthly Crime Trend + Forecast" subtitle="Historical data with 3-month forecast">
              {trend && (
                <div style={{ height: 280 }}>
                  <Line
                    data={{
                      labels: [...trend.historical.labels, ...trend.forecast.labels],
                      datasets: [
                        {
                          label: "Historical",
                          data: trend.historical.values,
                          borderColor: "#3B82F6",
                          backgroundColor: "rgba(59,130,246,0.08)",
                          tension: 0.4, fill: true, pointRadius: 2,
                        },
                        {
                          label: "Forecast",
                          data: [...Array(trend.historical.values.length).fill(null), ...trend.forecast.values],
                          borderColor: "#F59E0B",
                          borderDash: [6, 4],
                          backgroundColor: "rgba(245,158,11,0.08)",
                          tension: 0.4, fill: true,
                          pointRadius: 4, pointBackgroundColor: "#F59E0B",
                        },
                      ],
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { labels: { color: "#9AA8B2", boxWidth: 12 } } },
                      scales: {
                        x: { grid: gridOpts, ticks: tickOpts },
                        y: { grid: gridOpts, ticks: tickOpts },
                      },
                    }}
                  />
                </div>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Crime by Time of Day" subtitle="When crimes happen most">
            <div style={{ height: 280 }}>
              <Doughnut
                data={{
                  labels: timeS?.labels || [],
                  datasets: [{
                    data: timeS?.values || [],
                    backgroundColor: ["#3C3489", "#3B82F6", "#9AA8B2", "#64748B"],
                    borderWidth: 0,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom", labels: { color: "#9AA8B2", boxWidth: 10, padding: 10 } },
                    tooltip: {
                      callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()}`
                      }
                    }
                  },
                }}
              />
            </div>
          </ChartCard>
        </div>

        {/* ── Top Cities + Categories ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Top 10 Cities by Crime Count" subtitle="Most affected cities">
            {cities && (
              <div style={{ height: 320 }}>
                <Bar
                  data={{
                    labels: cities.labels,
                    datasets: [{
                      label: "Crime Count",
                      data: cities.values,
                      backgroundColor: "rgba(59,130,246,0.7)",
                      borderColor: "#3B82F6",
                      borderWidth: 1, borderRadius: 4,
                    }],
                  }}
                  options={{
                    indexAxis: "y", responsive: true, maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x.toLocaleString()}` } }
                    },
                    scales: {
                      x: { grid: gridOpts, ticks: tickOpts },
                      y: { grid: { display: false }, ticks: tickOpts },
                    },
                  }}
                />
              </div>
            )}
          </ChartCard>

          <ChartCard title="Crime by Category" subtitle="Distribution of crime types">
            <div style={{ height: 320 }}>
              <Bar
                data={{
                  labels: cats?.labels || [],
                  datasets: [{
                    label: "Count",
                    data: cats?.values || [],
                    backgroundColor: [
                      "rgba(239,68,68,0.7)", "rgba(245,158,11,0.7)",
                      "rgba(34,197,94,0.7)", "rgba(59,130,246,0.7)",
                      "rgba(168,85,247,0.7)", "rgba(20,184,166,0.7)",
                      "rgba(249,115,22,0.7)", "rgba(100,116,139,0.7)",
                    ],
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()}` } }
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { ...tickOpts, maxRotation: 30 } },
                    y: { grid: gridOpts, ticks: tickOpts },
                  },
                }}
              />
            </div>
          </ChartCard>
        </div>

        {/* ── Day of Week + Severity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Crime by Day of Week" subtitle="Which days have highest activity">
            <div style={{ height: 240 }}>
              <Bar
                data={{
                  labels: dayS?.labels || [],
                  datasets: [{
                    label: "Crime Count",
                    data: dayS?.values || [],
                    backgroundColor: "rgba(168,85,247,0.7)",
                    borderColor: "#A855F7", borderWidth: 1, borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()}` } }
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: tickOpts },
                    y: { grid: gridOpts, ticks: tickOpts },
                  },
                }}
              />
            </div>
          </ChartCard>

          <ChartCard title="Crime by Severity Level" subtitle="Level 1 (low) to Level 5 (high)">
            <div style={{ height: 240 }}>
              <Bar
                data={{
                  labels: sevS?.labels || [],
                  datasets: [{
                    label: "Count",
                    data: sevS?.values || [],
                    backgroundColor: [
                      "rgba(34,197,94,0.7)", "rgba(59,130,246,0.7)",
                      "rgba(245,158,11,0.7)", "rgba(249,115,22,0.7)",
                      "rgba(239,68,68,0.7)",
                    ],
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()}` } }
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: tickOpts },
                    y: { grid: gridOpts, ticks: tickOpts },
                  },
                }}
              />
            </div>
          </ChartCard>
        </div>

        {/* ── Case Closure Rate ── */}
        <ChartCard title="Case Closure Rate by City" subtitle="Percentage of cases solved per city (top 10)">
          <div style={{ height: 260 }}>
            <Bar
              data={{
                labels: closure?.labels || [],
                datasets: [{
                  label: "Closure Rate %",
                  data: closure?.values || [],
                  backgroundColor: "rgba(20,184,166,0.7)",
                  borderColor: "#14B8A6", borderWidth: 1, borderRadius: 4,
                }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}%` } },
                },
                scales: {
                  x: { grid: { display: false }, ticks: tickOpts },
                  y: {
                    grid: gridOpts,
                    ticks: { ...tickOpts, callback: v => `${v}%` },
                    min: 40, max: 60,
                  },
                },
              }}
            />
          </div>
        </ChartCard>

      </div>
    </div>
  );
}
