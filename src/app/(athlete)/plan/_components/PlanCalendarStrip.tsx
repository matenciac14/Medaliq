'use client'

import { WEEK_DAYS_SHORT, SESSION_NAMES } from '@/lib/constants/sessions'
import type { CalendarWeek } from '@/domain/calendar/calendar.types'
import { calendarDaysToWeekCells, type WeekDayCell } from '../../_components/week_day_cells'
import WeekDayStrip from '../../_components/WeekDayStrip'
import type { PlanWeek } from '../_lib/plan.types'
import { jsToWeekIdx } from '@/lib/core/date_utils'

export default function PlanCalendarStrip({ week, calendarDays, weekMonday, selectedDow, todayDow, isCurrentWeek, onSelect, loggedIds }: {
  week: PlanWeek | null
  calendarDays: CalendarWeek['days'] | null
  weekMonday: Date
  selectedDow: number
  todayDow: number
  isCurrentWeek: boolean
  onSelect: (dow: number) => void
  loggedIds: Set<string>
}) {
  const todayWeekIdx = jsToWeekIdx(new Date().getDay())
  const selectedIdx = selectedDow - 1

  // Build cells — calendarDaysToWeekCells is the source of truth when data is available
  let cells: WeekDayCell[]

  if (calendarDays && calendarDays.length > 0) {
    const baseCells = calendarDaysToWeekCells(calendarDays, isCurrentWeek ? todayWeekIdx : -1)
    // Apply optimistic loggedIds overlay: if the sport sessionId is in loggedIds, mark done
    cells = baseCells.map(cell => {
      if (cell.done) return cell
      const calDay = calendarDays.find(d => d.weekIdx === cell.idx)
      const sportSessionId = calDay?.sport?.sessionId ?? null
      if (sportSessionId && loggedIds.has(sportSessionId)) {
        return { ...cell, done: true }
      }
      return cell
    })
  } else {
    // Fallback: build from week.sessions when calendarDays is not yet loaded
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
    <div>
      {/* Mobile: segmented progress bar + day pills */}
      <div className="sm:hidden">
        {/* Segmented progress bar — green per completed day */}
        <div className="flex gap-[3px] mb-2">
          {cells.map(cell => {
            const hasSession = !!cell.sessionType && cell.sessionType !== 'DESCANSO'
            const isDone = cell.done && hasSession
            return (
              <div
                key={`bar-${cell.idx}`}
                className={`h-[3px] flex-1 rounded-full ${isDone ? 'bg-[#22c55e]' : 'bg-[#d1d5db]'}`}
              />
            )
          })}
        </div>
        <div className="flex justify-between py-3">
          {cells.map(cell => {
            const hasSession = !!cell.sessionType && cell.sessionType !== 'DESCANSO'
            const isSelected = selectedIdx === cell.idx
            return (
              <button
                key={cell.idx}
                onClick={() => onSelect(cell.idx + 1)}
                className="flex flex-col items-center gap-1"
              >
                <span className={`text-xs font-semibold ${
                  cell.isToday ? 'text-[#ea580c]'
                  : isSelected ? 'text-[#1e3a5f]'
                  : 'text-gray-400'
                }`}>
                  {WEEK_DAYS_SHORT[cell.idx]}
                </span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  cell.isToday ? 'bg-[#ea580c] text-white'
                  : cell.done && hasSession ? 'bg-[#22c55e] text-white'
                  : isSelected ? 'border-2 border-[#1e3a5f] text-[#1e3a5f] bg-white'
                  : hasSession ? 'bg-[#1e3a5f] text-white'
                  : 'bg-[#f1f5f9] text-gray-400 border border-[#cbd5e1]'
                }`}>
                  {cell.done && hasSession && !cell.isToday ? '✓' : cell.dateNum}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop: unified WeekDayStrip — grid variant matches Figma WeekSection */}
      <div className="hidden sm:block">
        <WeekDayStrip
          cells={cells}
          selectedIdx={selectedIdx}
          onCellClick={(idx) => onSelect(idx + 1)}
        />
      </div>
    </div>
  )
}
