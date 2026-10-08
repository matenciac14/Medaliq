import type { PrismaClient } from '../../generated/prisma/client'
import { PlanStatus } from '../../generated/prisma/enums'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { todayDowInTz } from '@/lib/core/date_utils'
import { calculateHRZones } from '@/domain/plan/formulas'
import { getDashboardSummary } from '@/domain/dashboard/get_dashboard_summary.use_case'
import {
  fetchCoreDashboardData,
  buildDashboardSummaryInput,
  computeFoodTotals,
  computeMealSlotLogs,
  buildWaterData,
} from '@/infrastructure/db/dashboard_queries'

// ── Types ────────────────────────────────────────────────────────────────────

type CompletedPlanStats = {
  name: string
  totalWeeks: number
  totalSessions: number
  totalKm: number | null
  seasonNumber: number
  adherencePct: number | null
}

// ── Use case ─────────────────────────────────────────────────────────────────

export async function getMobileDashboard(userId: string, tz: string | undefined, db: PrismaClient) {
  const [core, planMeta, lastCompletedPlanRaw] = await Promise.all([
    fetchCoreDashboardData(userId, tz),
    db.trainingPlan.findFirst({
      where: { userId, status: PlanStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, startDate: true, endDate: true, totalWeeks: true },
    }),
    db.trainingPlan.findFirst({
      where: { userId, status: PlanStatus.COMPLETED },
      orderBy: { endDate: 'desc' },
      select: { name: true, endDate: true },
    }),
  ])

  const { dbUser, recentGymSessions, coachRelation, weeklyRoutine, nutritionPlan, assignedWorkout: assignedWorkoutRaw, pendingSuggestionsCount, todayLog, todayFoodLogs, todayWaterLog } = core

  // PERF-01: load only current week with full sessions
  const currentWeekNum = planMeta ? getPlanWeekNumber(planMeta.startDate, planMeta.totalWeeks) : 0
  const planIsExpired = planMeta
    ? currentWeekNum > planMeta.totalWeeks && Date.now() > new Date(planMeta.endDate).getTime()
    : false

  const currentWeekData = planMeta && !planIsExpired ? await db.planWeek.findFirst({
    where: { planId: planMeta.id, weekNumber: currentWeekNum },
    include: { sessions: { include: { log: true }, orderBy: { dayOfWeek: 'asc' } } },
  }) : null

  const activePlanRaw = planMeta ? { ...planMeta, weeks: currentWeekData ? [currentWeekData] : [] } : null

  const lastCompletedPlan = activePlanRaw && !planIsExpired ? null
    : lastCompletedPlanRaw?.endDate ? { name: lastCompletedPlanRaw.name, endDate: new Date(lastCompletedPlanRaw.endDate) } : null

  // Map Prisma field names -> domain names
  const activePlan = activePlanRaw && !planIsExpired
    ? {
        ...activePlanRaw,
        weeks: activePlanRaw.weeks.map((w) => ({
          ...w,
          sessions: w.sessions.map((s) => ({
            ...s,
            zone:        s.zoneTarget,
            description: s.detailText,
            coachNotes:  s.coachNote,
          })),
        })),
      }
    : null

  const todayDow = todayDowInTz(tz)
  const summaryInput = buildDashboardSummaryInput(core, activePlan, lastCompletedPlan, todayDow)
  const { summary, planIdToComplete } = getDashboardSummary(summaryInput)

  // Auto-complete expired plans (idempotent — safe in GET, updateMany is a no-op if already COMPLETED)
  let justCompletedPlan: CompletedPlanStats | null = null

  if (planIdToComplete && planMeta) {
    justCompletedPlan = await buildCompletedPlanStats(planIdToComplete, planMeta.name, planMeta.totalWeeks, true, userId, db)
    await db.trainingPlan.updateMany({
      where: { id: planIdToComplete, status: PlanStatus.ACTIVE },
      data: { status: PlanStatus.COMPLETED },
    }).catch((err) => console.error('[dashboard] failed to auto-complete plan', planIdToComplete, err))
  }

  if (!justCompletedPlan) {
    const recentlyCompleted = await db.trainingPlan.findFirst({
      where: {
        userId,
        status: PlanStatus.COMPLETED,
        endDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { endDate: 'desc' },
      select: { id: true, name: true, totalWeeks: true },
    })
    if (recentlyCompleted) {
      justCompletedPlan = await buildCompletedPlanStats(recentlyCompleted.id, recentlyCompleted.name, recentlyCompleted.totalWeeks, false, userId, db)
    }
  }

  const todayFoodTotals = computeFoodTotals(todayFoodLogs) ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }

  return {
    ...summary,
    weeklyRoutine: weeklyRoutine ? { daysPerWeek: weeklyRoutine.daysPerWeek, days: weeklyRoutine.days } : null,
    todayLog: todayLog ?? null,
    hasEverLogged: summary.hasEverLogged,
    coach: coachRelation ? {
      name: coachRelation.coach.name ?? 'Tu coach',
      headline: coachRelation.coach.coachProfile?.headline ?? null,
      initial: (coachRelation.coach.name ?? 'C').charAt(0).toUpperCase(),
    } : null,
    isB2B: !!coachRelation,
    workoutName: assignedWorkoutRaw?.template.name ?? null,
    justCompletedPlan,
    pendingSuggestionsCount,
    todayFoodTotals: {
      ...todayFoodTotals,
      proteinG: Math.round(todayFoodTotals.proteinG * 10) / 10,
      carbsG:   Math.round(todayFoodTotals.carbsG   * 10) / 10,
      fatG:     Math.round(todayFoodTotals.fatG     * 10) / 10,
    },
    waterData: buildWaterData(todayWaterLog, nutritionPlan),
    mealSlotLogs: computeMealSlotLogs(todayFoodLogs),
    checkInData: (() => {
      const ci = dbUser.checkIns[0]
      if (!ci) return null
      return {
        energyLevel:     ci.energyLevel     ?? null,
        sleepHours:      ci.sleepHours      ?? null,
        stressLevel:     ci.stressLevel     ?? null,
        motivationLevel: ci.motivationLevel ?? null,
        recordedAt:      ci.recordedAt.toISOString(),
      }
    })(),
    hrZones: (() => {
      const hrMax = dbUser.profile?.hrMax ?? null
      if (!hrMax) return null
      const hrResting = dbUser.profile?.hrResting ?? 0
      return calculateHRZones(hrMax, hrResting)
    })(),
  }
}

// ── Helper ───────────────────────────────────────────────────────────────────

async function buildCompletedPlanStats(
  planId: string,
  name: string,
  totalWeeks: number,
  isNewCompletion: boolean,
  userId: string,
  db: PrismaClient,
): Promise<CompletedPlanStats> {
  const [sessionCount, kmAgg, completedCount, plannedCount] = await Promise.all([
    db.sessionLog.count({ where: { userId, plannedSession: { week: { planId } } } }),
    db.sessionLog.aggregate({
      where: { userId, plannedSession: { week: { planId } } },
      _sum: { distanceKm: true },
    }),
    db.trainingPlan.count({ where: { userId, status: PlanStatus.COMPLETED } }),
    db.plannedSession.count({ where: { week: { planId } } }),
  ])
  return {
    name,
    totalWeeks,
    totalSessions: sessionCount,
    totalKm: kmAgg._sum.distanceKm ? Math.round(kmAgg._sum.distanceKm) : null,
    seasonNumber: isNewCompletion ? completedCount + 1 : completedCount,
    adherencePct: plannedCount > 0 ? Math.round((sessionCount / plannedCount) * 100) : null,
  }
}
