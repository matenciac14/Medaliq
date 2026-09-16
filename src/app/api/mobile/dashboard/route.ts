import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getDashboardSummary } from '@/domain/dashboard/get_dashboard_summary.use_case'
import { calculateHRZones } from '@/domain/plan/formulas'
import { PlanStatus } from '@/generated/prisma/enums'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { todayDowInTz } from '@/lib/core/date_utils'
import {
  fetchCoreDashboardData,
  buildDashboardSummaryInput,
  computeFoodTotals,
  computeMealSlotLogs,
  buildWaterData,
} from '@/infrastructure/db/dashboard_queries'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:dashboard`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const userId = mobile.id
  const tz = req.nextUrl.searchParams.get('tz') || undefined

  try {
  // ── Shared queries + PERF-01 Phase 1: plan metadata sin sesiones ───────
  const [core, planMeta] = await Promise.all([
    fetchCoreDashboardData(userId, tz),
    prisma.trainingPlan.findFirst({
      where: { userId, status: PlanStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, startDate: true, endDate: true, totalWeeks: true },
    }),
  ])

  const { dbUser, recentGymSessions, coachRelation, weeklyRoutine, nutritionPlan, assignedWorkout: assignedWorkoutRaw, pendingSuggestionsCount, todayLog, todayFoodLogs, todayWaterLog } = core

  // PERF-01 Phase 2: cargar solo la semana actual con sesiones completas
  const currentWeekNum = planMeta ? getPlanWeekNumber(planMeta.startDate, planMeta.totalWeeks) : 0
  const planIsExpired = planMeta
    ? currentWeekNum > planMeta.totalWeeks && Date.now() > new Date(planMeta.endDate).getTime()
    : false

  const currentWeekData = planMeta && !planIsExpired ? await prisma.planWeek.findFirst({
    where: { planId: planMeta.id, weekNumber: currentWeekNum },
    include: { sessions: { include: { log: true }, orderBy: { dayOfWeek: 'asc' } } },
  }) : null

  const activePlanRaw = planMeta ? {
    ...planMeta,
    weeks: currentWeekData ? [currentWeekData] : [],
  } : null

  const lastCompletedPlan = activePlanRaw && !planIsExpired ? null : await prisma.trainingPlan.findFirst({
    where: { userId, status: PlanStatus.COMPLETED },
    orderBy: { endDate: 'desc' },
    select: { name: true, endDate: true },
  }).then(r => r?.endDate ? { name: r.name, endDate: new Date(r.endDate) } : null)

  // Map Prisma field names -> domain names before passing to the pure use case
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

  // When a plan just auto-completes, fetch stats to show the season-completed modal
  let justCompletedPlan: { name: string; totalWeeks: number; totalSessions: number; totalKm: number | null; seasonNumber: number; adherencePct: number | null } | null = null

  async function buildJustCompletedPlan(planId: string, name: string, totalWeeks: number, isNewCompletion: boolean) {
    const [sessionCount, kmAgg, completedCount, plannedCount] = await Promise.all([
      prisma.sessionLog.count({ where: { userId, plannedSession: { week: { planId } } } }),
      prisma.sessionLog.aggregate({
        where: { userId, plannedSession: { week: { planId } } },
        _sum: { distanceKm: true },
      }),
      prisma.trainingPlan.count({ where: { userId, status: PlanStatus.COMPLETED } }),
      prisma.plannedSession.count({ where: { week: { planId } } }),
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

  if (planIdToComplete && planMeta) {
    justCompletedPlan = await buildJustCompletedPlan(planIdToComplete, planMeta.name, planMeta.totalWeeks, true)
    await prisma.trainingPlan.updateMany({
      where: { id: planIdToComplete, status: PlanStatus.ACTIVE },
      data: { status: PlanStatus.COMPLETED },
    }).catch((err) => {
      console.error('[dashboard] failed to auto-complete plan', planIdToComplete, err)
    })
  }

  // Gap fix: if no justCompletedPlan from this request, check for recently completed plans
  if (!justCompletedPlan) {
    const recentlyCompleted = await prisma.trainingPlan.findFirst({
      where: {
        userId,
        status: PlanStatus.COMPLETED,
        endDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { endDate: 'desc' },
      select: { id: true, name: true, totalWeeks: true },
    })
    if (recentlyCompleted) {
      justCompletedPlan = await buildJustCompletedPlan(recentlyCompleted.id, recentlyCompleted.name, recentlyCompleted.totalWeeks, false)
    }
  }

  const todayFoodTotals = computeFoodTotals(todayFoodLogs) ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }

  return NextResponse.json({
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
  })
  } catch (err) {
    console.error('[mobile/dashboard]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
