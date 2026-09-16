'use client'

import Link from 'next/link'
import type { AthleteData, ActivePlanData, HealthProfileData, PlanSessionData, GymRoutineData } from '../AthleteDetailClient'

// ── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom',
}

const DAY_FULL: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje', FARTLEK: 'Fartlek', TEMPO: 'Tempo', INTERVALOS: 'Intervalos',
  TIRADA_LARGA: 'Tirada larga', FUERZA: 'Fuerza', DESCANSO: 'Descanso',
  TEST: 'Test', SIMULACRO: 'Simulacro', OTRO: 'Otro',
}

const TEMPLATE_PREVIEW: Record<string, { weeks: number; description: string; phases: string[] }> = {
  RACE_5K:            { weeks: 8,  description: 'Intervalos progresivos + fartlek semanal.', phases: ['BASE 3 sem', 'DESARROLLO 3 sem', 'AFINAMIENTO 2 sem'] },
  RACE_10K:           { weeks: 12, description: 'Volumen aeróbico + tempo runs y series.', phases: ['BASE 4 sem', 'DESARROLLO 5 sem', 'ESPECÍFICO 2 sem', 'AFINAMIENTO 1 sem'] },
  STRENGTH_TRAINING:  { weeks: 12, description: 'Splits Push/Pull/Legs con progresión de cargas.', phases: ['BASE 3 sem', 'DESARROLLO 5 sem', 'ESPECÍFICO 3 sem', 'AFINAMIENTO 1 sem'] },
  BODY_RECOMPOSITION: { weeks: 12, description: 'Fuerza + cardio moderado para recomposición.', phases: ['BASE 3 sem', 'DESARROLLO 5 sem', 'ESPECÍFICO 3 sem', 'AFINAMIENTO 1 sem'] },
}

const INTENSITY_SCORE: Record<string, number> = { HIGH: 3, MODERATE: 2, LOW: 1, REST: 0 }

const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Running', STRENGTH: 'Fuerza', CYCLING: 'Ciclismo',
}

const EXP_LABELS: Record<string, string> = {
  BEGINNER: 'Principiante', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado',
}

const PROFILE_ICONS: Record<string, string> = {
  age: '👤', weight: '⚖️', height: '📏', hr: '❤️', sport: '🏃', level: '📊',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function weekLoadScore(sessions: { intensity: string }[]): number {
  return sessions.reduce((sum, s) => sum + (INTENSITY_SCORE[s.intensity] ?? 2), 0)
}

function weekVolumeKg(sessions: PlanSessionData[]): number {
  return sessions.reduce((sum, s) => {
    if (s.gymLog) return sum + s.gymLog.totalVolume
    if (s.workoutDay) return sum + s.workoutDay.totalSets * 50 // rough estimate
    return sum
  }, 0)
}

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}:${sec.toString().padStart(2, '0')}/km`
}

function weekDateRange(planStart: Date, weekNumber: number): { start: Date; end: Date } {
  const base = new Date(planStart)
  const offset = (weekNumber - 1) * 7
  const start = new Date(base.getTime() + offset * 86_400_000)
  const end = new Date(start.getTime() + 6 * 86_400_000)
  return { start, end }
}

function formatDateShort(d: Date): string {
  return `${d.getDate()} ${d.toLocaleDateString('es', { month: 'short' })}`
}

function sessionDate(planStart: Date, weekNumber: number, dayOfWeek: number): Date {
  const base = new Date(planStart)
  const weekOffset = (weekNumber - 1) * 7
  const dayOffset = dayOfWeek - 1
  return new Date(base.getTime() + (weekOffset + dayOffset) * 86_400_000)
}

type SessionStatus = 'completed' | 'partial' | 'pending' | 'rest' | 'rest_respected'

function getSessionStatus(s: PlanSessionData, isPast: boolean): SessionStatus {
  if (s.type === 'DESCANSO') return isPast ? 'rest_respected' : 'rest'
  if (s.log) return s.log.rpe != null && s.log.rpe >= 8 ? 'partial' : 'completed'
  if (s.gymLog?.completed) {
    if (s.workoutDay && s.gymLog.exerciseCount < s.workoutDay.exerciseCount) return 'partial'
    return 'completed'
  }
  return 'pending'
}

const STATUS_RUNNING: Record<SessionStatus, { label: string; color: string; bg: string; icon: string }> = {
  completed:      { label: 'Completada',  color: '#16a251', bg: '#edfaf0', icon: '✓' },
  partial:        { label: 'Parcial',     color: '#e0660d', bg: '#fff5eb', icon: '▲' },
  pending:        { label: 'Pendiente',   color: '#3870c7', bg: '#edf2ff', icon: '○' },
  rest:           { label: 'Descanso',    color: '#9ea8b8', bg: '#f7f9fa', icon: '—' },
  rest_respected: { label: 'Respetado',   color: '#16a251', bg: '#edfaf0', icon: '✓' },
}

const STATUS_GYM: Record<SessionStatus, { label: string; color: string; bg: string; icon: string }> = {
  completed:      { label: 'Completada',  color: '#228b22', bg: '#e0f5e5', icon: '✓' },
  partial:        { label: 'Parcial',     color: '#ea580c', bg: '#fff2d9', icon: '▲' },
  pending:        { label: 'Pendiente',   color: '#386bb8', bg: '#d9e5f2', icon: '○' },
  rest:           { label: 'Descanso',    color: '#9ea8b8', bg: '#ebedf0', icon: '—' },
  rest_respected: { label: 'Respetado',   color: '#228b22', bg: '#e0f5e5', icon: '✓' },
}

function coachCanDo(specialties: string[], discipline: string): boolean {
  if (specialties.length === 0) return true
  return specialties.includes(discipline)
}

// ── Types ────────────────────────────────────────────────────────────────────

type SessionDraft = { durationMin: number; type: string; zoneTarget: string; detailText: string; structure: string }

interface PlanTabProps {
  athleteId: string
  athlete: AthleteData
  activePlan: ActivePlanData
  healthProfile: HealthProfileData
  creatingPlan: boolean
  setCreatingPlan: (v: boolean) => void
  planGoalType: string
  setPlanGoalType: (v: string) => void
  planDaysPerWeek: number
  setPlanDaysPerWeek: (v: number) => void
  planGenerating: boolean
  planError: string | null
  planMode: 'template' | 'copy'
  setPlanMode: (v: 'template' | 'copy') => void
  copySourcePlanId: string
  setCopySourcePlanId: (v: string) => void
  copyStartDate: string
  setCopyStartDate: (v: string) => void
  availablePlans: { planId: string; planName: string; totalWeeks: number; athleteName: string; status: string }[]
  loadingPlans: boolean
  loadAvailablePlans: () => void
  handleCopyPlan: () => void
  handleCreatePlan: () => void
  planViewWeekIdx: number
  setPlanViewWeekIdx: (fn: (i: number) => number) => void
  notes: Record<string, string>
  savedNotes: Record<string, boolean>
  savingNotes: Record<string, boolean>
  editingSession: string | null
  setEditingSession: (id: string | null) => void
  sessionDraft: SessionDraft
  setSessionDraft: (fn: (d: SessionDraft) => SessionDraft) => void
  savingSession: boolean
  handleNoteChange: (sessionId: string, value: string) => void
  handleSaveNote: (sessionId: string) => void
  handleSaveSession: (sessionId: string) => void
  coachSpecialties: string[]
  gymRoutine: GymRoutineData
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — Empty state
// ══════════════════════════════════════════════════════════════════════════════

function OnboardingBanner() {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-xl border-2" style={{ borderColor: '#f2d98c', backgroundColor: '#fff7e0' }}>
      <span className="text-xl shrink-0" style={{ color: '#99660d' }}>⚠</span>
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: '#99660d' }}>Onboarding pendiente</p>
        <p className="text-xs" style={{ color: '#b3842e' }}>
          Este atleta aún no completó su perfil. Sin datos de peso, FC y objetivo no puedes personalizar el plan.
        </p>
      </div>
      <button className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#1e3a5f' }}>
        Enviar recordatorio
      </button>
    </div>
  )
}

function ProfileCards({ healthProfile }: { healthProfile: HealthProfileData }) {
  if (!healthProfile) return null
  const items = [
    { icon: PROFILE_ICONS.age, value: `${healthProfile.age} años`, label: 'Edad' },
    { icon: PROFILE_ICONS.weight, value: `${healthProfile.weightKg} kg`, label: 'Peso' },
    { icon: PROFILE_ICONS.height, value: `${healthProfile.heightCm} cm`, label: 'Altura' },
    { icon: PROFILE_ICONS.hr, value: healthProfile.hrResting ? `${healthProfile.hrResting} bpm` : '—', label: 'FC reposo' },
    { icon: PROFILE_ICONS.sport, value: SPORT_LABELS[healthProfile.sport ?? ''] ?? healthProfile.sport ?? '—', label: 'Deporte' },
    { icon: PROFILE_ICONS.level, value: EXP_LABELS[healthProfile.experienceLevel ?? ''] ?? '—', label: 'Nivel' },
  ]

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: '#f5f7fa', borderColor: '#edf0f2' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#738090' }}>Perfil del atleta</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-white rounded-lg border px-3 py-3 text-center" style={{ borderColor: '#e8ebed' }}>
            <span className="text-lg">{item.icon}</span>
            <p className="text-sm font-bold mt-1" style={{ color: '#1f2d3d' }}>{item.value}</p>
            <p className="text-[10px]" style={{ color: '#8c99a6' }}>{item.label}</p>
          </div>
        ))}
      </div>
      {healthProfile.injuries.length > 0 && (
        <p className="mt-3 text-sm text-red-600 font-medium">
          ▲ Lesión reportada: {healthProfile.injuries.join(', ')}
        </p>
      )}
    </div>
  )
}

const GOAL_LABELS: Record<string, string> = {
  HYPERTROPHY: 'Hipertrofia',
  STRENGTH: 'Fuerza',
  TONING: 'Tonificación',
  FUNCTIONAL: 'Funcional',
}

const MUSCLE_ICONS: Record<string, string> = {
  chest: '🫁', back: '🔙', shoulders: '🏋️', biceps: '💪', triceps: '💪',
  legs: '🦵', quads: '🦵', hamstrings: '🦵', glutes: '🍑', calves: '🦶',
  core: '🧱', abs: '🧱', full_body: '🏋️',
}

function GymRoutineView({ athleteId, gymRoutine }: { athleteId: string; gymRoutine: NonNullable<GymRoutineData> }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#f3e8ff' }}>
            🏋️
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{gymRoutine.name}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {gymRoutine.goal && <span>{GOAL_LABELS[gymRoutine.goal] ?? gymRoutine.goal}</span>}
              <span>·</span>
              <span>{gymRoutine.daysPerWeek} días/sem</span>
              {gymRoutine.lastSessionDate && (
                <>
                  <span>·</span>
                  <span>Última sesión: {new Date(gymRoutine.lastSessionDate).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/coach/gym?assign=${athleteId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          Editar rutina →
        </Link>
      </div>

      {/* Workout days */}
      <div className="divide-y divide-gray-50">
        {gymRoutine.days.map((day, i) => (
          <div key={i} className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e0f5e5', color: '#228b22' }}>
                {DAY_NAMES[day.dayOfWeek] ?? `Día ${i + 1}`}
              </span>
              <span className="font-medium text-sm" style={{ color: '#1f2d3d' }}>{day.label}</span>
              <div className="flex items-center gap-1 ml-auto">
                {day.muscleGroups.map(mg => (
                  <span key={mg} className="text-[9px] font-medium px-1.5 py-0.5 rounded-[3px]" style={{ backgroundColor: '#ebedf0', color: '#667080' }}>
                    {MUSCLE_ICONS[mg.toLowerCase()] ?? ''} {mg}
                  </span>
                ))}
              </div>
            </div>

            {/* Exercises table */}
            <div className="bg-gray-50/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase text-gray-400">
                    <th className="text-left px-3 py-2">Ejercicio</th>
                    <th className="text-center px-3 py-2 w-16">Series</th>
                    <th className="text-center px-3 py-2 w-24">Reps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {day.exercises.map((ex, j) => (
                    <tr key={j} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-gray-700">{ex.name}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{ex.sets}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{ex.repsScheme}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GymRoutineProgress({ daysPerWeek }: { daysPerWeek: number }) {
  const totalWeeks = 8
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <h3 className="font-semibold" style={{ color: '#1f2d3d' }}>Progreso de la rutina</h3>
          <span className="text-xs" style={{ color: '#8c99a6' }}>{daysPerWeek} días/sem</span>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: '#ebedf0', color: '#667080' }}>
          Sin datos aún
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {Array.from({ length: totalWeeks }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 min-w-[48px]">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ border: '1px solid #e5e7eb', color: '#9ca3af' }}
            >
              {i + 1}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: '#8c99a6' }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#228b22' }} /> ≥80%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e0660d' }} /> 60-79%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }} /> &lt;60%</span>
      </div>
    </div>
  )
}

function DisciplineCards({
  athleteId, coachSpecialties, sport, onSelectRunning, onSelectCopy, loadAvailablePlans, availablePlans,
}: {
  athleteId: string
  coachSpecialties: string[]
  sport: string | null
  onSelectRunning: () => void
  onSelectCopy: () => void
  loadAvailablePlans: () => void
  availablePlans: { planId: string }[]
}) {
  const canRunning = coachCanDo(coachSpecialties, 'RUNNING')
  const canGym = coachCanDo(coachSpecialties, 'GYM')

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#1f2d3d' }}>Sin plan activo</h2>
          <p className="text-sm" style={{ color: '#8c99a6' }}>Asigna un plan de running o rutina de fuerza para que el atleta comience.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/coach/athletes/${athleteId}/plan/build`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            🗓 Constructor visual
          </Link>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white opacity-40 cursor-not-allowed" style={{ backgroundColor: '#1e3a5f' }}>
            Revisar y aprobar →
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {canRunning && (
          <button
            onClick={onSelectRunning}
            className="relative group text-left border-2 rounded-xl p-5 transition-colors hover:opacity-90"
            style={{ backgroundColor: '#f0f2ff', borderColor: '#1e3a5f' }}
          >
            {sport === 'RUNNING' && (
              <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                ★ Deporte del atleta
              </span>
            )}
            <div className="text-2xl mb-2">🏃</div>
            <h3 className="font-semibold mb-1" style={{ color: '#1f2d3d' }}>Plan de Running</h3>
            <p className="text-xs mb-3" style={{ color: '#667080' }}>Crea un plan periodizado por semanas con zonas FC, distancia y tempo runs</p>
            <span className="text-xs font-semibold" style={{ color: '#ea580c' }}>Crear plan →</span>
          </button>
        )}

        {canGym && (
          <Link
            href={`/coach/gym?assign=${athleteId}`}
            className="relative group text-left border rounded-xl p-5 transition-colors hover:opacity-90"
            style={{ backgroundColor: '#f5edff', borderColor: '#e8dbfa' }}
          >
            {sport === 'STRENGTH' && (
              <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                ★ Deporte del atleta
              </span>
            )}
            <div className="text-2xl mb-2">🏋️</div>
            <h3 className="font-semibold mb-1" style={{ color: '#1f2d3d' }}>Rutina de Fuerza</h3>
            <p className="text-xs mb-3" style={{ color: '#667080' }}>Asigna una rutina de ejercicios con series, cargas y progresión automática</p>
            <span className="text-xs font-semibold" style={{ color: '#ea580c' }}>Asignar rutina →</span>
          </Link>
        )}

        <button
          onClick={() => { onSelectCopy(); if (availablePlans.length === 0) loadAvailablePlans() }}
          className="group text-left border rounded-xl p-5 transition-colors hover:opacity-90"
          style={{ backgroundColor: '#fff7eb', borderColor: '#faebd1' }}
        >
          <div className="text-2xl mb-2">📋</div>
          <h3 className="font-semibold mb-1" style={{ color: '#1f2d3d' }}>Copiar de otro atleta</h3>
          <p className="text-xs mb-3" style={{ color: '#667080' }}>Duplica un plan existente de otro asesorado, ajustando las fechas</p>
          <span className="text-xs font-semibold" style={{ color: '#ea580c' }}>Seleccionar →</span>
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — Plan Progress Timeline
// ══════════════════════════════════════════════════════════════════════════════

function PlanProgressTimeline({
  plan, currentWeekIdx, isRunning, setPlanViewWeekIdx,
}: {
  plan: NonNullable<ActivePlanData>
  currentWeekIdx: number
  isRunning: boolean
  setPlanViewWeekIdx: (fn: (i: number) => number) => void
}) {
  const currentWeek = plan.weeks[currentWeekIdx]
  const adherences = plan.weeks.map((w) => {
    const trainingSessions = w.sessions.filter(s => s.type !== 'DESCANSO')
    if (trainingSessions.length === 0) return null
    const completed = trainingSessions.filter(s => s.log || s.gymLog?.completed).length
    return Math.round((completed / trainingSessions.length) * 100)
  })

  const currentAdh = adherences[currentWeekIdx]
  const totalTraining = currentWeek.sessions.filter(s => s.type !== 'DESCANSO').length
  const totalCompleted = currentWeek.sessions.filter(s => s.log || s.gymLog?.completed).length

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <h3 className="font-semibold" style={{ color: '#1f2d3d' }}>{isRunning ? 'Progreso del plan' : 'Progreso de la rutina'}</h3>
          <span className="text-xs" style={{ color: '#8c99a6' }}>Semana {currentWeek.weekNumber} de {plan.totalWeeks}</span>
        </div>
        {currentAdh != null && (
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              backgroundColor: currentAdh >= 80 ? '#edfaf0' : currentAdh >= 60 ? '#fff5eb' : '#fef2f2',
              color: currentAdh >= 80 ? '#16a251' : currentAdh >= 60 ? '#e0660d' : '#dc2626',
            }}
          >
            Adherencia: {totalCompleted}/{totalTraining} · {currentAdh}%{' '}
            {currentAdh < 60 ? '↓' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center overflow-x-auto pb-2">
        {plan.weeks.map((w, i) => {
          const adh = adherences[i]
          const isCurrent = i === currentWeekIdx
          const isPast = i < currentWeekIdx
          const color = adh == null ? '#d1d5db' : adh >= 80 ? '#16a251' : adh >= 60 ? '#e0660d' : '#dc2626'
          const isLast = i === plan.weeks.length - 1

          return (
            <div key={w.weekNumber} className="flex items-start">
              <button
                onClick={() => setPlanViewWeekIdx(() => i)}
                className="flex flex-col items-center gap-0.5 min-w-[48px]"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    backgroundColor: isCurrent ? '#1e3a5f' : isPast ? '#f3f4f6' : 'transparent',
                    color: isCurrent ? '#fff' : isPast ? '#374151' : '#9ca3af',
                    border: isCurrent ? '3px solid #3870c7' : '1px solid #e5e7eb',
                  }}
                >
                  {w.weekNumber}
                </div>
                {/* Color bar below pill */}
                {(isPast || isCurrent) && adh != null && (
                  <div className="w-5 h-[3px] rounded-full" style={{ backgroundColor: color }} />
                )}
                {/* Adherence % */}
                {(isPast || isCurrent) && adh != null && (
                  <span className="text-[10px] font-bold" style={{ color }}>{adh}%</span>
                )}
              </button>
              {/* Connector line */}
              {!isLast && (
                <div
                  className="self-center mt-0.5"
                  style={{
                    width: 32,
                    height: isPast ? 3 : 1,
                    backgroundColor: isPast ? color : '#e5e7eb',
                    borderRadius: 2,
                    marginTop: 18,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: '#8c99a6' }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16a251' }} /> ≥80%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e0660d' }} /> 60-79%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }} /> &lt;60%</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — Sessions Table
// ══════════════════════════════════════════════════════════════════════════════

const ZONE_COLORS: Record<string, { bg: string; color: string }> = {
  Z1: { bg: '#e0f5e5', color: '#16a251' },
  Z2: { bg: '#e0f5e5', color: '#16a251' },
  Z3: { bg: '#fff2d9', color: '#e0660d' },
  Z4: { bg: '#ffe5e0', color: '#d94d26' },
  Z5: { bg: '#f2d9e0', color: '#b22633' },
}

function parseStructureBlock(line: string): { zone: string | null; duration: string | null; text: string } {
  const parts = line.split('|')
  if (parts.length === 3) {
    const zone = parts[0].trim().toUpperCase()
    const dur = parts[1].trim()
    const text = parts[2].trim()
    return { zone: zone || null, duration: dur || null, text }
  }
  return { zone: null, duration: null, text: line.trim() }
}

function RunningSessionRow({ s, date, notes, savedNotes, savingNotes, handleNoteChange, handleSaveNote }: {
  s: PlanSessionData; date: Date
  notes: Record<string, string>; savedNotes: Record<string, boolean>
  savingNotes: Record<string, boolean>
  handleNoteChange: (id: string, v: string) => void; handleSaveNote: (id: string) => void
}) {
  const isPast = date.getTime() < Date.now()
  const status = getSessionStatus(s, isPast)
  const cfg = STATUS_RUNNING[status]
  const isRest = s.type === 'DESCANSO'

  return (
    <tr className="relative">
      {/* Accent bar */}
      <td className="w-[3px] p-0 align-top">
        <div className="w-[3px] h-full min-h-[40px] rounded-full my-2 ml-2" style={{ backgroundColor: cfg.color }} />
      </td>
      <td className="py-3 pr-4 pl-3 align-top">
        <div className="font-semibold text-sm" style={{ color: '#1f2d3d' }}>{DAY_NAMES[s.dayOfWeek]}</div>
        <div className="text-[10px]" style={{ color: '#8c99a6' }}>{formatDateShort(date)}</div>
      </td>
      <td className="py-3 pr-4 align-top">
        {isRest ? (
          <span className="text-sm text-gray-400">Descanso</span>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {SESSION_TYPE_LABELS[s.type] ?? s.type}
              </span>
              {s.zoneTarget && (() => {
                const zc = ZONE_COLORS[s.zoneTarget] ?? { bg: '#edf2ff', color: '#3870c7' }
                return (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: zc.bg, color: zc.color }}>
                    {s.zoneTarget}
                  </span>
                )
              })()}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {s.durationMin} min{s.detailText ? ` · ${s.detailText}` : ''}
            </p>
          </div>
        )}
      </td>
      <td className="py-3 pr-4 align-top text-xs">
        {isRest ? (
          isPast && <span className="text-green-600 text-xs font-medium">✓ Descanso respetado</span>
        ) : s.structure ? (
          <div className="rounded-lg p-2 space-y-1" style={{ backgroundColor: '#f8f9fb' }}>
            {s.structure.split('\n').filter(Boolean).map((line, i) => {
              const { zone, duration, text } = parseStructureBlock(line)
              const zc = zone ? (ZONE_COLORS[zone] ?? { bg: '#edf2ff', color: '#3870c7' }) : null
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {zc && zone && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: zc.bg, color: zc.color }}>
                      {zone}
                    </span>
                  )}
                  {duration && <span className="font-medium shrink-0" style={{ color: '#667080' }}>{duration}</span>}
                  <span style={{ color: '#4a5568' }}>{text}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-gray-400">
              <span className="font-medium text-gray-500">Plan</span>{' '}
              {s.detailText ? s.detailText : `${s.durationMin} min`}{s.zoneTarget ? ` · ${s.zoneTarget}` : ''}
            </div>
            {s.log && (
              <>
                <div className="text-gray-700">
                  <span className="font-medium text-gray-900">Real</span>{' '}
                  {s.log.distanceKm != null && `${s.log.distanceKm} km · `}
                  {s.log.paceSecPerKm != null && `${formatPace(s.log.paceSecPerKm)} · `}
                  {s.log.hrAvg != null && `FC ${s.log.hrAvg} · `}
                  {s.log.rpe != null && `RPE ${s.log.rpe}`}
                </div>
                {s.log.rpe != null && s.log.rpe >= 7 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    ▲ RPE alto ({s.log.rpe}/10)
                  </span>
                )}
                {s.log.distanceKm != null && s.detailText?.match(/(\d+)\s*km/) && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    ✓ Objetivo cumplido
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </td>
      <td className="py-3 pr-4 align-top">
        {!isRest && (
          <div className="space-y-1">
            {status === 'partial' && s.coachNote && (
              <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fff5eb', color: '#ea580c' }}>AUTO</span>
            )}
            <div className="flex gap-1 items-start">
              <input
                type="text"
                value={notes[s.id] ?? s.coachNote ?? ''}
                onChange={(e) => handleNoteChange(s.id, e.target.value)}
                placeholder="Nota..."
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-200 min-w-0"
              />
              <button
                onClick={() => handleSaveNote(s.id)}
                disabled={savingNotes[s.id]}
                className="shrink-0 text-[10px] px-2 py-1.5 rounded font-medium text-white"
                style={{ backgroundColor: savedNotes[s.id] ? '#16a34a' : '#1e3a5f' }}
              >
                {savingNotes[s.id] ? '...' : savedNotes[s.id] ? '✓' : '💾'}
              </button>
            </div>
          </div>
        )}
      </td>
      <td className="py-3 align-top text-right">
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.icon} {cfg.label}
        </span>
      </td>
    </tr>
  )
}

function GymSessionRow({ s, date, notes, savedNotes, savingNotes, handleNoteChange, handleSaveNote }: {
  s: PlanSessionData; date: Date
  notes: Record<string, string>; savedNotes: Record<string, boolean>
  savingNotes: Record<string, boolean>
  handleNoteChange: (id: string, v: string) => void; handleSaveNote: (id: string) => void
}) {
  const isPast = date.getTime() < Date.now()
  const status = getSessionStatus(s, isPast)
  const cfg = STATUS_GYM[status]
  const isRest = s.type === 'DESCANSO'
  const wd = s.workoutDay

  return (
    <tr className="relative">
      {/* Accent bar */}
      <td className="w-[3px] p-0 align-top">
        <div className="w-[3px] h-full min-h-[40px] rounded-full my-2 ml-2" style={{ backgroundColor: cfg.color }} />
      </td>
      <td className="py-3 pr-4 pl-3 align-top">
        <div className="font-semibold text-sm" style={{ color: '#1f2d3d' }}>{DAY_NAMES[s.dayOfWeek]}</div>
        <div className="text-[10px]" style={{ color: '#8c99a6' }}>{formatDateShort(date)}</div>
      </td>
      <td className="py-3 pr-4 align-top">
        {isRest ? (
          <span className="text-sm" style={{ color: '#8c99a6' }}>Descanso</span>
        ) : wd ? (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">{wd.label}</span>
              <span className="text-xs text-gray-400">{wd.exerciseCount} ej · {wd.totalSets} sets</span>
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {wd.muscleGroups.map((mg) => (
                <span key={mg} className="text-[9px] font-medium px-1.5 py-0.5 rounded-[3px] uppercase" style={{ backgroundColor: '#ebedf0', color: '#667080' }}>
                  {mg}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-500">{SESSION_TYPE_LABELS[s.type] ?? s.type}</span>
        )}
      </td>
      <td className="py-3 pr-4 align-top text-xs">
        {isRest ? (
          isPast && <span className="text-green-600 text-xs font-medium">✓ Descanso respetado</span>
        ) : (
          <div className="space-y-1">
            {wd && (
              <div className="text-gray-400">
                <span className="font-medium text-gray-500">Plan</span>{' '}
                {wd.exerciseCount} ej · {wd.totalSets} sets{wd.totalSets > 0 ? ` · ~${(wd.totalSets * 50).toLocaleString()} kg` : ''}
              </div>
            )}
            {s.gymLog && (
              <>
                <div className="text-gray-700">
                  <span className="font-medium text-gray-900">Real</span>{' '}
                  {s.gymLog.exerciseCount} ej · {s.gymLog.totalSets} sets · {s.gymLog.totalVolume.toLocaleString()} kg
                  {s.gymLog.rpe != null && ` · RPE ${s.gymLog.rpe}`}
                </div>
                {s.gymLog.prs.map((pr, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 mr-1">
                    🏆 PR: {pr.name} {pr.kg} kg
                  </span>
                ))}
                {wd && s.gymLog.exerciseCount < wd.exerciseCount && (() => {
                  const planVol = wd.totalSets * 50
                  const volDelta = planVol > 0 ? Math.round(((s.gymLog!.totalVolume - planVol) / planVol) * 100) : null
                  return (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      ▲ Faltó {wd.exerciseCount - s.gymLog!.exerciseCount} ej{volDelta != null ? ` · volumen ${volDelta}%` : ''}
                    </span>
                  )
                })()}
                {wd && s.gymLog.totalVolume >= wd.totalSets * 50 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    ✓ Volumen objetivo cumplido
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </td>
      <td className="py-3 pr-4 align-top">
        {!isRest && (
          <div className="space-y-1">
            {status === 'partial' && s.coachNote && (
              <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fff5eb', color: '#ea580c' }}>AUTO</span>
            )}
            <div className="flex gap-1 items-start">
              <input
                type="text"
                value={notes[s.id] ?? s.coachNote ?? ''}
                onChange={(e) => handleNoteChange(s.id, e.target.value)}
                placeholder="Nota..."
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-200 min-w-0"
              />
              <button
                onClick={() => handleSaveNote(s.id)}
                disabled={savingNotes[s.id]}
                className="shrink-0 text-[10px] px-2 py-1.5 rounded font-medium text-white"
                style={{ backgroundColor: savedNotes[s.id] ? '#16a34a' : '#1e3a5f' }}
              >
                {savingNotes[s.id] ? '...' : savedNotes[s.id] ? '✓' : '💾'}
              </button>
            </div>
          </div>
        )}
      </td>
      <td className="py-3 align-top text-right">
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.icon} {cfg.label}
        </span>
      </td>
    </tr>
  )
}

function SessionsCard({
  week, weekNumber, planStart, isRunning, athleteId, planId,
  notes, savedNotes, savingNotes, handleNoteChange, handleSaveNote,
}: {
  week: NonNullable<ActivePlanData>['weeks'][number]
  weekNumber: number
  planStart: Date
  isRunning: boolean
  athleteId: string
  planId: string
  notes: Record<string, string>
  savedNotes: Record<string, boolean>
  savingNotes: Record<string, boolean>
  handleNoteChange: (id: string, v: string) => void
  handleSaveNote: (id: string) => void
}) {
  const totalSessions = week.sessions.filter(s => s.type !== 'DESCANSO').length
  const completedCount = week.sessions.filter(s => s.log || s.gymLog?.completed).length

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header with legend + inline CTAs */}
      <div className="px-5 py-2.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold text-[15px]" style={{ color: '#1f2d3d' }}>Sesiones de la semana</h3>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: '#8c99a6' }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: isRunning ? '#16a251' : '#228b22' }} /> Completada</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: isRunning ? '#3870c7' : '#386bb8' }} /> Pendiente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9ea8b8' }} /> Descanso</span>
          </div>
          <span className="text-xs" style={{ color: '#8c99a6' }}>{totalSessions} sesiones · {completedCount} completadas</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/coach/athletes/${athleteId}/plan/build`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
            style={{ borderColor: '#d1d5db', color: '#4a5568' }}
          >
            🗓 Constructor visual
          </Link>
          <Link
            href={isRunning ? `/coach/plan/${planId}/review` : '/coach/gym'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {isRunning ? 'Revisar y aprobar →' : 'Editar rutina →'}
          </Link>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="text-left text-[11px] border-b border-gray-100 uppercase tracking-wide" style={{ color: '#738090' }}>
              <th className="w-[3px]" />
              <th className="pl-3 pr-2 pb-2 pt-3 font-medium w-[50px]">Día</th>
              <th className="pb-2 pt-3 font-medium">{isRunning ? 'Sesión' : 'Rutina'}</th>
              <th className="pb-2 pt-3 font-medium">{isRunning ? 'Plan vs Real' : 'Ejercicios · Volumen'}</th>
              <th className="pb-2 pt-3 font-medium">Nota del coach</th>
              <th className="pb-2 pt-3 pr-5 font-medium text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {week.sessions.map((s) => {
              const date = sessionDate(planStart, weekNumber, s.dayOfWeek)
              const RowComponent = isRunning ? RunningSessionRow : GymSessionRow
              return (
                <RowComponent
                  key={s.id}
                  s={s}
                  date={date}
                  notes={notes}
                  savedNotes={savedNotes}
                  savingNotes={savingNotes}
                  handleNoteChange={handleNoteChange}
                  handleSaveNote={handleSaveNote}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Plan Creation Form (kept from original)
// ══════════════════════════════════════════════════════════════════════════════

function PlanCreationForm({
  planMode, planGoalType, setPlanGoalType, planDaysPerWeek, setPlanDaysPerWeek,
  loadingPlans, availablePlans, copySourcePlanId, setCopySourcePlanId, copyStartDate, setCopyStartDate,
  planGenerating, planError, handleCreatePlan, handleCopyPlan, setCreatingPlan, setPlanMode,
}: Pick<PlanTabProps, 'planMode' | 'planGoalType' | 'setPlanGoalType' | 'planDaysPerWeek' | 'setPlanDaysPerWeek'
  | 'loadingPlans' | 'availablePlans' | 'copySourcePlanId' | 'setCopySourcePlanId' | 'copyStartDate' | 'setCopyStartDate'
  | 'planGenerating' | 'planError' | 'handleCreatePlan' | 'handleCopyPlan' | 'setCreatingPlan' | 'setPlanMode'>) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
      <div className="max-w-md mx-auto space-y-5">
        <h2 className="font-semibold text-gray-900 text-lg">
          {planMode === 'template' ? 'Crear plan de entrenamiento' : 'Copiar plan de otro atleta'}
        </h2>

        {planMode === 'template' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo del plan</label>
              <select value={planGoalType} onChange={(e) => setPlanGoalType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300">
                <option value="RACE_5K">Carrera 5K (8 semanas)</option>
                <option value="RACE_10K">Carrera 10K (12 semanas)</option>
                <option value="STRENGTH_TRAINING">Entrenamiento de fuerza (12 semanas)</option>
                <option value="BODY_RECOMPOSITION">Recomposición corporal (12 semanas)</option>
                <option value="WEIGHT_LOSS">Pérdida de peso</option>
                <option value="GENERAL_FITNESS">Condición general</option>
              </select>
              {TEMPLATE_PREVIEW[planGoalType] && (() => {
                const info = TEMPLATE_PREVIEW[planGoalType]
                return (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-[#1e3a5f]">{info.weeks} semanas</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-600 text-xs">{info.description}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {info.phases.map(p => (
                        <span key={p} className="text-[10px] px-2 py-0.5 bg-white border border-blue-100 rounded-full text-[#1e3a5f] font-medium">{p}</span>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Días por semana</label>
              <select value={planDaysPerWeek} onChange={(e) => setPlanDaysPerWeek(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300">
                {[3, 4, 5, 6].map(d => <option key={d} value={d}>{d} días</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            {loadingPlans ? (
              <p className="text-sm text-gray-400 text-center py-4">Cargando planes disponibles...</p>
            ) : availablePlans.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                No hay planes de otros atletas disponibles para copiar.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan de origen</label>
                  <select value={copySourcePlanId} onChange={(e) => setCopySourcePlanId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300">
                    {availablePlans.map(p => (
                      <option key={p.planId} value={p.planId}>
                        {p.athleteName} — {p.planName} ({p.totalWeeks} sem{p.status === 'ACTIVE' ? ' · activo' : ''})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                  <input type="date" value={copyStartDate} onChange={(e) => setCopyStartDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white" />
                </div>
              </>
            )}
          </>
        )}

        {planError && <p className="text-sm text-red-500">{planError}</p>}

        <div className="flex gap-3">
          <button onClick={() => setCreatingPlan(false)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            ← Volver
          </button>
          <button
            onClick={planMode === 'template' ? handleCreatePlan : handleCopyPlan}
            disabled={planGenerating || (planMode === 'copy' && (!copySourcePlanId || availablePlans.length === 0))}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}>
            {planGenerating ? 'Generando...' : planMode === 'template' ? 'Generar plan' : 'Copiar plan →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════

export default function PlanTab(props: PlanTabProps) {
  const {
    athleteId, athlete, activePlan, healthProfile,
    creatingPlan, setCreatingPlan, planMode, setPlanMode,
    planViewWeekIdx, setPlanViewWeekIdx,
    notes, savedNotes, savingNotes, handleNoteChange, handleSaveNote,
    coachSpecialties, availablePlans, loadAvailablePlans, gymRoutine,
  } = props

  const isRunning = healthProfile?.sport === 'RUNNING'

  // ── Gym routine active (no TrainingPlan, but has AssignedWorkout) ───────
  if (!activePlan && gymRoutine) {
    return (
      <div className="space-y-5">
        {!athlete.onboardingCompleted && <OnboardingBanner />}
        <GymRoutineView athleteId={athleteId} gymRoutine={gymRoutine} />
        <GymRoutineProgress daysPerWeek={gymRoutine.daysPerWeek} />
      </div>
    )
  }

  // ── Empty state (no plan, no routine) ──────────────────────────────────
  if (!activePlan) {
    return (
      <div className="space-y-4">
        {!athlete.onboardingCompleted && <OnboardingBanner />}
        <ProfileCards healthProfile={healthProfile} />

        {!creatingPlan ? (
          <DisciplineCards
            athleteId={athleteId}
            coachSpecialties={coachSpecialties}
            sport={healthProfile?.sport ?? null}
            onSelectRunning={() => { setPlanMode('template'); setCreatingPlan(true) }}
            onSelectCopy={() => { setPlanMode('copy'); setCreatingPlan(true) }}
            loadAvailablePlans={loadAvailablePlans}
            availablePlans={availablePlans}
          />
        ) : (
          <PlanCreationForm {...props} />
        )}
      </div>
    )
  }

  // ── Active plan ──────────────────────────────────────────────────────────
  const week = activePlan.weeks[planViewWeekIdx]
  const load = weekLoadScore(week.sessions)
  const prevLoad = planViewWeekIdx > 0 ? weekLoadScore(activePlan.weeks[planViewWeekIdx - 1].sessions) : null
  const overloadPct = prevLoad != null && prevLoad > 0 ? Math.round(((load - prevLoad) / prevLoad) * 100) : null

  const { start: weekStart, end: weekEnd } = weekDateRange(new Date(activePlan.startDate), week.weekNumber)
  const volKg = isRunning ? null : weekVolumeKg(week.sessions)

  return (
    <div className="space-y-5">
      {/* Week navigator */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlanViewWeekIdx(i => Math.max(0, i - 1))}
              disabled={planViewWeekIdx === 0}
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors disabled:opacity-30"
              style={{ border: '1px solid #d1d5db', color: '#6b7280' }}
            >
              ←
            </button>
            <p className="text-base font-bold" style={{ color: '#1e3a5f' }}>
              Semana {week.weekNumber} de {activePlan.totalWeeks} · {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}
            </p>
            <button
              onClick={() => setPlanViewWeekIdx(i => Math.min(activePlan.weeks.length - 1, i + 1))}
              disabled={planViewWeekIdx === activePlan.weeks.length - 1}
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors disabled:opacity-30"
              style={{ border: '1px solid #d1d5db', color: '#6b7280' }}
            >
              →
            </button>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <span className="text-sm font-bold" style={{ color: '#1e3a5f' }}>Carga: {load} pts</span>
              ) : volKg != null && volKg > 0 ? (
                <span className="text-sm font-bold" style={{ color: '#1e3a5f' }}>Volumen: {volKg.toLocaleString()} kg</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs" style={{ color: '#667080' }}>
            {week.focusDescription ?? `${week.phase} — semana ${week.weekNumber}`}
          </p>
          {overloadPct != null && overloadPct > 10 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={isRunning
                ? { backgroundColor: '#fff5eb', color: '#ea580c' }
                : { backgroundColor: '#edfaf0', color: '#16a251' }
              }
            >
              +{overloadPct}% vs anterior
            </span>
          )}
        </div>
      </div>

      {/* Sessions table */}
      <SessionsCard
        week={week}
        weekNumber={week.weekNumber}
        planStart={new Date(activePlan.startDate)}
        isRunning={isRunning}
        athleteId={athleteId}
        planId={activePlan.id}
        notes={notes}
        savedNotes={savedNotes}
        savingNotes={savingNotes}
        handleNoteChange={handleNoteChange}
        handleSaveNote={handleSaveNote}
      />

      {/* Copy link */}
      <div className="text-right">
        <button
          onClick={() => { setPlanMode('copy'); setCreatingPlan(true) }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {isRunning ? 'Copiar plan de otro atleta' : 'Copiar rutina de otro atleta'}
        </button>
      </div>

      {/* Progress timeline */}
      <PlanProgressTimeline
        plan={activePlan}
        currentWeekIdx={planViewWeekIdx}
        isRunning={isRunning}
        setPlanViewWeekIdx={setPlanViewWeekIdx}
      />
    </div>
  )
}
