'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatWeekRange } from '@/lib/core/date_utils'
import { WEEK_DAYS_SHORT, SESSION_NAMES } from '@/lib/constants/sessions'
import type { CalendarWeek } from '@/domain/calendar/calendar.types'
import type { PlanWeekSession, PlanWeek, PlanInfo } from '../_lib/plan.types'
import { getWeekMonday, formatVolume, formatPlanName } from '../_lib/plan_helpers'
import PageTopBar from '../../_components/PageTopBar'
import WeekNavBar from '../../_components/WeekNavBar'
import MobileDayPills from './MobileDayPills'
import SessionDetailCard from './SessionDetailCard'
import PlanCalendarStrip from './PlanCalendarStrip'
import NutritionCard from './PlanNutritionCard'
import KPICards from './PlanKPICards'
import PhaseBar from './PlanPhaseBar'
import AdherenceChart from './PlanAdherenceChart'
import BodyCompositionCard from './PlanBodyCompositionCard'
import WeekStatusCard from './PlanWeekStatus'
import HRZonesCard from './PlanHRZones'
import CheckInBanner from './PlanCheckInBanner'

// ── Props ─────────────────────────────────────────────────────────────

interface PlanClientProps {
  plan: PlanInfo
  weeks: PlanWeek[]
  initialCalendarWeek?: CalendarWeek | null
  nutritionTarget: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string } | null
  weightData: { currentKg: number | null; goalKg: number | null; progressPct: number | null; weeklyChange: number | null } | null
  checkInData?: { energyLevel: number | null; sleepHours: number | null; stressLevel: number | null; motivationLevel: number | null; recordedAt: string } | null
  bodyMeasures?: { waistCm: number | null; hipsCm: number | null; armsCm: number | null; thighsCm: number | null } | null
  hrZones?: { z1: { min: number; max: number }; z2: { min: number; max: number }; z3: { min: number; max: number }; z4: { min: number; max: number }; z5: { min: number; max: number } } | null
  coachName?: string | null
  raceDays?: number | null
  pendingSuggestionsCount?: number
  todayConsumed?: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null
  isB2B?: boolean
}

// ── Skeleton for week loading ─────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="px-4 pt-4 pb-4 animate-pulse">
      <div className="flex gap-[3px] mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-[3px] flex-1 rounded-full bg-gray-200" />
        ))}
      </div>
      <div className="flex justify-between py-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-6 h-3 rounded bg-gray-200" />
            <div className="w-10 h-10 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SesionLibreCard ───────────────────────────────────────────────────

function SesionLibreCard({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const pad = variant === 'desktop' ? 'p-6 pl-5' : 'p-4'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e5eaf0] rounded-sm" />
      <div className={`${pad} space-y-3`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">📝</span>
          <h3 className="text-lg font-bold text-[#1c2b45]">Sesión libre</h3>
        </div>
        <div className="flex gap-1.5">
          <span className="bg-[#f0f1f4] text-[#6b7582] text-xs font-semibold px-2 py-[5px] rounded-[6px]">— min</span>
          <span className="bg-[#f0f1f4] text-[#6b7582] text-xs font-semibold px-2 py-[5px] rounded-[6px]">Zona 2–3</span>
          <span className="bg-[#fff1ea] text-[#ea580c] text-xs font-bold px-2 py-[5px] rounded-[6px]">Libre</span>
        </div>
        <p className="text-[10px] font-bold text-[#8c9eb2] uppercase tracking-[0.6px]">
          Registra actividad libre
        </p>
        <a
          href="/log"
          className="flex items-center justify-center w-full bg-[#ea580c] hover:opacity-90 text-white text-sm font-bold h-[42px] rounded-[10px] transition-opacity"
        >
          Registrar sesión libre →
        </a>
      </div>
    </div>
  )
}

// ── GymDayCard — detalle de sesión de gym (AssignedWorkout) ────────────

import type { CalendarDay } from '@/domain/calendar/calendar.types'
import { CheckCircle2 as CheckGym } from 'lucide-react'

function GymDayCard({ gym, isToday }: { gym: NonNullable<CalendarDay['gym']>; isToday: boolean }) {
  const accentColor = gym.done ? 'bg-green-400' : isToday ? 'bg-[#ea580c]' : 'bg-purple-500'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${accentColor}`} />
        <div className="flex-1 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏋️</span>
            <h3 className="text-xl font-black text-gray-900 leading-tight">
              {gym.label}
            </h3>
            {isToday && (
              <span className="text-[10px] font-bold bg-[#ea580c] text-white px-2 py-0.5 rounded-full">HOY</span>
            )}
            {gym.done && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                <CheckGym size={11} /> Completada
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {gym.durationMin != null && (
              <span className="text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                {gym.durationMin} min
              </span>
            )}
            <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-100">
              💪 Fuerza
            </span>
            {gym.templateName && (
              <span className="text-xs font-medium bg-gray-50 text-gray-500 px-3 py-1.5 rounded-full">
                {gym.templateName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
            {gym.done ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                <CheckGym size={16} className="text-green-500" />
                <span className="text-sm font-semibold text-green-700">Completada</span>
              </div>
            ) : (
              <a
                href="/gym/session"
                className="flex-1 flex items-center justify-center gap-2 bg-[#ea580c] hover:opacity-90 text-white text-sm font-bold px-4 py-3 rounded-xl transition-opacity whitespace-nowrap"
              >
                Iniciar sesión de gym →
              </a>
            )}
            <a
              href="/gym"
              className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Ver rutina
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PlanClient ────────────────────────────────────────────────────────

export default function PlanClient({ plan, weeks, initialCalendarWeek, nutritionTarget, weightData, checkInData, bodyMeasures, hrZones, coachName, raceDays, pendingSuggestionsCount = 0, todayConsumed, isB2B = false }: PlanClientProps) {
  const todayDow = useMemo(() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  }, [])

  const [selectedWeekNum, setSelectedWeekNum] = useState(plan.currentWeek)
  const [selectedDow, setSelectedDow] = useState(todayDow)
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set())
  function markLogged(sessionId: string) {
    setLoggedIds(prev => new Set(prev).add(sessionId))
  }

  const [editedSessions, setEditedSessions] = useState<Map<string, Partial<PlanWeekSession>>>(new Map())
  function applyEdit(sessionId: string, updates: Partial<PlanWeekSession>) {
    setEditedSessions(prev => {
      const next = new Map(prev)
      next.set(sessionId, { ...(next.get(sessionId) ?? {}), ...updates })
      return next
    })
  }

  function mergeSession(s: PlanWeekSession): PlanWeekSession {
    const overrides = editedSessions.get(s.id)
    return overrides ? { ...s, ...overrides } : s
  }

  const isCurrentWeek = selectedWeekNum === plan.currentWeek
  const week = weeks.find(w => w.weekNumber === selectedWeekNum) ?? null
  const allPhases = [...new Set(weeks.map(w => w.phase))]

  // Calendar API — use pre-hydrated data for current week, fetch for other weeks
  const weekOffset = selectedWeekNum - plan.currentWeek
  const [calWeek, setCalWeek] = useState<CalendarWeek | null>(initialCalendarWeek ?? null)
  const [calLoading, setCalLoading] = useState(false)
  useEffect(() => {
    if (weekOffset === 0) {
      setCalWeek(initialCalendarWeek ?? null)
      return
    }
    setCalLoading(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const tzParam = tz ? `&tz=${encodeURIComponent(tz)}` : ''
    fetch(`/api/athlete/calendar?weekOffset=${weekOffset}${tzParam}`)
      .then(r => r.json())
      .then(data => { setCalWeek(data); setCalLoading(false) })
      .catch(() => setCalLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  const weekMonday = useMemo(
    () => getWeekMonday(plan.currentWeek, selectedWeekNum),
    [plan.currentWeek, selectedWeekNum]
  )

  const selDateObj = new Date(weekMonday.getTime() + (selectedDow - 1) * 86400000)
  const selDayLabel = `${WEEK_DAYS_SHORT[selectedDow - 1]} ${selDateObj.getDate()}`
  const weekLabel = formatWeekRange(weekMonday)

  const selectedSession = useMemo(() => {
    const s = week?.sessions.find(s => s.dayOfWeek === selectedDow) ?? null
    return s ? mergeSession(s) : null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, selectedDow, editedSessions])

  // Gym session from calWeek (for days without a plan session)
  const selectedGym = useMemo(() => {
    if (selectedSession) return null
    return calWeek?.days.find(d => d.dow === selectedDow)?.gym ?? null
  }, [selectedSession, calWeek, selectedDow])

  // KPI — combina plan sessions + gym sessions del calWeek
  const planCompleted = week?.sessions.filter(s => (s.done || loggedIds.has(s.id)) && s.type !== 'DESCANSO').length ?? 0
  const planTraining  = week?.sessions.filter(s => s.type !== 'DESCANSO').length ?? 0

  // Gym sessions from calendar that don't overlap with plan sessions
  const gymDays = useMemo(() => {
    if (!calWeek?.days) return []
    const planDows = new Set(week?.sessions.map(s => s.dayOfWeek) ?? [])
    return calWeek.days.filter(d => d.gym && !planDows.has(d.dow))
  }, [calWeek, week])
  const gymTraining = gymDays.length
  const gymCompleted = gymDays.filter(d => d.gym?.done).length

  const completedCount = planCompleted + gymCompleted
  const totalTraining = planTraining + gymTraining
  const adherencePct: number | null = totalTraining > 0 ? Math.round((completedCount / totalTraining) * 100) : null

  // Volume & gym detection
  const isGym = plan.name.toLowerCase().includes('recomp')
    || plan.name.toLowerCase().includes('body')
    || plan.name.toLowerCase().includes('fuerza')
    || ((week?.sessions.filter(s => s.type === 'FUERZA').length ?? 0) >
        (week?.sessions.filter(s => s.type !== 'FUERZA' && s.type !== 'DESCANSO').length ?? 0))

  const volumeLabel = isGym
    ? formatVolume(week?.sessions.filter(s => (s.done || loggedIds.has(s.id)) && s.type !== 'DESCANSO').reduce((sum, s) => sum + s.durationMin, 0) ?? 0)
    : `${week?.volumeKm ?? 0} km`

  const realCurrentPhase = weeks.find(w => w.weekNumber === plan.currentWeek)?.phase ?? (week?.phase ?? 'BASE')

  // Next day session preview — crosses week boundary
  const nextDow = selectedDow < 7 ? selectedDow + 1 : 1
  const nextWeekNum = selectedDow < 7 ? selectedWeekNum : selectedWeekNum + 1
  const nextWeek = nextWeekNum !== selectedWeekNum ? weeks.find(w => w.weekNumber === nextWeekNum) : week
  const nextSession = nextWeek?.sessions.find(s => s.dayOfWeek === nextDow && s.type !== 'DESCANSO') ?? null

  function handleNextDayClick() {
    if (selectedDow < 7) {
      setSelectedDow(nextDow)
    } else if (nextWeekNum <= plan.totalWeeks) {
      setSelectedWeekNum(nextWeekNum)
      setSelectedDow(1)
    }
  }

  return (
    <>
    {/* ══════ MOBILE (< sm) — Figma 2008:203 / 2145:218 ══════ */}
    <div className="sm:hidden min-h-screen bg-[#f1f5f9]">
      {/* Header — navy gradient */}
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] pb-3 px-5 pt-[max(env(safe-area-inset-top,0px),20px)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Mi Plan</h1>
            <p className="text-xs text-white/60 mt-0.5">
              Plan {formatPlanName(plan.name)} · {plan.totalWeeks} semanas
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {isB2B && coachName && (
                <span className="inline-flex items-center gap-1.5 text-green-300 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  Diseñado por Coach {coachName}
                </span>
              )}
              {raceDays != null && raceDays > 0 && (
                <span className="inline-flex items-center gap-1 bg-[#ea580c]/80 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
                  🏃 {raceDays}d
                </span>
              )}
            </div>
          </div>
          <div className="bg-white/15 text-white px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap">
            {realCurrentPhase} · Sem {plan.currentWeek}/{plan.totalWeeks}
          </div>
        </div>

        {/* Week Nav */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white/10 rounded-xl h-10">
            <button
              onClick={() => { setSelectedWeekNum(w => Math.max(1, w - 1)); setSelectedDow(todayDow) }}
              disabled={selectedWeekNum <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="flex-1 text-sm font-semibold text-white text-center whitespace-nowrap">
              Semana {selectedWeekNum} · {weekLabel}
            </span>
            {!isCurrentWeek && (
              <button
                onClick={() => { setSelectedWeekNum(plan.currentWeek); setSelectedDow(todayDow) }}
                className="text-xs font-bold text-white bg-[#ea580c] px-3 py-1 rounded-full transition-colors hover:bg-[#d14d07]"
              >
                Hoy
              </button>
            )}
            <button
              onClick={() => { setSelectedWeekNum(w => Math.min(plan.totalWeeks, w + 1)); setSelectedDow(1) }}
              disabled={selectedWeekNum >= plan.totalWeeks}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Day Pills — with skeleton while loading */}
      {calLoading ? (
        <CalendarSkeleton />
      ) : (
        <MobileDayPills
          calWeek={calWeek}
          week={week}
          weekMonday={weekMonday}
          isCurrentWeek={isCurrentWeek}
          todayDow={todayDow}
          selectedDow={selectedDow}
          loggedIds={loggedIds}
          onSelect={setSelectedDow}
        />
      )}

      {/* Content */}
      <div className="px-4 space-y-4 pb-24">

        {/* Adjustment banner — mobile */}
        {pendingSuggestionsCount > 0 && (
          <a href="/checkin" className="block bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
            <span className="text-lg">🔄</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-800">Ajuste disponible</p>
              <p className="text-[10px] text-blue-600">
                {pendingSuggestionsCount} {pendingSuggestionsCount === 1 ? 'sugerencia' : 'sugerencias'} de tu check-in
              </p>
            </div>
            <ChevronRight size={14} className="text-blue-400 shrink-0" />
          </a>
        )}

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {selDayLabel} · Sesión del día
        </p>

        {selectedSession ? (
          <SessionDetailCard
            key={`m-${selectedSession.id}`}
            session={selectedSession}
            isToday={isCurrentWeek && selectedDow === todayDow}
            isLogged={loggedIds.has(selectedSession.id)}
            onLogged={() => markLogged(selectedSession.id)}
            onEdited={(updates) => applyEdit(selectedSession.id, updates)}
          />
        ) : selectedGym ? (
          <GymDayCard gym={selectedGym} isToday={isCurrentWeek && selectedDow === todayDow} />
        ) : (
          <SesionLibreCard variant="mobile" />
        )}

        {/* Next day preview — mobile */}
        {nextSession && (
          <button
            onClick={handleNextDayClick}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-left"
          >
            <span className="text-sm">📅</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-400">Mañana</p>
              <p className="text-xs font-bold text-gray-800 truncate">
                {nextSession.label || SESSION_NAMES[nextSession.type] || nextSession.type}
                {' · '}{nextSession.durationMin} min
              </p>
            </div>
            <ChevronRight size={14} className="text-gray-400 shrink-0" />
          </button>
        )}

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esta semana</p>

        <KPICards
          completed={completedCount}
          total={totalTraining}
          volumeLabel={volumeLabel}
          adherencePct={adherencePct}
          isGym={isGym}
        />

        <PhaseBar
          allPhases={allPhases}
          currentPhase={realCurrentPhase}
          currentWeekNum={plan.currentWeek}
          totalWeeks={plan.totalWeeks}
          weeks={weeks}
          isGymPlan={isGym}
        />

        <AdherenceChart
          weeks={weeks}
          currentWeekNum={plan.currentWeek}
          selectedWeekNum={selectedWeekNum}
          totalWeeks={plan.totalWeeks}
          todayDow={todayDow}
          loggedIds={loggedIds}
        />

        {nutritionTarget && <NutritionCard nt={nutritionTarget} consumed={todayConsumed} />}

        <BodyCompositionCard weightData={weightData} bodyMeasures={bodyMeasures} />

        <WeekStatusCard checkInData={checkInData ?? null} />

        <HRZonesCard hrZones={hrZones} />

        <CheckInBanner recordedAt={checkInData?.recordedAt ?? null} />
      </div>
    </div>

    {/* ══════ DESKTOP (sm+) ══════ */}
    <div className="hidden sm:block px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-5">

      {/* ── WeekSection card ── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <PageTopBar
          title="Mi Plan"
          subtitle={
            <span className="flex items-center gap-2 flex-wrap">
              <span>{formatPlanName(plan.name)} · {plan.totalWeeks} semanas</span>
              {isB2B && coachName && (
                <span className="inline-flex items-center gap-1.5 text-green-600 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  Diseñado por Coach {coachName}
                </span>
              )}
            </span>
          }
          center={
            <WeekNavBar
              weekLabel={weekLabel}
              canGoPrev={selectedWeekNum > 1}
              canGoNext={selectedWeekNum < plan.totalWeeks}
              onPrev={() => { setSelectedWeekNum(w => Math.max(1, w - 1)); setSelectedDow(todayDow) }}
              onNext={() => { setSelectedWeekNum(w => Math.min(plan.totalWeeks, w + 1)); setSelectedDow(1) }}
              onToday={() => { setSelectedWeekNum(plan.currentWeek); setSelectedDow(todayDow) }}
              showToday={!isCurrentWeek}
            />
          }
          right={
            <div className="flex items-center gap-2">
              {raceDays != null && raceDays > 0 && (
                <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-[20px] text-xs font-semibold whitespace-nowrap">
                  🏃 {raceDays} días
                </span>
              )}
              <span className="inline-flex items-center bg-[#1e3a5f] text-white px-3.5 py-1.5 rounded-[20px] text-xs font-semibold whitespace-nowrap">
                {realCurrentPhase} · {selectedWeekNum} / {plan.totalWeeks}
              </span>
            </div>
          }
        />

        {/* Progress bar */}
        <div className="px-5">
          <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ea580c] rounded-full transition-all duration-500"
              style={{ width: `${Math.round((plan.currentWeek / plan.totalWeeks) * 100)}%` }}
            />
          </div>
        </div>

        {/* Calendar Strip */}
        <div className="px-3 pt-3">
          <PlanCalendarStrip
            week={week}
            calendarDays={calWeek?.days ?? null}
            weekMonday={weekMonday}
            selectedDow={selectedDow}
            todayDow={todayDow}
            isCurrentWeek={isCurrentWeek}
            onSelect={setSelectedDow}
            loggedIds={loggedIds}
          />
        </div>

        {/* Footer — session count */}
        <div className="px-5 pb-3 flex justify-end">
          <span className="text-xs text-gray-400 font-medium">
            {completedCount} / {totalTraining} sesiones
          </span>
        </div>
      </div>

      {/* Adjustment banner */}
      {pendingSuggestionsCount > 0 && (
        <a href="/checkin" className="block bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5 flex items-center gap-3 hover:bg-blue-100 transition-colors">
          <span className="text-xl">🔄</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-800">Ajuste de plan disponible</p>
            <p className="text-xs text-blue-600">
              {pendingSuggestionsCount === 1
                ? 'Tienes 1 sugerencia pendiente de tu último check-in'
                : `Tienes ${pendingSuggestionsCount} sugerencias pendientes de tu último check-in`}
            </p>
          </div>
          <ChevronRight size={16} className="text-blue-400" />
        </a>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-5">

        {/* Left (3/5) */}
        <div className="xl:col-span-3 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {selDayLabel} · Sesión del día
          </p>

          {selectedSession ? (
            <SessionDetailCard
              key={selectedSession.id}
              session={selectedSession}
              isToday={isCurrentWeek && selectedDow === todayDow}
              isLogged={loggedIds.has(selectedSession.id)}
              onLogged={() => markLogged(selectedSession.id)}
              onEdited={(updates) => { applyEdit(selectedSession.id, updates) }}
            />
          ) : selectedGym ? (
            <GymDayCard gym={selectedGym} isToday={isCurrentWeek && selectedDow === todayDow} />
          ) : (
            <SesionLibreCard />
          )}

          {/* Next day preview */}
          {nextSession && (
            <button
              onClick={handleNextDayClick}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-base">📅</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500">Mañana</p>
                <p className="text-sm font-bold text-gray-800 truncate">
                  {nextSession.label || SESSION_NAMES[nextSession.type] || nextSession.type}
                  {' · '}{nextSession.durationMin} min
                </p>
              </div>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
            </button>
          )}

        </div>

        {/* Right (2/5) — Figma MetricsPanel */}
        <div className="xl:col-span-2 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Esta semana
          </p>

          <KPICards
            completed={completedCount}
            total={totalTraining}
            volumeLabel={volumeLabel}
            adherencePct={adherencePct}
            isGym={isGym}
          />

          <PhaseBar
            allPhases={allPhases}
            currentPhase={realCurrentPhase}
            currentWeekNum={plan.currentWeek}
            totalWeeks={plan.totalWeeks}
            weeks={weeks}
            isGymPlan={isGym}
          />

          <div className="grid grid-cols-2 gap-3">
            <WeekStatusCard checkInData={checkInData ?? null} />
            <HRZonesCard hrZones={hrZones} />
          </div>

          <AdherenceChart
            weeks={weeks}
            currentWeekNum={plan.currentWeek}
            selectedWeekNum={selectedWeekNum}
            totalWeeks={plan.totalWeeks}
            todayDow={todayDow}
            loggedIds={loggedIds}
          />
        </div>
      </div>

      {/* Bottom row — Nutrition + Body Composition (Figma: below separator) */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3">
          {nutritionTarget && <NutritionCard nt={nutritionTarget} consumed={todayConsumed} />}
        </div>
        <div className="xl:col-span-2">
          <BodyCompositionCard weightData={weightData} bodyMeasures={bodyMeasures} />
        </div>
      </div>

      <CheckInBanner recordedAt={checkInData?.recordedAt ?? null} />
    </div>
    </>
  )
}
