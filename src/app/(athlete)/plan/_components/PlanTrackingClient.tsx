'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SESSION_NAMES, SESSION_ICONS, WEEK_DAYS_SHORT } from '@/lib/constants/sessions'
import type { CalendarWeek, CalendarDay } from '@/domain/calendar/calendar.types'
import type { NutritionTarget, WeightData, BodyMeasures } from '../_lib/plan.types'
import PageTopBar from '../../_components/PageTopBar'
import WeekNavBar from '../../_components/WeekNavBar'

// ── Props ─────────────────────────────────────────────────────────────

type Props = {
  isB2B: boolean
  initialCalendarWeek: CalendarWeek | null
  nutritionTarget: NutritionTarget | null
  weightData: WeightData | null
  bodyMeasures: BodyMeasures | null
}

// ── Main ──────────────────────────────────────────────────────────────

export default function PlanTrackingClient({
  isB2B,
  initialCalendarWeek,
  nutritionTarget,
  weightData,
  bodyMeasures,
}: Props) {
  const todayDow = useMemo(() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  }, [])

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDow, setSelectedDow] = useState(todayDow)

  // Calendar data — use pre-hydrated for weekOffset=0, fetch for others
  const [calWeek, setCalWeek] = useState<CalendarWeek | null>(initialCalendarWeek)
  const [calLoading, setCalLoading] = useState(false)

  useEffect(() => {
    if (weekOffset === 0) {
      setCalWeek(initialCalendarWeek)
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

  const isCurrentWeek = weekOffset === 0
  const weekLabel = calWeek?.label ?? ''

  // Selected day data
  const selectedDay = useMemo(
    () => calWeek?.days.find(d => d.dow === selectedDow) ?? null,
    [calWeek, selectedDow],
  )

  // KPIs — count real activity this week
  const weekStats = useMemo(() => {
    if (!calWeek?.days) return { sessions: 0, totalMin: 0 }
    let sessions = 0
    let totalMin = 0
    for (const d of calWeek.days) {
      if (d.sport?.done) { sessions++; totalMin += d.sport.logDurationMin ?? d.sport.durationMin }
      if (d.gym?.done) { sessions++; totalMin += d.gym.durationMin ?? 0 }
      if (d.freeRun) { sessions++; totalMin += d.freeRun.durationMin ?? 0 }
    }
    return { sessions, totalMin }
  }, [calWeek])

  const selDayLabel = selectedDay
    ? `${WEEK_DAYS_SHORT[selectedDow - 1]} ${selectedDay.dateNum}`
    : WEEK_DAYS_SHORT[selectedDow - 1] ?? ''

  return (
    <>
    {/* ══════ MOBILE (< sm) ══════ */}
    <div className="sm:hidden min-h-screen bg-[#f1f5f9]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] pb-3 px-5 pt-[max(env(safe-area-inset-top,0px),20px)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-[22px] font-bold text-white leading-tight">Mi Plan</h1>
            <p className="text-[12px] text-[#99a6b8] mt-0.5">Modo tracking</p>
          </div>
        </div>

        {/* Week Nav */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white/10 rounded-xl h-10">
            <button
              onClick={() => { setWeekOffset(w => w - 1); setSelectedDow(1) }}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="flex-1 text-[13px] font-semibold text-white text-center whitespace-nowrap">
              {weekLabel}
            </span>
            {!isCurrentWeek && (
              <button
                onClick={() => { setWeekOffset(0); setSelectedDow(todayDow) }}
                className="text-[12px] font-bold text-white bg-[#ea580c] px-3 py-1 rounded-full transition-colors hover:bg-[#d14d07]"
              >
                Hoy
              </button>
            )}
            <button
              onClick={() => { setWeekOffset(w => w + 1); setSelectedDow(1) }}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Day Pills */}
      {calLoading ? (
        <DayPillsSkeleton />
      ) : (
        <div className="px-4 pt-4 pb-2">
          <div className="flex justify-between">
            {calWeek?.days.map((day, i) => {
              const hasActivity = !!(day.sport?.done || day.gym || day.freeRun)
              const isToday = isCurrentWeek && day.dow === todayDow
              const isSel = day.dow === selectedDow

              return (
                <button key={day.dow} onClick={() => setSelectedDow(day.dow)} className="flex flex-col items-center gap-1">
                  <span className={cn('text-[11px] font-semibold',
                    isToday ? 'text-[#ea580c]' : isSel ? 'text-[#1e3a5f]' : 'text-gray-400'
                  )}>
                    {WEEK_DAYS_SHORT[i]}
                  </span>
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold transition-colors',
                    isToday ? 'bg-[#ea580c] text-white' :
                    isSel ? 'border-2 border-[#1e3a5f] text-[#1e3a5f] bg-white' :
                    hasActivity ? 'bg-green-100 text-green-700 border border-green-300' :
                    'bg-white text-gray-400 border border-gray-200'
                  )}>
                    {hasActivity && !isToday ? <CheckCircle2 size={16} /> : day.dateNum}
                  </div>
                </button>
              )
            }) ?? Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-semibold text-gray-400">{WEEK_DAYS_SHORT[i]}</span>
                <div className="w-10 h-10 rounded-full bg-white text-gray-400 border border-gray-200 flex items-center justify-center text-[15px] font-bold">—</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 space-y-4 pb-24">
        <p className="text-[10px] font-semibold text-[#9ba2ad] uppercase tracking-[0.3px]">
          {selDayLabel} · Actividad del dia
        </p>

        <DayDetailCard day={selectedDay} isToday={isCurrentWeek && selectedDow === todayDow} />

        <p className="text-[10px] font-semibold text-[#9ba2ad] uppercase tracking-[0.3px]">Esta semana</p>

        <TrackingKPIs sessions={weekStats.sessions} totalMin={weekStats.totalMin} />

        {nutritionTarget && <NutritionSnapshotCard nt={nutritionTarget} />}
        <BodySnapshotCard weightData={weightData} bodyMeasures={bodyMeasures} />

        <CTACard isB2B={isB2B} />
      </div>
    </div>

    {/* ══════ DESKTOP (sm+) ══════ */}
    <div className="hidden sm:block px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-5">
      {/* WeekSection card — matches active/completed plan structure */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <PageTopBar
          title="Mi Plan"
          subtitle="Modo tracking"
          center={
            <WeekNavBar
              weekLabel={weekLabel}
              canGoPrev={true}
              canGoNext={true}
              onPrev={() => { setWeekOffset(w => w - 1); setSelectedDow(1) }}
              onNext={() => { setWeekOffset(w => w + 1); setSelectedDow(1) }}
              onToday={() => { setWeekOffset(0); setSelectedDow(todayDow) }}
              showToday={!isCurrentWeek}
            />
          }
        />

        {/* Calendar Strip */}
        <div className="px-3 pt-3">
        <div className="grid grid-cols-7 divide-x divide-gray-50">
          {calWeek?.days.map((day, i) => {
            const hasActivity = !!(day.sport?.done || day.gym || day.freeRun)
            const isToday = isCurrentWeek && day.dow === todayDow
            const isSelected = day.dow === selectedDow
            const isFuture = isCurrentWeek ? day.dow > todayDow : weekOffset > 0

            const barColor = hasActivity ? 'bg-green-500' : isToday || isSelected ? 'bg-[#ea580c]' : isFuture ? 'bg-[#ea580c]/30' : 'bg-gray-200'
            const cardBg = isToday
              ? 'bg-[#1e3a5f]'
              : hasActivity ? 'bg-green-50/60'
              : isSelected ? 'bg-orange-50'
              : isFuture ? 'bg-[#fff7ed] hover:bg-orange-100'
              : 'bg-[#f5f7fa] hover:bg-gray-100'
            const isInverted = isToday

            return (
              <button
                key={day.dow}
                onClick={() => setSelectedDow(day.dow)}
                className={cn('flex flex-col items-center py-3.5 px-1 transition-colors text-center relative min-h-[150px]', cardBg)}
              >
                <div className={cn('absolute top-0 left-0 right-0 h-[3px]', barColor)} />
                <span className={cn('text-[11px] font-semibold mb-1',
                  isInverted ? 'text-white/70' :
                  isToday || isSelected ? 'text-[#ea580c] font-bold' :
                  isFuture ? 'text-[#ea580c]' : 'text-gray-400'
                )}>
                  {WEEK_DAYS_SHORT[i]}
                </span>
                <div className="flex items-center gap-1 mb-2">
                  <span className={cn('text-[22px] font-black leading-none',
                    isInverted ? 'text-white' :
                    hasActivity ? 'text-green-600' :
                    isToday || isSelected ? 'text-[#ea580c]' :
                    isFuture ? 'text-[#ea580c]' : 'text-gray-300'
                  )}>
                    {day.dateNum}
                  </span>
                  {isToday && (
                    <span className="text-[8px] font-bold bg-[#ea580c] text-white px-1.5 py-0.5 rounded-full leading-none">HOY</span>
                  )}
                </div>

                {/* Activity summary */}
                <div className="mt-auto space-y-0.5">
                  {day.sport?.done && (
                    <span className={cn('text-[10px] font-semibold leading-tight block', isInverted ? 'text-white' : 'text-green-700')}>
                      {SESSION_ICONS[day.sport.type] ?? '🏃'} {SESSION_NAMES[day.sport.type] ?? day.sport.type}
                    </span>
                  )}
                  {day.gym && (
                    <span className={cn('text-[10px] font-semibold leading-tight block', isInverted ? 'text-white' : day.gym.done ? 'text-green-700' : 'text-purple-600')}>
                      💪 {day.gym.label}
                    </span>
                  )}
                  {day.freeRun && (
                    <span className={cn('text-[10px] font-semibold leading-tight block', isInverted ? 'text-white' : 'text-blue-600')}>
                      {SESSION_ICONS[day.freeRun.type] ?? '🏃'} {SESSION_NAMES[day.freeRun.type] ?? 'Libre'}
                    </span>
                  )}
                  {!day.sport?.done && !day.gym && !day.freeRun && isSelected && (
                    <span className="text-[11px] font-semibold text-[#ea580c] mt-0.5">Registrar →</span>
                  )}
                </div>
              </button>
            )
          }) ?? Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex flex-col items-center py-3.5 px-1 bg-[#f5f7fa] min-h-[150px]">
              <span className="text-[11px] font-semibold mb-1 text-gray-400">{WEEK_DAYS_SHORT[i]}</span>
              <span className="text-[22px] font-black leading-none text-gray-300">—</span>
            </div>
          ))}
        </div>
        </div>

        {/* Footer — session count */}
        <div className="px-5 pb-3 flex justify-end">
          <span className="text-[12px] text-gray-400 font-medium">
            {weekStats.sessions} sesiones esta semana
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 space-y-4">
          <p className="text-[10px] font-semibold text-[#9ba2ad] uppercase tracking-[0.3px]">
            {selDayLabel} · Actividad del dia
          </p>
          <DayDetailCard day={selectedDay} isToday={isCurrentWeek && selectedDow === todayDow} />
        </div>

        <div className="xl:col-span-2 space-y-4">
          <p className="text-[10px] font-semibold text-[#9ba2ad] uppercase tracking-[0.3px]">Esta semana</p>
          <TrackingKPIs sessions={weekStats.sessions} totalMin={weekStats.totalMin} />
          {nutritionTarget && <NutritionSnapshotCard nt={nutritionTarget} />}
          <BodySnapshotCard weightData={weightData} bodyMeasures={bodyMeasures} />
          <CTACard isB2B={isB2B} />
        </div>
      </div>
    </div>
    </>
  )
}

// ── DayDetailCard — shows gym / freeRun / empty for selected day ──────

function DayDetailCard({ day, isToday }: { day: CalendarDay | null; isToday: boolean }) {
  if (!day) return <SesionLibreCard />

  // Gym session
  if (day.gym) {
    const accentColor = day.gym.done ? 'bg-green-400' : isToday ? 'bg-[#ea580c]' : 'bg-purple-500'
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex">
          <div className={`w-1.5 shrink-0 ${accentColor}`} />
          <div className="flex-1 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[22px]">🏋️</span>
              <h3 className="text-[20px] font-black text-gray-900 leading-tight">{day.gym.label}</h3>
              {isToday && <span className="text-[10px] font-bold bg-[#ea580c] text-white px-2 py-0.5 rounded-full">HOY</span>}
              {day.gym.done && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                  <CheckCircle2 size={11} /> Completada
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {day.gym.durationMin != null && (
                <span className="text-[12px] font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                  {day.gym.durationMin} min
                </span>
              )}
              <span className="text-[12px] font-semibold bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-100">
                💪 Fuerza
              </span>
              {day.gym.templateName && (
                <span className="text-[12px] font-medium bg-gray-50 text-gray-500 px-3 py-1.5 rounded-full">
                  {day.gym.templateName}
                </span>
              )}
              {day.gym.rpe != null && (
                <span className="text-[12px] font-medium bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full">
                  RPE {day.gym.rpe}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
              {day.gym.done ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="text-[13px] font-semibold text-green-700">Completada</span>
                </div>
              ) : (
                <a
                  href="/gym/session"
                  className="flex-1 flex items-center justify-center gap-2 bg-[#ea580c] hover:opacity-90 text-white text-[14px] font-bold px-4 py-3 rounded-xl transition-opacity whitespace-nowrap"
                >
                  Iniciar sesion de gym →
                </a>
              )}
              <a
                href="/gym"
                className="px-4 py-2.5 border border-gray-200 text-gray-600 text-[13px] font-medium rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Ver rutina
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Free run
  if (day.freeRun) {
    const icon = SESSION_ICONS[day.freeRun.type] ?? '🏃'
    const name = SESSION_NAMES[day.freeRun.type] ?? 'Sesion libre'
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex">
          <div className="w-1.5 shrink-0 bg-blue-400" />
          <div className="flex-1 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[22px]">{icon}</span>
              <h3 className="text-[20px] font-black text-gray-900 leading-tight">{name}</h3>
              {isToday && <span className="text-[10px] font-bold bg-[#ea580c] text-white px-2 py-0.5 rounded-full">HOY</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {day.freeRun.durationMin != null && (
                <span className="text-[12px] font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                  {day.freeRun.durationMin} min
                </span>
              )}
              {day.freeRun.distanceKm != null && (
                <span className="text-[12px] font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
                  {day.freeRun.distanceKm} km
                </span>
              )}
              {day.freeRun.rpe != null && (
                <span className="text-[12px] font-medium bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full">
                  RPE {day.freeRun.rpe}
                </span>
              )}
              <span className="text-[12px] font-semibold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-100">
                Sesion libre
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl w-fit">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-[13px] font-semibold text-green-700">Registrada</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Sport session completed (outside plan — shouldn't happen in tracking but handle it)
  if (day.sport?.done) {
    const icon = SESSION_ICONS[day.sport.type] ?? '🏃'
    const name = SESSION_NAMES[day.sport.type] ?? day.sport.type
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex">
          <div className="w-1.5 shrink-0 bg-green-400" />
          <div className="flex-1 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[22px]">{icon}</span>
              <h3 className="text-[20px] font-black text-gray-900 leading-tight">{name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {day.sport.logDurationMin != null && (
                <span className="text-[12px] font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                  {day.sport.logDurationMin} min
                </span>
              )}
              {day.sport.logRpe != null && (
                <span className="text-[12px] font-medium bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full">
                  RPE {day.sport.logRpe}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl w-fit">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-[13px] font-semibold text-green-700">Completada</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Empty day
  return <SesionLibreCard />
}

// ── SesionLibreCard ───────────────────────────────────────────────────

function SesionLibreCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e5eaf0] rounded-sm" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[22px]">📝</span>
          <h3 className="text-[18px] font-bold text-[#1c2b45]">Sin actividad</h3>
        </div>
        <p className="text-[12px] text-[#8c9eb2]">
          Registra una sesion de running o ve al gym
        </p>
        <div className="flex gap-2">
          <a
            href="/log"
            className="flex-1 flex items-center justify-center bg-[#ea580c] hover:opacity-90 text-white text-[13px] font-bold h-[42px] rounded-[10px] transition-opacity"
          >
            Registrar sesion →
          </a>
          <a
            href="/gym"
            className="flex items-center justify-center px-4 border border-gray-200 text-gray-600 text-[13px] font-medium h-[42px] rounded-[10px] hover:bg-gray-50 transition-colors"
          >
            Gym
          </a>
        </div>
      </div>
    </div>
  )
}

// ── KPIs ──────────────────────────────────────────────────────────────

function TrackingKPIs({ sessions, totalMin }: { sessions: number; totalMin: number }) {
  const timeLabel = totalMin >= 60
    ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
    : totalMin > 0 ? `${totalMin} min` : '—'

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <p className="text-[10px] font-medium text-[#9ba2ad] mb-1">Sesiones</p>
        <p className="text-[22px] font-bold leading-none text-gray-900">{sessions}</p>
        <p className="text-[9px] text-[#bcc0c7] mt-1.5">esta semana</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <p className="text-[10px] font-medium text-[#9ba2ad] mb-1">Tiempo</p>
        <p className="text-[22px] font-bold leading-none text-gray-900">{timeLabel}</p>
        <p className="text-[9px] text-[#bcc0c7] mt-1.5">registrado</p>
      </div>
    </div>
  )
}

// ── Nutrition snapshot ────────────────────────────────────────────────

function NutritionSnapshotCard({ nt }: { nt: NutritionTarget }) {
  return (
    <a href="/nutrition" className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <p className="text-[10px] font-bold text-[#9ba2ad] uppercase tracking-[0.5px] mb-2">Nutricion</p>
      <div className="flex items-end gap-4">
        <div>
          <span className="text-[22px] font-bold text-gray-900 leading-none">{nt.kcal.toLocaleString('es')}</span>
          <span className="text-[11px] text-[#8c99a6] ml-1">kcal</span>
        </div>
        <div className="flex gap-3 text-[11px]">
          <span className="text-blue-600 font-semibold">{nt.proteinG}g prot</span>
          <span className="text-yellow-600 font-semibold">{nt.carbsG}g carbs</span>
          <span className="text-green-600 font-semibold">{nt.fatG}g grasas</span>
        </div>
      </div>
    </a>
  )
}

// ── Body composition snapshot ─────────────────────────────────────────

function BodySnapshotCard({ weightData, bodyMeasures }: { weightData: WeightData | null; bodyMeasures: BodyMeasures | null }) {
  const currentKg = weightData?.currentKg ?? null
  const measures = [
    { label: 'Cintura', value: bodyMeasures?.waistCm },
    { label: 'Cadera', value: bodyMeasures?.hipsCm },
    { label: 'Muslo', value: bodyMeasures?.thighsCm },
  ]
  const hasData = currentKg != null || measures.some(m => m.value != null)
  if (!hasData) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-[10px] font-bold text-[#9ba2ad] uppercase tracking-[0.5px] mb-2">Composicion corporal</p>
      <div className="flex items-start">
        <div className="w-[80px]">
          <p className="text-[20px] font-bold text-[#1a2744]">{currentKg != null ? `${currentKg} kg` : '— kg'}</p>
        </div>
        <div className="w-px h-8 bg-[#e0e5eb] mx-3 mt-1" />
        <div className="flex flex-1 gap-0">
          {measures.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[13px] font-semibold text-[#33404d]">{m.value != null ? `${m.value} cm` : '—'}</span>
              <span className="text-[9px] text-[#808c99]">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── CTA ───────────────────────────────────────────────────────────────

function CTACard({ isB2B }: { isB2B: boolean }) {
  if (isB2B) {
    return (
      <div className="bg-[#1e3a5f] rounded-xl p-5 space-y-2">
        <p className="text-[14px] font-bold text-white">Tu coach esta preparando tu plan</p>
        <p className="text-[11px] text-white/60">Cuando tu entrenador asigne el plan, aparecera aqui automaticamente.</p>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl border border-[#d1d9e1] p-4 space-y-2.5">
      <p className="text-[13px] font-semibold text-[#1c2b45]">Entrena con un plan estructurado</p>
      <p className="text-[11px] text-[#708299] leading-[15px]">Un plan adaptativo ajusta cada sesion a tus metricas semanales.</p>
      <a
        href="/find-coach"
        className="flex items-center justify-center w-full bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-[13px] font-semibold py-[11px] rounded-[10px] transition-colors"
      >
        Buscar entrenador →
      </a>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────

function DayPillsSkeleton() {
  return (
    <div className="px-4 pt-4 pb-2 animate-pulse">
      <div className="flex justify-between">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-6 h-3 rounded bg-gray-200" />
            <div className="w-10 h-10 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
