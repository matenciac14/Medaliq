'use client'

import { cn } from '@/lib/utils'
import { WEEK_DAYS_SHORT } from '@/lib/constants/sessions'
import { jsToWeekIdx } from '@/lib/core/date_utils'
import type { CalendarWeek } from '@/domain/calendar/calendar.types'
import { calendarDaysToWeekCells, type WeekDayCell } from '../../_components/week_day_cells'
import { SESSION_NAMES } from '@/lib/constants/sessions'
import type { PlanWeek } from '../_lib/plan.types'

interface MobileDayPillsProps {
  calWeek: CalendarWeek | null
  week: PlanWeek | null
  weekMonday: Date
  isCurrentWeek: boolean
  todayDow: number
  selectedDow: number
  loggedIds: Set<string>
  onSelect: (dow: number) => void
}

export default function MobileDayPills({
  calWeek, week, weekMonday, isCurrentWeek,
  todayDow, selectedDow, loggedIds, onSelect,
}: MobileDayPillsProps) {
  const todayWeekIdx = jsToWeekIdx(new Date().getDay())
  const selectedIdx = selectedDow - 1

  let cells: WeekDayCell[]

  if (calWeek?.days && calWeek.days.length > 0) {
    const baseCells = calendarDaysToWeekCells(calWeek.days, isCurrentWeek ? todayWeekIdx : -1)
    cells = baseCells.map(cell => {
      if (cell.done) return cell
      const calDay = calWeek.days.find(d => d.weekIdx === cell.idx)
      const sportSessionId = calDay?.sport?.sessionId ?? null
      if (sportSessionId && loggedIds.has(sportSessionId)) {
        return { ...cell, done: true }
      }
      return cell
    })
  } else {
    cells = Array.from({ length: 7 }, (_, i) => {
      const dow = i + 1
      const session = week?.sessions.find(s => s.dayOfWeek === dow) ?? null
      const dateObj = new Date(weekMonday.getTime() + i * 86400000)
      const isToday = isCurrentWeek && i === todayWeekIdx
      const isRest = !session || session.type === 'DESCANSO'
      const isDone = (session?.done || (session ? loggedIds.has(session.id) : false)) ?? false
      return {
        idx: i,
        dateNum: dateObj.getDate(),
        isToday,
        sessionType: session ? session.type : null,
        done: isDone,
        durationMin: session?.durationMin ?? 0,
        zoneTarget: session?.zoneTarget ?? '',
        label: session && !isRest
          ? (session.label || SESSION_NAMES[session.type] || session.type)
          : null,
        hasGym: false,
      } as WeekDayCell
    })
  }

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Segmented progress bar */}
      <div className="flex gap-[3px] mb-2">
        {cells.map(cell => {
          const hasSession = !!cell.sessionType && cell.sessionType !== 'DESCANSO'
          const isDone = cell.done && hasSession
          return (
            <div key={`bar-${cell.idx}`} className={`h-[3px] flex-1 rounded-full ${isDone ? 'bg-[#22c55e]' : 'bg-[#d1d5db]'}`} />
          )
        })}
      </div>
      <div className="flex justify-between py-3">
        {cells.map(cell => {
          const hasSession = !!cell.sessionType && cell.sessionType !== 'DESCANSO'
          const isSelected = selectedIdx === cell.idx
          return (
            <button key={cell.idx} onClick={() => onSelect(cell.idx + 1)} className="flex flex-col items-center gap-1">
              <span className={cn('text-xs font-semibold',
                cell.isToday ? 'text-[#ea580c]' : isSelected ? 'text-[#1e3a5f]' : 'text-gray-400'
              )}>
                {WEEK_DAYS_SHORT[cell.idx]}
              </span>
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                cell.isToday ? 'bg-[#ea580c] text-white' :
                cell.done && hasSession ? 'bg-[#22c55e] text-white' :
                isSelected ? 'border-2 border-[#1e3a5f] text-[#1e3a5f] bg-white' :
                hasSession ? 'bg-[#1e3a5f] text-white' :
                'bg-[#f1f5f9] text-gray-400 border border-[#cbd5e1]'
              )}>
                {cell.done && hasSession && !cell.isToday ? '\u2713' : cell.dateNum}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
