'use client'

import { cn } from '@/lib/utils'
import type { PlanWeek as PlanClientWeek } from '../_lib/plan.types'

export const PHASES_ORDER = ['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO']

const PHASE_COLORS: Record<string, string> = {
  BASE: '#3b82f6', DESARROLLO: '#22c55e', ESPECIFICO: '#f97316', AFINAMIENTO: '#ef4444',
}
const PHASE_LABELS: Record<string, string> = {
  BASE: 'Base', DESARROLLO: 'Desarrollo', ESPECIFICO: 'Específico', AFINAMIENTO: 'Afinamiento',
}
const PHASE_LABELS_GYM: Record<string, string> = {
  BASE: 'Adaptación', DESARROLLO: 'Volumen', ESPECIFICO: 'Intensidad', AFINAMIENTO: 'Pico',
}

export default function PhaseBar({ allPhases, currentPhase, currentWeekNum, totalWeeks, weeks, isGymPlan }: {
  allPhases: string[]; currentPhase: string; currentWeekNum: number; totalWeeks: number; weeks: PlanClientWeek[]; isGymPlan?: boolean
}) {
  // Always show all 4 phases — highlight those present in the plan
  const display = PHASES_ORDER
  const pct = Math.round((currentWeekNum / totalWeeks) * 100)
  const activeIdx = display.indexOf(currentPhase)
  const labels = isGymPlan ? PHASE_LABELS_GYM : PHASE_LABELS

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-900">Progreso del plan</span>
        <span className="text-xs text-gray-400">Sem. {currentWeekNum}/{totalWeeks} · {pct}%</span>
      </div>
      {/* Phase pills — Figma style */}
      <div className="flex gap-2">
        {display.map((phase, idx) => {
          const isActive = idx === activeIdx
          const isDone = idx < activeIdx
          const count = weeks.filter(w => w.phase === phase).length || 1
          const color = PHASE_COLORS[phase] ?? '#9ca3af'
          const shortLabel = (labels[phase] ?? phase).length > 8
            ? (labels[phase] ?? phase).slice(0, 7) + '.'
            : labels[phase] ?? phase
          const pillStyle = isActive || isDone
            ? { flex: count, backgroundColor: color }
            : { flex: count }
          return (
            <div
              key={phase}
              style={pillStyle}
              className={cn(
                'py-2 rounded-lg text-center text-xs font-semibold transition-colors',
                isActive && 'text-white',
                isDone && 'text-white opacity-70',
                !isActive && !isDone && 'border border-gray-200 text-gray-400',
              )}
            >
              {isDone ? '✓ ' : ''}{shortLabel}
            </div>
          )
        })}
      </div>
    </div>
  )
}
