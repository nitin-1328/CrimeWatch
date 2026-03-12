export default function HeatmapLegend(){
  return (
    <div className="absolute top-6 right-6 w-40 bg-card p-3 rounded-md shadow-card-dark">
      <h5 className="text-sm font-semibold text-white mb-2">Heatmap Legend</h5>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Low</span>
        <div className="flex-1 mx-2 h-2 rounded bg-gradient-to-r from-green-400 via-yellow-400 to-red-500" />
        <span>High</span>
      </div>
      <div className="mt-2 text-xs text-muted">Colors indicate relative density.</div>
    </div>
  )
}
