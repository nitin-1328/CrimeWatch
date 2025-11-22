import { useState } from "react";
import API from "../api/axios";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";

export default function Report() {
  const [form, setForm] = useState({
    description: "",
    latitude: "",
    longitude: "",
    victim_age: "",
    victim_gender: "",
    weapon_used: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const updateForm = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submitReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await API.post("/incidents/report", {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        victim_age: form.victim_age ? parseInt(form.victim_age) : null,
      });

      setMsg("Incident successfully reported!");
      setForm({
        description: "",
        latitude: "",
        longitude: "",
        victim_age: "",
        victim_gender: "",
        weapon_used: "",
      });
    } catch (err) {
      setMsg("Error submitting incident!");
    }

    setLoading(false);
  };

  return (
    <>
      <Navbar />

      <motion.div
        className="min-h-screen flex justify-center items-start pt-16 bg-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-xl border border-gray-700"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
        >
          <h1 className="text-3xl font-semibold mb-6 text-blue-400">
            Report an Incident
          </h1>

          {msg && (
            <p className="mb-4 text-center text-lg text-green-400">{msg}</p>
          )}

          <form onSubmit={submitReport} className="space-y-4">
            <div>
              <label className="text-gray-300">Crime Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={updateForm}
                className="w-full p-3 bg-gray-900 text-gray-200 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500"
                rows="4"
                required
              ></textarea>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300">Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={form.latitude}
                  onChange={updateForm}
                  className="w-full p-3 bg-gray-900 text-gray-200 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-gray-300">Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={form.longitude}
                  onChange={updateForm}
                  className="w-full p-3 bg-gray-900 text-gray-200 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300">Victim Age</label>
                <input
                  type="number"
                  name="victim_age"
                  value={form.victim_age}
                  onChange={updateForm}
                  className="w-full p-3 bg-gray-900 text-gray-200 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-300">Gender</label>
                <select
                  name="victim_gender"
                  value={form.victim_gender}
                  onChange={updateForm}
                  className="w-full p-3 bg-gray-900 text-gray-200 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-gray-300">Weapon Used</label>
              <input
                name="weapon_used"
                value={form.weapon_used}
                onChange={updateForm}
                className="w-full p-3 bg-gray-900 text-gray-200 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500"
                placeholder="Knife, Gun, None, Unknown..."
              />
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 transition rounded-lg text-white font-semibold text-lg shadow-md"
            >
              {loading ? "Submitting..." : "Submit Report"}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </>
  );
}
