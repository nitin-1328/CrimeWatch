import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet.heat";
import API from "../api/axios";
import Navbar from "../components/Navbar";

function HeatLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heatPoints = points.map((p) => [p[0], p[1], p[2] || 0.5]);

    const heatLayer = window.L.heatLayer(heatPoints, {
      radius: 30,
      blur: 20,
      maxZoom: 17,
      minOpacity: 0.5,
      gradient: {
        0.2: "#00ff00",
        0.4: "#ffff00",
        0.6: "#ff8000",
        0.8: "#ff0000",
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [points]);

  return null;
}

export default function Heatmap() {
  const [heatPoints, setHeatPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadHeatmap() {
    try {
      const res = await API.get("/incidents/heatmap");
      setHeatPoints(res.data.heatmap || []);
    } catch (err) {
      alert("Failed to load heatmap");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadHeatmap();
  }, []);

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-900 text-gray-200 p-4">
        <div className="max-w-6xl mx-auto">

          {/* Page Heading */}
          <h1 className="text-3xl font-bold mb-2">Crime Heatmap</h1>
          <p className="text-gray-400 mb-6">
            Visual representation of crime intensity across mapped regions.
            Hotter areas indicate higher crime density.
          </p>

          {/* Loading Skeleton */}
          {loading && (
            <div className="text-center text-gray-400">Loading heatmap...</div>
          )}

          {/* Map Container */}
          {!loading && (
            <div className="rounded-xl overflow-hidden border border-gray-700 shadow-xl">
              <MapContainer
                center={[19.0760, 72.8777]}
                zoom={6}
                style={{ height: "80vh", width: "100%" }}
                className="rounded-xl"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap"
                />
                <HeatLayer points={heatPoints} />
              </MapContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
