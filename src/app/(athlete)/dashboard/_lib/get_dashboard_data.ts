import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { getWeekMonday, todayDowInTz, todayInTz } from '@/lib/core/date_utils'
import { getDashboardSummary, type DashboardSummary } from '@/domain/dashboard/get_dashboard_summary.use_case'
import { buildCalendarWeek } from '@/infrastructure/db/calendar'
import {
  fetchCoreDashboardData,
  buildDashboardSummaryInput,
  computeFoodTotals,
  computeMealSlotLogs,
  buildWaterData,
} from '@/infrastructure/db/dashboard_queries'
import { handlePlanLifecycle } from '@/infrastructure/db/shared_athlete_data'
import type { CalendarWeek } from '@/domain/calendar/calendar.types'

// ── Types ────────────────────────────────────────────────────────────────────

type CompletedPlanInfo = {
  endDate: Date
  name: string
  totalWeeks: number
  sessionsLogged: number
  sessionsTotal: number
}

type RoutineDayConfig = { dow: number; activity: 'GYM' | 'RUN' | 'REST'; split?: string; runType?: string }

export type TodaySessionData = {
  id: string
  logId: string | null
  type: string
  intensity: string
  durationMin: number
  zoneTarget: string
  detailText: string
  completed: boolean
  logType: 'session' | 'gym'
}

export type DashboardMode = 'TRAINING' | 'RECOVERY' | 'FREE' | 'GYM'

export type DashboardData = {
  // Core
  dashboardMode: DashboardMode
  firstName: string
  timezone: string
  isB2B: boolean

  // Plan
  planData: { name: string; totalWeeks: number; currentWeek: number; phase: string }
  activePlanId: string | null
  todaySession: TodaySessionData | null
  lastCompletedPlanInfo: CompletedPlanInfo | null
  recoveryDaysSinceEnd: number | null

  // Week navigation
  weekOffset: number
  selectedWeekNum: number
  isCurrentWeek: boolean
  weekDateLabel: string

  // Week KPIs
  completedCount: number
  totalTraining: number
  currentWeekVolumeKm: number | null
  volumeDeltaPct: number | null

  // FREE/GYM mode week data
  weekSessionCount: number
  weekSessionTarget: number
  weekSessionDelta: number | null
  avgKcalPerDay: number | null

  // Shared summary (from use case)
  dashSummary: DashboardSummary

  // Check-in
  lastCheckIn: {
    recordedAt: Date
    hardestSessionRpe: number | null
    energyLevel: number | null
    weightKg: number | null
    sleepHours: number | null
  } | null
  formCheckInDate: string | null
  checkinPending: boolean

  // Form status
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string

  // Weight
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null

  // Race/Recomp
  raceDays: number | null
  raceDate: string | undefined
  isRecomp: boolean
  streakDays: number

  // Coach
  coachRelation: {
    coach: {
      name: string | null
      coachProfile: { slug: string | null; specialties: string[] | null; headline: string | null } | null
    }
  } | null

  // Gym
  assignedWorkout: {
    template: {
      name: string
      days: { dayOfWeek: number; isRestDay: boolean; label?: string; exercises: unknown[] }[]
    }
  } | null
  hasGymToday: boolean
  gymDoneToday: boolean
  todayGymDay: { dayOfWeek: number; isRestDay: boolean; label?: string; exercises: unknown[] } | null
  todayGymSession: { id: string; durationMin: number | null; energyState: string | null } | null

  // Routine
  todayRoutineDay: RoutineDayConfig | null

  // Nutrition
  nutritionPlan: { targetKcalHard: number } | null
  todayConsumed: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null

  // Suggestions
  pendingSuggestionsCount: number

  // Today log
  todayLogRaw: { weightKg: number | null; energyLevel: number | null } | null

  // Dashboard-level flags
  hasEverLogged: boolean
  phaseDisplay: string

  // Pre-computed calendar week (eliminates client-side fetch flash)
  initialCalendarWeek: CalendarWeek

  // Pre-fetched water log (eliminates zeros flash in HydrationWidget)
  initialWater: { mlLogged: number; waterMlTarget: number }

  // Pre-fetched meal slot logs (eliminates zeros flash in MealSlotsWidget)
  initialMealSlotLogs: { mealType: string; kcal: number }[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function phaseLabel(phase: string): string {
  if (phase === 'ESPECIFICO') return 'ESPECÍFICO'
  return phase
}

function computeWeekDateLabel(weekStartDate: Date): string {
  const end = new Date(weekStartDate)
  end.setDate(end.getDate() + 6)
  const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  if (weekStartDate.getMonth() === end.getMonth()) {
    return `${weekStartDate.getDate()}\u2013${end.getDate()} ${MONTHS[weekStartDate.getMonth()]}`
  }
  return `${weekStartDate.getDate()} ${MONTHS[weekStartDate.getMonth()]} \u2013 ${end.getDate()} ${MONTHS[end.getMonth()]}`
}

// ── Main function ────────────────────────────────────────────────────────────

export async function getDashboardData(userId: string, rawWeekOffset: number, sessionIsB2B: boolean): Promise<DashboardData> {
  // Fetch user timezone first (lightweight) for date-boundary calculations
  const userTz = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  }).then(u => u?.timezone ?? undefined)

  const todayDow = todayDowInTz(userTz)

  // ── Shared + web-specific parallel fetch ─────────────────────────────────
  const [core, activePlansRaw, initialCalendarWeek] = await Promise.all([
    fetchCoreDashboardData(userId, userTz),
    prisma.trainingPlan.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              select: { id: true, type: true, dayOfWeek: true, log: { select: { id: true } } },
            },
          },
        },
      },
    }),
    buildCalendarWeek(userId, rawWeekOffset, userTz),
  ])

  const { dbUser, recentLogs, nutritionPlan, assignedWorkout: assignedWorkoutRaw, weeklyRoutine, recentGymSessions, coachRelation: coachRelationRaw, pendingSuggestionsCount, todayLog: todayLogRaw, todayFoodLogs, todayWaterLog } = core

  // ── Plan lifecycle (dedup + expiration) — shared with Plan page ────────
  const { activePlan: activePlanResolved, expiredSnapshot } = handlePlanLifecycle(activePlansRaw)
  const activePlan = activePlanResolved

  let lastCompletedPlanInfo: CompletedPlanInfo | null = null
  if (expiredSnapshot) {
    const allSessions = expiredSnapshot.weeks.flatMap(w => w.sessions)
    lastCompletedPlanInfo = {
      endDate: new Date(expiredSnapshot.endDate),
      name: expiredSnapshot.name,
      totalWeeks: expiredSnapshot.totalWeeks,
      sessionsLogged: allSessions.filter(s => s.log).length,
      sessionsTotal: allSessions.length,
    }
  }

  if (!activePlan && !lastCompletedPlanInfo) {
    const raw = await prisma.trainingPlan.findFirst({
      where: { userId, status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      select: {
        endDate: true, name: true, totalWeeks: true,
        weeks: { select: { sessions: { select: { log: { select: { id: true } } } } } },
      },
    })
    if (raw) {
      const allSessions = raw.weeks.flatMap(w => w.sessions)
      lastCompletedPlanInfo = {
        endDate: new Date(raw.endDate),
        name: raw.name,
        totalWeeks: raw.totalWeeks,
        sessionsLogged: allSessions.filter(s => s.log).length,
        sessionsTotal: allSessions.length,
      }
    }
  }

  // ── Dashboard mode ─────────────────────────────────────────────────────
  const recoveryDaysSinceEnd = lastCompletedPlanInfo
    ? Math.floor((Date.now() - lastCompletedPlanInfo.endDate.getTime()) / 86400000)
    : null
  const dashboardMode: DashboardMode = activePlan
    ? 'TRAINING'
    : assignedWorkoutRaw
      ? 'GYM'
      : lastCompletedPlanInfo && recoveryDaysSinceEnd !== null && recoveryDaysSinceEnd <= 14
        ? 'RECOVERY'
        : 'FREE'

  const firstName = (dbUser.name ?? dbUser.email ?? 'Atleta').split(' ')[0]
  const profile = dbUser.profile
  const lastCheckIn = dbUser.checkIns[0] ?? null
  const coachRelation = coachRelationRaw ?? null
  const assignedWorkout = assignedWorkoutRaw ?? null
  const todayGymDay = assignedWorkout?.template.days.find((d) => d.dayOfWeek === todayDow) ?? null
  const hasGymToday = !!(todayGymDay && !todayGymDay.isRestDay)
  const todayGymSession = recentGymSessions.find((gs) => new Date(gs.date).toDateString() === new Date().toDateString()) ?? null
  const gymDoneToday = !!todayGymSession

  // ── Self-directed: today's routine day ─────────────────────────────────
  const routineDays = (weeklyRoutine?.days ?? []) as RoutineDayConfig[]
  const todayRoutineDay = routineDays.find((d) => d.dow === todayDow) ?? null

  // ── Week range for FREE/GYM/RECOVERY ───────────────────────────────────
  const weekStart = getWeekMonday(rawWeekOffset, userTz)
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000 - 1)

  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekEnd = new Date(weekStart)
  prevWeekEnd.setTime(prevWeekEnd.getTime() - 1)

  const [weekFreeLogs, weekGymSessions, prevWeekFreeLogs, prevWeekGymSessions, weekFoodLogs] = activePlan ? [[], [], [], [], []] : await Promise.all([
    prisma.sessionLog.findMany({
      where: { userId, plannedSessionId: null, completedAt: { gte: weekStart, lte: weekEnd } },
      select: { completedAt: true, freeSessionType: true },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true, date: { gte: weekStart, lte: weekEnd } },
      orderBy: { date: 'asc' },
      select: { date: true, assignedWorkout: { select: { template: { select: { name: true } } } } },
    }),
    prisma.sessionLog.findMany({
      where: { userId, plannedSessionId: null, completedAt: { gte: prevWeekStart, lte: prevWeekEnd } },
      select: { completedAt: true },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true, date: { gte: prevWeekStart, lte: prevWeekEnd } },
      select: { date: true },
    }),
    prisma.foodLog.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      select: { date: true, kcalLogged: true },
    }),
  ])

  const activeDaysThisWeek = new Set([
    ...weekFreeLogs.map((l) => new Date(l.completedAt).toDateString()),
    ...weekGymSessions.map((g) => new Date(g.date).toDateString()),
  ])
  const weekSessionCount = activeDaysThisWeek.size

  const prevWeekActiveDays = new Set([
    ...prevWeekFreeLogs.map((l) => new Date(l.completedAt).toDateString()),
    ...prevWeekGymSessions.map((g) => new Date(g.date).toDateString()),
  ])
  const prevWeekSessionCount = prevWeekActiveDays.size
  const weekSessionDelta = prevWeekSessionCount > 0 ? weekSessionCount - prevWeekSessionCount : null

  const avgKcalPerDay = (() => {
    if (weekFoodLogs.length === 0) return null
    const byDay = new Map<string, number>()
    for (const log of weekFoodLogs) {
      const key = new Date(log.date).toDateString()
      byDay.set(key, (byDay.get(key) ?? 0) + (log.kcalLogged ?? 0))
    }
    if (byDay.size === 0) return null
    const total = Array.from(byDay.values()).reduce((a, b) => a + b, 0)
    return Math.round(total / byDay.size)
  })()

  const weekSessionTarget = weeklyRoutine?.daysPerWeek ?? 4

  // ── Plan & current week ────────────────────────────────────────────────
  let planData = { name: 'Sin plan', totalWeeks: 0, currentWeek: 0, phase: 'BASE' }
  let todaySession: TodaySessionData | null = null
  let currentWeekVolumeKm: number | null = null
  let weekOffset = rawWeekOffset
  let selectedWeekNum = 0
  let isCurrentWeek = weekOffset === 0

  if (activePlan) {
    const currentWeek = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    weekOffset = Math.max(1 - currentWeek, rawWeekOffset)
    selectedWeekNum = currentWeek + weekOffset
    isCurrentWeek = weekOffset === 0

    const currentPlanWeek = activePlan.weeks.find(w => w.weekNumber === currentWeek) ?? null
    const selectedPlanWeek = activePlan.weeks.find(w => w.weekNumber === selectedWeekNum) ?? null

    planData = {
      name: activePlan.name,
      totalWeeks: activePlan.totalWeeks,
      currentWeek,
      phase: currentPlanWeek?.phase ?? 'BASE',
    }

    if (currentPlanWeek) {
      const currentWeekFullSessions = await prisma.plannedSession.findMany({
        where: { week: { planId: activePlan.id, weekNumber: currentWeek } },
        include: { log: true },
        orderBy: { dayOfWeek: 'asc' },
      })
      const todayPlanned = currentWeekFullSessions.find(s => s.dayOfWeek === todayDow) ?? null
      if (todayPlanned && todayPlanned.type !== 'DESCANSO') {
        todaySession = {
          id: todayPlanned.id,
          logId: todayPlanned.log?.id ?? null,
          type: todayPlanned.type,
          intensity: todayPlanned.intensity ?? 'MODERATE',
          durationMin: todayPlanned.durationMin,
          zoneTarget: todayPlanned.zoneTarget ?? 'Z2',
          detailText: todayPlanned.detailText ?? '',
          completed: !!todayPlanned.log,
          logType: 'session',
        }
      }
    }

    currentWeekVolumeKm = selectedPlanWeek?.volumeKm ?? null
  }

  // BUG-056: free session fallback — use timezone-aware "today"
  if (!todaySession) {
    const todayStart = todayInTz(userTz)
    const todayFreeLog = recentLogs.find(l => new Date(l.completedAt) >= todayStart)
    if (todayFreeLog) {
      todaySession = {
        id: todayFreeLog.id,
        logId: todayFreeLog.id,
        type: todayFreeLog.freeSessionType ?? 'OTRO',
        intensity: 'MODERATE',
        durationMin: todayFreeLog.durationMin ?? 0,
        zoneTarget: 'LIBRE',
        detailText: 'Sesión libre registrada',
        completed: true,
        logType: 'session',
      }
    }
  }

  // ── getDashboardSummary (shared use case) ──────────────────────────────
  const activePlanForSummary = activePlan ? {
    id: activePlan.id,
    name: activePlan.name,
    startDate: new Date(activePlan.startDate),
    totalWeeks: activePlan.totalWeeks,
    weeks: activePlan.weeks.map(w => ({
      weekNumber: w.weekNumber,
      phase: w.phase,
      volumeKm: w.volumeKm ?? null,
      sessions: w.sessions.map(s => ({
        id: s.id, type: s.type, dayOfWeek: s.dayOfWeek, durationMin: null,
        zone: null, intensity: null, description: null, log: s.log,
      })),
    })),
  } : null

  const lastCompletedPlanForSummary = lastCompletedPlanInfo
    ? { name: lastCompletedPlanInfo.name, endDate: lastCompletedPlanInfo.endDate }
    : null

  const summaryInput = buildDashboardSummaryInput(core, activePlanForSummary, lastCompletedPlanForSummary, todayDow)
  const { summary: dashSummary } = getDashboardSummary(summaryInput)

  // ── Derived values ─────────────────────────────────────────────────────
  const formCheckInDate: string | null = lastCheckIn
    ? (() => {
        const daysAgo = Math.floor((Date.now() - new Date(lastCheckIn.recordedAt).getTime()) / 86400000)
        return daysAgo === 0 ? 'hoy' : daysAgo === 1 ? 'ayer' : `hace ${daysAgo} días`
      })()
    : null

  const weekStartDate = getWeekMonday(weekOffset, userTz)
  const weekDateLabel = computeWeekDateLabel(weekStartDate)

  // Week KPIs
  const selectedPlanWeekSessions = activePlan?.weeks.find(w => w.weekNumber === selectedWeekNum)?.sessions ?? []
  const planCompletedCount = selectedPlanWeekSessions.filter(s => s.log && s.type !== 'DESCANSO').length
  const planTotalTraining = selectedPlanWeekSessions.filter(s => s.type !== 'DESCANSO').length
  const weekEndDate2 = new Date(weekStartDate)
  weekEndDate2.setDate(weekStartDate.getDate() + 7)
  const freeLogsSelectedWeek = recentLogs.filter(l =>
    l.freeSessionType !== null &&
    new Date(l.completedAt) >= weekStartDate &&
    new Date(l.completedAt) < weekEndDate2
  ).length
  const completedCount = planCompletedCount + freeLogsSelectedWeek
  const totalTraining = planTotalTraining + freeLogsSelectedWeek

  const raceDate = (profile?.sportDetails as Record<string, unknown> | null)?.raceDate as string | undefined
  const prevPlanWeekData = activePlan?.weeks.find((w: { weekNumber: number }) => w.weekNumber === planData.currentWeek - 1)
  const prevVolume = prevPlanWeekData?.volumeKm ?? null
  const volumeDeltaPct = currentWeekVolumeKm && prevVolume
    ? Math.round(((currentWeekVolumeKm - prevVolume) / prevVolume) * 100)
    : null

  return {
    dashboardMode,
    firstName,
    timezone: dbUser.timezone ?? 'America/Bogota',
    isB2B: sessionIsB2B,

    planData,
    activePlanId: activePlan?.id ?? null,
    todaySession,
    lastCompletedPlanInfo,
    recoveryDaysSinceEnd,

    weekOffset,
    selectedWeekNum,
    isCurrentWeek,
    weekDateLabel,

    completedCount,
    totalTraining,
    currentWeekVolumeKm,
    volumeDeltaPct,

    weekSessionCount,
    weekSessionTarget,
    weekSessionDelta,
    avgKcalPerDay,

    dashSummary,

    lastCheckIn: lastCheckIn ? {
      recordedAt: lastCheckIn.recordedAt,
      hardestSessionRpe: lastCheckIn.hardestSessionRpe ?? null,
      energyLevel: lastCheckIn.energyLevel ?? null,
      weightKg: lastCheckIn.weightKg ?? null,
      sleepHours: lastCheckIn.sleepHours ?? null,
    } : null,
    formCheckInDate,
    checkinPending: dashSummary.checkinPending,

    formStatus: dashSummary.formStatus,
    formMessage: dashSummary.formMessage,

    currentWeight: dashSummary.metrics.weightKg,
    targetWeight: dashSummary.metrics.weightGoalKg,
    weeklyWeightChange: dashSummary.weeklyWeightChange,
    weightProgressPct: dashSummary.weightProgressPct,

    raceDays: dashSummary.raceDays,
    raceDate,
    isRecomp: dashSummary.isRecomp,
    streakDays: dashSummary.streakDays,

    coachRelation: coachRelation ? {
      coach: {
        name: coachRelation.coach.name,
        coachProfile: coachRelation.coach.coachProfile,
      },
    } : null,

    assignedWorkout: assignedWorkout ? {
      template: {
        name: assignedWorkout.template.name,
        days: assignedWorkout.template.days.map(d => ({
          dayOfWeek: d.dayOfWeek,
          isRestDay: d.isRestDay,
          label: (d as unknown as { label?: string }).label,
          exercises: d.exercises,
        })),
      },
    } : null,
    hasGymToday,
    gymDoneToday,
    todayGymDay: todayGymDay ? { dayOfWeek: todayGymDay.dayOfWeek, isRestDay: todayGymDay.isRestDay, label: (todayGymDay as unknown as { label?: string }).label, exercises: todayGymDay.exercises } : null,
    todayGymSession: todayGymSession ? { id: todayGymSession.id, durationMin: todayGymSession.durationMin, energyState: todayGymSession.energyState } : null,

    todayRoutineDay,

    nutritionPlan: nutritionPlan ? { targetKcalHard: nutritionPlan.targetKcalHard } : null,
    todayConsumed: computeFoodTotals(todayFoodLogs),

    pendingSuggestionsCount,

    todayLogRaw: todayLogRaw ?? null,

    hasEverLogged: dashSummary.hasEverLogged,
    phaseDisplay: phaseLabel(planData.phase),

    initialCalendarWeek,

    initialWater: buildWaterData(todayWaterLog, nutritionPlan),

    initialMealSlotLogs: computeMealSlotLogs(todayFoodLogs),
  }
}
