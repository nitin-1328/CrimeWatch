import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axios from "../api/axios";
import {
  Line,
  Bar
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement
);

export default function Analytics() {
  const [trend, setTrend] = useState(null);
  const [cities, setCities] = useState(null);

  useEffect(() => {
    axios.get("/analytics/monthly_trend").then((res) => setTrend(res.data));
    axios.get("/analytics/top_cities").then((res) => setCities(res.data));
  }, []);

  return (
    <>
      <Navbar />

      <div className="min-h-screen px-8 py-10 bg-gray-900 text-white">

        <h1 className="text-4xl font-bold mb-8">Analytics Dashboard</h1>

        {/* Monthly Trend */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-xl mb-10">
          <h2 className="text-xl font-semibold mb-4">Monthly Crime Trend + Forecast</h2>

          {trend && (
            <Line
              data={{
                labels: [...trend.historical.labels, ...trend.forecast.labels],
                datasets: [
                  {
                    label: "Historical",
                    data: trend.historical.values,
                    borderColor: "skyblue",
                    tension: 0.3,
                  },
                  {
                    label: "Forecast",
                    data: [
                      ...Array(trend.historical.values.length).fill(null),
                      ...trend.forecast.values
                    ],
                    borderColor: "orange",
                    borderDash: [5, 5],
                    tension: 0.3,
                  },
                ],
              }}
            />
          )}
        </div>

        {/* Top Cities */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Top 10 Cities by Crime Count</h2>

          {cities && (
            <Bar
              data={{
                labels: cities.labels,
                datasets: [
                  {
                    label: "Crime Count",
                    data: cities.values,
                    backgroundColor: "rgb(34,197,94)",
                  },
                ],
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
