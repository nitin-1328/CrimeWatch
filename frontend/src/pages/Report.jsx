// Report.jsx
import { useState } from "react";
import API from "../api/axios";
import { mlAPI, getErrorMessage } from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";

// ── Progress bar ───────────────────────────────────
function ProgressBar({ step, total }) {
  const percent = ((step - 1) / (total - 1)) * 100;
  return (
    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
      <motion.div
        className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-500"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

// ── Step indicator dots ────────────────────────────
function StepDots({ step, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${i + 1 === step
              ? "w-6 h-2 bg-blue-500"
              : i + 1 < step
                ? "w-2 h-2 bg-blue-500/60"
                : "w-2 h-2 bg-white/20"
            }`}
        />
      ))}
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#9AA8B2] uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Input styles ───────────────────────────────────
const inputCls =
  "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white " +
  "placeholder-white/20 text-sm focus:outline-none focus:border-blue-500 " +
  "focus:ring-1 focus:ring-blue-500/30 transition";

// ── Success screen ─────────────────────────────────
function SuccessScreen({ category, onReset }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500
                   flex items-center justify-center mx-auto mb-5"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="#34D399"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          />
        </svg>
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2">Report Submitted!</h2>
      <p className="text-[#9AA8B2] mb-2">
        Thank you — the community will be notified.
      </p>

      {category && (
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border
                        border-blue-500/20 rounded-xl px-4 py-2 mt-2 mb-6">
          <span className="text-xs text-[#9AA8B2]">AI predicted category:</span>
          <span className="text-sm font-semibold text-blue-400">{category}</span>
        </div>
      )}

      <button
        onClick={onReset}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
                   rounded-xl font-medium transition-all"
      >
        Report Another
      </button>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────
export default function Report() {
  const TOTAL_STEPS = 3;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [predicted, setPredicted] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCategory, setAiCategory] = useState(null);

  const [form, setForm] = useState({
    description: "",
    latitude: "",
    longitude: "",
    victim_age: "",
    victim_gender: "",
    weapon_used: "",
  });

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  // ── Auto-fill location from browser ───────────────
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("latitude", pos.coords.latitude.toFixed(6));
        update("longitude", pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      () => {
        alert("Could not get location. Please enter manually.");
        setGeoLoading(false);
      }
    );
  };

  // ── AI category prediction ─────────────────────────
  const handleAIPredict = async () => {
    if (!form.description.trim()) return;
    setAiLoading(true);
    try {
      const res = await mlAPI.predictCategory(form.description);
      setAiCategory(res.data.category);
    } catch {
      // silently fail
    }
    setAiLoading(false);
  };

  // ── Submit ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post("/incidents/report", {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        victim_age: form.victim_age ? parseInt(form.victim_age) : null,
      });
      setPredicted(res.data.predicted_category);
      setSuccess(true);
    } catch (err) {
      alert(getErrorMessage(err));
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setSuccess(false);
    setStep(1);
    setAiCategory(null);
    setPredicted(null);
    setForm({
      description: "", latitude: "", longitude: "",
      victim_age: "", victim_gender: "", weapon_used: "",
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 bg-[#0B1220] px-4">
      <div className="w-full max-w-xl bg-[#0F1A26] border border-white/10
                      rounded-2xl shadow-2xl p-8">

        {success ? (
          <SuccessScreen category={predicted} onReset={handleReset} />
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">Report an Incident</h1>
              <p className="text-sm text-[#9AA8B2] mt-1">
                Step {step} of {TOTAL_STEPS}
              </p>
              <div className="mt-4">
                <ProgressBar step={step} total={TOTAL_STEPS} />
                <StepDots step={step} total={TOTAL_STEPS} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">

                {/* ── Step 1: Description ── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <Field label="Crime Description">
                      <textarea
                        required
                        rows={5}
                        value={form.description}
                        onChange={(e) => update("description", e.target.value)}
                        placeholder="Describe what happened in detail..."
                        className={inputCls}
                      />
                    </Field>

                    {/* AI Predict button */}
                    {form.description.length > 10 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleAIPredict}
                          disabled={aiLoading}
                          className="text-xs px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30
                                     border border-purple-500/30 text-purple-300 rounded-lg transition"
                        >
                          {aiLoading ? "Predicting..." : "✨ AI Predict Category"}
                        </button>
                        {aiCategory && (
                          <span className="text-xs bg-blue-500/10 border border-blue-500/20
                                           text-blue-400 px-3 py-1.5 rounded-lg">
                            {aiCategory}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Step 2: Location + Victim ── */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Location */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#9AA8B2] uppercase tracking-wide">
                        Location
                      </span>
                      <button
                        type="button"
                        onClick={handleGeolocate}
                        disabled={geoLoading}
                        className="text-xs px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30
                                   border border-blue-500/30 text-blue-300 rounded-lg transition"
                      >
                        {geoLoading ? "Getting location..." : "📍 Use My Location"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Latitude">
                        <input
                          required
                          value={form.latitude}
                          onChange={(e) => update("latitude", e.target.value)}
                          placeholder="28.7041"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Longitude">
                        <input
                          required
                          value={form.longitude}
                          onChange={(e) => update("longitude", e.target.value)}
                          placeholder="77.1025"
                          className={inputCls}
                        />
                      </Field>
                    </div>

                    {/* Victim info */}
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Victim Age">
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={form.victim_age}
                          onChange={(e) => update("victim_age", e.target.value)}
                          placeholder="Optional"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Gender">
                        <select
                          value={form.victim_gender}
                          onChange={(e) => update("victim_gender", e.target.value)}
                          className={inputCls}
                        >
                          <option value="">Select</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="X">Other</option>
                        </select>
                      </Field>
                    </div>

                    <Field label="Weapon Used">
                      <input
                        value={form.weapon_used}
                        onChange={(e) => update("weapon_used", e.target.value)}
                        placeholder="Knife, Firearm, None..."
                        className={inputCls}
                      />
                    </Field>
                  </motion.div>
                )}

                {/* ── Step 3: Review ── */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-base font-semibold text-white">
                      Review your report
                    </h3>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4
                                    space-y-3 text-sm">
                      {[
                        { label: "Description", value: form.description },
                        { label: "Location", value: `${form.latitude}, ${form.longitude}` },
                        { label: "Victim Age", value: form.victim_age || "N/A" },
                        { label: "Gender", value: form.victim_gender || "N/A" },
                        { label: "Weapon", value: form.weapon_used || "N/A" },
                        { label: "AI Category", value: aiCategory || "Will be predicted" },
                      ].map((row) => (
                        <div key={row.label} className="flex gap-3">
                          <span className="text-[#9AA8B2] w-28 shrink-0">
                            {row.label}
                          </span>
                          <span className="text-white break-words flex-1">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-[#9AA8B2]">
                      Please verify all details before submitting.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Navigation buttons ── */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${step === 1
                      ? "invisible"
                      : "bg-white/5 hover:bg-white/10 text-[#9AA8B2] border border-white/10"
                    }`}
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                             text-white text-sm font-semibold rounded-xl transition-all
                             hover:shadow-lg hover:shadow-blue-500/20"
                >
                  {step < TOTAL_STEPS
                    ? "Next →"
                    : submitting
                      ? "Submitting..."
                      : "Submit Report"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}