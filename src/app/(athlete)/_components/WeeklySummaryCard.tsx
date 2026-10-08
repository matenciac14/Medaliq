import ProgressBar from './ui/ProgressBar'

type Props = {
  completedCount: number
  totalTraining: number
  weekSessionCount: number
  weekSessionTarget: number
  weekSessionDelta: number | null
  avgKcalPerDay: number | null
  currentVolume: number | null
  volumeDeltaPct: number | null
  variant?: 'default' | 'free'
  // Legacy — kept for caller compatibility
  lastCheckIn?: { hardestSessionRpe: number | null; energyLevel: number | null; weightKg: number | null } | null
  formCheckInDate?: string | null
}

export default function WeeklySummaryCard({
  completedCount, totalTraining,
  weekSessionDelta, avgKcalPerDay,
  currentVolume, volumeDeltaPct,
}: Props) {
  const completionPct = Math.round((completedCount / Math.max(totalTraining, 1)) * 100)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Resumen Semanal</p>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">datos de tu log</span>
      </div>

      <div className="grid grid-cols-2 gap-0">
        {/* SESIONES */}
        <div className="pr-4 border-r border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Sesiones</p>
          <div className="grid grid-cols-3 gap-1">
            <div>
              <p className="text-xl font-black text-[#1e3a5f] leading-none">{completedCount}</p>
              <p className="text-[10px] text-gray-500 mt-1">completadas</p>
            </div>
            <div>
              {weekSessionDelta != null ? (
                <p className={`text-xl font-black leading-none ${weekSessionDelta >= 0 ? 'text-[#22c55e]' : 'text-red-500'}`}>
                  {weekSessionDelta >= 0 ? '\u2191' : '\u2193'}{Math.abs(weekSessionDelta)}
                </p>
              ) : (
                <p className="text-xl font-black text-gray-300 leading-none">&mdash;</p>
              )}
              <p className="text-[10px] text-gray-500 mt-1">vs. sem. ant.</p>
            </div>
            <div>
              <p className="text-xl font-black text-[#1e3a5f] leading-none">
                {avgKcalPerDay != null ? avgKcalPerDay.toLocaleString() : '\u2014'}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">kcal/dia</p>
            </div>
          </div>
        </div>

        {/* CARGA SEMANAL */}
        <div className="pl-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Carga Semanal</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-[#1e3a5f] leading-none">{currentVolume ?? 0} km</span>
            {volumeDeltaPct != null && (
              <span className={`text-xs font-semibold ${volumeDeltaPct >= 0 ? 'text-[#22c55e]' : 'text-red-500'}`}>
                {volumeDeltaPct >= 0 ? '\u2191' : '\u2193'} {Math.abs(volumeDeltaPct)}%
              </span>
            )}
          </div>
          <ProgressBar pct={completionPct} className="mb-1" />
          <p className="text-[10px] text-gray-400 mt-1">{completionPct}% del objetivo</p>
        </div>
      </div>
    </div>
  )
}
