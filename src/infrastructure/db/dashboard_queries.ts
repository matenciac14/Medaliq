/**
 * Shared dashboard queries — used by both web (get-dashboard-data.ts) and mobile (route.ts).
 *
 * Extracts the 11 parallel DB queries that both platforms need, plus helpers to
 * map raw data into the getDashboardSummary use-case input.
 */

import { prisma } from '@/lib/db/prisma'
import { todayInTz } from '@/lib/core/date_utils'
import type { DashboardInput } from '@/domain/dashboard/get_dashboard_summary.use_case'
import { queryPendingSuggestions, queryTodayFoodLogs } from '@/infrastructure/db/shared_athlete_data'

// ── Core fetch ──────────────────────────────────────────────────────────────────

export async function fetchCoreDashboardData(userId: string, timezone?: string | null) {
  const todayStart = todayInTz(timezone)

  const [
    dbUser,
    recentLogs,
    nutritionPlan,
    assignedWorkout,
    weeklyRoutine,
    recentGymSessions,
    coachRelation,
    pendingSuggestionsCount,
    todayLog,
    todayFoodLogs,
    todayWaterLog,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        checkIns: { orderBy: { recordedAt: 'desc' as const }, take: 12 },
      },
    }),
    prisma.sessionLog.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' as const },
      take: 60,
      select: {
        id: true,
        completedAt: true,
        freeSessionType: true,
        durationMin: true,
        rpe: true,
        plannedSession: { select: { type: true } },
      },
    }),
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      include: { template: { include: { days: { include: { exercises: true } } } } },
      orderBy: { createdAt: 'desc' as const },
    }),
    prisma.weeklyRoutine.findUnique({ where: { userId } }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true },
      orderBy: { date: 'desc' as const },
      take: 60,
      select: {
        id: true,
        date: true,
        durationMin: true,
        energyState: true,
        assignedWorkout: { select: { template: { select: { name: true } } } },
      },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId: userId, status: 'ACTIVE' },
      include: {
        coach: {
          select: {
            name: true,
            coachProfile: { select: { slug: true, specialties: true, headline: true } },
          },
        },
      },
    }),
    queryPendingSuggestions(userId),
    prisma.dailyLog.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { weightKg: true, energyLevel: true },
    }),
    queryTodayFoodLogs(userId, timezone),
    prisma.waterLog.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { mlLogged: true },
    }),
  ])

  if (!dbUser) throw new Error('USER_NOT_FOUND')

  return {
    dbUser,
    recentLogs,
    nutritionPlan,
    assignedWorkout,
    weeklyRoutine,
    recentGymSessions,
    coachRelation,
    pendingSuggestionsCount,
    todayLog,
    todayFoodLogs,
    todayWaterLog,
  }
}

export type CoreDashboardData = Awaited<ReturnType<typeof fetchCoreDashboardData>>

// ── Mapping to use-case input ───────────────────────────────────────────────────

type ActivePlanForSummary = DashboardInput['activePlanRaw']
type LastCompletedPlan = DashboardInput['lastCompletedPlan']

export function buildDashboardSummaryInput(
  core: CoreDashboardData,
  activePlan: ActivePlanForSummary,
  lastCompletedPlan: LastCompletedPlan,
  todayDow?: number,
): DashboardInput {
  const { dbUser, recentLogs, nutritionPlan, assignedWorkout, recentGymSessions } = core
  const profile = dbUser.profile

  return {
    todayDow,
    user: {
      name: dbUser.name,
      profile: profile ? {
        weightKg: profile.weightKg,
        hrResting: profile.hrResting,
        weightGoalKg: profile.weightGoalKg,
        sleepHoursAvg: profile.sleepHoursAvg,
        sportDetails: profile.sportDetails,
        sportGoal: profile.sportGoal,
      } : null,
    },
    activePlanRaw: activePlan,
    lastCompletedPlan,
    checkIns: dbUser.checkIns.map(c => ({
      recordedAt: c.recordedAt,
      weekNumber: c.weekNumber,
      weightKg: c.weightKg,
      hrResting: c.hrResting,
      sleepHours: c.sleepHours,
      energyLevel: c.energyLevel,
      hardestSessionRpe: c.hardestSessionRpe,
    })),
    recentLogs: recentLogs.map(l => ({
      completedAt: l.completedAt,
      freeSessionType: l.freeSessionType ?? null,
      durationMin: l.durationMin ?? null,
      rpe: l.rpe ?? null,
      plannedSession: l.plannedSession ?? null,
    })),
    nutritionPlan: nutritionPlan ? {
      targetKcalHard: nutritionPlan.targetKcalHard,
      targetKcalEasy: nutritionPlan.targetKcalEasy,
      targetKcalRest: nutritionPlan.targetKcalRest,
      proteinG: nutritionPlan.proteinG,
      carbsHardG: nutritionPlan.carbsHardG,
      carbsEasyG: nutritionPlan.carbsEasyG,
      fatG: nutritionPlan.fatG,
    } : null,
    assignedWorkout: assignedWorkout ? {
      template: {
        days: assignedWorkout.template.days.map(d => ({
          dayOfWeek: d.dayOfWeek,
          isRestDay: d.isRestDay,
        })),
      },
    } : null,
    gymCompletionDates: recentGymSessions.map(gs => gs.date),
    recentGymSessions: recentGymSessions.map(gs => ({
      date: gs.date,
      durationMin: gs.durationMin ?? null,
      templateName: gs.assignedWorkout?.template.name ?? null,
    })),
  }
}

// ── Shared derived-value helpers ────────────────────────────────────────────────

export function computeFoodTotals(foodLogs: CoreDashboardData['todayFoodLogs']) {
  if (foodLogs.length === 0) return null
  return foodLogs.reduce(
    (acc, l) => {
      const r = l.grams / 100
      return {
        kcal:     acc.kcal     + Math.round(l.kcalLogged    ?? (l.food.kcalPer100g    * r)),
        proteinG: acc.proteinG + Math.round(l.proteinLogged ?? (l.food.proteinPer100g * r)),
        carbsG:   acc.carbsG   + Math.round(l.carbsLogged   ?? (l.food.carbsPer100g   * r)),
        fatG:     acc.fatG     + Math.round(l.fatLogged     ?? (l.food.fatPer100g     * r)),
      }
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  )
}

export function computeMealSlotLogs(foodLogs: CoreDashboardData['todayFoodLogs']) {
  const kcalByType: Record<string, number> = {}
  for (const fl of foodLogs) {
    const mealType = fl.mealType ?? 'SNACK'
    const kcal = fl.kcalLogged ?? (fl.food.kcalPer100g * fl.grams / 100)
    kcalByType[mealType] = (kcalByType[mealType] ?? 0) + kcal
  }
  return Object.entries(kcalByType).map(([mealType, kcal]) => ({ mealType, kcal: Math.round(kcal) }))
}

export function buildWaterData(
  waterLog: CoreDashboardData['todayWaterLog'],
  nutritionPlan: CoreDashboardData['nutritionPlan'],
) {
  return {
    mlLogged: waterLog?.mlLogged ?? 0,
    waterMlTarget: nutritionPlan?.waterMlTarget ?? 2000,
  }
}
