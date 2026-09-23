'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import type { CalendarWeek, CalendarDay } from '@/domain/calendar/calendar.types'
import { calendarDaysToWeekCells, type WeekDayCell } from './week_day_cells'
import WeekDayStrip from './WeekDayStrip'
import { jsToWeekIdx } from '@/lib/core/date_utils'
import { SESSION_ICONS, SESSION_NAMES, WEEK_DAYS_SHORT } from '@/lib/constants/sessions'


interface Props {
  weekOffset: number
  /** Dashboard mode — determines detail card behavior */
  dashboardMode?: 'TRAINING' | 'RECOVERY' | 'FREE' | 'GYM'
  /** Athlete first name for CTA fallback */
  firstName?: string
  /** Week label for mobile header (e.g. "10–16 ago") */
  weekLabel?: string
  /** Registration/session count for mobile header */
  mobileCount?: string
  /** B2B athlete — shows COACH badge in session detail */
  isB2B?: boolean
  /** Plan phase display name (e.g. "BASE", "BUILD") — for BadgesRow */
  planPhase?: string | null
  /** Current plan week number — for BadgesRow */
  planWeekNum?: number | null
  /** Total plan weeks — for BadgesRow */
  planTotalWeeks?: number | null
  /** Coach name — for B2B BadgesRow */
  coachName?: string | null
  /** Pre-computed calendar week from server — eliminates client-side fetch flash */
  initialCalendarWeek?: CalendarWeek | null
}

export default function DashboardCalendarStrip({ weekOffset, dashboardMode = 'FREE', firstName = '', weekLabel = '', mobileCount = '', isB2B = false, planPhase = null, planWeekNum = null, planTotalWeeks = null, coachName = null, initialCalendarWeek = null }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const todayWeekIdx = jsToWeekIdx(new Date().getDay())
  const isCurrentWeek = weekOffset === 0

  function navigateWeek(delta: number) {
    const next = weekOffset + delta
    router.push(next === 0 ? pathname : `${pathname}?weekOffset=${next}`)
  }

  // Initialize from server data when available — eliminates the "zeros flash"
  const hasInitialData = !!initialCalendarWeek
  const initialCells = hasInitialData
    ? calendarDaysToWeekCells(initialCalendarWeek.days, isCurrentWeek ? todayWeekIdx : -1)
    : Array.from({ length: 7 }, (_, idx) => ({
        idx, dateNum: 0, isToday: isCurrentWeek && idx === todayWeekIdx,
        sessionType: null, done: false, durationMin: 0, zoneTarget: '',
        label: null, hasGym: false,
      }))
  const initialStats = hasInitialData
    ? (() => {
        const training = initialCells.filter(c => c.sessionType && c.sessionType !== 'DESCANSO')
        return { completed: training.filter(c => c.done).length, total: training.length }
      })()
    : { completed: 0, total: 0 }
  const initialSelectedIdx = hasInitialData
    ? (isCurrentWeek ? todayWeekIdx : (() => { const i = initialCells.findIndex(c => c.sessionType && c.sessionType !== 'DESCANSO'); return i >= 0 ? i : 0 })())
    : null

  const [cells, setCells] = useState<WeekDayCell[]>(initialCells)
  const [days, setDays] = useState<CalendarDay[]>(initialCalendarWeek?.days ?? [])
  const [loading, setLoading] = useState(!hasInitialData)
  const [stats, setStats] = useState(initialStats)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(initialSelectedIdx)
  // Track which weekOffset has been initialized server-side to skip redundant fetch
  const [initializedOffset] = useState(hasInitialData ? weekOffset : null)

  useEffect(() => {
    // Skip client fetch if server already provided data for this weekOffset
    if (weekOffset === initializedOffset) return

    setLoading(true)
    fetch(`/api/athlete/calendar?weekOffset=${weekOffset}`)
      .then(r => r.json())
      .then((week: CalendarWeek) => {
        const todayIdx = isCurrentWeek ? todayWeekIdx : -1
        const nextCells = calendarDaysToWeekCells(week.days, todayIdx)
        setCells(nextCells)
        setDays(week.days)

        const training = nextCells.filter(c => c.sessionType && c.sessionType !== 'DESCANSO')
        setStats({
          completed: training.filter(c => c.done).length,
          total: training.length,
        })

        if (isCurrentWeek) {
          setSelectedIdx(todayIdx)
        } else {
          const firstWithSession = nextCells.findIndex(c => c.sessionType && c.sessionType !== 'DESCANSO')
          setSelectedIdx(firstWithSession >= 0 ? firstWithSession : 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [weekOffset, initializedOffset])

  const progressPct = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

  // Find the CalendarDay for the selected index
  const selectedDay = selectedIdx !== null && days.length > 0
    ? days.find(d => d.weekIdx === selectedIdx) ?? null
    : null

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {/* Mobile: day pills — no card wrapper, full width, matches plan page */}
      <div className="sm:hidden py-3">
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
                onClick={() => setSelectedIdx(cell.idx)}
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
        {/* Mobile: session detail for selected day */}
        {selectedDay && (
          <MobileSelectedDayCard day={selectedDay} isToday={selectedIdx === todayWeekIdx && isCurrentWeek} />
        )}
      </div>
      {/* Desktop: progress bar + rich card columns */}
      <div className="hidden sm:block">
        {/* Progress bar — green fill proportional to completed sessions (Figma Barra-Progreso) */}
        {stats.total > 0 && (
          <div className="h-[3px] rounded-full bg-gray-200 mb-2">
            <div
              className="h-[3px] rounded-full bg-[#22c55e] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
        <WeekDayStrip
          cells={cells}
          variant="cards"
          selectedIdx={selectedIdx ?? undefined}
          onCellClick={setSelectedIdx}
        />
      </div>
      {/* Detail card — desktop only */}
      <div className="hidden sm:block">
        {selectedDay && (
          <SelectedDayDetail
            day={selectedDay}
            dashboardMode={dashboardMode}
            firstName={firstName}
            completedCount={stats.completed}
            totalSessions={stats.total}
            isB2B={isB2B}
            planPhase={planPhase}
            planWeekNum={planWeekNum}
            planTotalWeeks={planTotalWeeks}
            coachName={coachName}
          />
        )}
      </div>
    </div>
  )
}

// ── Detail card for selected day ──────────────────────────────────────────────

function SelectedDayDetail({ day, dashboardMode, firstName, completedCount, totalSessions, isB2B = false, planPhase = null, planWeekNum = null, planTotalWeeks = null, coachName = null }: {
  day: CalendarDay
  dashboardMode: string
  firstName: string
  completedCount: number
  totalSessions: number
  isB2B?: boolean
  planPhase?: string | null
  planWeekNum?: number | null
  planTotalWeeks?: number | null
  coachName?: string | null
}) {
  const { sport, gym, freeRun } = day
  const isRest = !!sport && sport.type === 'DESCANSO' && !gym
  const hasActiveSession = (!!sport && sport.type !== 'DESCANSO') || !!gym || !!freeRun

  // No active session (empty day or rest day without gym) — show fallback
  if (!hasActiveSession) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2.5">
        <div className="w-1 h-9 bg-[#22c55e] rounded-full shrink-0" />
        <span className="text-base">{isRest ? '😴' : '💪'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1e3a5f]">
            {isRest
              ? 'Día de descanso'
              : dashboardMode === 'FREE'
              ? `Tu espacio de entrenamiento está listo, ${firstName}`
              : 'Sin sesión programada'}
          </p>
          <p className="text-xs text-gray-500">
            {isRest
              ? 'Recuperación activa — tu cuerpo necesita este día.'
              : dashboardMode === 'FREE'
              ? 'Anota tu actividad de hoy y empieza a construir tu historial.'
              : 'Sin sesión programada para este día.'}
          </p>
        </div>
        {dashboardMode === 'FREE' && (
          <>
            <Link href="/find-coach" className="text-xs font-semibold text-[#1e3a5f] border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0">
              Conecta con un entrenador →
            </Link>
            <Link href="/gym" className="text-xs font-semibold text-white bg-[#ea580c] px-4 py-2 rounded-xl hover:bg-[#d14d07] transition-colors whitespace-nowrap shrink-0">
              Arma tu rutina →
            </Link>
          </>
        )}
      </div>
    )
  }

  // Determine primary session info
  const isGymPrimary = !!gym && (!sport || sport.type === 'DESCANSO')
  const isSportPrimary = !!sport && sport.type !== 'DESCANSO'
  const isFreeRun = !isSportPrimary && !isGymPrimary && !!freeRun

  const sessionName = isSportPrimary
    ? (sport!.detailText ?? sport!.type.replace(/_/g, ' '))
    : isGymPrimary
    ? gym!.label
    : freeRun!.type.replace(/_/g, ' ')

  const emoji = isSportPrimary
    ? (SESSION_ICONS[sport!.type] ?? '🏃')
    : isGymPrimary
    ? '💪'
    : (SESSION_ICONS[freeRun!.type] ?? '🏃')

  const durationMin = isSportPrimary
    ? sport!.durationMin
    : isGymPrimary
    ? (gym!.durationMin ?? 0)
    : (freeRun!.durationMin ?? 0)

  const done = isSportPrimary
    ? sport!.done
    : isGymPrimary
    ? gym!.done
    : true

  const rpe = isSportPrimary
    ? sport!.logRpe
    : isGymPrimary
    ? gym!.rpe
    : freeRun?.rpe ?? null

  const sessionCategory = isSportPrimary ? 'Carrera' : isGymPrimary ? 'Gym' : 'Carrera libre'

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {/* Row 1: Accent bar + emoji + name — Buttons right (Figma layout) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <div className="w-[3px] h-[50px] bg-[#1e3a5f] rounded-full shrink-0 mt-0.5" />
          <span className="text-2xl leading-none">{emoji}</span>
          <div>
            <p className="text-lg font-black text-gray-900 leading-tight">{sessionName}</p>
            {/* PillsRow */}
            <div className="flex gap-1.5 flex-wrap items-center mt-1.5">
              {durationMin > 0 && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {durationMin} min
                </span>
              )}
              {isSportPrimary && sport!.zoneTarget && sport!.zoneTarget !== 'N/A' && sport!.zoneTarget !== '—' && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  Zona {sport!.zoneTarget}
                </span>
              )}
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                {sessionCategory}
              </span>
              {rpe && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  RPE {rpe}
                </span>
              )}
              {isB2B && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#1e3a5f]">
                  👤 COACH
                </span>
              )}
              {isFreeRun && freeRun!.distanceKm && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {freeRun!.distanceKm} km
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Buttons — right-aligned */}
        <div className="flex items-center gap-2 shrink-0">
          {(isSportPrimary || isGymPrimary) && (
            <Link href={isSportPrimary ? '/plan' : '/gym'} className="text-xs font-semibold text-[#1e3a5f] border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap">
              Ver plan →
            </Link>
          )}
          {done ? (
            <span className="flex items-center gap-1 text-white text-xs font-semibold bg-[#22c55e] px-4 py-2 rounded-xl">
              <CheckCircle2 size={14} /> Completada
            </span>
          ) : (
            <Link href={isGymPrimary ? '/gym/session' : '/log/run'} className="text-xs font-semibold text-white bg-[#ea580c] px-4 py-2 rounded-xl hover:bg-[#d14d07] transition-colors whitespace-nowrap">
              Realizar sesión →
            </Link>
          )}
        </div>
      </div>
      {/* BadgesRow — phase + week + completion/coach (Figma BadgesRow) */}
      {(totalSessions > 0 || planPhase) && (
        <div className="flex gap-1.5 items-center mt-2.5 ml-[15px]">
          {planPhase && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#1e3a5f] text-white">
              Fase {planPhase}
            </span>
          )}
          {planWeekNum && planTotalWeeks && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-600">
              Semana {planWeekNum}/{planTotalWeeks}
            </span>
          )}
          {totalSessions > 0 && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-600">
              {completedCount}/{totalSessions} completadas
            </span>
          )}
          {isB2B && coachName && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-600">
              Coach: {coachName}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Mobile selected-day card (replaces TodaySessionMobile — synced with CalendarStrip) ──

function MobileSelectedDayCard({ day, isToday }: { day: CalendarDay; isToday: boolean }) {
  const { sport, gym, freeRun } = day
  const isRest = !!sport && sport.type === 'DESCANSO' && !gym
  const hasSport = !!sport && sport.type !== 'DESCANSO'
  const hasGym = !!gym
  const hasFree = !!freeRun
  const hasSession = hasSport || hasGym || hasFree

  // Rest day
  if (isRest && !hasGym) {
    return (
      <div className="bg-white rounded-[20px] p-[18px] flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <span className="text-2xl">😴</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">Día de descanso</p>
          <p className="text-sm text-gray-500 mt-0.5">Recupera bien hoy</p>
        </div>
      </div>
    )
  }

  // No session at all
  if (!hasSession) {
    return (
      <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="h-[3px] bg-[#ea580c]" />
        <div className="px-4 pt-3.5 pb-3.5 space-y-2">
          <span className="text-[10px] font-semibold text-[#ea580c] tracking-widest uppercase">
            {isToday ? '● HOY' : `● ${WEEK_DAYS_SHORT[day.weekIdx].toUpperCase()}`}
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎯</span>
            <span className="text-2xl font-black text-[#1e3a5f] tracking-tight leading-none">Sin sesión</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">Sin sesión planificada</p>
          <p className="text-xs text-gray-500">Registra tu entrenamiento</p>
          <div className="pt-2">
            <Link href="/log/run" className="block bg-[#ea580c] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
              Registrar actividad →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Determine primary session
  const isSportPrimary = hasSport
  const isGymPrimary = hasGym && !hasSport

  const sessionType = isSportPrimary ? sport!.type : isGymPrimary ? 'FUERZA' : freeRun!.type
  const sessionName = isSportPrimary
    ? (sport!.detailText ?? SESSION_NAMES[sport!.type] ?? sport!.type.replace(/_/g, ' '))
    : isGymPrimary
    ? (gym!.templateName ?? gym!.label)
    : (SESSION_NAMES[freeRun!.type] ?? freeRun!.type.replace(/_/g, ' '))

  const emoji = isSportPrimary
    ? (SESSION_ICONS[sport!.type] ?? '🏃')
    : isGymPrimary ? '💪' : (SESSION_ICONS[freeRun!.type] ?? '🏃')

  const durationMin = isSportPrimary
    ? sport!.durationMin
    : isGymPrimary ? (gym!.durationMin ?? 0) : (freeRun!.durationMin ?? 0)

  const done = isSportPrimary ? sport!.done : isGymPrimary ? gym!.done : true
  const zone = isSportPrimary ? sport!.zoneTarget : null
  const detailText = isSportPrimary ? sport!.detailText : isGymPrimary ? gym!.label : 'Sesión libre'

  const accentColor = 'bg-[#22c55e]'

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className={`h-[3px] ${accentColor}`} />
      <div className="px-4 pt-3.5 pb-3.5 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-semibold text-[#ea580c] tracking-widest uppercase">
            {isToday ? '● HOY' : `● ${WEEK_DAYS_SHORT[day.weekIdx].toUpperCase()}`}
          </span>
          {done ? (
            <span className="bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-lg">Completada</span>
          ) : zone && zone !== 'N/A' ? (
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-lg">
              Zona {zone}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{done ? '✓' : emoji}</span>
          <span className="text-2xl font-black text-[#1e3a5f] tracking-tight leading-none">
            {durationMin > 0 ? `${durationMin} min` : sessionName}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-900">{sessionName}</p>
        {detailText && (
          <p className="text-xs text-gray-500">{detailText}</p>
        )}
        <div className="pt-2">
          {done ? (
            <Link href={isGymPrimary ? '/gym/history' : '/progress'}
              className="block bg-[#1e3a5f] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
              Ver resumen →
            </Link>
          ) : (
            <Link href={isGymPrimary ? '/gym/session' : isSportPrimary ? `/log/run?sessionId=${sport!.sessionId}&type=${sport!.type}&duration=${sport!.durationMin}&zone=${sport!.zoneTarget}` : '/log/run'}
              className="block bg-[#1e3a5f] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
              {isGymPrimary ? 'Ir al Gym →' : 'Iniciar →'}
            </Link>
          )}
        </div>
        <Link href="/log/run" className="block text-center text-xs font-medium text-gray-500">
          + Agregar otra actividad
        </Link>
      </div>
    </div>
  )
}

// ── Mobile dot detail (sm:hidden viewport) ───────────────────────────────────

function MobileDotDetail({ day }: { day: CalendarDay }) {
  const { sport, gym, freeRun } = day
  const isRest = !!sport && sport.type === 'DESCANSO' && !gym
  const hasActive = (!!sport && sport.type !== 'DESCANSO') || !!gym || !!freeRun

  if (!hasActive && !isRest) return null

  const label = isRest
    ? 'Descanso'
    : sport && sport.type !== 'DESCANSO'
    ? (sport.detailText ?? sport.type.replace(/_/g, ' '))
    : gym
    ? (gym.templateName ?? gym.label)
    : freeRun!.type.replace(/_/g, ' ')

  const emoji = isRest
    ? '😴'
    : sport && sport.type !== 'DESCANSO'
    ? (SESSION_ICONS[sport.type] ?? '🏃')
    : gym
    ? '💪'
    : (SESSION_ICONS[freeRun!.type] ?? '🏃')

  const durationMin = sport && sport.type !== 'DESCANSO'
    ? sport.durationMin
    : gym
    ? (gym.durationMin ?? 0)
    : (freeRun?.durationMin ?? 0)

  const done = sport && sport.type !== 'DESCANSO'
    ? sport.done
    : gym
    ? gym.done
    : true

  const zone = sport && sport.type !== 'DESCANSO' ? sport.zoneTarget : null

  return (
    <div className="flex items-center gap-2.5 mt-3 pt-2.5 border-t border-gray-100">
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <div className="flex gap-1.5 mt-1">
          {durationMin > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
              {durationMin} min
            </span>
          )}
          {zone && zone !== 'N/A' && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
              Zona {zone}
            </span>
          )}
          {done && hasActive && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-100 text-green-600">
              ✓ Completada
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
