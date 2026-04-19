'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AthleteFeatureToggles from './AthleteFeatureToggles'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AthleteData = {
  id: string
  name: string | null
  email: string
  createdAt: Date
}

export type HealthProfileData = {
  age: number
  weightKg: number
  weightGoalKg: number | null
  hrResting: number | null
  hrMax: number | null
  heightCm: number
  injuries: string[]
  conditions: string[]
} | null

export type PlanWeekData = {
  weekNumber: number
  phase: string
  focusDescription: string | null
  isRecoveryWeek: boolean
  sessions: {
    dayOfWeek: number
    type: string
    durationMin: number
    detailText: string | null
    zoneTarget: string | null
  }[]
}

export type ActivePlanData = {
  id: string
  name: string
  totalWeeks: number
  startDate: Date
  status: string
  weeks: PlanWeekData[]
} | null

export type CheckInData = {
  id: string
  weekNumber: number
  recordedAt: Date
  weightKg: number | null
  hrResting: number | null
  sleepScore: number | null
  energyLevel: number | null
  dietAdherencePct: number | null
  painFlag: boolean
}

export type NutritionPlanData = {
  tdee: number
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
} | null

export type InitialFeatures = {
  plan: boolean
  checkin: boolean
  nutrition: boolean
  progress: boolean
}

// ─── Gym Types ───────────────────────────────────────────────────────────────

type GymExerciseLog = {
  exerciseId: string
  name: string
  muscleGroups: string[]
  logs: {
    date: string
    sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null }[]
  }[]
}

// ─── Day name map ─────────────────────────────────────────────────────────────

const DAY_NAMES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2',
  FARTLEK: 'Fartlek',
  TEMPO: 'Tempo',
  INTERVALOS: 'Intervalos',
  TIRADA_LARGA: 'Tirada larga',
  FUERZA: 'Fuerza',
  CICLA: 'Ciclismo',
  NATACION: 'Natación',
  DESCANSO: 'Descanso',
  TEST: 'Test',
  SIMULACRO: 'Simulacro',
  OTRO: 'Otro',
}

const TABS = ['Resumen', 'Plan', 'Progreso', 'Nutrición', 'Gym']

// ─── Props ────────────────────────────────────────────────────────────────────

interface AthleteDetailClientProps {
  athleteId: string
  athlete: AthleteData
  healthProfile: HealthProfileData
  activePlan: ActivePlanData
  recentCheckIns: CheckInData[]
  nutritionPlan: NutritionPlanData
  initialFeatures: InitialFeatures
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AthleteDetailClient({
  athleteId,
  athlete,
  healthProfile,
  activePlan,
  recentCheckIns,
  nutritionPlan,
  initialFeatures,
}: AthleteDetailClientProps) {
  const [activeTab, setActiveTab] = useState('Resumen')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({})

  // Gym tab state
  const [gymLogs, setGymLogs] = useState<GymExerciseLog[]>([])
  const [gymLoading, setGymLoading] = useState(false)
  const [gymLoaded, setGymLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Gym' || gymLoaded) return
    setGymLoading(true)
    fetch(`/api/coach/gym/athlete/${athleteId}/logs`)
      .then((r) => r.json())
      .then((data) => {
        setGymLogs(Array.isArray(data) ? data : [])
        setGymLoaded(true)
      })
      .catch(() => setGymLogs([]))
      .finally(() => setGymLoading(false))
  }, [activeTab, gymLoaded, athleteId])

  function handleNoteChange(key: string, value: string) {
    setNotes((prev) => ({ ...prev, [key]: value }))
    setSavedNotes((prev) => ({ ...prev, [key]: false }))
  }

  function handleSaveNote(key: string) {
    setSavedNotes((prev) => ({ ...prev, [key]: true }))
  }

  // HR zones calculation
  const hrMaxValue = healthProfile?.hrMax ?? (healthProfile?.age ? 220 - healthProfile.age : 185)
  const zones = [
    { label: 'Z1 — Recuperación', min: Math.round(hrMaxValue * 0.5), max: Math.round(hrMaxValue * 0.6) },
    { label: 'Z2 — Base aeróbica', min: Math.round(hrMaxValue * 0.6), max: Math.round(hrMaxValue * 0.7) },
    { label: 'Z3 — Tempo', min: Math.round(hrMaxValue * 0.7), max: Math.round(hrMaxValue * 0.8) },
    { label: 'Z4 — Umbral', min: Math.round(hrMaxValue * 0.8), max: Math.round(hrMaxValue * 0.9) },
    { label: 'Z5 — VO2max', min: Math.round(hrMaxValue * 0.9), max: hrMaxValue },
  ]

  // Derived data for Resumen
  const latestCheckIn = recentCheckIns[0] ?? null
  const checkInsSorted = [...recentCheckIns].sort((a, b) => a.weekNumber - b.weekNumber)

  const weights = checkInsSorted.map((c) => c.weightKg).filter((w): w is number => w !== null)
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0

  // Last check-in days ago
  const lastCheckInDaysAgo = latestCheckIn
    ? Math.floor((Date.now() - new Date(latestCheckIn.recordedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Alerts based on real data
  const alerts: string[] = []
  if (recentCheckIns.length === 0) {
    alerts.push('Sin check-ins registrados aún')
  }
  if (lastCheckInDaysAgo !== null && lastCheckInDaysAgo >= 7) {
    alerts.push(`Check-in pendiente hace ${lastCheckInDaysAgo} días`)
  }
  if (latestCheckIn?.painFlag) {
    alerts.push('Reporte de dolor en el último check-in')
  }
  if (latestCheckIn?.hrResting !== null && latestCheckIn?.hrResting !== undefined &&
      healthProfile?.hrResting !== null && healthProfile?.hrResting !== undefined &&
      latestCheckIn.hrResting > healthProfile.hrResting + 10) {
    alerts.push('FC reposo elevada respecto al valor basal')
  }

  // Display name initials
  const displayName = athlete.name ?? athlete.email
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Plan info from config (via activePlan or healthProfile)
  const currentWeekLabel = activePlan ? `Semana activa desde ${new Date(activePlan.startDate).toLocaleDateString('es-CO')}` : null

  return (
    <div className="px-4 py-4 lg:p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/coach/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        ← Volver al panel
      </Link>

      {/* Athlete header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
          <p className="text-sm text-gray-500">{athlete.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="px-3 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap shrink-0"
            style={
              activeTab === t
                ? { color: '#1e3a5f', borderBottom: '2px solid #1e3a5f', marginBottom: '-1px' }
                : { color: '#6b7280' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab: Resumen ──────────────────────────────────────────────────────── */}
      {activeTab === 'Resumen' && (
        <div className="space-y-6">
          {/* Perfil */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Perfil del atleta</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Peso actual" value={healthProfile?.weightKg ? `${healthProfile.weightKg} kg` : '—'} />
              <Stat label="Peso objetivo" value={healthProfile?.weightGoalKg ? `${healthProfile.weightGoalKg} kg` : '—'} />
              <Stat label="FC reposo" value={healthProfile?.hrResting ? `${healthProfile.hrResting} bpm` : '—'} />
              <Stat
                label="Adherencia"
                value={
                  latestCheckIn?.dietAdherencePct != null
                    ? `${latestCheckIn.dietAdherencePct}%`
                    : '—'
                }
              />
              <Stat
                label="Plan"
                value={activePlan ? activePlan.name : 'Sin plan activo'}
              />
              <Stat
                label="Semanas"
                value={activePlan ? `${activePlan.weeks.length}/${activePlan.totalWeeks}` : '—'}
              />
              <Stat
                label="Último check-in"
                value={lastCheckInDaysAgo !== null ? `Hace ${lastCheckInDaysAgo} días` : 'Sin datos'}
              />
              <Stat label="Email" value={athlete.email} />
            </div>
          </div>

          {/* Zonas FC */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Zonas de frecuencia cardíaca</h2>
            <div className="space-y-2">
              {zones.map((z, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: ['#93c5fd', '#4ade80', '#facc15', '#fb923c', '#f87171'][i] }}
                  />
                  <span className="text-gray-700 w-44">{z.label}</span>
                  <span className="text-gray-500 font-mono text-xs">
                    {z.min} – {z.max} bpm
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          {alerts.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5">
              <h2 className="font-semibold text-red-800 mb-3">Alertas activas</h2>
              <ul className="space-y-2">
                {alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <span>⚠</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acceso del atleta */}
          <AthleteFeatureToggles
            athleteId={athleteId}
            initialFeatures={initialFeatures}
          />

          {/* Últimos check-ins tabla */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
            <h2 className="font-semibold text-gray-900 mb-4">Últimos check-ins</h2>
            {checkInsSorted.length === 0 ? (
              <p className="text-sm text-gray-400">Sin check-ins registrados aún.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Semana</th>
                    <th className="pb-2 font-medium">Peso</th>
                    <th className="pb-2 font-medium">FC reposo</th>
                    <th className="pb-2 font-medium">Sueño</th>
                    <th className="pb-2 font-medium">Energía</th>
                    <th className="pb-2 font-medium">Adherencia</th>
                    <th className="pb-2 font-medium">Dolor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {checkInsSorted.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 font-medium text-gray-700">S{c.weekNumber}</td>
                      <td className="py-2.5 text-gray-600">{c.weightKg != null ? `${c.weightKg} kg` : '—'}</td>
                      <td className="py-2.5 text-gray-600">{c.hrResting != null ? `${c.hrResting} bpm` : '—'}</td>
                      <td className="py-2.5 text-gray-600">{c.sleepScore != null ? `${c.sleepScore}/100` : '—'}</td>
                      <td className="py-2.5 text-gray-600">{c.energyLevel != null ? `${c.energyLevel}/10` : '—'}</td>
                      <td className="py-2.5 text-gray-600">{c.dietAdherencePct != null ? `${c.dietAdherencePct}%` : '—'}</td>
                      <td className="py-2.5">
                        {c.painFlag ? (
                          <span className="text-red-600 font-medium">Sí</span>
                        ) : (
                          <span className="text-green-600">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Plan ─────────────────────────────────────────────────────────── */}
      {activeTab === 'Plan' && (
        <div className="space-y-6">
          {/* Review CTA */}
          <div className="flex justify-end">
            <Link
              href={`/coach/plan/${athleteId}/review`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Revisar y aprobar →
            </Link>
          </div>

          {!activePlan ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">📋</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin plan activo</h2>
              <p className="text-gray-400 text-sm">El atleta aún no tiene un plan de entrenamiento activo</p>
            </div>
          ) : (
            activePlan.weeks.map((week) => (
              <div key={week.weekNumber} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold mb-1" style={{ color: '#1e3a5f' }}>
                  {week.phase} — semana {week.weekNumber}
                  {week.isRecoveryWeek && (
                    <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Recuperación
                    </span>
                  )}
                </h2>
                {week.focusDescription && (
                  <p className="text-xs text-gray-500 mb-3">{week.focusDescription}</p>
                )}
                <div className="space-y-4">
                  {week.sessions.map((session, si) => {
                    const noteKey = `${week.weekNumber}-${si}`
                    return (
                      <div key={si} className="border-l-2 pl-4" style={{ borderColor: '#f97316' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-400 uppercase">
                            {DAY_NAMES[session.dayOfWeek] ?? `Día ${session.dayOfWeek}`}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {SESSION_TYPE_LABELS[session.type] ?? session.type}
                          </span>
                          <span className="text-xs text-gray-400">{session.durationMin} min</span>
                        </div>
                        {session.detailText && (
                          <p className="text-xs text-gray-500 mb-2">{session.detailText}</p>
                        )}
                        {session.zoneTarget && (
                          <p className="text-xs text-blue-600 mb-2">Zona: {session.zoneTarget}</p>
                        )}
                        <div className="flex gap-2 items-start">
                          <textarea
                            rows={2}
                            placeholder="Nota del coach..."
                            value={notes[noteKey] ?? ''}
                            onChange={(e) => handleNoteChange(noteKey, e.target.value)}
                            className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 text-gray-700 placeholder-gray-300"
                          />
                          <button
                            onClick={() => handleSaveNote(noteKey)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: savedNotes[noteKey] ? '#16a34a' : '#1e3a5f' }}
                          >
                            {savedNotes[noteKey] ? '✓ Guardado' : 'Guardar nota'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {week.sessions.length === 0 && (
                    <p className="text-xs text-gray-400">Sin sesiones planificadas para esta semana</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Progreso ─────────────────────────────────────────────────────── */}
      {activeTab === 'Progreso' && (
        <div className="space-y-6">
          {checkInsSorted.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">📊</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin datos de progreso</h2>
              <p className="text-gray-400 text-sm">El atleta aún no ha completado check-ins</p>
            </div>
          ) : (
            <>
              {/* Tabla de check-ins */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
                <h2 className="font-semibold text-gray-900 mb-4">Historial de check-ins</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium">Semana</th>
                      <th className="pb-2 font-medium">Peso (kg)</th>
                      <th className="pb-2 font-medium">FC reposo</th>
                      <th className="pb-2 font-medium">Sueño</th>
                      <th className="pb-2 font-medium">Energía</th>
                      <th className="pb-2 font-medium">Adherencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {checkInsSorted.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 font-medium text-gray-700">S{c.weekNumber}</td>
                        <td className="py-2.5 text-gray-600">{c.weightKg ?? '—'}</td>
                        <td className="py-2.5 text-gray-600">{c.hrResting ?? '—'}</td>
                        <td className="py-2.5 text-gray-600">{c.sleepScore ?? '—'}</td>
                        <td className="py-2.5 text-gray-600">{c.energyLevel ?? '—'}</td>
                        <td className="py-2.5 text-gray-600">
                          {c.dietAdherencePct != null ? `${c.dietAdherencePct}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Curva de peso */}
              {weights.length > 1 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-5">Curva de peso</h2>
                  <div className="flex items-end gap-4 h-28">
                    {checkInsSorted
                      .filter((c) => c.weightKg !== null)
                      .map((c, idx, arr) => {
                        const range = maxWeight - minWeight || 1
                        const heightPct = (((c.weightKg as number) - minWeight) / range) * 70 + 30
                        return (
                          <div key={c.id} className="flex flex-col items-center gap-1 flex-1">
                            <span className="text-xs text-gray-500 font-mono">{c.weightKg}</span>
                            <div
                              className="w-full rounded-t-md transition-all"
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: '#1e3a5f',
                                opacity: 0.7 + (idx / arr.length) * 0.3,
                              }}
                            />
                            <span className="text-xs text-gray-400">S{c.weekNumber}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Adherencia */}
              {checkInsSorted.some((c) => c.dietAdherencePct !== null) && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-5">Adherencia semanal</h2>
                  <div className="space-y-3">
                    {checkInsSorted
                      .filter((c) => c.dietAdherencePct !== null)
                      .map((c) => (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-6">S{c.weekNumber}</span>
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${c.dietAdherencePct}%`,
                                backgroundColor:
                                  (c.dietAdherencePct ?? 0) >= 70
                                    ? '#16a34a'
                                    : (c.dietAdherencePct ?? 0) >= 40
                                    ? '#d97706'
                                    : '#dc2626',
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-9 text-right">
                            {c.dietAdherencePct}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Nutrición ────────────────────────────────────────────────────── */}
      {activeTab === 'Nutrición' && (
        <div className="space-y-6">
          {!nutritionPlan ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-4">🥗</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Sin plan nutricional</h2>
              <p className="text-gray-400 text-sm">El atleta aún no tiene un plan nutricional generado</p>
            </div>
          ) : (
            <>
              {/* TDEE & targets */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Targets calóricos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <Stat label="TDEE base" value={`${nutritionPlan.tdee} kcal`} />
                  <Stat label="Día duro" value={`${nutritionPlan.targetKcalHard} kcal`} />
                  <Stat label="Día fácil" value={`${nutritionPlan.targetKcalEasy} kcal`} />
                  <Stat label="Día descanso" value={`${nutritionPlan.targetKcalRest} kcal`} />
                </div>
              </div>

              {/* Macros */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Macronutrientes</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <Stat label="Proteína" value={`${nutritionPlan.proteinG} g`} />
                  <Stat label="Carbs (duro)" value={`${nutritionPlan.carbsHardG} g`} />
                  <Stat label="Carbs (fácil)" value={`${nutritionPlan.carbsEasyG} g`} />
                  <Stat label="Grasas" value={`${nutritionPlan.fatG} g`} />
                </div>
              </div>

              {/* Context */}
              {healthProfile && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-sm text-gray-600">
                  <p>
                    Calculado para{' '}
                    <strong>{healthProfile.weightKg} kg</strong>
                    {healthProfile.weightGoalKg && (
                      <> con objetivo de <strong>{healthProfile.weightGoalKg} kg</strong></>
                    )}
                    {activePlan && <>, durante el plan <strong>{activePlan.name}</strong></>}.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Gym ──────────────────────────────────────────────────────────── */}
      {activeTab === 'Gym' && (
        <div className="space-y-5">
          {gymLoading && (
            <div className="text-center py-16 text-gray-400 text-sm">Cargando logs de gym...</div>
          )}

          {!gymLoading && gymLogs.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">🏋️</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin sesiones registradas</h2>
              <p className="text-gray-400 text-sm">El atleta aún no ha completado sesiones de gym</p>
            </div>
          )}

          {!gymLoading &&
            gymLogs.map((ex) => {
              const maxGymWeight = Math.max(
                1,
                ...ex.logs.flatMap((l) => l.sets.map((s) => s.weightKg ?? 0))
              )

              return (
                <div key={ex.exerciseId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{ex.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ex.muscleGroups.slice(0, 3).map((mg) => (
                          <span
                            key={mg}
                            className="text-[10px] font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] px-1.5 py-0.5 rounded-full"
                          >
                            {mg}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {ex.logs.length} sesión{ex.logs.length !== 1 ? 'es' : ''}
                    </span>
                  </div>

                  {/* Mini bar chart */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Peso máximo por sesión (kg)</p>
                    <div className="flex items-end gap-1.5 h-16">
                      {ex.logs.map((log, li) => {
                        const sessionMax = Math.max(0, ...log.sets.map((s) => s.weightKg ?? 0))
                        const heightPct = maxGymWeight > 0 ? (sessionMax / maxGymWeight) * 100 : 0
                        return (
                          <div key={li} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                            <span className="text-[9px] text-gray-400 font-mono truncate w-full text-center">
                              {sessionMax > 0 ? `${sessionMax}` : '—'}
                            </span>
                            <div
                              className="w-full rounded-t-sm transition-all"
                              style={{
                                height: `${Math.max(heightPct, 4)}%`,
                                backgroundColor: '#f97316',
                                opacity: 0.5 + (li / ex.logs.length) * 0.5,
                              }}
                            />
                            <span className="text-[8px] text-gray-300 truncate w-full text-center">
                              {log.date.slice(5)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Last session detail */}
                  {ex.logs.length > 0 &&
                    (() => {
                      const last = ex.logs[ex.logs.length - 1]
                      return (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Última sesión — {last.date}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {last.sets.map((s) => (
                              <div
                                key={s.setNumber}
                                className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
                              >
                                <span className="font-bold text-[#1e3a5f] w-4 text-center">
                                  {s.setNumber}
                                </span>
                                <span className="text-gray-500">
                                  {s.weightKg != null ? `${s.weightKg} kg` : '—'} ×{' '}
                                  {s.repsCompleted ?? '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}
