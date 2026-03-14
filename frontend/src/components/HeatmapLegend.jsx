// HeatmapLegend.jsx
export default function HeatmapLegend() {
  return (
    <div className="absolute top-4 right-4 z-[1000] w-44 bg-[#0F1A26]/90 backdrop-blur border border-white/10 p-3 rounded-xl shadow-xl">
      <h5 className="text-sm font-semibold text-white mb-2">Heatmap Legend</h5>
      <div className="flex items-center justify-between text-xs text-[#9AA8B2]">
        <span>Low</span>
        <div className="flex-1 mx-2 h-2 rounded bg-gradient-to-r from-green-400 via-yellow-400 to-red-500" />
        <span>High</span>
      </div>
      <div className="mt-2 text-xs text-[#9AA8B2]">
        Colors indicate relative density.
      </div>
    </div>
  );
}