'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getInitialWeekIdx } from '@/lib/core/week_number'
import Link from 'next/link'
import { FoodLogsSection, type FoodLogEntry } from './FoodLogsSection'
import { type DayAdherence } from './NutritionAdherenceCard'
import SummaryTab from './tabs/SummaryTab'
import PlanTab from './tabs/PlanTab'
import ProgressTab from './tabs/ProgressTab'
import NutritionTab from './tabs/NutritionTab'
import MessagesTab from './tabs/MessagesTab'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AthleteData = {
  id: string
  name: string | null
  email: string
  createdAt: Date
  onboardingCompleted: boolean
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
  sport: string | null
  experienceLevel: string | null
  ftp: number | null
} | null

export type SessionLogData = {
  rpe: number | null
  distanceKm: number | null
  durationMin: number | null
  hrAvg: number | null
  paceSecPerKm: number | null
}

export type GymLogData = {
  rpe: number | null
  durationMin: number | null
  completed: boolean
  totalSets: number
  totalVolume: number
  exerciseCount: number
  prs: { name: string; kg: number }[]
}

export type WorkoutDayData = {
  label: string
  muscleGroups: string[]
  exerciseCount: number
  totalSets: number
}

export type PlanSessionData = {
  id: string
  dayOfWeek: number
  type: string
  durationMin: number
  detailText: string | null
  zoneTarget: string | null
  coachNote: string | null
  structure: string | null
  intensity: string
  date: Date | null
  log: SessionLogData | null
  gymLog: GymLogData | null
  workoutDay: WorkoutDayData | null
}

export type PlanWeekData = {
  weekNumber: number
  phase: string
  focusDescription: string | null
  isRecoveryWeek: boolean
  sessions: PlanSessionData[]
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
  stressLevel: number | null
  motivationLevel: number | null
  painLevel: number | null
  dietAdherencePct: number | null
  painFlag: boolean
  hardestSessionRpe: number | null
  adjustmentsTriggered: string[]
  notes: string | null
  waistCm: number | null
  armsCm: number | null
  hipsCm: number | null
  thighsCm: number | null
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
  kcalAdjustment: number
} | null

export type PaymentData = {
  amount: number
  currency: string
  status: 'PAID' | 'PENDING' | 'OVERDUE'
  paidAt: Date | null
  dueDate: Date
} | null

export type PRRecord = {
  exerciseName: string
  weightKg: number
  date: Date
}

export type GymRoutineDayData = {
  label: string
  dayOfWeek: number
  muscleGroups: string[]
  exercises: { name: string; sets: number; repsScheme: string }[]
}

export type GymRoutineData = {
  name: string
  goal: string | null
  daysPerWeek: number
  lastSessionDate: Date | null
  days: GymRoutineDayData[]
} | null

export type AthleteStatus = 'ACTIVE' | 'PAUSED'

// ─── Local types (not exported — used for state only) ────────────────────────

type DailyLogEntry = { date: string; weightKg: number | null; energyLevel: number | null; hrResting: number | null; sleepHours: number | null }

type Msg = { id: string; fromId: string; toId: string; content: string; readAt: string | null; createdAt: string }

type MealPlanData = { data: unknown; updatedAt: string } | null
type FoodProfileData = {
  availableFoods: string[]; availableFoodIds: string[]; restrictions: string[]
  mealsPerDay: number; weighsFood: boolean; notes: string | null
} | null
type AthleteFoodItem = {
  id: string; name: string; category: string
  kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number
  servingG: number; servingLabel?: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ['Resumen', 'Plan', 'Progreso', 'Nutrición', 'Mensajes']

const PHASE_KCAL_DELTA: Record<string, { label: string; delta: number; desc: string }> = {
  BASE:        { label: 'BASE',        delta: -200, desc: 'Déficit leve (−200 kcal)' },
  DESARROLLO:  { label: 'DESARROLLO',  delta:    0, desc: 'Mantenimiento' },
  ESPECIFICO:  { label: 'ESPECÍFICO',  delta: +100, desc: 'Superávit leve (+100 kcal)' },
  AFINAMIENTO: { label: 'AFINAMIENTO', delta: -100, desc: 'Reducción leve (−100 kcal)' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AthleteDetailClientProps {
  athleteId: string
  athlete: AthleteData
  healthProfile: HealthProfileData
  activePlan: ActivePlanData
  recentCheckIns: CheckInData[]
  nutritionPlan: NutritionPlanData
  initialStatus: AthleteStatus
  coachGoal: string | null
  privateNotes: string | null
  coachSpecialties: string[]
  latestPayment: PaymentData
  prRecords: PRRecord[]
  gymRoutine: GymRoutineData
  volumeTotalKg: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AthleteDetailClient({
  athleteId,
  athlete,
  healthProfile,
  activePlan,
  recentCheckIns,
  nutritionPlan,
  initialStatus,
  coachGoal: initialCoachGoal,
  privateNotes: initialPrivateNotes,
  coachSpecialties,
  latestPayment,
  prRecords,
  gymRoutine,
  volumeTotalKg,
}: AthleteDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const TAB_PARAM_MAP: Record<string, string> = {
    resumen: 'Resumen', plan: 'Plan', progreso: 'Progreso',
    nutricion: 'Nutrición', mensajes: 'Mensajes',
  }

  const [activeTab, setActiveTab] = useState(() => {
    const param = searchParams.get('tab')?.toLowerCase()
    // Match against TABS constant and param map
    if (param) {
      const mapped = TAB_PARAM_MAP[param]
      if (mapped && TABS.includes(mapped)) return mapped
    }
    return 'Resumen'
  })

  // Plan session notes
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    activePlan?.weeks.forEach((w) => {
      w.sessions.forEach((s) => { if (s.coachNote) initial[s.id] = s.coachNote })
    })
    return initial
  })
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})

  const [planViewWeekIdx, setPlanViewWeekIdx] = useState(() => getInitialWeekIdx(activePlan))

  // Plan creation
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [planGoalType, setPlanGoalType] = useState('RACE_5K')
  const [planDaysPerWeek, setPlanDaysPerWeek] = useState(4)
  const [planGenerating, setPlanGenerating] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planCreated, setPlanCreated] = useState(false)
  const [planMode, setPlanMode] = useState<'template' | 'copy'>('template')
  const [copySourcePlanId, setCopySourcePlanId] = useState('')
  const [copyStartDate, setCopyStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [availablePlans, setAvailablePlans] = useState<{ planId: string; planName: string; totalWeeks: number; athleteName: string; status: string }[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  async function loadAvailablePlans() {
    setLoadingPlans(true)
    try {
      const res = await fetch('/api/coach/plans')
      if (!res.ok) throw new Error()
      const { plans } = await res.json()
      const filtered = (plans as typeof availablePlans).filter((p) => p.planId !== (activePlan as { id?: string } | null)?.id)
      setAvailablePlans(filtered)
      if (filtered.length > 0) setCopySourcePlanId(filtered[0].planId)
    } catch { /* silently fail */ } finally { setLoadingPlans(false) }
  }

  async function handleCopyPlan() {
    if (!copySourcePlanId || !copyStartDate) return
    setPlanGenerating(true); setPlanError(null)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/plan/copy-from`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePlanId: copySourcePlanId, startDate: copyStartDate }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error copiando el plan')
      setPlanCreated(true); setCreatingPlan(false)
      router.push(`/coach/athletes/${athleteId}/plan/build`)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Error desconocido')
    } finally { setPlanGenerating(false) }
  }

  async function handleCreatePlan() {
    setPlanGenerating(true); setPlanError(null)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalType: planGoalType, daysPerWeek: planDaysPerWeek, hoursPerSession: 1 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error generando el plan')
      setPlanCreated(true); setCreatingPlan(false)
      router.push(`/coach/athletes/${athleteId}/plan/build`)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Error desconocido')
    } finally { setPlanGenerating(false) }
  }

  // Reset password
  const [resettingPwd, setResettingPwd] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [pwdCopied, setPwdCopied] = useState(false)

  async function handleResetPassword() {
    setResettingPwd(true); setResetLink(null)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setResetLink(data.resetLink)
    } finally { setResettingPwd(false) }
  }

  async function handleCopyPassword() {
    if (!resetLink) return
    try {
      await navigator.clipboard.writeText(resetLink)
      setPwdCopied(true)
      setTimeout(() => setPwdCopied(false), 2000)
    } catch { /* no-op */ }
  }

  // Coach goal & private notes
  const [coachGoal, setCoachGoal] = useState(initialCoachGoal ?? '')
  const [privateNotes, setPrivateNotes] = useState(initialPrivateNotes ?? '')
  const [savingCoachNotes, setSavingCoachNotes] = useState(false)
  const [coachNotesSaved, setCoachNotesSaved] = useState(false)

  async function handleSaveCoachNotes() {
    setSavingCoachNotes(true); setCoachNotesSaved(false)
    try {
      await fetch(`/api/coach/athletes/${athleteId}/config`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachGoal: coachGoal.trim() || null, privateNotes: privateNotes.trim() || null }),
      })
      setCoachNotesSaved(true)
      setTimeout(() => setCoachNotesSaved(false), 2500)
    } finally { setSavingCoachNotes(false) }
  }

  // Athlete status
  const [athleteStatus, setAthleteStatus] = useState<AthleteStatus>(initialStatus)
  const [togglingStatus, setTogglingStatus] = useState(false)
  // activated se deriva del status del atleta — no de features individuales
  const activated = athleteStatus === 'ACTIVE'

  async function handleToggleStatus() {
    const next: AthleteStatus = athleteStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setTogglingStatus(true)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) setAthleteStatus(next)
    } finally { setTogglingStatus(false) }
  }

  // Nutrition
  const [editingNutrition, setEditingNutrition] = useState(false)
  const [nutritionDraft, setNutritionDraft] = useState<NutritionPlanData>(nutritionPlan)
  const [savingNutrition, setSavingNutrition] = useState(false)
  const [nutritionSaveError, setNutritionSaveError] = useState<string | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlanData>(null)
  const [foodProfile, setFoodProfile] = useState<FoodProfileData>(null)
  const [athleteFoods, setAthleteFoods] = useState<AthleteFoodItem[]>([])
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([])
  const [nutritionExtLoaded, setNutritionExtLoaded] = useState(false)
  const [adherenceData, setAdherenceData] = useState<DayAdherence[]>([])
  const [assignedTemplate, setAssignedTemplate] = useState<{
    id: string; templateId: string; assignedAt: string
    template: { id: string; name: string; goal: string | null }
  } | null>(null)
  const [templateTotals, setTemplateTotals] = useState<Record<string, { kcal: number; proteinG: number; carbsG: number; fatG: number }> | null>(null)
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [plannerKey, setPlannerKey] = useState(0)

  useEffect(() => {
    if (activeTab !== 'Nutrición' || nutritionExtLoaded) return
    Promise.all([
      fetch(`/api/coach/athletes/${athleteId}/nutrition`).then(r => r.json()),
      fetch(`/api/coach/athletes/${athleteId}/nutrition/adherence`).then(r => r.json()),
    ])
      .then(([d, adh]) => {
        setMealPlan(d.mealPlan ?? null)
        setFoodProfile(d.foodProfile ?? null)
        setAthleteFoods(d.athleteFoods ?? [])
        setFoodLogs(d.foodLogs ?? [])
        setAssignedTemplate(d.assignedTemplate ?? null)
        setTemplateTotals(d.templateTotals ?? null)
        setAdherenceData(adh.days ?? [])
        setNutritionExtLoaded(true)
      })
      .catch(() => setNutritionExtLoaded(true))
  }, [activeTab, nutritionExtLoaded, athleteId])

  async function handleApplyTemplate() {
    setApplyingTemplate(true)
    try {
      const now = new Date()
      const dow = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
      const weekStartDate = monday.toISOString().slice(0, 10)
      const res = await fetch(`/api/coach/athletes/${athleteId}/nutrition/apply-template`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDate }),
      })
      if (res.ok) {
        const data = await res.json()
        setPlannerKey(k => k + 1)
        alert(`Template aplicado: ${data.created} items creados para la semana.`)
      } else {
        const err = await res.json().catch(() => null)
        alert(err?.error ?? 'Error al aplicar template')
      }
    } finally { setApplyingTemplate(false) }
  }

  // Session editor
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [sessionDraft, setSessionDraft] = useState<{ durationMin: number; type: string; zoneTarget: string; detailText: string; structure: string }>({
    durationMin: 60, type: '', zoneTarget: '', detailText: '', structure: ''
  })
  const [savingSession, setSavingSession] = useState(false)

  async function handleSaveSession(sessionId: string) {
    setSavingSession(true)
    try {
      await fetch(`/api/coach/sessions/${sessionId}/edit`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionDraft),
      })
      setEditingSession(null)
      router.refresh()
    } finally { setSavingSession(false) }
  }

  // Daily logs
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([])
  const [dailyLogsLoaded, setDailyLogsLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Resumen' || dailyLogsLoaded) return
    fetch(`/api/coach/athletes/${athleteId}/dailylogs`)
      .then(r => r.json())
      .then((data: { logs?: DailyLogEntry[] }) => { setDailyLogs(data.logs ?? []); setDailyLogsLoaded(true) })
      .catch(() => setDailyLogsLoaded(true))
  }, [activeTab, dailyLogsLoaded, athleteId])

  // Mensajes
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [msgsLoaded, setMsgsLoaded] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [msgSending, setMsgSending] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Mensajes') return
    const load = () =>
      fetch(`/api/messages?with=${athleteId}`)
        .then(r => r.json())
        .then(d => { setMsgs(d.messages ?? []); setMsgsLoaded(true) })
        .catch(() => setMsgsLoaded(true))
    load()
    fetch('/api/messages/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromId: athleteId }) })
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [activeTab, athleteId])

  async function handleSendMessage() {
    if (!msgInput.trim() || msgSending) return
    setMsgSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toId: athleteId, content: msgInput.trim() }),
      })
      if (res.ok) {
        const { message } = await res.json()
        setMsgs(prev => [...prev, message])
        setMsgInput('')
      }
    } finally { setMsgSending(false) }
  }

  function handleNoteChange(sessionId: string, value: string) {
    setNotes((prev) => ({ ...prev, [sessionId]: value }))
    setSavedNotes((prev) => ({ ...prev, [sessionId]: false }))
  }

  async function handleSaveNote(sessionId: string) {
    setSavingNotes((prev) => ({ ...prev, [sessionId]: true }))
    try {
      await fetch(`/api/coach/sessions/${sessionId}/note`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes[sessionId] ?? '' }),
      })
      setSavedNotes((prev) => ({ ...prev, [sessionId]: true }))
    } finally { setSavingNotes((prev) => ({ ...prev, [sessionId]: false })) }
  }

  async function handleSaveNutrition() {
    if (!nutritionDraft) return
    setSavingNutrition(true); setNutritionSaveError(null)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/nutrition`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nutritionDraft),
      })
      if (res.ok) {
        setEditingNutrition(false)
      } else {
        setNutritionSaveError('Error al guardar. Inténtalo de nuevo.')
      }
    } catch {
      setNutritionSaveError('Error de conexión.')
    } finally { setSavingNutrition(false) }
  }

  // ── Computed values ───────────────────────────────────────────────────────────

  const hrMaxValue = healthProfile?.hrMax ?? (healthProfile?.age ? 220 - healthProfile.age : 185)
  const zones = [
    { label: 'Z1 — Recuperación', min: Math.round(hrMaxValue * 0.5), max: Math.round(hrMaxValue * 0.6) },
    { label: 'Z2 — Base aeróbica', min: Math.round(hrMaxValue * 0.6), max: Math.round(hrMaxValue * 0.7) },
    { label: 'Z3 — Tempo', min: Math.round(hrMaxValue * 0.7), max: Math.round(hrMaxValue * 0.8) },
    { label: 'Z4 — Umbral', min: Math.round(hrMaxValue * 0.8), max: Math.round(hrMaxValue * 0.9) },
    { label: 'Z5 — VO2max', min: Math.round(hrMaxValue * 0.9), max: hrMaxValue },
  ]

  const latestCheckIn = recentCheckIns[0] ?? null
  const checkInsSorted = [...recentCheckIns].sort((a, b) => a.weekNumber - b.weekNumber)
  const weights = checkInsSorted.map((c) => c.weightKg).filter((w): w is number => w !== null)
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0

  const lastCheckInDaysAgo = latestCheckIn
    ? Math.floor((Date.now() - new Date(latestCheckIn.recordedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const alerts: string[] = []
  if (recentCheckIns.length === 0) alerts.push('Sin check-ins registrados aún')
  if (lastCheckInDaysAgo !== null && lastCheckInDaysAgo >= 7) alerts.push(`Check-in pendiente hace ${lastCheckInDaysAgo} días`)

  // RPE + dolor descriptivo (Figma: "RPE 7.5 + dolor reportado en S5")
  const rpeHigh = latestCheckIn?.hardestSessionRpe != null && latestCheckIn.hardestSessionRpe >= 7
  const hasPain = latestCheckIn?.painFlag
  if (rpeHigh && hasPain) {
    alerts.push(`RPE ${latestCheckIn!.hardestSessionRpe} + dolor reportado en S${latestCheckIn!.weekNumber}`)
  } else if (rpeHigh) {
    alerts.push(`RPE ${latestCheckIn!.hardestSessionRpe} en S${latestCheckIn!.weekNumber}`)
  } else if (hasPain) {
    alerts.push(`Dolor reportado en S${latestCheckIn!.weekNumber}`)
  }

  if (latestCheckIn?.hrResting !== null && latestCheckIn?.hrResting !== undefined &&
      healthProfile?.hrResting !== null && healthProfile?.hrResting !== undefined &&
      latestCheckIn.hrResting > healthProfile.hrResting + 10) {
    alerts.push('FC reposo elevada respecto al valor basal')
  }

  // Sueño bajo consecutivo (Figma: "Sueño < 7h por 3 semanas")
  const lowSleepWeeks = recentCheckIns
    .filter((c) => c.sleepScore != null && Math.round(c.sleepScore / 100 * 8) < 7)
    .length
  if (lowSleepWeeks >= 3) {
    alerts.push(`Sueño < 7h por ${lowSleepWeeks} semanas`)
  }

  const displayName = athlete.name ?? athlete.email
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const currentPhase = (() => {
    if (!activePlan || activePlan.weeks.length === 0) return null
    const idx = getInitialWeekIdx(activePlan)
    return activePlan.weeks[idx]?.phase ?? null
  })()

  function applyPhaseTargets() {
    if (!nutritionPlan || !currentPhase) return
    const delta = PHASE_KCAL_DELTA[currentPhase]?.delta ?? 0
    setNutritionDraft({
      ...nutritionPlan,
      targetKcalHard: nutritionPlan.tdee + delta + 300,
      targetKcalEasy: nutritionPlan.tdee + delta,
      targetKcalRest: nutritionPlan.tdee + delta - 200,
    })
    setEditingNutrition(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-4 lg:p-6 max-w-6xl mx-auto">
      <Link
        href="/coach/athletes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        ← Mis Atletas
      </Link>

      {/* Athlete header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {initials}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: '#1f2d3d' }}>{displayName}</h1>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={
                athleteStatus === 'ACTIVE'
                  ? { backgroundColor: '#dcfce7', color: '#15803d' }
                  : { backgroundColor: '#fef3c7', color: '#92400e' }
              }
            >
              {athleteStatus === 'ACTIVE' ? 'Activo' : 'Pausado'}
            </span>
            {healthProfile?.sport && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#f0f1f3', color: '#4a5568' }}>
                {healthProfile.sport === 'RUNNING' ? 'Running' : healthProfile.sport === 'STRENGTH' ? 'Fuerza' : healthProfile.sport}
                {healthProfile.experienceLevel && ` · ${healthProfile.experienceLevel === 'BEGINNER' ? 'Principiante' : healthProfile.experienceLevel === 'INTERMEDIATE' ? 'Intermedio' : healthProfile.experienceLevel === 'ADVANCED' ? 'Avanzado' : healthProfile.experienceLevel}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className="shrink-0 text-sm font-medium px-5 py-2 rounded-lg border transition-colors disabled:opacity-50"
            style={
              athleteStatus === 'ACTIVE'
                ? { borderColor: '#d1d5db', color: '#6b7280' }
                : { borderColor: '#1e3a5f', color: '#1e3a5f' }
            }
          >
            {togglingStatus ? '...' : athleteStatus === 'ACTIVE' ? 'Pausar' : 'Reactivar'}
          </button>
          <p className="text-sm" style={{ color: '#8c99a6' }}>
            {athlete.email} · Cliente desde {new Date(athlete.createdAt).toLocaleDateString('es', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b mb-5" style={{ borderColor: '#e5e7eb' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="pb-2.5 text-sm transition-colors whitespace-nowrap shrink-0"
            style={
              activeTab === t
                ? { color: '#1e3a5f', fontWeight: 700, borderBottom: '3px solid #1e3a5f', marginBottom: '-1px' }
                : { color: '#8c99a6', fontWeight: 500 }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'Resumen' && (
        <SummaryTab
          athleteId={athleteId}
          athlete={athlete}
          healthProfile={healthProfile}
          activePlan={activePlan}
          coachGoal={coachGoal}
          setCoachGoal={setCoachGoal}
          privateNotes={privateNotes}
          setPrivateNotes={setPrivateNotes}
          savingCoachNotes={savingCoachNotes}
          coachNotesSaved={coachNotesSaved}
          handleSaveCoachNotes={handleSaveCoachNotes}
          zones={zones}
          latestCheckIn={latestCheckIn}
          checkInsSorted={checkInsSorted}
          lastCheckInDaysAgo={lastCheckInDaysAgo}
          alerts={alerts}
          dailyLogs={dailyLogs}
          latestPayment={latestPayment}
          prRecords={prRecords}
          gymRoutine={gymRoutine}
          volumeTotalKg={volumeTotalKg}
        />
      )}

      {activeTab === 'Plan' && (
        <PlanTab
          athleteId={athleteId}
          athlete={athlete}
          activePlan={activePlan}
          healthProfile={healthProfile}
          creatingPlan={creatingPlan}
          setCreatingPlan={setCreatingPlan}
          planGoalType={planGoalType}
          setPlanGoalType={setPlanGoalType}
          planDaysPerWeek={planDaysPerWeek}
          setPlanDaysPerWeek={setPlanDaysPerWeek}
          planGenerating={planGenerating}
          planError={planError}
          planMode={planMode}
          setPlanMode={setPlanMode}
          copySourcePlanId={copySourcePlanId}
          setCopySourcePlanId={setCopySourcePlanId}
          copyStartDate={copyStartDate}
          setCopyStartDate={setCopyStartDate}
          availablePlans={availablePlans}
          loadingPlans={loadingPlans}
          loadAvailablePlans={loadAvailablePlans}
          handleCopyPlan={handleCopyPlan}
          handleCreatePlan={handleCreatePlan}
          planViewWeekIdx={planViewWeekIdx}
          setPlanViewWeekIdx={setPlanViewWeekIdx}
          notes={notes}
          savedNotes={savedNotes}
          savingNotes={savingNotes}
          editingSession={editingSession}
          setEditingSession={setEditingSession}
          sessionDraft={sessionDraft}
          setSessionDraft={setSessionDraft}
          savingSession={savingSession}
          handleNoteChange={handleNoteChange}
          handleSaveNote={handleSaveNote}
          handleSaveSession={handleSaveSession}
          coachSpecialties={coachSpecialties}
          gymRoutine={gymRoutine}
        />
      )}

      {activeTab === 'Progreso' && (
        <ProgressTab
          checkInsSorted={checkInsSorted}
          weights={weights}
          maxWeight={maxWeight}
          minWeight={minWeight}
        />
      )}

      {activeTab === 'Nutrición' && (
        <NutritionTab
          athleteId={athleteId}
          nutritionPlan={nutritionPlan}
          activePlan={activePlan}
          foodProfile={foodProfile}
          foodLogs={foodLogs}
          nutritionExtLoaded={nutritionExtLoaded}
          adherenceData={adherenceData}
          selfReportedAdherencePct={latestCheckIn?.dietAdherencePct ?? null}
        />
      )}

      {activeTab === 'Mensajes' && (
        <MessagesTab
          athleteId={athleteId}
          msgs={msgs}
          msgsLoaded={msgsLoaded}
          msgInput={msgInput}
          setMsgInput={setMsgInput}
          msgSending={msgSending}
          handleSendMessage={handleSendMessage}
        />
      )}
    </div>
  )
}
