'use client'

import { cn } from '@/lib/utils'

export default function BodyCompositionCard({ weightData, bodyMeasures }: {
  weightData: { currentKg: number | null; goalKg: number | null; progressPct: number | null; weeklyChange: number | null } | null
  bodyMeasures?: { waistCm: number | null; hipsCm: number | null; armsCm: number | null; thighsCm: number | null } | null
}) {
  const hasData = weightData?.currentKg != null || bodyMeasures != null
  const { currentKg, goalKg, weeklyChange } = weightData ?? { currentKg: null, goalKg: null, weeklyChange: null }

  const changeBadge = weeklyChange !== null && weeklyChange !== 0
    ? {
        label: `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg/sem · ${Math.abs(weeklyChange) <= 1 ? 'ritmo ideal' : 'ritmo alto'}`,
        color: weeklyChange < 0 ? 'text-green-600' : weeklyChange > 0.5 ? 'text-red-500' : 'text-orange-500',
        bg: weeklyChange < 0 ? 'bg-green-50' : weeklyChange > 0.5 ? 'bg-red-50' : 'bg-orange-50',
      }
    : null

  const allMeasures = [
    { label: 'Cintura', value: bodyMeasures?.waistCm ?? null },
    { label: 'Cadera', value: bodyMeasures?.hipsCm ?? null },
    { label: 'Brazos', value: bodyMeasures?.armsCm ?? null },
    { label: 'Muslo', value: bodyMeasures?.thighsCm ?? null },
  ]
  const measures = allMeasures

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-900">Composición corporal</span>
        {changeBadge && (
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', changeBadge.color, changeBadge.bg)}>
            {weeklyChange! < 0 ? '↓' : '↑'} {changeBadge.label}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-black text-gray-900 tracking-tight">
          {currentKg != null ? `${currentKg} kg` : '— kg'}
        </span>
        {goalKg != null && <span className="text-xs text-gray-400">→ meta {goalKg} kg</span>}
        {!hasData && <span className="text-xs text-gray-300">Sin datos registrados</span>}
      </div>

      <div className="flex gap-2">
        {measures.map(m => (
          <div key={m.label} className="flex-1 text-center">
            <span className="text-sm font-bold text-gray-900">
              {m.value != null ? `${m.value} cm` : '— cm'}
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
