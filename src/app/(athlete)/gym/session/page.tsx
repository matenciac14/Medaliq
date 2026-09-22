'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { translateMuscleGroup } from '@/lib/gym/labels'
import MuscleMapWeb, { buildSessionMuscleData } from '@/components/MuscleMapWeb'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Timer,
  Loader2,
  X,
} from 'lucide-react'
import ShareMilestoneButton from '@/app/(athlete)/_components/ShareMilestoneButton'

// ─── Types ──────────────────────────────────────────────────────────────────

type ExerciseData = {
  id: string
  name: string
  muscleGroups: string[]
  equipment: string
  category: string
  description: string | null
  tips: string | null
  gif: string | null
}

type PickerExercise = { id: string; name: string; bodyPart: string; gif: string | null }

type WorkoutExercise = {
  id: string
  order: number
  sets: number
  repsScheme: string
  restSeconds: number | null
  notes: string | null
  setType: string
  supersetWith: string | null
  suggestedNextWeightKg: number | null
  exercise: ExerciseData
}

type PreviousLog = {
  workoutExerciseId: string
  setNumber: number
  weightKg: number | null
  repsCompleted: number | null
}

type SessionData = {
  assignedWorkoutId: string | null
  plannedSessionId: string | null
  templateName: string
  dayOfWeek: number
  isRestDay: boolean
  workoutDay: {
    id: string
    label: string
    muscleGroups: string[]
    warmupNotes: string | null
    cardioNotes: string | null
  } | null
  exercises: WorkoutExercise[]
  previousLogs: PreviousLog[]
  freeSession?: boolean
}

type SetState = {
  weightKg: string
  repsCompleted: string
  completed: boolean
}

// exerciseId -> setIndex (0-based) -> SetState
type SetsMap = Record<string, SetState[]>

type FreeExercise = { id: string; name: string }

// ─── Session Timer ───────────────────────────────────────────────────────────

function useSessionTimer() {
  const startRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const display = `${minutes}:${String(seconds).padStart(2, '0')}`
  return { display, minutes }
}

// ─── Rest Timer ──────────────────────────────────────────────────────────────

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) {
      onDone()
      return
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, onDone])

  const pct = ((seconds - remaining) / seconds) * 100

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-3">
      <Timer size={18} className="text-blue-500 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-blue-700">Descanso</span>
          <span className="text-sm font-bold text-blue-700">{remaining}s</span>
        </div>
        <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <button
        onClick={onDone}
        className="text-blue-400 hover:text-blue-600 transition-colors"
        aria-label="Saltar descanso"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ─── Complete Modal ───────────────────────────────────────────────────────────

type EnergyState = 'EXHAUSTED' | 'NORMAL' | 'ENERGIZED'
type Discomfort = 'NONE' | 'MILD' | 'MODERATE'

const ENERGY_OPTIONS: { value: EnergyState; emoji: string; label: string }[] = [
  { value: 'EXHAUSTED', emoji: '😮‍💨', label: 'Agotado' },
  { value: 'NORMAL', emoji: '😊', label: 'Normal' },
  { value: 'ENERGIZED', emoji: '💪', label: 'Con energía' },
]

const DISCOMFORT_OPTIONS: { value: Discomfort; emoji: string; label: string }[] = [
  { value: 'NONE', emoji: '✅', label: 'Sin molestias' },
  { value: 'MILD', emoji: '⚡', label: 'Leve' },
  { value: 'MODERATE', emoji: '⚠️', label: 'Moderada' },
]

function CompleteModal({
  onSubmit,
  onSkip,
  loading,
  defaultDuration,
}: {
  onSubmit: (data: { rpe: number; durationMin: number; notes: string; energyState?: EnergyState; discomfort?: Discomfort }) => void
  onSkip: () => void
  loading: boolean
  defaultDuration: number
}) {
  const [rpe, setRpe] = useState(7)
  const [durationMin, setDurationMin] = useState(defaultDuration)
  const [notes, setNotes] = useState('')
  const [energyState, setEnergyState] = useState<EnergyState | null>(null)
  const [discomfort, setDiscomfort] = useState<Discomfort | null>(null)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1e3a5f]">Sesion completada</h2>
          <p className="text-sm text-gray-500 mt-0.5">¿Cómo fue tu sesión de hoy?</p>
        </div>

        <div className="px-6 space-y-5 pb-5">
          {/* Energy State */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2.5">¿Cómo saliste?</label>
            <div className="grid grid-cols-3 gap-2">
              {ENERGY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEnergyState(opt.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${
                    energyState === opt.value
                      ? 'border-[#ea580c] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className={`text-xs font-semibold ${energyState === opt.value ? 'text-[#ea580c]' : 'text-gray-600'}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RPE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Esfuerzo percibido (RPE)</label>
              <span className="text-lg font-bold text-[#ea580c]">{rpe}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="w-full accent-[#ea580c]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Muy fácil</span>
              <span>Máximo esfuerzo</span>
            </div>
          </div>

          {/* Discomfort */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2.5">¿Alguna molestia?</label>
            <div className="grid grid-cols-3 gap-2">
              {DISCOMFORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDiscomfort(opt.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${
                    discomfort === opt.value
                      ? 'border-[#ea580c] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className={`text-xs font-semibold ${discomfort === opt.value ? 'text-[#ea580c]' : 'text-gray-600'}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Duración (minutos)</label>
            <input
              type="number"
              min={1}
              max={300}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea580c]/40 focus:border-[#ea580c]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="¿Alguna observación sobre la sesión?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#ea580c]/40 focus:border-[#ea580c]"
            />
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => onSubmit({
              rpe,
              durationMin,
              notes,
              energyState: energyState ?? undefined,
              discomfort: discomfort ?? undefined,
            })}
            disabled={loading}
            className="w-full bg-[#ea580c] hover:bg-orange-600 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Guardar y continuar
          </button>
          <button
            onClick={onSkip}
            disabled={loading}
            className="w-full text-gray-400 hover:text-gray-600 text-sm font-medium py-2 transition-colors"
          >
            Saltar por ahora
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTargetReps(scheme: string): number | null {
  const first = scheme.split(/[-,x ]/)[0].trim()
  const n = parseInt(first)
  return isNaN(n) ? null : n
}

// ─── Superset Styles ─────────────────────────────────────────────────────────

const SUPERSET_STYLES: Record<string, { hexColor: string; bgClass: string; textClass: string; label: string }> = {
  SUPERSET: { hexColor: '#a78bfa', bgClass: 'bg-purple-50', textClass: 'text-purple-700', label: 'Superset' },
  BISERIE:  { hexColor: '#818cf8', bgClass: 'bg-indigo-50', textClass: 'text-indigo-700', label: 'Biserie'  },
  DROPSET:  { hexColor: '#fb7185', bgClass: 'bg-rose-50',   textClass: 'text-rose-500',   label: 'Drop Set' },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GymSessionPage() {
  const router = useRouter()
  const { data: authSession } = useSession()
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { display: timerDisplay, minutes: elapsedMinutes } = useSessionTimer()

  // sets state: workoutExercise.id -> array of SetState
  const [setsMap, setSetsMap] = useState<SetsMap>({})

  // which exercises are expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // rest timer state: workoutExerciseId that just completed a set
  const [activeTimer, setActiveTimer] = useState<{ weId: string; seconds: number } | null>(null)

  // modal
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newPRs, setNewPRs] = useState<{ exerciseName: string | null; weightKg: number | null }[]>([])

  // free session state
  const [freeExercises, setFreeExercises] = useState<FreeExercise[]>([])
  const [newExerciseName, setNewExerciseName] = useState('')

  // exercise picker
  const [showPicker, setShowPicker] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerResults, setPickerResults] = useState<PickerExercise[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)

  useEffect(() => {
    if (pickerQuery.length < 2) { setPickerResults([]); return }
    setPickerLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/athlete/gym/exercises/search?q=${encodeURIComponent(pickerQuery)}`)
        const data = await res.json()
        setPickerResults(data.exercises ?? [])
      } finally {
        setPickerLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [pickerQuery])

  // Fetch session data on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/athlete/gym/session/today')
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Error cargando la sesión')
          return
        }
        const data: SessionData = await res.json()
        setSessionData(data)

        // Initialize setsMap
        const initial: SetsMap = {}
        for (const we of data.exercises) {
          initial[we.id] = Array.from({ length: we.sets }, (_, idx) => {
            const prev = data.previousLogs.find(
              (l) => l.workoutExerciseId === we.id && l.setNumber === idx + 1
            )
            return {
              weightKg: we.suggestedNextWeightKg != null ? String(we.suggestedNextWeightKg) : '',
              repsCompleted: '',
              completed: false,
              _prevWeight: prev?.weightKg ?? null,
              _prevReps: prev?.repsCompleted ?? null,
            } as SetState & { _prevWeight: number | null; _prevReps: number | null }
          })
        }
        setSetsMap(initial)

        // Expand first exercise by default
        if (data.exercises.length > 0) {
          setExpanded(new Set([data.exercises[0].id]))
        }
      } catch {
        setError('No se pudo cargar la sesión')
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [])

  const prevLogsMap = useRef<Record<string, Record<number, PreviousLog>>>({})
  useEffect(() => {
    if (!sessionData) return
    const map: Record<string, Record<number, PreviousLog>> = {}
    for (const log of sessionData.previousLogs) {
      if (!map[log.workoutExerciseId]) map[log.workoutExerciseId] = {}
      map[log.workoutExerciseId][log.setNumber] = log
    }
    prevLogsMap.current = map
  }, [sessionData])

  const toggleExpanded = useCallback((weId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(weId)) next.delete(weId)
      else next.add(weId)
      return next
    })
  }, [])

  const updateSet = useCallback((weId: string, setIdx: number, field: 'weightKg' | 'repsCompleted', value: string) => {
    setSetsMap((prev) => {
      const copy = { ...prev }
      copy[weId] = copy[weId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
      return copy
    })
  }, [])

  const addFreeExercise = useCallback(() => {
    const name = newExerciseName.trim()
    if (!name) return
    const id = `free-${Date.now()}`
    setFreeExercises((prev) => [...prev, { id, name }])
    setSetsMap((prev) => ({ ...prev, [id]: [{ weightKg: '', repsCompleted: '', completed: false }] }))
    setExpanded((prev) => { const n = new Set(prev); n.add(id); return n })
    setNewExerciseName('')
  }, [newExerciseName])

  const selectPickerExercise = useCallback((ex: PickerExercise) => {
    const id = `free-${Date.now()}`
    setFreeExercises((prev) => [...prev, { id, name: ex.name }])
    setSetsMap((prev) => ({ ...prev, [id]: [{ weightKg: '', repsCompleted: '', completed: false }] }))
    setExpanded((prev) => { const n = new Set(prev); n.add(id); return n })
    setShowPicker(false)
    setPickerQuery('')
    setPickerResults([])
  }, [])

  const addFreeSet = useCallback((feId: string) => {
    setSetsMap((prev) => ({
      ...prev,
      [feId]: [...(prev[feId] ?? []), { weightKg: '', repsCompleted: '', completed: false }],
    }))
  }, [])

  const toggleSetDone = useCallback((weId: string, setIdx: number, restSeconds: number | null) => {
    setSetsMap((prev) => {
      const copy = { ...prev }
      const wasCompleted = copy[weId][setIdx].completed
      copy[weId] = copy[weId].map((s, i) => i === setIdx ? { ...s, completed: !wasCompleted } : s)
      if (!wasCompleted && restSeconds && restSeconds > 0) {
        setActiveTimer({ weId, seconds: restSeconds })
      }
      return copy
    })
  }, [])

  // Calculate progress
  const { completedSets, totalSets } = (() => {
    let done = 0
    let total = 0
    for (const sets of Object.values(setsMap)) {
      total += sets.length
      done += sets.filter((s) => s.completed).length
    }
    return { completedSets: done, totalSets: total }
  })()

  // Can finish if at least one set logged per exercise (or no exercises)
  const canFinish = sessionData?.freeSession
    ? freeExercises.length > 0 && freeExercises.some((fe) => setsMap[fe.id]?.some((s) => s.completed))
    : sessionData?.exercises.length === 0
      || sessionData?.exercises.every((we) => setsMap[we.id]?.some((s) => s.completed)) === true

  const handleComplete = useCallback(async (data: { rpe: number; durationMin: number; notes: string; energyState?: EnergyState; discomfort?: Discomfort }) => {
    const { rpe, durationMin, notes, energyState, discomfort } = data
    if (!sessionData) return
    setSubmitting(true)

    const sets: {
      workoutExerciseId?: string
      exerciseName?: string
      setNumber: number
      weightKg: number | null
      repsCompleted: number | null
      completed: boolean
    }[] = []

    if (sessionData.freeSession) {
      for (const fe of freeExercises) {
        const feSets = setsMap[fe.id] ?? []
        feSets.forEach((s, idx) => {
          sets.push({
            exerciseName: fe.name,
            setNumber: idx + 1,
            weightKg: s.weightKg !== '' ? parseFloat(s.weightKg) : null,
            repsCompleted: s.repsCompleted !== '' ? parseInt(s.repsCompleted) : null,
            completed: s.completed,
          })
        })
      }
    } else {
      for (const we of sessionData.exercises) {
        const weSets = setsMap[we.id] ?? []
        weSets.forEach((s, idx) => {
          sets.push({
            workoutExerciseId: we.id,
            setNumber: idx + 1,
            weightKg: s.weightKg !== '' ? parseFloat(s.weightKg) : null,
            repsCompleted: s.repsCompleted !== '' ? parseInt(s.repsCompleted) : null,
            completed: s.completed,
          })
        })
      }
    }

    try {
      const res = await fetch('/api/athlete/gym/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedWorkoutId: sessionData.assignedWorkoutId ?? undefined,
          plannedSessionId: sessionData.plannedSessionId ?? undefined,
          dayOfWeek: sessionData.dayOfWeek,
          rpe,
          durationMin,
          energyState,
          discomfort,
          notes,
          sets,
        }),
      })

      if (!res.ok) throw new Error('Error guardando sesión')

      const data = await res.json()
      if (data.newPRs?.length > 0) {
        setNewPRs(data.newPRs)
        setTimeout(() => router.push('/gym?completed=1'), 3000)
      } else {
        router.push('/gym?completed=1')
      }
    } catch {
      setSubmitting(false)
      alert('Error al guardar la sesión. Intenta de nuevo.')
    }
  }, [sessionData, setsMap, router])

  if (!authSession?.user?.features?.gym) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <span className="text-5xl">🏋️</span>
        <h2 className="text-xl font-bold text-[#1e3a5f]">Tracker de ejercicios disponible en Pro</h2>
        <p className="text-gray-500 text-sm max-w-xs">Registra tus sesiones de ejercicios con el plan Pro.</p>
        <a href="/upgrade" className="mt-2 inline-block rounded-xl bg-[#ea580c] text-white px-6 py-3 text-sm font-semibold hover:bg-[#ea6c0a] transition-colors">Ver planes → Pro $9.99/mes</a>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-[#1e3a5f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto">
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-gray-600 hover:text-[#ea580c] transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  if (!sessionData || sessionData.isRestDay) {
    return (
      <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">😴</p>
          <p className="font-semibold text-gray-700 text-lg">Día de descanso</p>
          <p className="text-sm text-gray-500 mt-1">Disfruta tu recuperación</p>
          <button
            onClick={() => router.push('/gym')}
            className="mt-5 text-sm font-medium text-[#1e3a5f] hover:text-[#ea580c] transition-colors"
          >
            ← Volver al gym
          </button>
        </div>
      </div>
    )
  }

  const { workoutDay, exercises } = sessionData

  // Compute superset pairs for bracket rendering
  const supersetInfo = new Map<string, { isFirst: boolean; setType: string }>()
  for (const ex of exercises) {
    if (ex.supersetWith && !supersetInfo.has(ex.id)) {
      supersetInfo.set(ex.id, { isFirst: true, setType: ex.setType })
      if (!supersetInfo.has(ex.supersetWith)) {
        supersetInfo.set(ex.supersetWith, { isFirst: false, setType: ex.setType })
      }
    }
    if (!supersetInfo.has(ex.id)) {
      const initiator = exercises.find((e) => e.supersetWith === ex.id)
      if (initiator) supersetInfo.set(ex.id, { isFirst: false, setType: initiator.setType })
    }
  }

  return (
    <div className="px-4 py-6 md:px-8 max-w-7xl mx-auto pb-40 md:pb-8">
      {/* Header — full width */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/gym')}
            className="text-gray-400 hover:text-[#ea580c] transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#1e3a5f] leading-tight">
              {sessionData.templateName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {workoutDay?.label}
              {workoutDay?.muscleGroups && workoutDay.muscleGroups.length > 0 && (
                <>
                  {' · '}
                  {workoutDay.muscleGroups.map((mg) => (
                    <span key={mg} className="inline-flex items-center text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full mr-1">
                      {translateMuscleGroup(mg)}
                    </span>
                  ))}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 flex items-center gap-4">
          <div>
            <p className="text-3xl font-bold text-[#ea580c] tabular-nums">{timerDisplay}</p>
          </div>
          <div className="text-sm text-gray-500">
            <p className="font-semibold">{completedSets}/{totalSets}</p>
            <p className="text-xs">series</p>
          </div>
          <button
            onClick={() => router.push('/gym')}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Cancelar sesión
          </button>
        </div>
      </div>

      {/* ── 2-COL LAYOUT ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* ── MAIN: Exercise tracker ─────────────────────────── */}
        <div className="space-y-5">

      {/* Warmup notes */}
      {workoutDay?.warmupNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Calentamiento: </span>{workoutDay.warmupNotes}
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-3">
        {exercises.map((we, exIdx) => {
          const sets = setsMap[we.id] ?? []
          const isExpanded = expanded.has(we.id)
          const completedCount = sets.filter((s) => s.completed).length
          const allDone = completedCount === sets.length && sets.length > 0
          const showTimer = activeTimer?.weId === we.id
          const targetReps = parseTargetReps(we.repsScheme)
          const allRepsHit =
            allDone &&
            targetReps !== null &&
            sets.every((s) => {
              const reps = parseInt(s.repsCompleted)
              return !isNaN(reps) && reps >= targetReps
            })

          const ssInfo = supersetInfo.get(we.id)
          const ssStyle = ssInfo ? (SUPERSET_STYLES[ssInfo.setType] ?? SUPERSET_STYLES.SUPERSET) : null

          return (
            <div
              key={we.id}
              className={`bg-white border rounded-xl overflow-hidden transition-colors ${
                allDone ? 'border-green-200' : 'border-gray-200'
              }`}
              style={ssInfo && ssStyle ? { borderLeftWidth: 4, borderLeftColor: ssStyle.hexColor } : undefined}
            >
              {/* Superset label */}
              {ssInfo?.isFirst && ssStyle && (
                <div className={`px-4 py-1.5 flex items-center gap-1.5 border-b border-gray-100 ${ssStyle.bgClass}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${ssStyle.textClass}`}>↕ {ssStyle.label}</span>
                </div>
              )}
              {/* Exercise header */}
              <button
                onClick={() => toggleExpanded(we.id)}
                className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                  allDone ? 'bg-green-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  allDone ? 'bg-green-500 text-white' : 'bg-[#1e3a5f] text-white'
                }`}>
                  {allDone ? '✓' : exIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${allDone ? 'text-green-700' : 'text-gray-900'}`}>
                    {we.exercise.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">{we.sets} series · {we.repsScheme} reps</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                      {we.exercise.equipment}
                    </span>
                    {we.setType !== 'NORMAL' && (
                      <span className="text-xs bg-[#ea580c]/10 text-[#ea580c] px-1.5 py-0.5 rounded font-semibold">
                        {we.setType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{completedCount}/{sets.length}</span>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  {/* GIF demo */}
                  {we.exercise.gif && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={we.exercise.gif}
                      alt={we.exercise.name}
                      className="w-full max-h-48 object-contain rounded-lg bg-gray-50"
                    />
                  )}

                  {/* Description/tips */}
                  {(we.exercise.description || we.exercise.tips) && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 space-y-1">
                      {we.exercise.description && <p>{we.exercise.description}</p>}
                      {we.exercise.tips && <p className="text-[#1e3a5f] font-medium">💡 {we.exercise.tips}</p>}
                    </div>
                  )}

                  {/* Reps scheme guide */}
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Objetivo: </span>{we.repsScheme} reps
                    {we.restSeconds ? <span className="ml-2">· Descanso: {we.restSeconds}s</span> : null}
                  </p>
                  {we.notes && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{we.notes}</p>
                  )}

                  {/* Sets */}
                  <div className="space-y-2">
                    {sets.map((s, setIdx) => {
                      const prevLog = prevLogsMap.current[we.id]?.[setIdx + 1]
                      const extSet = s as SetState & { _prevWeight?: number | null; _prevReps?: number | null }

                      return (
                        <div
                          key={setIdx}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all ${
                            s.completed
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          {/* Set badge */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            s.completed ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {setIdx + 1}
                          </div>

                          {/* Inputs */}
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1">
                              {(prevLog?.weightKg != null || extSet._prevWeight != null) && (
                                <p className="text-[10px] text-gray-400 mb-0.5">
                                  Última: {prevLog?.weightKg ?? extSet._prevWeight} kg
                                </p>
                              )}
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step={0.5}
                                placeholder="kg"
                                value={s.weightKg}
                                onChange={(e) => updateSet(we.id, setIdx, 'weightKg', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#ea580c]/40 focus:border-[#ea580c] min-w-0"
                              />
                            </div>
                            <span className="text-gray-400 text-sm">×</span>
                            <div className="flex-1">
                              {(prevLog?.repsCompleted != null || extSet._prevReps != null) && (
                                <p className="text-[10px] text-gray-400 mb-0.5">
                                  Última: {prevLog?.repsCompleted ?? extSet._prevReps} reps
                                </p>
                              )}
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                placeholder="reps"
                                value={s.repsCompleted}
                                onChange={(e) => updateSet(we.id, setIdx, 'repsCompleted', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#ea580c]/40 focus:border-[#ea580c] min-w-0"
                              />
                            </div>
                          </div>

                          {/* Done button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSetDone(we.id, setIdx, we.restSeconds) }}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                              s.completed
                                ? 'bg-green-500 text-white scale-110'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            aria-label={s.completed ? 'Desmarcar serie' : 'Marcar serie completa'}
                          >
                            <CheckCircle2 size={20} />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Rest timer */}
                  {showTimer && (
                    <RestTimer
                      seconds={activeTimer!.seconds}
                      onDone={() => setActiveTimer(null)}
                    />
                  )}

                  {/* Progression suggestion */}
                  {allRepsHit && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                      <span className="text-base">🏋️</span>
                      <div>
                        <p className="text-xs font-bold text-green-700">+2.5 kg recomendado</p>
                        <p className="text-[10px] text-green-600">Completaste todos los reps objetivo — sube el peso la próxima sesión</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Free session — exercise adder */}
      {sessionData.freeSession && (
        <div className="space-y-3">
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#1e3a5f]/30 hover:border-[#1e3a5f]/60 text-[#1e3a5f] font-semibold text-sm py-3.5 rounded-xl transition-colors"
          >
            + Agregar ejercicio
          </button>

          {/* Picker modal */}
          {showPicker && createPortal(
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-3">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar ejercicio (ej: sentadilla, press...)"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea580c]/40 focus:border-[#ea580c]"
                  />
                  <button onClick={() => { setShowPicker(false); setPickerQuery(''); setPickerResults([]) }} className="text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                    <X size={20} />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 py-2">
                  {pickerLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-gray-400" />
                    </div>
                  )}
                  {!pickerLoading && pickerQuery.length >= 2 && pickerResults.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">Sin resultados para &ldquo;{pickerQuery}&rdquo;</p>
                  )}
                  {!pickerLoading && pickerQuery.length < 2 && (
                    <p className="text-xs text-gray-400 text-center py-6">Escribe al menos 2 letras para buscar</p>
                  )}
                  {pickerResults.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => selectPickerExercise(ex)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      {ex.gif ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ex.gif} alt={ex.name} className="w-10 h-10 rounded-lg object-contain bg-gray-100 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{ex.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{ex.bodyPart}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )}

          {freeExercises.map((fe, feIdx) => {
            const feSets = setsMap[fe.id] ?? []
            const isExpanded = expanded.has(fe.id)
            const completedCount = feSets.filter((s) => s.completed).length
            const allDone = completedCount === feSets.length && feSets.length > 0

            return (
              <div
                key={fe.id}
                className={`bg-white border rounded-xl overflow-hidden transition-colors ${allDone ? 'border-green-200' : 'border-gray-200'}`}
              >
                <button
                  onClick={() => toggleExpanded(fe.id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors ${allDone ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${allDone ? 'bg-green-500 text-white' : 'bg-[#1e3a5f] text-white'}`}>
                    {allDone ? '✓' : feIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${allDone ? 'text-green-700' : 'text-gray-900'}`}>{fe.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{completedCount}/{feSets.length} series completadas</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                    {feSets.map((s, setIdx) => (
                      <div
                        key={setIdx}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all ${s.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.completed ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {setIdx + 1}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="number" inputMode="decimal" min={0} step={0.5} placeholder="kg"
                            value={s.weightKg}
                            onChange={(e) => updateSet(fe.id, setIdx, 'weightKg', e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#ea580c]/40 focus:border-[#ea580c] min-w-0"
                          />
                          <span className="text-gray-400 text-sm">×</span>
                          <input
                            type="number" inputMode="numeric" min={0} placeholder="reps"
                            value={s.repsCompleted}
                            onChange={(e) => updateSet(fe.id, setIdx, 'repsCompleted', e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#ea580c]/40 focus:border-[#ea580c] min-w-0"
                          />
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSetDone(fe.id, setIdx, null) }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${s.completed ? 'bg-green-500 text-white scale-110' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                          aria-label={s.completed ? 'Desmarcar serie' : 'Marcar serie completa'}
                        >
                          <CheckCircle2 size={20} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => addFreeSet(fe.id)}
                      className="w-full text-center text-xs text-gray-500 hover:text-[#ea580c] border border-dashed border-gray-300 rounded-lg py-2 transition-colors"
                    >
                      + Serie
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Cardio notes */}
      {workoutDay?.cardioNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <span className="font-semibold">Cardio: </span>{workoutDay.cardioNotes}
        </div>
      )}

      {/* Finish button — desktop inline */}
      <div className="hidden md:block pt-2">
        <button
          onClick={() => setShowModal(true)}
          disabled={!canFinish}
          className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
            canFinish
              ? 'bg-[#ea580c] hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {canFinish ? 'Finalizar sesión' : sessionData.freeSession ? 'Agrega al menos 1 ejercicio y 1 serie' : `Completa al menos 1 serie por ejercicio (${completedSets}/${totalSets})`}
        </button>
      </div>
        </div>{/* end main col */}

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside className="hidden lg:block space-y-6">
          {/* Mapa muscular */}
          {workoutDay?.muscleGroups && workoutDay.muscleGroups.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm sticky top-6">
              <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3">Músculos de esta sesión</h3>
              <div className="flex justify-center mb-3">
                <MuscleMapWeb
                  data={buildSessionMuscleData([
                    ...workoutDay.muscleGroups,
                    ...exercises.flatMap(we => we.exercise.muscleGroups),
                  ])}
                  mode="session"
                  compact={true}
                />
              </div>
              {workoutDay.muscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {workoutDay.muscleGroups.map(mg => (
                    <span key={mg} className="text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full">
                      {translateMuscleGroup(mg)}
                    </span>
                  ))}
                </div>
              )}

              {/* Exercise progress list */}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ejercicios</p>
                <div className="space-y-2">
                  {exercises.map((we) => {
                    const sets = setsMap[we.id] ?? []
                    const doneCount = sets.filter(s => s.completed).length
                    const allDone = doneCount === sets.length && sets.length > 0
                    const isCurrent = expanded.has(we.id)
                    return (
                      <button
                        key={we.id}
                        onClick={() => toggleExpanded(we.id)}
                        className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg transition-colors ${isCurrent ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`w-3 h-3 rounded-full shrink-0 ${allDone ? 'bg-green-500' : isCurrent ? 'bg-[#1e3a5f]' : 'bg-gray-200'}`} />
                        <span className={`text-sm truncate ${allDone ? 'text-green-700' : isCurrent ? 'font-semibold text-[#1e3a5f]' : 'text-gray-600'}`}>
                          {we.exercise.name}
                        </span>
                        {allDone && <CheckCircle2 size={14} className="text-green-500 shrink-0 ml-auto" />}
                      </button>
                    )
                  })}
                  {freeExercises.map((fe) => {
                    const sets = setsMap[fe.id] ?? []
                    const doneCount = sets.filter(s => s.completed).length
                    const allDone = doneCount === sets.length && sets.length > 0
                    return (
                      <button
                        key={fe.id}
                        onClick={() => toggleExpanded(fe.id)}
                        className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className={`w-3 h-3 rounded-full shrink-0 ${allDone ? 'bg-green-500' : 'bg-gray-200'}`} />
                        <span className={`text-sm truncate ${allDone ? 'text-green-700' : 'text-gray-600'}`}>{fe.name}</span>
                        {allDone && <CheckCircle2 size={14} className="text-green-500 shrink-0 ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>{/* end grid */}

      {/* Finish button — mobile: fixed above bottom nav */}
      <div
        className="fixed left-0 right-0 px-4 pt-3 bg-white border-t border-gray-200 md:hidden"
        style={{ bottom: 0, paddingBottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
      >
        <button
          onClick={() => setShowModal(true)}
          disabled={!canFinish}
          className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
            canFinish
              ? 'bg-[#ea580c] hover:bg-orange-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {canFinish ? 'Finalizar sesión' : sessionData.freeSession ? 'Agrega al menos 1 ejercicio y 1 serie' : `Completa al menos 1 serie por ejercicio (${completedSets}/${totalSets})`}
        </button>
      </div>

      {/* PR celebration banner */}
      {newPRs.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-black text-gray-900 mb-2">¡Nuevo récord personal!</h2>
            <div className="space-y-2 mb-6">
              {newPRs.map((pr, i) => (
                <div key={i} className="bg-orange-50 rounded-xl px-4 py-2">
                  <p className="font-semibold text-gray-800 text-sm">{pr.exerciseName}</p>
                  {pr.weightKg && (
                    <p className="text-[#ea580c] font-black text-lg">{pr.weightKg} kg</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mb-4">
              <ShareMilestoneButton
                type="PR"
                context={{
                  exerciseName: newPRs[0]?.exerciseName,
                  weightKg: newPRs[0]?.weightKg,
                }}
              />
            </div>
            <p className="text-xs text-gray-400">Redirigiendo...</p>
          </div>
        </div>
      )}

      {/* Complete modal — montado en document.body via portal para evitar stacking context del layout */}
      {showModal && createPortal(
        <CompleteModal
          onSubmit={handleComplete}
          onSkip={() => setShowModal(false)}
          loading={submitting}
          defaultDuration={elapsedMinutes > 0 ? elapsedMinutes : 60}
        />,
        document.body
      )}
    </div>
  )
}
