'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────

interface ExerciseOption {
  id: string
  name: string
  nameEs?: string
  bodyPart: string
  target: string
  equipment: string
  gif?: string
  coachId: string | null
}

interface DayExercise {
  exerciseId: string
  sets: number
  repsScheme: string
  restSeconds: number | ''
  setType: string
  notes: string
  order: number
}

interface DayConfig {
  dayOfWeek: number
  label: string
  muscleGroups: string[]
  isRestDay: boolean
  warmupNotes: string
  cardioNotes: string
  exercises: DayExercise[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

const GOAL_OPTIONS = [
  { value: 'HYPERTROPHY', label: 'Hipertrofia' },
  { value: 'STRENGTH', label: 'Fuerza' },
  { value: 'TONING', label: 'Tonificación' },
  { value: 'FUNCTIONAL', label: 'Funcional' },
  { value: 'ENDURANCE', label: 'Resistencia' },
]

const LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
]

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  QUADRICEPS: 'Cuádriceps',
  HAMSTRINGS: 'Isquiotibiales',
  GLUTES: 'Glúteos',
  CHEST: 'Pecho',
  BACK: 'Espalda',
  SHOULDERS: 'Hombros',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  ABS: 'Abdomen',
  CALVES: 'Gemelos',
  FULL_BODY: 'Cuerpo completo',
}

const ALL_MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_LABELS)

const SET_TYPES = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'SUPERSET', label: 'Superset' },
  { value: 'BISERIE', label: 'Biserie' },
  { value: 'DROPSET', label: 'Dropset' },
  { value: 'CIRCUIT', label: 'Circuito' },
]

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// ─── Helper ────────────────────────────────────────────────────────────────

function buildInitialDays(count: number): DayConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    dayOfWeek: i + 1,
    label: DAY_LABELS[i] ?? `Día ${i + 1}`,
    muscleGroups: [],
    isRestDay: false,
    warmupNotes: '',
    cardioNotes: '',
    exercises: [],
  }))
}

function blankExercise(order: number): DayExercise {
  return {
    exerciseId: '',
    sets: 4,
    repsScheme: '12-10-8-8',
    restSeconds: 90,
    setType: 'NORMAL',
    notes: '',
    order,
  }
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function NewRoutinePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1 — Basic info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('HYPERTROPHY')
  const [level, setLevel] = useState('INTERMEDIATE')
  const [daysPerWeek, setDaysPerWeek] = useState(4)

  // Step 2 — Day config
  const [days, setDays] = useState<DayConfig[]>(buildInitialDays(4))

  // Step 3 — Exercise library
  const [exerciseLib, setExerciseLib] = useState<ExerciseOption[]>([])
  const [libLoading, setLibLoading] = useState(false)
  const [activeDay, setActiveDay] = useState(0)

  // Step 4 — Submit
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When daysPerWeek changes, rebuild days array preserving existing config
  useEffect(() => {
    setDays((prev) => {
      const next = buildInitialDays(daysPerWeek)
      return next.map((d, i) => (prev[i] ? { ...d, ...prev[i], dayOfWeek: d.dayOfWeek } : d))
    })
  }, [daysPerWeek])

  // Fetch exercise library when entering step 3
  useEffect(() => {
    if (step === 3 && exerciseLib.length === 0) {
      setLibLoading(true)
      fetch('/api/coach/gym/exercises?limit=100')
        .then((r) => r.json())
        .then((data) => setExerciseLib(Array.isArray(data?.exercises) ? data.exercises : []))
        .catch(() => {})
        .finally(() => setLibLoading(false))
    }
  }, [step, exerciseLib.length])

  // ── Day config helpers ──────────────────────────────────────────────────

  function updateDay(index: number, patch: Partial<DayConfig>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function toggleDayMuscle(dayIndex: number, muscle: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        const mg = d.muscleGroups.includes(muscle)
          ? d.muscleGroups.filter((m) => m !== muscle)
          : [...d.muscleGroups, muscle]
        return { ...d, muscleGroups: mg }
      })
    )
  }

  // ── Exercise helpers ────────────────────────────────────────────────────

  function addExercise(dayIndex: number) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        return { ...d, exercises: [...d.exercises, blankExercise(d.exercises.length)] }
      })
    )
  }

  function updateExercise(dayIndex: number, exIndex: number, patch: Partial<DayExercise>) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        const exercises = d.exercises.map((ex, j) => (j === exIndex ? { ...ex, ...patch } : ex))
        return { ...d, exercises }
      })
    )
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        const exercises = d.exercises.filter((_, j) => j !== exIndex).map((ex, j) => ({ ...ex, order: j }))
        return { ...d, exercises }
      })
    )
  }

  function moveExercise(dayIndex: number, exIndex: number, dir: 'up' | 'down') {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        const exs = [...d.exercises]
        const target = dir === 'up' ? exIndex - 1 : exIndex + 1
        if (target < 0 || target >= exs.length) return d
        ;[exs[exIndex], exs[target]] = [exs[target], exs[exIndex]]
        return { ...d, exercises: exs.map((ex, j) => ({ ...ex, order: j })) }
      })
    )
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/coach/gym/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, goal, level, daysPerWeek, days }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar la rutina')
      }

      router.push('/coach/gym')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1 validation ───────────────────────────────────────────────────

  function canGoStep2() {
    return name.trim().length >= 2
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/coach/gym"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
        >
          <span>←</span> Volver al gym
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
          Nueva rutina
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s === step
                  ? 'text-white'
                  : s < step
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
              style={s === step ? { backgroundColor: '#ea580c' } : {}}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-8 ${s < step ? 'bg-green-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm text-gray-500">
          {step === 1 && 'Información básica'}
          {step === 2 && 'Configurar días'}
          {step === 3 && 'Agregar ejercicios'}
          {step === 4 && 'Revisar y guardar'}
        </div>
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la rutina <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Programa Vittoz — Fase I"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivo general, a quién está dirigida..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800"
              >
                {GOAL_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800"
              >
                {LEVEL_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Días por semana: <span className="font-bold" style={{ color: '#ea580c' }}>{daysPerWeek}</span>
            </label>
            <input
              type="range"
              min={1}
              max={7}
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              className="w-full accent-orange-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span><span>7</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canGoStep2()}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#ea580c' }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="space-y-4">
          {days.map((day, dayIndex) => (
            <div key={day.dayOfWeek} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{DAY_LABELS[dayIndex] ?? `Día ${dayIndex + 1}`}</h3>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.isRestDay}
                    onChange={(e) => updateDay(dayIndex, { isRestDay: e.target.checked })}
                    className="accent-orange-600"
                  />
                  Día de descanso
                </label>
              </div>

              {!day.isRestDay && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta del día</label>
                    <input
                      type="text"
                      value={day.label}
                      onChange={(e) => updateDay(dayIndex, { label: e.target.value })}
                      placeholder={`${DAY_LABELS[dayIndex]} — Cuádriceps y Gemelos`}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Músculos trabajados</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_MUSCLE_GROUPS.map((mg) => (
                        <button
                          key={mg}
                          type="button"
                          onClick={() => toggleDayMuscle(dayIndex, mg)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                            day.muscleGroups.includes(mg)
                              ? 'border-orange-400 bg-orange-50 text-orange-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {MUSCLE_GROUP_LABELS[mg]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Calentamiento</label>
                      <textarea
                        value={day.warmupNotes}
                        onChange={(e) => updateDay(dayIndex, { warmupNotes: e.target.value })}
                        placeholder="5 min bici + movilidad de cadera..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cardio / finisher</label>
                      <textarea
                        value={day.cardioNotes}
                        onChange={(e) => updateDay(dayIndex, { cardioNotes: e.target.value })}
                        placeholder="10 min escaladora intensidad media..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {day.isRestDay && (
                <p className="text-sm text-gray-400 italic">Sin entrenamiento — día de recuperación activa</p>
              )}
            </div>
          ))}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
            >
              ← Atrás
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#ea580c' }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Day tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeDay === i
                    ? 'text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                style={activeDay === i ? { backgroundColor: '#1e3a5f' } : {}}
              >
                {DAY_LABELS[i] ?? `Día ${i + 1}`}
                {day.isRestDay && ' 😴'}
              </button>
            ))}
          </div>

          {days[activeDay]?.isRestDay ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Día de descanso — sin ejercicios
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{days[activeDay]?.label || DAY_LABELS[activeDay]}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {days[activeDay]?.exercises.length} ejercicio{days[activeDay]?.exercises.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => addExercise(activeDay)}
                  className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#ea580c' }}
                >
                  + Agregar
                </button>
              </div>

              {libLoading && (
                <p className="text-sm text-gray-400">Cargando biblioteca...</p>
              )}

              {days[activeDay]?.exercises.length === 0 && !libLoading && (
                <p className="text-sm text-gray-400 text-center py-6">
                  No hay ejercicios. Haz clic en &quot;+ Agregar&quot; para comenzar.
                </p>
              )}

              <div className="space-y-3">
                {days[activeDay]?.exercises.map((ex, exIndex) => (
                  <div
                    key={exIndex}
                    className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">EJERCICIO {exIndex + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveExercise(activeDay, exIndex, 'up')}
                          disabled={exIndex === 0}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveExercise(activeDay, exIndex, 'down')}
                          disabled={exIndex === (days[activeDay]?.exercises.length ?? 0) - 1}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => removeExercise(activeDay, exIndex)}
                          className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:text-red-600 text-xs ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Exercise select + EX-10 GIF preview */}
                    <div className="flex gap-3 items-start">
                      <select
                        value={ex.exerciseId}
                        onChange={(e) => updateExercise(activeDay, exIndex, { exerciseId: e.target.value })}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 bg-white"
                      >
                        <option value="">Seleccionar ejercicio...</option>
                        {exerciseLib.map((lib) => (
                          <option key={lib.id} value={lib.id}>
                            {lib.nameEs ?? lib.name}{!lib.coachId ? '' : ' (tuyo)'}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const sel = exerciseLib.find(e => e.id === ex.exerciseId)
                        return sel?.gif ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sel.gif}
                            alt={sel.nameEs ?? sel.name}
                            title={sel.nameEs ?? sel.name}
                            className="w-16 h-16 rounded-lg object-contain bg-gray-50 border border-gray-100 shrink-0"
                          />
                        ) : null
                      })()}
                    </div>

                    {/* Sets row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Series</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={ex.sets}
                          onChange={(e) => updateExercise(activeDay, exIndex, { sets: Number(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none text-gray-800 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Reps / Esquema</label>
                        <input
                          type="text"
                          value={ex.repsScheme}
                          onChange={(e) => updateExercise(activeDay, exIndex, { repsScheme: e.target.value })}
                          placeholder="12-10-8"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none text-gray-800 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Descanso (seg)</label>
                        <input
                          type="number"
                          min={0}
                          step={15}
                          value={ex.restSeconds}
                          onChange={(e) => updateExercise(activeDay, exIndex, { restSeconds: Number(e.target.value) })}
                          placeholder="90"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none text-gray-800 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Tipo de set</label>
                        <select
                          value={ex.setType}
                          onChange={(e) => updateExercise(activeDay, exIndex, { setType: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none text-gray-800 bg-white"
                        >
                          {SET_TYPES.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Notes */}
                    <input
                      type="text"
                      value={ex.notes}
                      onChange={(e) => updateExercise(activeDay, exIndex, { notes: e.target.value })}
                      placeholder="Notas para este ejercicio..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none text-gray-800 bg-white placeholder-gray-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
            >
              ← Atrás
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#ea580c' }}
            >
              Revisar →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4 ── */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Resumen de la rutina</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <SummaryItem label="Nombre" value={name} />
              <SummaryItem label="Objetivo" value={GOAL_OPTIONS.find((g) => g.value === goal)?.label ?? goal} />
              <SummaryItem label="Nivel" value={LEVEL_OPTIONS.find((l) => l.value === level)?.label ?? level} />
              <SummaryItem label="Días/semana" value={String(daysPerWeek)} />
            </div>

            <div className="space-y-2">
              {days.map((day, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-t border-gray-100 first:border-t-0">
                  <span className="text-xs font-semibold text-gray-400 w-16 shrink-0 pt-0.5">
                    {DAY_LABELS[i] ?? `Día ${i + 1}`}
                  </span>
                  {day.isRestDay ? (
                    <span className="text-sm text-gray-400">Descanso</span>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{day.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {day.exercises.length} ejercicio{day.exercises.length !== 1 ? 's' : ''}
                        {day.muscleGroups.length > 0 && ` · ${day.muscleGroups.map((mg) => MUSCLE_GROUP_LABELS[mg] ?? mg).join(', ')}`}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
            >
              ← Atrás
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#ea580c' }}
            >
              {loading ? 'Guardando...' : 'Guardar rutina'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
