/**
 * Use Case: Get Dashboard Summary
 *
 * Pure computation — no DB access, no side effects.
 * Receives raw DB data, returns the dashboard payload + any pending side effects.
 *
 * Side effect signaling:
 *   result.planIdToComplete — if non-null, the route must mark that plan COMPLETED in DB.
 */

import { getPlanWeekNumber, getCurrentISOWeek } from '@/lib/core/week_number'
import { getDailyNutritionTarget } from '@/domain/nutrition/daily_target'
import { getSessionIntensity } from '@/domain/plan/intensity'
import { jsToOurDow } from '@/lib/core/date_utils'

// ── Input types ───────────────────────────────────────────────────────────────

// Domain names: description=detailText, zone=zoneTarget, coachNotes=coachNote — mapped in callers
type SessionLog = { id: string; log: { id: string } | null; type: string; dayOfWeek: number; durationMin: number | null; zone: string | null; intensity: string | null; description: string | null; coachNotes?: string | null }
export type PlanWeek = { weekNumber: number; phase: string; volumeKm: number | null; sessions: SessionLog[] }
type ActivePlan = { id: string; name: string; startDate: Date; totalWeeks: number; weeks: PlanWeek[] }
type CheckIn = { recordedAt: Date; weekNumber: number; weightKg: number | null; hrResting: number | null; sleepHours: number | null; energyLevel: number | null; hardestSessionRpe: number | null }
type NutritionPlan = { targetKcalHard: number; targetKcalEasy: number; targetKcalRest: number; proteinG: number; carbsHardG: number; carbsEasyG: number; fatG: number }
type RecentLogInput = { completedAt: Date; freeSessionType?: string | null; durationMin?: number | null; rpe?: number | null; plannedSession?: { type: string } | null }

export type AssignedWorkoutInput = {
  template: { days: { dayOfWeek: number; isRestDay: boolean; label?: string }[] }
} | null

export type GymSessionInput = { date: Date; durationMin?: number | null; templateName?: string | null }

export type DashboardInput = {
  user: {
    name: string | null
    profile: {
      weightKg: number | null
      hrResting: number | null
      weightGoalKg: number | null
      sleepHoursAvg: number | null
      sportDetails: unknown
      sportGoal: string | null
    } | null
  } | null
  activePlanRaw: ActivePlan | null
  lastCompletedPlan: { name: string; endDate: Date } | null
  checkIns: CheckIn[]
  recentLogs: RecentLogInput[]
  nutritionPlan: NutritionPlan | null
  assignedWorkout?: AssignedWorkoutInput
  gymCompletionDates?: Date[]  // fechas de GymSession completadas — para streak
  recentGymSessions?: GymSessionInput[]  // gym sessions con detalle para recentActivity
  todayDow?: number  // 1=Mon..7=Sun — timezone-aware, computed by caller
}

export type WeekSessionSlot = {
  dayIndex: number
  type: string | null
  done: boolean
  isToday: boolean
  id: string | null
  durationMin: number | null
  zoneTarget: string | null
  gymLabel: string | null
}

export type DashboardSummary = {
  firstName: string
  todaySession: {
    id: string
    logId: string | null
    type: string
    intensity: string | null
    durationMin: number | null
    zoneTarget: string
    detailText: string
    completed: boolean
  } | null
  planData: { name: string; currentWeek: number; totalWeeks: number; phase: string } | null
  metrics: { weightKg: number | null; weightGoalKg: number | null; hrResting: number | null; sleepHours: number | null }
  weekSessions: WeekSessionSlot[]
  nutritionTarget: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string } | null
  completedCount: number
  totalTraining: number
  checkinPending: boolean
  streakDays: number
  weekStreak: number
  raceDays: number | null
  isRecomp: boolean
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  lastCheckIn: { energyLevel: number | null; hardestSessionRpe: number | null; sleepHours: number | null } | null
  lastCheckinDaysAgo: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
  currentVolume: number | null
  volumeDeltaPct: number | null
  mode: 'TRAINING' | 'RECOVERY' | 'FREE' | 'GYM'
  recoveryDaysLeft: number | null
  completedPlanName: string | null
  recentActivity: { type: string; completedAt: string; durationMin: number | null; rpe: number | null }[]
  hasEverLogged: boolean
}

export type DashboardResult = {
  summary: DashboardSummary
  planIdToComplete: string | null  // route must mark this plan COMPLETED if non-null
}

// ── Use case ──────────────────────────────────────────────────────────────────

export function getDashboardSummary(input: DashboardInput): DashboardResult {
  const { user, activePlanRaw, lastCompletedPlan, checkIns, recentLogs, nutritionPlan, assignedWorkout } = input
  const todayDow = input.todayDow ?? jsToOurDow(new Date().getDay())

  // ── Plan lifecycle ────────────────────────────────────────────────
  let planIdToComplete: string | null = null
  let activePlan: ActivePlan | null = activePlanRaw
  let completedPlanName: string | null = null
  let completedPlanEndDate: Date | null = null

  if (activePlan) {
    const endDate = new Date(activePlan.startDate)
    endDate.setDate(endDate.getDate() + activePlan.totalWeeks * 7)
    const rawWeek = Math.floor((Date.now() - new Date(activePlan.startDate).getTime()) / 86400000 / 7) + 1
    if (rawWeek > activePlan.totalWeeks && Date.now() > endDate.getTime()) {
      planIdToComplete = activePlan.id
      completedPlanName = activePlan.name
      completedPlanEndDate = endDate
      activePlan = null
    }
  }

  if (!activePlan && !completedPlanName && lastCompletedPlan?.endDate) {
    completedPlanName = lastCompletedPlan.name
    completedPlanEndDate = new Date(lastCompletedPlan.endDate)
  }

  const recoveryDaysSinceEnd = completedPlanEndDate
    ? Math.floor((Date.now() - completedPlanEndDate.getTime()) / 86400000) : null
  const recoveryDaysLeft = recoveryDaysSinceEnd !== null ? Math.max(0, 14 - recoveryDaysSinceEnd) : null
  const hasGymAssignment = !!assignedWorkout
  const mode: 'TRAINING' | 'RECOVERY' | 'FREE' | 'GYM' = activePlan
    ? 'TRAINING'
    : hasGymAssignment
      ? 'GYM'
      : recoveryDaysSinceEnd !== null && recoveryDaysSinceEnd <= 14 ? 'RECOVERY' : 'FREE'

  // ── Check-ins ─────────────────────────────────────────────────────
  const lastCheckIn = checkIns[0] ?? null
  const prevCheckIn = checkIns[1] ?? null

  // ── Today's session ───────────────────────────────────────────────
  let todaySession: DashboardSummary['todaySession'] = null
  if (activePlan) {
    const currentWeek = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    const week = activePlan.weeks.find(w => w.weekNumber === currentWeek)
    const session = week?.sessions.find(s => s.dayOfWeek === todayDow)
    if (session && session.type !== 'DESCANSO') {
      todaySession = {
        id: session.id,
        logId: session.log?.id ?? null,
        type: session.type,
        intensity: session.intensity ?? null,
        durationMin: session.durationMin,
        zoneTarget: session.zone ?? '2',
        detailText: session.description ?? session.coachNotes ?? '',
        completed: !!session.log,
      }
    }
  }

  // Fallback: if no running session today (no plan OR plan says DESCANSO), check gym
  if (!todaySession && assignedWorkout) {
    const todayGymDay = assignedWorkout.template.days.find(d => d.dayOfWeek === todayDow)
    if (todayGymDay && !todayGymDay.isRestDay) {
      todaySession = {
        id: 'gym-today',
        logId: null,
        type: 'FUERZA',
        intensity: 'MODERATE',
        durationMin: 60,
        zoneTarget: '',
        detailText: todayGymDay.label ?? '',
        completed: (input.gymCompletionDates ?? []).some(d => {
          const dt = new Date(d)
          const dtDow = dt.getUTCDay() === 0 ? 7 : dt.getUTCDay()
          return dtDow === todayDow
        }),
      }
    }
  }

  // ── Weekly strip ──────────────────────────────────────────────────
  let completedCount = 0
  let totalTraining = 0
  let planData: DashboardSummary['planData'] = null
  const weekSessions: WeekSessionSlot[] = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i, type: null, done: false, isToday: i + 1 === todayDow, id: null, durationMin: null, zoneTarget: null, gymLabel: null,
  }))

  if (activePlan) {
    const currentWeek = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    const week = activePlan.weeks.find(w => w.weekNumber === currentWeek)
    if (week) {
      totalTraining = week.sessions.filter(s => s.type !== 'DESCANSO').length
      completedCount = week.sessions.filter(s => s.log && s.type !== 'DESCANSO').length
      for (const s of week.sessions) {
        const idx = s.dayOfWeek - 1
        if (idx >= 0 && idx < 7) {
          weekSessions[idx].type = s.type
          weekSessions[idx].done = !!s.log
          weekSessions[idx].id = s.id
          weekSessions[idx].durationMin = s.durationMin
          weekSessions[idx].zoneTarget = s.zone ?? '2'
        }
      }
      planData = { name: activePlan.name, currentWeek, totalWeeks: activePlan.totalWeeks, phase: week.phase }
    }
  }

  // ── GYM: overlay assignedWorkout on empty slots (matches web buildCalendarWeek) ──
  if (assignedWorkout) {
    // Use todayDow (timezone-aware) to compute this week's Monday
    const todayIdx = todayDow - 1 // 0=Mon..6=Sun
    const gymDoneThisWeek = new Set<number>()
    for (const d of (input.gymCompletionDates ?? [])) {
      const dt = new Date(d)
      const dtDow = dt.getUTCDay() === 0 ? 7 : dt.getUTCDay() // 1=Mon..7=Sun
      // Check if this date falls within the current week by comparing dow offset from todayDow
      const daysDiff = dtDow - 1 // 0-based index (Mon=0)
      // Only include if within 7-day window: dayIdx relative to this week's Monday
      const distFromMonday = daysDiff
      if (distFromMonday >= 0 && distFromMonday <= 6) {
        // Verify it's actually this week: diff from today should be within [-todayIdx, 6-todayIdx]
        const diffFromToday = daysDiff - todayIdx
        if (diffFromToday >= -todayIdx && diffFromToday <= 6 - todayIdx) {
          gymDoneThisWeek.add(daysDiff)
        }
      }
    }

    for (const day of assignedWorkout.template.days) {
      const idx = day.dayOfWeek - 1
      if (idx < 0 || idx >= 7) continue
      // Only fill empty slots — don't overwrite sport sessions
      if (weekSessions[idx].type && weekSessions[idx].type !== 'DESCANSO') continue
      if (day.isRestDay) continue

      weekSessions[idx].type = 'FUERZA'
      const done = gymDoneThisWeek.has(idx)
      weekSessions[idx].done = done
      weekSessions[idx].durationMin = 60
      weekSessions[idx].gymLabel = day.label ?? null
      totalTraining++
      if (done) completedCount++
    }
  }

  // ── Nutrition target ──────────────────────────────────────────────
  const intensity = (todaySession?.intensity as 'HIGH' | 'MODERATE' | 'LOW' | null)
    ?? (todaySession?.type ? getSessionIntensity(todaySession.type) : null)
  const nt = nutritionPlan ? getDailyNutritionTarget(intensity, nutritionPlan) : null
  const nutritionTarget = nt ? { kcal: nt.kcal, proteinG: nt.proteinG, carbsG: nt.carbsG, fatG: nt.fatG, label: nt.label } : null

  // ── Streak ────────────────────────────────────────────────────────
  // Uses UTC date strings for comparison — completedAt and gymCompletionDates are UTC.
  // todayMidnight derived from todayDow to stay timezone-consistent.
  const toUTCDateStr = (d: Date) => d.toISOString().split('T')[0]
  const logDateSet = new Set([
    ...recentLogs.map(l => toUTCDateStr(new Date(l.completedAt))),
    ...(input.gymCompletionDates ?? []).map(d => toUTCDateStr(new Date(d))),
  ])
  let streakDays = 0
  // Compute today as UTC date from the timezone-aware todayDow offset
  const nowUtc = new Date()
  const todayMidnight = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()))
  for (let i = 0; i <= 59; i++) {
    const d = new Date(todayMidnight.getTime() - i * 86_400_000)
    if (logDateSet.has(toUTCDateStr(d))) streakDays++
    else break
  }

  // ── Week streak ──────────────────────────────────────────────────
  // Consecutive weeks (Mon–Sun) with at least 1 session — for milestone celebrations
  function getMondayKey(date: Date): string {
    const d = new Date(date)
    const dow = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1
    d.setUTCDate(d.getUTCDate() - dow)
    return toUTCDateStr(d)
  }
  const weekSet = new Set([
    ...recentLogs.map(l => getMondayKey(new Date(l.completedAt))),
    ...(input.gymCompletionDates ?? []).map(d => getMondayKey(new Date(d))),
  ])
  let weekStreak = 0
  const thisMonday = new Date(todayMidnight)
  const thisDowIdx = todayDow - 1 // 0=Mon..6=Sun
  thisMonday.setUTCDate(thisMonday.getUTCDate() - thisDowIdx)
  for (let i = 0; i <= 51; i++) {
    const weekStart = new Date(thisMonday.getTime() - i * 7 * 86_400_000)
    if (weekSet.has(toUTCDateStr(weekStart))) weekStreak++
    else break
  }

  // ── Race / recomp ─────────────────────────────────────────────────
  const sportDetails = user?.profile?.sportDetails as Record<string, unknown> | null
  const raceDateStr = sportDetails?.raceDate as string | undefined
  const raceDays = raceDateStr ? Math.ceil((new Date(raceDateStr).getTime() - Date.now()) / 86400000) : null
  const isRecomp = !!(
    user?.profile?.sportGoal?.includes('BODY') ||
    activePlan?.name?.toLowerCase().includes('recomp') ||
    activePlan?.name?.toLowerCase().includes('body')
  )

  // ── Weight progress ───────────────────────────────────────────────
  const currentWeight = lastCheckIn?.weightKg ?? user?.profile?.weightKg ?? null
  const targetWeight = user?.profile?.weightGoalKg ?? null
  const startWeight = [...checkIns].reverse().find(c => c.weightKg != null)?.weightKg ?? user?.profile?.weightKg ?? null
  let weeklyWeightChange: number | null = null
  if (lastCheckIn?.weightKg && prevCheckIn?.weightKg) {
    const daysDiff = Math.max(1,
      (new Date(lastCheckIn.recordedAt).getTime() - new Date(prevCheckIn.recordedAt).getTime()) / 86400000
    )
    weeklyWeightChange = Math.round(((lastCheckIn.weightKg - prevCheckIn.weightKg) / daysDiff) * 7 * 10) / 10
  }
  let weightProgressPct: number | null = null
  if (currentWeight && targetWeight && startWeight && startWeight !== targetWeight) {
    const totalDistance = Math.abs(targetWeight - startWeight)
    const remaining = Math.abs(targetWeight - currentWeight)
    // Progreso = cuánto se ha cerrado la brecha entre start y target
    const pct = Math.round(((totalDistance - remaining) / totalDistance) * 100)
    weightProgressPct = Math.min(100, Math.max(0, pct))
  }

  // ── Weekly volume ─────────────────────────────────────────────────
  let currentVolume: number | null = null
  let volumeDeltaPct: number | null = null
  if (activePlan) {
    const currentWeekNum = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    const currentWeekData = activePlan.weeks.find(w => w.weekNumber === currentWeekNum)
    const prevWeekData = activePlan.weeks.find(w => w.weekNumber === currentWeekNum - 1)
    currentVolume = currentWeekData?.volumeKm ?? null
    const prevVolume = prevWeekData?.volumeKm ?? null
    if (currentVolume && prevVolume) {
      volumeDeltaPct = Math.round(((currentVolume - prevVolume) / prevVolume) * 100)
    }
  }

  // ── Form status (uses todaySession, volume, mode — must come after them) ──
  const { formStatus, formMessage } = computeFormStatus({
    lastCheckIn, todayMidnight, todaySession, mode, volumeDeltaPct,
  })

  // ── Recent activity (merge SessionLog + GymSession) ─────────────────────
  const logEntries = recentLogs.map(l => ({
    type: l.freeSessionType ?? l.plannedSession?.type ?? 'OTRO',
    completedAt: l.completedAt.toISOString(),
    durationMin: l.durationMin ?? null,
    rpe: l.rpe ?? null,
    _ts: new Date(l.completedAt).getTime(),
  }))
  const gymEntries = (input.recentGymSessions ?? []).map(g => ({
    type: 'FUERZA' as string,
    completedAt: new Date(g.date).toISOString(),
    durationMin: g.durationMin ?? null,
    rpe: null as number | null,
    _ts: new Date(g.date).getTime(),
  }))
  const recentActivity = [...logEntries, ...gymEntries]
    .sort((a, b) => b._ts - a._ts)
    .slice(0, 5)
    .map(({ _ts, ...rest }) => rest)

  const hasEverLogged = recentLogs.length > 0 || (input.gymCompletionDates ?? []).length > 0

  return {
    planIdToComplete,
    summary: {
      firstName: (user?.name ?? 'Atleta').split(' ')[0],
      todaySession,
      planData,
      metrics: {
        weightKg: currentWeight,
        weightGoalKg: targetWeight,
        hrResting: lastCheckIn?.hrResting ?? user?.profile?.hrResting ?? null,
        sleepHours: lastCheckIn?.sleepHours ?? user?.profile?.sleepHoursAvg ?? null,
      },
      weekSessions,
      nutritionTarget,
      completedCount,
      totalTraining,
      checkinPending: (() => {
        const currentWeekNum = activePlanRaw
          ? getPlanWeekNumber(activePlanRaw.startDate, activePlanRaw.totalWeeks)
          : getCurrentISOWeek()
        return !lastCheckIn || lastCheckIn.weekNumber !== currentWeekNum
      })(),
      streakDays,
      weekStreak,
      raceDays,
      isRecomp,
      formStatus,
      formMessage,
      lastCheckIn: lastCheckIn ? {
        energyLevel: lastCheckIn.energyLevel,
        hardestSessionRpe: lastCheckIn.hardestSessionRpe,
        sleepHours: lastCheckIn.sleepHours,
      } : null,
      lastCheckinDaysAgo: lastCheckIn?.recordedAt
        ? Math.floor((todayMidnight.getTime() - new Date(lastCheckIn.recordedAt).getTime()) / 86_400_000)
        : null,
      weeklyWeightChange,
      weightProgressPct,
      currentVolume,
      volumeDeltaPct,
      mode,
      recoveryDaysLeft,
      completedPlanName,
      recentActivity,
      hasEverLogged,
    },
  }
}

// ── Form status computation ──────────────────────────────────────────────────

const CHECKIN_EXPIRY_DAYS = 7
const VOLUME_SPIKE_THRESHOLD = 20 // % de aumento que sube la alerta

function computeFormStatus(ctx: {
  lastCheckIn: CheckIn | null
  todayMidnight: Date
  todaySession: DashboardSummary['todaySession']
  mode: 'TRAINING' | 'RECOVERY' | 'FREE' | 'GYM'
  volumeDeltaPct: number | null
}): { formStatus: 'good' | 'moderate' | 'rest'; formMessage: string } {
  const { lastCheckIn, todayMidnight, todaySession, mode, volumeDeltaPct } = ctx

  // Recovery mode — siempre descanso, independiente del check-in
  if (mode === 'RECOVERY') {
    return { formStatus: 'rest', formMessage: 'Periodo de recuperacion post-plan' }
  }

  // Sin check-in nunca
  if (!lastCheckIn) {
    return { formStatus: 'good', formMessage: 'Sin datos de check-in' }
  }

  // Check-in expirado (>7 días) — no hacer recomendaciones con datos viejos
  const daysAgo = Math.floor(
    (todayMidnight.getTime() - new Date(lastCheckIn.recordedAt).getTime()) / 86_400_000,
  )
  if (daysAgo > CHECKIN_EXPIRY_DAYS) {
    return { formStatus: 'good', formMessage: 'Haz tu check-in semanal' }
  }

  // Check-in fresco — calcular estado base con energía + RPE + sueño
  const energy = lastCheckIn.energyLevel ?? 3
  const rpe = lastCheckIn.hardestSessionRpe ?? 5
  const sleep = (lastCheckIn.sleepHours ?? 7) >= 6.5

  let formStatus: 'good' | 'moderate' | 'rest'
  if (energy >= 4 && rpe <= 7 && sleep) formStatus = 'good'
  else if (energy >= 3 && rpe <= 8) formStatus = 'moderate'
  else formStatus = 'rest'

  // Spike de volumen semanal (>20%) con fatiga moderada → subir a rest
  if (formStatus === 'moderate' && volumeDeltaPct !== null && volumeDeltaPct > VOLUME_SPIKE_THRESHOLD) {
    formStatus = 'rest'
  }

  // Mensaje contextual según si hoy hay sesión o es día libre
  const isRestDay = !todaySession
  const formMessage = buildFormMessage(formStatus, isRestDay)

  return { formStatus, formMessage }
}

function buildFormMessage(status: 'good' | 'moderate' | 'rest', isRestDay: boolean): string {
  if (isRestDay) {
    if (status === 'rest') return 'Dia libre — prioriza descansar'
    if (status === 'moderate') return 'Dia libre — recupera energia'
    return 'Dia libre — buen momento para descansar'
  }
  if (status === 'good') return 'Listo para entrenar fuerte'
  if (status === 'moderate') return 'Controla la intensidad hoy'
  return 'Entrena suave o considera descansar'
}
