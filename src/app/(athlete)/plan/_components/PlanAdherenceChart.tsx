'use client'

import { cn } from '@/lib/utils'
import type { PlanWeek as PlanClientWeek } from '../_lib/plan.types'

const DAY_LABELS_COMPACT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function AdherenceChart({ weeks, currentWeekNum, selectedWeekNum, totalWeeks, todayDow, loggedIds }: {
  weeks: PlanClientWeek[]; currentWeekNum: number; selectedWeekNum?: number; totalWeeks: number; todayDow: number; loggedIds: Set<string>
}) {
  const weekNum = selectedWeekNum ?? currentWeekNum
  const isCurrentWeek = weekNum === currentWeekNum
  const currentWeek = weeks.find(w => w.weekNumber === weekNum)

  // Empty state — no sessions for this week
  if (!currentWeek || currentWeek.sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-bold text-gray-900">Adherencia semanal</span>
          <span className="text-xs text-gray-400">Sin datos</span>
        </div>
        <div className="flex gap-1.5">
          {DAY_LABELS_COMPACT.map(d => (
            <div key={d} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-[22px] rounded-md bg-gray-100" />
              <span className="text-[10px] font-medium text-gray-400">{d}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const dow = i + 1
    const session = currentWeek.sessions.find(s => s.dayOfWeek === dow)
    const isRest = !session || session.type === 'DESCANSO'
    const isFuture = isCurrentWeek ? dow > todayDow : false
    const isToday = isCurrentWeek ? dow === todayDow : false
    const isDone = session?.done || (session?.id != null && loggedIds.has(session.id))

    let status: 'done' | 'missed' | 'rest' | 'future' | 'today'
    if (isRest) status = 'rest'
    else if (isFuture) status = 'future'
    else if (isToday && !isDone) status = 'today'
    else if (isDone) status = 'done'
    else status = 'missed'

    return { dow, label: DAY_LABELS_COMPACT[i], status }
  })

  const completedDays = days.filter(d => d.status === 'done').length
  const trainingDays = days.filter(d => d.status !== 'rest' && d.status !== 'future').length
  const pct = trainingDays > 0 ? Math.round((completedDays / trainingDays) * 100) : 0

  const statusColors: Record<string, string> = {
    done: '#22c55e', missed: '#ef4444', rest: '#e5e7eb', future: '#f3f4f6', today: '#f97316',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold text-gray-900">Adherencia semanal</span>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>
      <div className="flex gap-1.5">
        {days.map(({ dow, label, status }) => (
          <div key={dow} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-md"
              style={{ height: 22, backgroundColor: statusColors[status] }}
            />
            <span className={cn(
              'text-[10px] font-medium',
              status === 'done' ? 'text-green-600' :
              status === 'today' ? 'text-[#ea580c]' :
              'text-gray-400'
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
