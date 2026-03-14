// FloatingStats.jsx
export default function FloatingStats({ total, hotspots, avgSeverity }) {
  return (
    <div className="flex gap-3">
      <div className="bg-[#0F1A26]/90 backdrop-blur border border-white/10
                      rounded-xl px-4 py-2 text-center min-w-[90px]">
        <p className="text-xl font-bold text-white">
          {total.toLocaleString()}
        </p>
        <p className="text-xs text-[#9AA8B2]">Total Points</p>
      </div>

      <div className="bg-[#0F1A26]/90 backdrop-blur border border-white/10
                      rounded-xl px-4 py-2 text-center min-w-[90px]">
        <p className="text-xl font-bold text-red-400">
          {hotspots.toLocaleString()}
        </p>
        <p className="text-xs text-[#9AA8B2]">Hotspots</p>
      </div>

      <div className="bg-[#0F1A26]/90 backdrop-blur border border-white/10
                      rounded-xl px-4 py-2 text-center min-w-[90px]">
        <p className="text-xl font-bold text-yellow-400">
          {(avgSeverity * 5).toFixed(1)}
        </p>
        <p className="text-xs text-[#9AA8B2]">Avg Severity</p>
      </div>
    </div>
  );
}