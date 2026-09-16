'use client'

import { cn } from '@/lib/utils'
import PlanCompletionCard from '../../_components/PlanCompletionCard'
import PageTopBar from '../../_components/PageTopBar'
import WeekDayStrip from '../../_components/WeekDayStrip'
import type { WeekDayCell } from '../../_components/week_day_cells'

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const PHASE_LABELS: Record<string, string> = {
  BASE: 'BASE', DEVELOPMENT: 'DESARRO', BUILD: 'DESARRO',
  SPECIFIC: 'ESPECÍF', PEAK: 'ESPECÍF', TAPER: 'AFIN.', RACE: 'AFIN.',
}

const PHASES_ALL = ['Base', 'Desarrollo', 'Específico', 'Afinamiento']

type LastWeekSession = {
  dayOfWeek: number
  type: string
  label: string
  durationMin: number
  zone: string
  done: boolean
}

type NutritionTarget = { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string }
type WeightData = { currentKg: number | null; goalKg: number | null; progressPct: number | null; weeklyChange: number | null }
type CheckInData = { energyLevel: number | null; sleepHours: number | null; stressLevel: number | null; motivationLevel: number | null; recordedAt: string }
type BodyMeasures = { waistCm: number | null; hipsCm: number | null; armsCm: number | null; thighsCm: number | null }
type HRZoneData = { z1: { min: number; max: number }; z2: { min: number; max: number }; z3: { min: number; max: number }; z4: { min: number; max: number }; z5: { min: number; max: number } }

type Props = {
  isB2B: boolean
  planName: string
  totalWeeks: number
  endDate: string
  sessionsLogged: number
  sessionsTotal: number
  recoveryDaysSinceEnd: number
  completedAdherencePct: number
  lastWeekSessions: LastWeekSession[]
  phases: string[]
  currentWeek: number
  nutritionTarget: NutritionTarget | null
  weightData: WeightData | null
  checkInData: CheckInData | null
  bodyMeasures: BodyMeasures | null
  hrZones: HRZoneData | null
}

export default function PlanCompletedClient({
  isB2B, planName, totalWeeks, endDate, sessionsLogged, sessionsTotal,
  recoveryDaysSinceEnd, completedAdherencePct, lastWeekSessions,
  phases, currentWeek, nutritionTarget, weightData, checkInData,
  bodyMeasures, hrZones,
}: Props) {
  const sessionsByDow = new Map(lastWeekSessions.map(s => [s.dayOfWeek, s]))

  // Compute last week's Monday from endDate (endDate is typically the Sunday)
  const endDateObj = new Date(endDate + 'T00:00:00')
  const endDow = endDateObj.getDay() === 0 ? 7 : endDateObj.getDay()
  const lastWeekMonday = new Date(endDateObj)
  lastWeekMonday.setDate(endDateObj.getDate() - (endDow - 1))

  // Build WeekDayCell[] for the shared WeekDayStrip component
  const lastWeekCells: WeekDayCell[] = Array.from({ length: 7 }, (_, i) => {
    const session = sessionsByDow.get(i + 1)
    return {
      idx: i,
      dateNum: new Date(lastWeekMonday.getTime() + i * 86400000).getDate(),
      isToday: false,
      sessionType: session?.type ?? null,
      done: session?.done ?? false,
      durationMin: session?.durationMin ?? 0,
      zoneTarget: session?.zone ?? '',
      label: session?.label ?? null,
      hasGym: false,
    }
  })

  const displayPhases = phases.length > 0
    ? [...new Set(phases.map(p => PHASE_LABELS[p] ?? p))]
    : ['BASE', 'DESARRO', 'ESPECÍF', 'AFIN.']

  return (
    <>
    {/* ══════ MOBILE (< sm) — Figma 3431:200 / 3432:64 ══════ */}
    <div className="sm:hidden min-h-screen bg-[#f1f5f9]">
      {/* Header — navy gradient */}
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] pb-3 px-5 pt-[max(env(safe-area-inset-top,0px),20px)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-[20px] font-bold text-white leading-tight">Mi Plan</h1>
            <p className="text-[11px] text-white/60 mt-0.5">{planName} · {totalWeeks} semanas</p>
          </div>
          <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">
            ✓ COMPLETADO
          </div>
        </div>

        {/* Completion date bar */}
        <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
          <span className="text-[13px] font-semibold text-white">Completado el {endDateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Day Pills — last week dates */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex justify-between">
          {Array.from({ length: 7 }, (_, i) => {
            const dow = i + 1
            const session = sessionsByDow.get(dow)
            const isDone = session?.done ?? false
            const isRest = session?.type === 'DESCANSO' || session?.type === 'REST'
            const dayDate = new Date(lastWeekMonday)
            dayDate.setDate(lastWeekMonday.getDate() + i)

            return (
              <div key={dow} className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-semibold text-gray-400">{WEEK_DAYS[i]}</span>
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold',
                  isDone && !isRest ? 'bg-[#22c55e] text-white' :
                  isRest ? 'bg-[#f1f5f9] text-gray-400 border border-[#cbd5e1]' :
                  'bg-gray-100 text-gray-400 border border-gray-200'
                )}>
                  {isDone && !isRest ? '\u2713' : dayDate.getDate()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 pb-24">
        {/* Celebration card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
          <span className="text-[48px] block">🏆</span>
          <h2 className="text-[22px] font-black text-gray-900">¡Plan completado!</h2>
          <p className="text-[13px] text-gray-500">{planName} · {totalWeeks} semanas</p>
          <div className="flex justify-center gap-8 pt-2">
            <div className="text-center">
              <p className="text-[24px] font-black text-gray-900">{totalWeeks}</p>
              <p className="text-[11px] text-gray-400">semanas</p>
            </div>
            <div className="text-center">
              <p className="text-[24px] font-black text-gray-900">{sessionsLogged}</p>
              <p className="text-[11px] text-gray-400">sesiones</p>
            </div>
            <div className="text-center">
              <p className="text-[24px] font-black text-[#ea580c]">{completedAdherencePct}%</p>
              <p className="text-[11px] text-gray-400">adherencia</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esta semana</p>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Completadas</p>
            <p className="text-[20px] font-black leading-none text-gray-900">{sessionsLogged}/{sessionsTotal}</p>
            <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sesiones</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Volumen</p>
            <p className="text-[20px] font-black leading-none text-gray-900">{totalWeeks * 4}</p>
            <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">en el plan</p>
          </div>
          <div className={cn('bg-white rounded-xl shadow-sm p-3', completedAdherencePct < 80 ? 'border-2 border-[#ea580c]/30' : 'border border-gray-100')}>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Adherencia</p>
            <p className="text-[20px] font-black leading-none text-[#ea580c]">{completedAdherencePct}%</p>
            <p className={cn('text-[10px] mt-1 whitespace-nowrap', completedAdherencePct < 80 ? 'text-red-500' : 'text-gray-400')}>
              {completedAdherencePct < 80 ? '↓ meta 80%' : '✓ objetivo'}
            </p>
          </div>
        </div>

        {/* Phase progress — completado */}
        <CompletedPhaseBar totalWeeks={totalWeeks} />

        {/* Nutrición hoy */}
        {nutritionTarget && <CompletedNutritionCard nt={nutritionTarget} />}

        {/* Estado semanal */}
        <CompletedEstadoSemana checkInData={checkInData} />

        {/* Zonas FC */}
        <CompletedZonasFC hrZones={hrZones} />

        {/* Composición corporal */}
        <CompletedBodyCard weightData={weightData} bodyMeasures={bodyMeasures} />

        {/* CTA card */}
        {isB2B ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
            <p className="text-[14px] font-bold text-[#1e3a5f]">Tu coach asignará el próximo plan</p>
            <p className="text-[11px] text-gray-400">Recibirás una notificación cuando tu entrenador lo haya preparado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-[14px] font-bold text-[#1e3a5f]">¿Listo para el siguiente desafío?</p>
            <a
              href="/find-coach"
              className="block w-full text-center bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-[14px] font-bold py-3 rounded-xl transition-colors"
            >
              Buscar entrenador →
            </a>
          </div>
        )}

        {/* Check-in banner */}
        <CompletedCheckInBanner recordedAt={checkInData?.recordedAt ?? null} />
      </div>
    </div>

    {/* ══════ DESKTOP (sm+) ══════ */}
    <div className="hidden sm:block px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-5">
      {/* WeekSection card — matches active plan structure */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <PageTopBar
          title="Mi Plan"
          subtitle={`${planName} · ${totalWeeks} semanas`}
          right={
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3.5 py-1.5 rounded-[20px] text-[11px] font-semibold whitespace-nowrap">
              ✓ PLAN COMPLETADO
            </span>
          }
        />

        {/* Progress bar — 100% complete */}
        <div className="px-5">
          <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#22c55e] rounded-full w-full" />
          </div>
        </div>

        {/* Calendar Strip — Last week of completed plan (shared GridCell) */}
        <div className="px-3 pt-3">
          <WeekDayStrip cells={lastWeekCells} />
        </div>

        {/* Footer — session count */}
        <div className="px-5 pb-3 flex justify-end">
          <span className="text-[12px] text-gray-400 font-medium">
            {sessionsLogged} / {sessionsTotal} sesiones
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumen del plan</p>
          <PlanCompletionCard
            planName={planName}
            totalWeeks={totalWeeks}
            sessionsLogged={sessionsLogged}
            sessionsTotal={sessionsTotal}
            recoveryDaysSinceEnd={recoveryDaysSinceEnd}
            isB2B={isB2B}
          />
        </div>

        <div className="xl:col-span-2 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esta semana</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Completadas</p>
              <p className="text-[20px] font-black leading-none text-gray-900">{sessionsLogged}/{sessionsTotal}</p>
              <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sesiones</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Volumen</p>
              <p className="text-[20px] font-black leading-none text-gray-900">{totalWeeks * 4}</p>
              <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">en el plan</p>
            </div>
            <div className={cn('bg-white rounded-xl shadow-sm p-3', completedAdherencePct < 80 ? 'border-2 border-[#ea580c]/30' : 'border border-gray-100')}>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Adherencia</p>
              <p className="text-[20px] font-black leading-none text-[#ea580c]">{completedAdherencePct}%</p>
              <p className={cn('text-[10px] mt-1 whitespace-nowrap', completedAdherencePct < 80 ? 'text-red-500' : 'text-gray-400')}>
                {completedAdherencePct < 80 ? '↓ meta 80%' : '✓ objetivo'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-gray-900">Progreso del plan</p>
              <p className="text-[11px] text-gray-400">
                Sem. {currentWeek} / {totalWeeks} · 100%
              </p>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${displayPhases.length}, 1fr)` }}>
              {displayPhases.map((phase, i) => (
                <div
                  key={i}
                  className="h-8 rounded-md flex items-center justify-center text-[9px] font-bold uppercase tracking-wide bg-[#1e3a5f] text-white"
                >
                  {phase}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CompletedEstadoSemana checkInData={checkInData} />
            <CompletedZonasFC hrZones={hrZones} />
          </div>

          <CompletedBodyCard weightData={weightData} bodyMeasures={bodyMeasures} />

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            {isB2B ? (
              <>
                <p className="text-[13px] font-bold text-[#1e3a5f]">Tu coach asignará el próximo plan</p>
                <p className="text-[11px] text-gray-400">Recibirás una notificación cuando tu entrenador lo tenga listo.</p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold text-[#1e3a5f]">¿Listo para el siguiente desafío?</p>
                <a
                  href="/find-coach"
                  className="block w-full text-center bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-[14px] font-bold px-5 py-3 rounded-xl transition-colors"
                >
                  Buscar entrenador →
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nutrition + CheckIn — full width */}
      {nutritionTarget && <CompletedNutritionCard nt={nutritionTarget} />}
      <CompletedCheckInBanner recordedAt={checkInData?.recordedAt ?? null} />
    </div>
    </>
  )
}

// ── Shared sub-components for completed state ─────────────────────────

function CompletedPhaseBar({ totalWeeks }: { totalWeeks: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-bold text-gray-900">Progreso del plan</p>
        <p className="text-[11px] text-gray-400">Plan completado {totalWeeks}/{totalWeeks} · 100%</p>
      </div>
      <div className="flex gap-1.5">
        {PHASES_ALL.map(p => (
          <div key={p} className="flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold bg-[#1e3a5f] text-white">
            {'✓ '}{p}
          </div>
        ))}
      </div>
    </div>
  )
}

function CompletedNutritionCard({ nt }: { nt: NutritionTarget }) {
  const macros = [
    { label: 'Proteína', value: `${nt.proteinG} g`, color: '#3b82f6' },
    { label: 'Carbos', value: `${nt.carbsG} g`, color: '#22c55e' },
    { label: 'Grasas', value: `${nt.fatG} g`, color: '#f97316' },
  ]
  return (
    <a href="/nutrition" className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-4 sm:mt-0">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Nutrición hoy</p>
      <div className="flex items-end gap-6">
        <div>
          <span className="text-[28px] font-black text-gray-900 tracking-tight leading-none">{nt.kcal.toLocaleString('es')}</span>
          <span className="text-[12px] text-gray-400 ml-1">kcal</span>
        </div>
        {macros.map(m => (
          <div key={m.label} className="flex flex-col items-center gap-1">
            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-[13px] font-bold text-gray-900">{m.value}</span>
            <span className="text-[9px] text-gray-400">{m.label}</span>
          </div>
        ))}
      </div>
    </a>
  )
}

function CompletedEstadoSemana({ checkInData }: { checkInData: CheckInData | null }) {
  const { energyLevel, sleepHours, stressLevel, motivationLevel } = checkInData ?? {}
  const items = [
    { label: 'Energía', value: energyLevel ? `${energyLevel}/5` : '—', icon: '⚡' },
    { label: 'Sueño', value: sleepHours ? `${sleepHours}h` : '—', icon: '😴' },
    { label: 'Estrés', value: stressLevel ? `${stressLevel}/5` : '—', icon: '😤' },
    { label: 'Motiv.', value: motivationLevel ? `${motivationLevel}/5` : '—', icon: '💪' },
  ]
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className="text-[13px] font-bold text-gray-900 block mb-3">Tu estado esta semana</span>
      <div className="flex gap-3">
        {items.map(i => (
          <div key={i.label} className="flex-1 text-center">
            <span className="text-[16px] block mb-1">{i.icon}</span>
            <span className="text-[14px] font-bold text-gray-900 block">{i.value}</span>
            <span className="text-[9px] text-gray-400">{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompletedZonasFC({ hrZones }: { hrZones: HRZoneData | null }) {
  const defaultColors = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#dc2626']
  const zones = hrZones
    ? [
        { label: 'Z1', range: `${hrZones.z1.min}-${hrZones.z1.max}`, color: '#3b82f6' },
        { label: 'Z2', range: `${hrZones.z2.min}-${hrZones.z2.max}`, color: '#22c55e' },
        { label: 'Z3', range: `${hrZones.z3.min}-${hrZones.z3.max}`, color: '#f97316' },
        { label: 'Z4', range: `${hrZones.z4.min}-${hrZones.z4.max}`, color: '#ef4444' },
        { label: 'Z5', range: `${hrZones.z5.min}+`, color: '#dc2626' },
      ]
    : ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((l, i) => ({ label: l, range: '— bpm', color: defaultColors[i] }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className="text-[13px] font-bold text-gray-900 block mb-3">Zonas FC</span>
      {!hrZones && <p className="text-[10px] text-gray-300 -mt-1 mb-2">Completa tu perfil con FC máx</p>}
      <div className="flex gap-2">
        {zones.map(z => (
          <div key={z.label} className="flex-1 text-center">
            <div className={cn('w-2.5 h-2.5 rounded-full mx-auto mb-1.5', !hrZones && 'opacity-30')} style={{ backgroundColor: z.color }} />
            <span className="text-[11px] font-bold text-gray-900 block">{z.label}</span>
            <span className={cn('text-[9px]', hrZones ? 'text-gray-400' : 'text-gray-300')}>{z.range}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompletedBodyCard({ weightData, bodyMeasures }: { weightData: WeightData | null; bodyMeasures: BodyMeasures | null }) {
  const currentKg = weightData?.currentKg ?? null
  const goalKg = weightData?.goalKg ?? null
  const hasData = currentKg != null || bodyMeasures != null
  const measures = [
    { label: 'Cintura', value: bodyMeasures?.waistCm },
    { label: 'Cadera', value: bodyMeasures?.hipsCm },
    { label: 'Brazo', value: bodyMeasures?.armsCm },
    { label: 'Muslo', value: bodyMeasures?.thighsCm },
  ]
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-gray-900">Composición corporal</span>
        {!hasData && <span className="text-[11px] text-gray-400">Sin datos</span>}
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[24px] font-black text-gray-900 tracking-tight">
          {currentKg != null ? `${currentKg} kg` : '— kg'}
        </span>
        {goalKg != null && <span className="text-[12px] text-gray-400">→ meta {goalKg} kg</span>}
      </div>
      <div className="flex gap-2">
        {measures.map(m => (
          <div key={m.label} className="flex-1 text-center">
            <span className="text-[15px] font-bold text-gray-900">
              {m.value != null ? `${m.value} cm` : '— cm'}
            </span>
            <p className="text-[9px] text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompletedCheckInBanner({ recordedAt }: { recordedAt: string | null }) {
  if (!recordedAt) {
    return (
      <a href="/checkin" className="flex items-center gap-2 text-[11px] text-gray-300 hover:text-gray-500 transition-colors mt-2">
        <span>📊</span>
        <span>Sin check-ins registrados · Haz tu primer check-in semanal</span>
      </a>
    )
  }
  const d = new Date(recordedAt)
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`
  return (
    <a href="/checkin" className="flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors mt-2">
      <span>📊</span>
      <span>Último check-in: {label}</span>
    </a>
  )
}
