import { useState } from "react";
import axios from "../api/axios";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import L from "leaflet";

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function SafeRoute() {
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");

  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);

  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  // Autocomplete search
  const fetchSuggestions = async (query, type) => {
    if (query.length < 3) {
      type === "start" ? setStartSuggestions([]) : setEndSuggestions([]);
      return;
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(
      query
    )}`;

    const res = await fetch(url);
    const data = await res.json();

    if (type === "start") setStartSuggestions(data);
    else setEndSuggestions(data);
  };

  // Convert address → lat/lon
  const geocode = async (address) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        address
      )}&format=json`
    );
    const data = await res.json();
    if (!data.length) return null;

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  };

  const handleSelectSuggestion = (s, type) => {
    const full = s.display_name;

    if (type === "start") {
      setStartAddress(full);
      setStartSuggestions([]);
    } else {
      setEndAddress(full);
      setEndSuggestions([]);
    }
  };

  const getRoute = async () => {
    if (!startAddress || !endAddress) {
      alert("Please enter both addresses!");
      return;
    }

    setLoading(true);

    const start = await geocode(startAddress);
    const end = await geocode(endAddress);

    if (!start || !end) {
      alert("Could not locate one of the addresses.");
      setLoading(false);
      return;
    }

    setStartCoords(start);
    setEndCoords(end);

    try {
      const res = await axios.get(
        `/route/find?start_lat=${start.lat}&start_lon=${start.lon}&end_lat=${end.lat}&end_lon=${end.lon}`
      );

      setRoute(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching route");
    }

    setLoading(false);
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen px-6 py-8 bg-gradient-to-br from-gray-900 to-black text-gray-100">
        <h1 className="text-4xl font-extrabold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-700">
          Safe Route Finder 🚗✨
        </h1>

        {/* SEARCH CARD */}
        <motion.div
          className="max-w-3xl mx-auto bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* START ADDRESS */}
          <div className="mb-6 relative">
            <label className="text-gray-300">Start Address</label>
            <input
              type="text"
              placeholder="Enter start location"
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700"
              value={startAddress}
              onChange={(e) => {
                setStartAddress(e.target.value);
                fetchSuggestions(e.target.value, "start");
              }}
            />

            {startSuggestions.length > 0 && (
              <div className="absolute bg-gray-800 border border-gray-700 rounded-lg mt-1 w-full max-h-40 overflow-y-auto shadow-lg z-20">
                {startSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="p-2 hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleSelectSuggestion(s, "start")}
                  >
                    {s.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* END ADDRESS */}
          <div className="mb-6 relative">
            <label className="text-gray-300">Destination Address</label>
            <input
              type="text"
              placeholder="Enter destination"
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700"
              value={endAddress}
              onChange={(e) => {
                setEndAddress(e.target.value);
                fetchSuggestions(e.target.value, "end");
              }}
            />

            {endSuggestions.length > 0 && (
              <div className="absolute bg-gray-800 border border-gray-700 rounded-lg mt-1 w-full max-h-40 overflow-y-auto shadow-lg z-20">
                {endSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="p-2 hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleSelectSuggestion(s, "end")}
                  >
                    {s.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={getRoute}
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold shadow-lg hover:scale-105 transition-all"
            >
              {loading ? "Finding Route..." : "Find Safe Route"}
            </button>
          </div>
        </motion.div>

        {/* MAP */}
        {route && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <MapContainer
              center={[startCoords.lat, startCoords.lon]}
              zoom={13}
              style={{ height: "450px", width: "100%" }}
              className="rounded-xl shadow-xl"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <Marker position={[startCoords.lat, startCoords.lon]}>
                <Popup>Start</Popup>
              </Marker>

              <Marker position={[endCoords.lat, endCoords.lon]}>
                <Popup>Destination</Popup>
              </Marker>

              <Polyline
                positions={route.geometry.coordinates.map((c) => [c[1], c[0]])}
                color="lime"
                weight={5}
              />
            </MapContainer>
          </motion.div>
        )}

        {/* SAFETY ANALYSIS UI — ADDED BELOW */}
        {route && (
          <motion.div
            className="max-w-3xl mx-auto mt-10 p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-blue-400 text-center">
              Route Safety Analysis
            </h2>

            {/* Score display */}
            <div className="text-center mb-6">
              <p className="text-gray-300 text-lg">Safety Score:</p>
              <p className="text-5xl font-extrabold mt-2">
                {route.score}
              </p>

              <p className="mt-3 text-gray-400">
                {route.score === 0 &&
                  "✨ Extremely Safe – No crime incidents detected on this route."}
                {route.score > 0 &&
                  route.score <= 3 &&
                  "🟢 Low Risk – Minimal crime activity nearby."}
                {route.score > 3 &&
                  route.score <= 8 &&
                  "🟡 Moderate Risk – Some crime hotspots detected."}
                {route.score > 8 &&
                  "🔴 High Risk – Multiple crime areas detected along this route."}
              </p>
            </div>

            {/* Risk Meter */}
            <div className="w-full bg-gray-700 h-5 rounded-full overflow-hidden mb-5">
              <div
                className={`h-full transition-all duration-700 ${
                  route.score === 0
                    ? "bg-green-500"
                    : route.score <= 3
                    ? "bg-green-400"
                    : route.score <= 8
                    ? "bg-yellow-400"
                    : "bg-red-600"
                }`}
                style={{
                  width:
                    route.score === 0
                      ? "10%"
                      : route.score > 15
                      ? "100%"
                      : `${(route.score / 15) * 100}%`,
                }}
              ></div>
            </div>

            {/* Badge */}
            <div className="text-center mt-6">
              <span
                className={`px-6 py-2 rounded-full text-lg font-semibold ${
                  route.score === 0
                    ? "bg-green-600 text-white"
                    : route.score <= 3
                    ? "bg-green-500 text-white"
                    : route.score <= 8
                    ? "bg-yellow-400 text-black"
                    : "bg-red-600 text-white"
                }`}
              >
                {route.score === 0 && "Ultra Safe Route"}
                {route.score > 0 && route.score <= 3 && "Safe Route"}
                {route.score > 3 && route.score <= 8 && "Moderate Risk"}
                {route.score > 8 && "⚠ Dangerous Route"}
              </span>
            </div>

            {/* Warning Messages */}
            {route.score > 8 && (
              <p className="mt-6 text-center text-red-400 text-lg font-semibold">
                ⚠ High Level Warning: This route goes through multiple dangerous
                crime areas. Avoid if possible.
              </p>
            )}

            {route.score > 3 && route.score <= 8 && (
              <p className="mt-6 text-center text-yellow-300 text-lg">
                ⚠ Medium Risk: Be careful, especially at night.
              </p>
            )}

            {route.score <= 3 && (
              <p className="mt-6 text-center text-green-400 text-lg">
                ✓ Good Route! Only minimal crime indicators found.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </>
  );
}
