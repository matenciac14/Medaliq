/**
 * Maps a Prisma CoachAthlete relation (with nested athlete data) to the
 * MappedAthlete shape consumed by coach views and API routes.
 *
 * Lives in infrastructure/ so both app/api/ and app/coach/ can import it
 * without creating cross-dependencies between app/ subfolders.
 */
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { calculateTrainingAdherence } from '@/domain/training/get_training_adherence'

const SESSION_DISPLAY: Record<string, { label: string; color: string }> = {
  RODAJE_Z2:    { label: 'Z2',   color: '#16a34a' },
  FARTLEK:      { label: 'FAR',  color: '#ea580c' },
  TEMPO:        { label: 'TEMP', color: '#ea580c' },
  INTERVALOS:   { label: 'INT',  color: '#dc2626' },
  TIRADA_LARGA: { label: 'TL',   color: '#2563eb' },
  FUERZA:       { label: 'GYM',  color: '#ea580c' },
  CICLA:        { label: 'CIC',  color: '#2563eb' },
  NATACION:     { label: 'NAT',  color: '#2563eb' },
  DESCANSO:     { label: '—',    color: '#9ca3af' },
  TEST:         { label: 'TEST', color: '#dc2626' },
  SIMULACRO:    { label: 'SIM',  color: '#dc2626' },
  OTRO:         { label: 'OTRO', color: '#6b7280' },
}

export type MappedAthlete = {
  id: string
  name: string
  email: string
  sport: string
  goal: string | null
  currentWeek: number
  totalWeeks: number
  phase: string | null
  lastCheckInDaysAgo: number
  weightKg: number | null
  weightGoalKg: number | null
  hrResting: number | null
  weightDropKg: number
  adherencePct: number
  alerts: string[]
  planStatus: string | null
  status: 'ACTIVE' | 'PAUSED'
  todaySession: { label: string; color: string } | null
  alertFlags: {
    noCheckin: boolean
    highRpe: boolean
    weightDrop: boolean
    weightDropKg: number
    adjustments: string[]
  }
}

// Input shape — matches Prisma query result from both athletes/page.tsx and the API route.
// Sessions are expected to be pre-filtered to past dates (date <= now) in the query.
export type CoachAthleteRow = {
  id: string // CoachAthlete.id — used as cursor
  status: string
  athlete: {
    id: string
    name: string | null
    email: string | null
    profile: {
      weightKg: number | null
      weightGoalKg: number | null
      hrResting: number | null
      sport: string | null
    } | null
    trainingPlans: Array<{
      status: string
      startDate: Date
      totalWeeks: number
      goalType: string | null
      weeks: Array<{
        weekNumber: number
        phase: string
        sessions: Array<{
          date: Date
          type: string
          log: { id: string } | null
        }>
      }>
    }>
    checkIns: Array<{
      recordedAt: Date
      weightKg: number | null
      hrResting: number | null
      hardestSessionRpe: number | null
      adjustmentsTriggered: string[]
      weekNumber: number
    }>
    // Gym data for unified adherence (optional — backward compatible)
    athleteAssignments?: Array<{
      isActive: boolean
      startDate: Date
      template: { daysPerWeek: number }
    }>
    _count?: {
      gymSessions: number
    }
  }
}

export function mapCoachAthleteRelation(rel: CoachAthleteRow, now: Date): MappedAthlete {
  const { athlete } = rel
  const plan = athlete.trainingPlans[0] ?? null
  const lastCheckIn = athlete.checkIns[0] ?? null
  const prevCheckIn = athlete.checkIns[1] ?? null

  const daysSince = lastCheckIn
    ? Math.floor((now.getTime() - new Date(lastCheckIn.recordedAt).getTime()) / 86_400_000)
    : 999

  const currentWeek = plan
    ? getPlanWeekNumber(new Date(plan.startDate), plan.totalWeeks)
    : 0

  const allPastSessions = plan?.weeks.filter((w) => w.weekNumber <= currentWeek).flatMap((w) => w.sessions) ?? []

  // Gym routine data for unified adherence
  const activeWorkout = athlete.athleteAssignments?.find(w => w.isActive)
  const gymRoutine = activeWorkout
    ? {
        daysPerWeek: activeWorkout.template.daysPerWeek,
        weeksActive: Math.max(1, Math.ceil(
          (now.getTime() - new Date(activeWorkout.startDate).getTime()) / (7 * 86_400_000)
        )),
      }
    : null

  const adherenceResult = calculateTrainingAdherence({
    planSessions: allPastSessions,
    gymRoutine,
    gymSessionsDone: { count: athlete._count?.gymSessions ?? 0 },
  })
  const adherencePct = adherenceResult.totalAdherence

  const currentPlanWeek =
    plan?.weeks.find((w) => w.weekNumber === currentWeek) ??
    plan?.weeks[plan.weeks.length - 1]

  const weightDrop =
    lastCheckIn?.weightKg && prevCheckIn?.weightKg
      ? prevCheckIn.weightKg - lastCheckIn.weightKg
      : 0
  const highRpe = (lastCheckIn?.hardestSessionRpe ?? 0) >= 8
  const weightAlert = weightDrop > 0.75
  const noCheckinAlert = daysSince >= 7
  const adjustments = lastCheckIn?.adjustmentsTriggered ?? []

  // Find today's planned session across all weeks
  const nowY = now.getFullYear()
  const nowM = now.getMonth()
  const nowD = now.getDate()
  const allSessions = plan?.weeks.flatMap((w) => w.sessions) ?? []
  const todayPlanned = allSessions.find((s) => {
    const d = new Date(s.date)
    return d.getFullYear() === nowY && d.getMonth() === nowM && d.getDate() === nowD
  })
  const todaySession = todayPlanned ? (SESSION_DISPLAY[todayPlanned.type] ?? null) : null

  return {
    id: athlete.id,
    name: athlete.name ?? 'Atleta',
    email: athlete.email ?? '',
    sport: athlete.profile?.sport ?? '',
    goal: plan?.goalType ?? null,
    currentWeek,
    totalWeeks: plan?.totalWeeks ?? 0,
    phase: (currentPlanWeek?.phase as string) ?? null,
    lastCheckInDaysAgo: daysSince,
    weightKg: lastCheckIn?.weightKg ?? athlete.profile?.weightKg ?? null,
    weightGoalKg: athlete.profile?.weightGoalKg ?? null,
    hrResting: lastCheckIn?.hrResting ?? athlete.profile?.hrResting ?? null,
    weightDropKg: weightDrop,
    adherencePct,
    alerts: adjustments,
    planStatus: plan?.status ?? null,
    status: (rel.status as 'ACTIVE' | 'PAUSED') ?? 'ACTIVE',
    todaySession,
    alertFlags: {
      noCheckin: noCheckinAlert,
      highRpe,
      weightDrop: weightAlert,
      weightDropKg: weightDrop,
      adjustments,
    },
  }
}
