import { useState } from 'react';

export default function HeatmapFilters({ onApply, onReset, initial }) {
  const [types, setTypes] = useState(initial?.types || []);
  const [timeRange, setTimeRange] = useState(initial?.timeRange || '7d');
  const [severity, setSeverity] = useState(initial?.severity || 1);

  const toggleType = (t) => {
    setTypes((s) => (s.includes(t) ? s.filter(x => x !== t) : [...s, t]));
  };

  return (
    <aside className="w-80 bg-card rounded-md p-4 space-y-4">
      <h4 className="text-white font-semibold">Filters</h4>

      <div>
        <label className="text-sm text-muted">Crime Type</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {['Assault','Theft','Burglary','Vandalism','Other'].map(t => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-3 py-1 rounded-full text-sm transition ${types.includes(t) ? 'bg-gradient-to-r from-primary to-accent text-white' : 'bg-bg/50 text-muted hover:bg-bg/70'}`}
            >{t}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-muted">Time Range</label>
        <select className="mt-2 w-full form-select bg-bg/40" value={timeRange} onChange={e => setTimeRange(e.target.value)}>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-muted">Minimum Severity</label>
        <input type="range" min="1" max="5" value={severity} onChange={e => setSeverity(e.target.value)} className="w-full mt-2" />
        <div className="text-sm text-muted mt-1">{severity} / 5</div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={() => onApply({ types, timeRange, severity })} className="flex-1 py-2 rounded-md bg-gradient-to-r from-primary to-accent text-white">Apply</button>
        <button onClick={() => { setTypes([]); setTimeRange('7d'); setSeverity(1); onReset && onReset(); }} className="flex-1 py-2 rounded-md bg-bg/60 text-muted border border-bg/50">Reset</button>
      </div>
    </aside>
  )
}
