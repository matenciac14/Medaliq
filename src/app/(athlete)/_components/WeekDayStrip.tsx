'use client'

import { cn } from '@/lib/utils'
import { WEEK_DAYS_SHORT, SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import type { WeekDayCell } from './week_day_cells'

export type { WeekDayCell }

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  cells: WeekDayCell[]
  /** Index of the selected day (0-6). Activates selection state. */
  selectedIdx?: number
  /** Called when a cell is clicked. */
  onCellClick?: (idx: number) => void
  /** 'cards' = dashboard tall-card style; 'grid' = plan/gym compact 7-col grid; 'dots' = Figma mobile simple circles */
  variant?: 'cards' | 'grid' | 'dots'
  /** Today's weekday index (0=Mon). Enables past/future awareness in dots variant. */
  todayIdx?: number
  className?: string
}

const DOT_DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function WeekDayStrip({ cells, selectedIdx, onCellClick, variant = 'cards', todayIdx, className }: Props) {
  if (variant === 'dots') {
    return (
      <div className={cn('grid grid-cols-7 gap-1', className)}>
        {cells.map(cell => (
          <DotCell
            key={cell.idx}
            cell={cell}
            todayIdx={todayIdx ?? -1}
            isSelected={selectedIdx === cell.idx}
            onClick={onCellClick ? () => onCellClick(cell.idx) : undefined}
          />
        ))}
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div className={cn('flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-7 sm:overflow-visible', className)}>
        {cells.map(cell => (
          <DashboardCard
            key={cell.idx}
            cell={cell}
            isSelected={selectedIdx === cell.idx}
            onClick={onCellClick ? () => onCellClick(cell.idx) : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-7 divide-x divide-gray-200', className)}>
      {cells.map(cell => (
        <GridCell
          key={cell.idx}
          cell={cell}
          isSelected={selectedIdx === cell.idx}
          onClick={onCellClick ? () => onCellClick(cell.idx) : undefined}
        />
      ))}
    </div>
  )
}

// ── Dashboard card variant ─────────────────────────────────────────────────────

function DashboardCard({ cell, isSelected = false, onClick }: { cell: WeekDayCell; isSelected?: boolean; onClick?: () => void }) {
  const { isToday, done, sessionType, label, durationMin, zoneTarget } = cell
  const isRest = sessionType === 'DESCANSO'
  const hasSession = !!sessionType && !isRest
  const emoji = SESSION_ICONS[sessionType ?? ''] ?? (isRest ? '😴' : null)
  const sessionName = label ?? SESSION_NAMES[sessionType ?? '']

  // Priority: today (navy) > selected (orange) > done (green) > default
  const isInverted = isToday || (done && hasSession && !isSelected)

  const barColor = isToday ? 'bg-[#ea580c]'
    : isSelected ? 'bg-[#ea580c]'
    : done && !isRest ? 'bg-[#22c55e]'
    : hasSession ? 'bg-gray-300'
    : 'bg-[#99a4b5]'

  const cardBg = isToday
    ? 'bg-[#1e3a5f]'
    : isSelected ? 'bg-orange-50 ring-2 ring-[#ea580c]/20'
    : done && hasSession ? 'bg-[#22c55e]'
    : hasSession ? 'bg-white border border-gray-200'
    : 'bg-[#f5f7fa]'

  const dayColor = isInverted ? 'text-white/80'
    : isSelected ? 'text-[#ea580c]'
    : 'text-gray-400'

  const numColor = isInverted ? 'text-white'
    : isSelected ? 'text-[#ea580c]'
    : 'text-gray-900'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={cn('rounded-2xl flex-shrink-0 w-[104px] sm:w-auto flex flex-col min-h-[130px] overflow-hidden text-left', cardBg, onClick && 'cursor-pointer')}
    >
      <div className={cn('h-[3px] w-full', barColor)} />

      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-start justify-between gap-1">
          <span className={cn('text-xs font-medium leading-none', dayColor)}>
            {WEEK_DAYS_SHORT[cell.idx]}
          </span>
          {done && hasSession && !isSelected && <span className="text-white text-xs leading-none">✓</span>}
          {isToday && (
            <span className="text-[10px] font-bold bg-[#ea580c] text-white px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">HOY</span>
          )}
        </div>
        <span className={cn('text-xl font-black leading-none', numColor)}>{cell.dateNum}</span>
        {emoji ? (
          <span className="text-xl leading-none mt-1">{emoji}</span>
        ) : !sessionType && (
          <span className={cn('text-xl leading-none mt-1', isToday ? 'text-[#ea580c]' : 'text-gray-400')}>+</span>
        )}
        <span className={cn('text-xs font-semibold leading-tight mt-auto',
          isInverted ? 'text-white'
          : isSelected ? 'text-gray-700'
          : isRest ? 'text-gray-400'
          : !sessionType ? 'text-gray-400'
          : 'text-gray-700'
        )}>
          {sessionName ?? (isToday ? 'Registrar →' : (!sessionType ? 'Sin sesión' : null))}
        </span>
        {hasSession && durationMin > 0 && (
          <span className={cn('text-[10px] leading-none', isInverted ? 'text-white/70' : 'text-gray-400')}>
            {durationMin} min{zoneTarget && zoneTarget !== 'N/A' && sessionType !== 'FUERZA' ? ` · ${zoneTarget}` : ''}
          </span>
        )}
      </div>
    </Wrapper>
  )
}

// ── Figma mobile dot variant ──────────────────────────────────────────────────

function DotCell({ cell, todayIdx, isSelected, onClick }: { cell: WeekDayCell; todayIdx: number; isSelected?: boolean; onClick?: () => void }) {
  const { isToday, done, sessionType } = cell
  const hasSession = !!sessionType && sessionType !== 'DESCANSO'
  const isPast = todayIdx >= 0 && cell.idx < todayIdx
  const isFuture = todayIdx >= 0 && cell.idx > todayIdx
  const isPastUnlogged = isPast && hasSession && !done
  const Wrapper = onClick ? 'button' : 'div'

  const dotBg = done && hasSession ? 'bg-[#22c55e] text-white'
    : isToday ? 'bg-white border-2 border-[#ea580c] text-[#ea580c]'
    : isPastUnlogged ? 'bg-[#fff7ed] border-2 border-[#f97316] text-[#f97316]'
    : hasSession ? 'bg-[#1e3a5f] text-white'
    : 'bg-gray-100 text-gray-400'

  const dotContent = done && hasSession ? '✓'
    : isPastUnlogged ? '!'
    : hasSession ? (SESSION_ICONS[sessionType!] ?? '·')
    : '·'

  return (
    <Wrapper onClick={onClick} className={cn('flex flex-col items-center gap-1.5 py-1', isFuture && hasSession && 'opacity-40')}>
      <span className={cn('text-xs font-semibold',
        isToday ? 'text-[#ea580c] font-bold' : isSelected ? 'text-[#1e3a5f] font-bold' : 'text-gray-400'
      )}>
        {DOT_DAY_LETTERS[cell.idx]}
      </span>
      <div className={cn(
        'w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-sm font-bold',
        dotBg,
        isSelected && !isToday && !isPastUnlogged && 'ring-2 ring-[#1e3a5f]/40',
      )}>
        {dotContent}
      </div>
    </Wrapper>
  )
}

// ── Plan / Gym grid cell variant ───────────────────────────────────────────────

function GridCell({ cell, isSelected, onClick }: { cell: WeekDayCell; isSelected: boolean; onClick?: () => void }) {
  const { isToday, done, sessionType, durationMin, zoneTarget } = cell
  const isRest = sessionType === 'DESCANSO'
  const hasSession = !!sessionType && !isRest
  const sessionName = SESSION_NAMES[sessionType ?? ''] ?? cell.label
  const emoji = SESSION_ICONS[sessionType ?? ''] ?? (isRest ? '😴' : null)
  const isInverted = isToday || (done && hasSession && !isSelected)

  const barColor = isToday ? 'bg-[#ea580c]'
    : isSelected ? 'bg-[#ea580c]'
    : done && !isRest ? 'bg-[#22c55e]'
    : hasSession ? 'bg-gray-300'
    : 'bg-[#99a4b5]'

  const cardBg = isToday
    ? 'bg-[#1e3a5f]'
    : isSelected ? 'bg-orange-50 hover:bg-orange-100'
    : done && hasSession ? 'bg-[#22c55e]'
    : hasSession ? 'bg-white border border-gray-200'
    : 'bg-[#f5f7fa] hover:bg-gray-100'

  const dayColor = isInverted ? 'text-white/80'
    : isSelected ? 'text-[#ea580c]'
    : 'text-gray-400'

  const numColor = isInverted ? 'text-white'
    : isSelected ? 'text-[#ea580c]'
    : 'text-gray-900'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={cn('relative flex flex-col py-3.5 px-3 text-left transition-colors', cardBg, onClick && 'cursor-pointer')}
    >
      <div className={cn('absolute top-0 left-0 right-0 h-[3px]', barColor)} />

      <div className="flex items-start justify-between gap-1 mb-1">
        <span className={cn('text-xs font-medium leading-none', dayColor)}>
          {WEEK_DAYS_SHORT[cell.idx]}
        </span>
        {done && hasSession && !isSelected && <span className="text-white text-xs leading-none">✓</span>}
        {isToday && (
          <span className="text-[10px] font-bold bg-[#ea580c] text-white px-1.5 py-0.5 rounded-full leading-none">HOY</span>
        )}
      </div>

      <span className={cn('text-xl font-black leading-none', numColor)}>{cell.dateNum}</span>

      {emoji ? (
        <span className="text-xl leading-none mt-1">{emoji}</span>
      ) : !sessionType && (
        <span className={cn('text-xl leading-none mt-1', isToday ? 'text-[#ea580c]' : 'text-gray-400')}>+</span>
      )}

      <span className={cn('text-xs font-semibold leading-tight mt-auto',
        isInverted ? 'text-white'
        : isSelected ? 'text-gray-700'
        : isRest ? 'text-gray-400'
        : !sessionType ? 'text-gray-400'
        : 'text-gray-700'
      )}>
        {isRest ? 'Descanso' : (sessionName ?? (isToday ? 'Registrar →' : (!sessionType ? 'Sin sesión' : null)))}
      </span>

      {hasSession && durationMin > 0 && (
        <span className={cn('text-[10px] leading-none', isInverted ? 'text-white/70' : 'text-gray-400')}>
          {durationMin} min{zoneTarget && zoneTarget !== 'N/A' && sessionType !== 'FUERZA' ? ` · ${zoneTarget}` : ''}
        </span>
      )}
    </Wrapper>
  )
}
