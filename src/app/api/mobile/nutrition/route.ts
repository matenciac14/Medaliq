import { NextRequest, NextResponse } from 'next/server'
import { todayDowInTz, todayInTz } from '@/lib/core/date_utils'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { intensityToDayType } from '@/lib/nutrition/day_type'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily_target'
import { parseMealPlanData } from '@/domain/nutrition/generate_meal_plan'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const tz = req.nextUrl.searchParams.get('tz') || undefined
  const todayDow = todayDowInTz(tz)

  // Fetch plan first to compute current week — avoid date-based query (timezone-sensitive)
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, startDate: true, totalWeeks: true },
  })
  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : null

  const todayStart = todayInTz(tz)

  const [nutritionPlanRaw, mealPlan, todaySession, gymToday, healthProfile, gymSessionToday, currentPlanWeek] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.mealPlan.findUnique({ where: { userId } }),
    activePlan && currentWeek
      ? prisma.plannedSession.findFirst({
          where: {
            week: { planId: activePlan.id, weekNumber: currentWeek },
            dayOfWeek: todayDow,
          },
          select: { type: true, intensity: true },
        })
      : Promise.resolve(null),
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: {
        template: {
          select: {
            days: {
              where: { dayOfWeek: todayDow },
              select: { isRestDay: true },
            },
          },
        },
      },
    }),
    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, heightCm: true, age: true, gender: true, weightGoalKg: true },
    }),
    // EX-18: gym calories burned today
    prisma.gymSession.findFirst({
      where: { athleteId: userId, date: { gte: todayStart }, completed: true },
      select: { caloriesBurned: true },
      orderBy: { createdAt: 'desc' },
    }),
    // MOB-NUT-01: contexto de fase del plan para banner en mobile
    activePlan && currentWeek
      ? prisma.planWeek.findFirst({
          where: { planId: activePlan.id, weekNumber: currentWeek },
          select: { isRecoveryWeek: true, sessions: { select: { intensity: true } } },
        })
      : Promise.resolve(null),
  ])

  // PERSIST-09: GET no hace writes. El lazy-init fue eliminado para no violar REST
  // y evitar race conditions entre requests concurrentes. La inicialización del plan
  // nutricional ocurre en POST /api/onboarding/generate o POST /api/athlete/nutrition/generate.
  const nutritionPlan = nutritionPlanRaw

  // R5: fixed daily target — no intensity-based auto-switch
  const sessionIntensity = 'MODERATE' as const
  const dayType = 'easy' as const

  // MOB-NUT-01: computar contexto de fase del plan
  const planPhaseContext = currentPlanWeek?.isRecoveryWeek
    ? 'Semana de descarga'
    : currentPlanWeek?.sessions.some(s => s.intensity === 'HIGH')
      ? 'Semana de carga alta'
      : currentPlanWeek?.sessions.some(s => s.intensity === 'MODERATE')
        ? 'Semana de carga media'
        : null

  const gymKcalBurned = gymSessionToday?.caloriesBurned ?? null

  if (!nutritionPlan) {
    return NextResponse.json({ hasNutritionPlan: false, dayType, macros: null, mealPlan: null, gymKcalBurned, planPhaseContext })
  }

  const dailyTarget = getDailyNutritionTarget(sessionIntensity, nutritionPlan)
  const macros = { kcal: dailyTarget.kcal, proteinG: dailyTarget.proteinG, carbsG: dailyTarget.carbsG, fatG: dailyTarget.fatG, tdee: nutritionPlan.tdee }

  return NextResponse.json({
    hasNutritionPlan: true,
    dayType,
    macros,
    mealPlan: parseMealPlanData(mealPlan?.data ?? null),
    pendingAdjustment: null,
    gymKcalBurned,
    waterMlTarget: nutritionPlan.waterMlTarget ?? 2000,
    planPhaseContext,
  })
}
