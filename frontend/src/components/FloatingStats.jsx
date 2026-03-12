import { motion } from 'framer-motion';

export default function FloatingStats({ total = 0, hotspots = 0, avgSeverity = 0 }){
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-3 rounded-md shadow-card-dark w-48">
      <div className="text-xs text-muted">Overview</div>
      <div className="flex items-center justify-between mt-2">
        <div>
          <div className="text-lg font-semibold">{total}</div>
          <div className="text-xs text-muted">Total Points</div>
        </div>

        <div>
          <div className="text-lg font-semibold">{hotspots}</div>
          <div className="text-xs text-muted">Hotspots</div>
        </div>
      </div>
      <div className="mt-3 text-sm">
        <div className="text-xs text-muted">Avg. severity</div>
        <div className="text-white font-medium">{avgSeverity.toFixed(2)}</div>
      </div>
    </motion.div>
  )
}
