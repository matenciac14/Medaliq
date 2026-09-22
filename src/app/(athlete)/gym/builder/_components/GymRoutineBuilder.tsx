'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Search, ChevronLeft, ChevronRight, Check, Dumbbell } from 'lucide-react'

type Exercise = {
  id: string
  name: string
  bodyPart: string
  target: string
  equipment: string
}

type AddedExercise = {
  exerciseId: string
  name: string
  sets: number
  repsScheme: string
}

type DayConfig = {
  dow: number
  label: string
  exercises: AddedExercise[]
}

const DOW_LABELS: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom',
}

const BODY_PART_LABELS: Record<string, string> = {
  back: 'Espalda',
  chest: 'Pecho',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  arms: 'Brazos',
  'upper legs': 'Piernas',
  legs: 'Piernas',
  'lower legs': 'Pantorrillas',
  waist: 'Core',
  cardio: 'Cardio',
  neck: 'Cuello',
}

// Display order for muscle group chips
const BODY_PART_ORDER = ['upper legs', 'chest', 'back', 'shoulders', 'upper arms', 'lower legs', 'waist']

const GOAL_OPTIONS = [
  { value: 'HYPERTROPHY', label: 'Hipertrofia' },
  { value: 'STRENGTH', label: 'Fuerza' },
  { value: 'TONING', label: 'Tonificación' },
  { value: 'FUNCTIONAL', label: 'Funcional' },
]

const LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
]

export default function GymRoutineBuilder({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [routineName, setRoutineName] = useState('')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('')
  const [activeDows, setActiveDows] = useState<Set<number>>(new Set())
  const [days, setDays] = useState<Record<number, DayConfig>>({})
  const [selectedDow, setSelectedDow] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [bodyPartFilter, setBodyPartFilter] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Unique bodyParts present in the exercise catalog, in display order
  const availableBodyParts = useMemo(() => {
    const present = new Set(exercises.map(e => e.bodyPart))
    return BODY_PART_ORDER.filter(bp => present.has(bp))
  }, [exercises])

  // Filtered exercises — bodyPart chip + text search, no arbitrary cap
  const filteredExercises = useMemo(() => {
    let list = exercises
    if (bodyPartFilter) {
      list = list.filter(e => e.bodyPart === bodyPartFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.bodyPart.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q)
      )
    }
    return list
  }, [exercises, searchQuery, bodyPartFilter])

  function toggleDow(dow: number) {
    const next = new Set(activeDows)
    if (next.has(dow)) {
      next.delete(dow)
      const nextDays = { ...days }
      delete nextDays[dow]
      setDays(nextDays)
      if (selectedDow === dow) setSelectedDow(null)
    } else {
      next.add(dow)
      if (!days[dow]) {
        setDays(d => ({ ...d, [dow]: { dow, label: `Día ${DOW_LABELS[dow]}`, exercises: [] } }))
      }
      setSelectedDow(dow)
    }
    setActiveDows(next)
  }

  function updateDayLabel(dow: number, label: string) {
    setDays(d => ({ ...d, [dow]: { ...d[dow], label } }))
  }

  function addExercise(dow: number, ex: Exercise) {
    const day = days[dow]
    if (!day) return
    if (day.exercises.some(e => e.exerciseId === ex.id)) return
    setDays(d => ({
      ...d,
      [dow]: {
        ...d[dow],
        exercises: [
          ...d[dow].exercises,
          { exerciseId: ex.id, name: ex.name, sets: 4, repsScheme: '10-12' },
        ],
      },
    }))
  }

  function removeExercise(dow: number, exerciseId: string) {
    setDays(d => ({
      ...d,
      [dow]: { ...d[dow], exercises: d[dow].exercises.filter(e => e.exerciseId !== exerciseId) },
    }))
  }

  function updateExercise(dow: number, exerciseId: string, field: 'sets' | 'repsScheme', value: string | number) {
    setDays(d => ({
      ...d,
      [dow]: {
        ...d[dow],
        exercises: d[dow].exercises.map(e =>
          e.exerciseId === exerciseId ? { ...e, [field]: value } : e
        ),
      },
    }))
  }

  async function handleSave() {
    if (!routineName.trim()) { setError('Ponle un nombre a tu rutina'); return }
    if (activeDows.size === 0) { setError('Selecciona al menos un día de entrenamiento'); return }

    setSaving(true)
    setError(null)

    try {
      const daysPayload = Array.from(activeDows).sort().map(dow => ({
        dayOfWeek: dow,
        label: days[dow]?.label ?? `Día ${DOW_LABELS[dow]}`,
        muscleGroups: [],
        isRestDay: false,
        exercises: (days[dow]?.exercises ?? []).map((ex, i) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          repsScheme: ex.repsScheme,
          order: i,
        })),
      }))

      const restDays = [1,2,3,4,5,6,7].filter(d => !activeDows.has(d)).map(dow => ({
        dayOfWeek: dow,
        label: 'Descanso',
        muscleGroups: [],
        isRestDay: true,
        exercises: [],
      }))

      const res = await fetch('/api/athlete/gym/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routineName.trim(),
          goal: goal || null,
          level: level || null,
          daysPerWeek: activeDows.size,
          days: [...daysPayload, ...restDays],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? 'Error creando la rutina')
      }

      const template = await res.json() as { id: string }

      const assignRes = await fetch('/api/athlete/gym/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      })

      if (!assignRes.ok) {
        const err = await assignRes.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? 'Error activando la rutina')
      }

      router.push('/gym')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const sortedActiveDows = Array.from(activeDows).sort()

  return (
    <div className={`px-4 py-6 md:px-8 md:py-8 mx-auto space-y-6 ${step === 3 ? 'max-w-7xl' : 'max-w-2xl'}`}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <a href="/gym" className="text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronLeft size={20} />
        </a>
        <div>
          <h1 className="text-xl font-bold text-[#1e3a5f]">Crear mi rutina</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Paso {step} de 3 · {step === 1 ? 'Nombre y objetivo' : step === 2 ? 'Días de entrenamiento' : 'Ejercicios por día'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#ea580c] rounded-full transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {/* ─── Step 1: Name + metadata ─── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Nombre de la rutina <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Mi rutina Push Pull Legs"
              value={routineName}
              onChange={e => setRoutineName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">Objetivo</label>
              <div className="space-y-1.5">
                {GOAL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGoal(g => g === opt.value ? '' : opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      goal === opt.value
                        ? 'bg-[#ea580c] text-white border-[#ea580c]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">Nivel</label>
              <div className="space-y-1.5">
                {LEVEL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLevel(l => l === opt.value ? '' : opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      level === opt.value
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (!routineName.trim()) { setError('El nombre es obligatorio'); return }
              setError(null)
              setStep(2)
            }}
            className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Continuar <ChevronRight size={16} />
          </button>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* ─── Step 2: Day selector ─── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              ¿Qué días entrenas?
            </p>
            <p className="text-xs text-gray-400 mb-4">Selecciona los días de entrenamiento. Los días restantes quedan como descanso.</p>

            <div className="grid grid-cols-7 gap-2">
              {[1,2,3,4,5,6,7].map(dow => {
                const isActive = activeDows.has(dow)
                return (
                  <button
                    key={dow}
                    onClick={() => toggleDow(dow)}
                    className={`flex flex-col items-center py-3 px-1 rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-[#ea580c] bg-[#ea580c]/5 text-[#ea580c]'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold">{DOW_LABELS[dow]}</span>
                    {isActive && <Check size={14} className="mt-1" />}
                  </button>
                )
              })}
            </div>

            {activeDows.size > 0 && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                {activeDows.size} día{activeDows.size > 1 ? 's' : ''} de entrenamiento por semana
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft size={16} /> Atrás
            </button>
            <button
              onClick={() => {
                if (activeDows.size === 0) { setError('Selecciona al menos 1 día'); return }
                setError(null)
                setSelectedDow(sortedActiveDows[0] ?? null)
                setStep(3)
              }}
              className="flex-1 py-3 rounded-xl bg-[#1e3a5f] text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Continuar <ChevronRight size={16} />
            </button>
          </div>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* ─── Step 3: Exercises per day ─── */}
      {step === 3 && (
        <div className="space-y-4">

          {/* Day tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sortedActiveDows.map(dow => (
              <button
                key={dow}
                onClick={() => setSelectedDow(dow)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                  selectedDow === dow
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {DOW_LABELS[dow]}
                {(days[dow]?.exercises.length ?? 0) > 0 && (
                  <span className="ml-1.5 text-[10px] bg-[#ea580c] text-white px-1.5 py-0.5 rounded-full">
                    {days[dow].exercises.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 2-col: editor + agregar ejercicio */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* ── MAIN: Day editor ──────────────────────────── */}
            <div className="space-y-4">
              {selectedDow !== null && days[selectedDow] && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Day label */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={days[selectedDow].label}
                        onChange={e => updateDayLabel(selectedDow, e.target.value)}
                        placeholder="Ej: Push — Pecho y Hombros"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#1e3a5f]"
                      />
                    </div>
                    {days[selectedDow].exercises.length > 0 && (
                      <p className="text-xs text-gray-400 shrink-0">{days[selectedDow].exercises.length} ejercicios</p>
                    )}
                  </div>

                  {/* Added exercises */}
                  {days[selectedDow].exercises.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {days[selectedDow].exercises.map(ex => (
                        <div key={ex.exerciseId} className="px-5 py-3 flex items-center gap-3">
                          <Dumbbell size={14} className="text-[#ea580c] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{ex.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="number"
                                min={1} max={10}
                                value={ex.sets}
                                onChange={e => updateExercise(selectedDow, ex.exerciseId, 'sets', parseInt(e.target.value) || 1)}
                                className="w-14 border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-[#1e3a5f]"
                              />
                              <span className="text-xs text-gray-400">series ×</span>
                              <input
                                type="text"
                                value={ex.repsScheme}
                                onChange={e => updateExercise(selectedDow, ex.exerciseId, 'repsScheme', e.target.value)}
                                className="w-16 border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-[#1e3a5f]"
                                placeholder="10-12"
                              />
                              <span className="text-xs text-gray-400">reps</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeExercise(selectedDow, ex.exerciseId)}
                            className="text-gray-300 hover:text-red-400 transition-colors p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-8 text-center text-gray-400 text-sm">
                      Agrega ejercicios desde el panel de la derecha
                    </div>
                  )}
                </div>
              )}

              {/* Summary + actions */}
              <div className="bg-gray-50 rounded-xl px-5 py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700">{routineName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {sortedActiveDows.length} días · {Object.values(days).reduce((acc, d) => acc + d.exercises.length, 0)} ejercicios totales
                  </p>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={16} /> Atrás
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[#ea580c] text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {saving ? 'Guardando...' : 'Activar rutina'}
                </button>
              </div>
            </div>

            {/* ── SIDEBAR: Agregar ejercicio ─────────────────── */}
            {selectedDow !== null && days[selectedDow] && (
              <aside className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit sticky top-6">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-[#1e3a5f]">Agregar ejercicio</h3>
                </div>

                <div className="px-5 py-3">
                  {/* Text search */}
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar ejercicio..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setBodyPartFilter(null) }}
                      className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
                    />
                  </div>

                  {/* Muscle group chips */}
                  {!searchQuery.trim() && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {availableBodyParts.map(bp => (
                        <button
                          key={bp}
                          onClick={() => setBodyPartFilter(f => f === bp ? null : bp)}
                          className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                            bodyPartFilter === bp
                              ? 'bg-[#ea580c] text-white border-[#ea580c]'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {BODY_PART_LABELS[bp] ?? bp}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Exercise list */}
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {filteredExercises.map(ex => {
                      const alreadyAdded = days[selectedDow].exercises.some(e => e.exerciseId === ex.id)
                      return (
                        <button
                          key={ex.id}
                          onClick={() => addExercise(selectedDow, ex)}
                          disabled={alreadyAdded}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                            alreadyAdded
                              ? 'bg-green-50 text-green-700 cursor-default'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ex.name}</p>
                            <p className="text-[10px] text-gray-400">
                              {BODY_PART_LABELS[ex.bodyPart] ?? ex.bodyPart} · {ex.target}
                            </p>
                          </div>
                          {alreadyAdded
                            ? <Check size={14} className="shrink-0 text-green-500" />
                            : <Plus size={14} className="shrink-0 text-[#ea580c]" />
                          }
                        </button>
                      )
                    })}
                    {filteredExercises.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-3">
                        {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Sin ejercicios en esta categoría'}
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
