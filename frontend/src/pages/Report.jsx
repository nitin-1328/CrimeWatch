import { useState } from "react";
import API from "../api/axios";
import { motion } from "framer-motion";

const Step = ({ children }) => (
  <div className="space-y-4">{children}</div>
);

function ProgressBar({ step }) {
  const percent = ((step - 1) / 2) * 100;
  return (
    <div className="w-full bg-bg/40 rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-2 bg-gradient-to-r from-primary to-accent"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

export default function Report() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    description: "",
    latitude: "",
    longitude: "",
    victim_age: "",
    victim_gender: "",
    weapon_used: "",
  });

  function update(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function handleFinalSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post("/incidents/report", {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        victim_age: form.victim_age ? parseInt(form.victim_age) : null,
      });
      setSuccess(true);
    } catch (err) {
      // show inline error — keep UX simple
      alert("Failed to submit report. Try again.");
    }
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card p-8 rounded-2xl shadow-card-dark text-center">
          <motion.svg width="96" height="96" viewBox="0 0 24 24" className="mx-auto mb-4">
            <motion.circle cx="12" cy="12" r="10" stroke="#34D399" strokeWidth="2" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
            <motion.path d="M7 13l3 3 7-7" stroke="#34D399" strokeWidth="2" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.5 }} />
          </motion.svg>
          <h2 className="text-2xl font-semibold mb-2">Report submitted</h2>
          <p className="text-muted mb-4">Thank you — the community will be notified.</p>
          <button onClick={() => { setSuccess(false); setForm({ description: "", latitude: "", longitude: "", victim_age: "", victim_gender: "", weapon_used: "" }); setStep(1); }} className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-md">Report another</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-12 bg-bg">
      <div className="w-full max-w-xl p-6 bg-card rounded-2xl shadow-card-dark border border-bg/60">
        <h1 className="text-2xl font-semibold mb-4">Report an Incident</h1>
        <ProgressBar step={step} />

        <form onSubmit={step === 3 ? handleFinalSubmit : (e) => { e.preventDefault(); setStep((s) => Math.min(3, s+1)); }} className="mt-6">
          {step === 1 && (
            <Step>
              <label className="block text-sm text-muted">Crime Description</label>
              <textarea required value={form.description} onChange={(e) => update('description', e.target.value)} className="w-full p-3 bg-bg/30 rounded-md border border-bg/50" rows={5} />
            </Step>
          )}

          {step === 2 && (
            <Step>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted">Latitude</label>
                  <input required value={form.latitude} onChange={(e) => update('latitude', e.target.value)} className="w-full p-2 bg-bg/30 rounded-md border border-bg/50" />
                </div>
                <div>
                  <label className="text-sm text-muted">Longitude</label>
                  <input required value={form.longitude} onChange={(e) => update('longitude', e.target.value)} className="w-full p-2 bg-bg/30 rounded-md border border-bg/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="text-sm text-muted">Victim Age</label>
                  <input type="number" value={form.victim_age} onChange={(e) => update('victim_age', e.target.value)} className="w-full p-2 bg-bg/30 rounded-md border border-bg/50" />
                </div>

                <div>
                  <label className="text-sm text-muted">Gender</label>
                  <select value={form.victim_gender} onChange={(e) => update('victim_gender', e.target.value)} className="w-full p-2 bg-bg/30 rounded-md border border-bg/50">
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-2">
                <label className="text-sm text-muted">Weapon Used</label>
                <input value={form.weapon_used} onChange={(e) => update('weapon_used', e.target.value)} placeholder="Knife, Gun, None..." className="w-full p-2 bg-bg/30 rounded-md border border-bg/50" />
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step>
              <h3 className="text-lg font-semibold">Review</h3>
              <div className="space-y-2 text-sm text-muted">
                <div><strong>Description:</strong> {form.description}</div>
                <div><strong>Location:</strong> {form.latitude}, {form.longitude}</div>
                <div><strong>Victim:</strong> {form.victim_age || 'N/A'} / {form.victim_gender || 'N/A'}</div>
                <div><strong>Weapon:</strong> {form.weapon_used || 'N/A'}</div>
              </div>
            </Step>
          )}

          <div className="flex items-center justify-between mt-6">
            <div>
              {step > 1 && <button type="button" onClick={() => setStep((s) => Math.max(1, s-1))} className="px-4 py-2 bg-bg/50 rounded-md text-muted">Back</button>}
            </div>

            <div>
              {step < 3 && <button type="submit" className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-md">Next</button>}
              {step === 3 && <button type="submit" disabled={submitting} className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-md">{submitting ? 'Submitting...' : 'Submit Report'}</button>}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
            {/* Submit Button */}
