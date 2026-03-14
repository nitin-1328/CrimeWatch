// HeatmapFilters.jsx
import { useState } from 'react';

export default function HeatmapFilters({ onApply, onReset, initial }) {
  const [types, setTypes] = useState(initial?.types || []);
  const [timeRange, setTimeRange] = useState(initial?.timeRange || '7d');
  const [severity, setSeverity] = useState(initial?.severity || 1);

  const CRIME_TYPES = ['Assault', 'Theft', 'Burglary', 'Vandalism', 'Other'];

  const toggleType = (t) => {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleApply = () => {
    onApply({
      types,
      timeRange,
      severity: Number(severity), // ensure number, not string
    });
  };

  const handleReset = () => {
    setTypes([]);
    setTimeRange('7d');
    setSeverity(1);
    onReset && onReset();
  };

  return (
    <aside className="w-72 shrink-0 bg-[#0F1A26] rounded-xl p-5 space-y-5 border border-white/10">
      <h4 className="text-white font-semibold text-base">Filters</h4>

      {/* Crime Type */}
      <div>
        <label className="text-xs text-[#9AA8B2] uppercase tracking-wide">
          Crime Type
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CRIME_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${types.includes(t)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white/10 text-[#9AA8B2] hover:bg-white/20'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
        {types.length > 0 && (
          <p className="text-xs text-blue-400 mt-2">
            {types.length} type{types.length > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Time Range */}
      <div>
        <label className="text-xs text-[#9AA8B2] uppercase tracking-wide">
          Time Range
        </label>
        <select
          className="mt-2 w-full bg-white/10 border border-white/10 text-white
                     rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Severity Slider */}
      <div>
        <label className="text-xs text-[#9AA8B2] uppercase tracking-wide">
          Minimum Severity
        </label>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
          className="w-full mt-2 accent-blue-500"
        />
        <div className="flex justify-between text-xs text-[#9AA8B2] mt-1">
          <span>1 (Low)</span>
          <span className="text-white font-semibold">{severity} / 5</span>
          <span>5 (High)</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleApply}
          className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700
                     text-white text-sm font-semibold transition-all"
        >
          Apply
        </button>
        <button
          onClick={handleReset}
          className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20
                     text-[#9AA8B2] text-sm transition-all border border-white/10"
        >
          Reset
        </button>
      </div>
    </aside>
  );
}