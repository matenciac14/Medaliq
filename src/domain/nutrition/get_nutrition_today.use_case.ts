/**
 * Domain use case — get today's nutrition data for mobile.
 *
 * Pure orchestration: receives userId + prisma, returns complete nutrition state.
 * No auth, no rate limiting, no Next.js — those belong in the route layer.
 */
import type { PrismaClient } from '../../generated/prisma/client'
import { todayDowInTz, todayInTz, getWeekMonday } from '@/lib/core/date_utils'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { intensityToDayType } from '@/lib/nutrition/day_type'
import { getDailyNutritionTarget, type NutritionPlanTargets } from '@/domain/nutrition/daily_target'
import { parseMealPlanData } from '@/domain/nutrition/generate_meal_plan'
import { buildFoodLogResponse } from '@/domain/nutrition/calculate_food_log'
import { PrismaFoodProposalRepository } from '@/infrastructure/db/food_proposal.repository'

const proposalRepo = new PrismaFoodProposalRepository()

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'Desayuno', LUNCH: 'Almuerzo', DINNER: 'Cena',
  SNACK: 'Merienda', PRE_WORKOUT: 'Pre-entreno', POST_WORKOUT: 'Post-entreno',
}

const MEAL_TIMES: Record<string, string> = {
  BREAKFAST: '08:00', PRE_WORKOUT: '10:00', LUNCH: '12:30',
  SNACK: '15:30', POST_WORKOUT: '17:00', DINNER: '19:30',
}

const TIPS: Record<string, { title: string; body: string }> = {
  hard: { title: 'Carbos antes del gym', body: 'Consume avena o arroz 60 min antes del entreno. Maximo rendimiento.' },
  easy: { title: 'Proteina post-sesion', body: '30 g en los 30 min post-entreno. Facilita la recuperacion muscular.' },
  rest: { title: 'Hidratacion activa', body: 'Mantente en 2 L aunque no entrenes. Activa la recuperacion.' },
}

export async function getNutritionToday(
  userId: string,
  tz: string | undefined,
  prisma: PrismaClient,
) {
  const todayDow = todayDowInTz(tz)

  // Phase 1: active plan + current week
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, startDate: true, totalWeeks: true },
  })
  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : null

  const todayStart = todayInTz(tz)
  const weekMonday = getWeekMonday(0, tz)
  const weekSunday = new Date(weekMonday)
  weekSunday.setUTCDate(weekMonday.getUTCDate() + 6)
  weekSunday.setUTCHours(23, 59, 59, 999)

  // Phase 2: all parallel reads
  const [
    nutritionPlan, mealPlanRow, todaySession, assignedNutritionPlan,
    plannedMeals, foodLogs, waterLog, gymToday, gymSessionToday,
    currentPlanWeek, healthProfile, proposals, weekFoodLogs, weekPlannedSessions,
  ] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.mealPlan.findUnique({ where: { userId } }),
    activePlan && currentWeek
      ? prisma.plannedSession.findFirst({
          where: { week: { planId: activePlan.id, weekNumber: currentWeek }, dayOfWeek: todayDow },
          select: { intensity: true, type: true },
        })
      : Promise.resolve(null),
    prisma.assignedNutritionPlan.findUnique({
      where: { athleteId: userId },
      include: {
        coach: { select: { name: true } },
        template: {
          select: {
            name: true,
            days: {
              include: {
                meals: {
                  orderBy: { order: 'asc' },
                  include: {
                    items: {
                      orderBy: { order: 'asc' },
                      include: { food: { select: { id: true, name: true, category: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.plannedMeal.findMany({
      where: { userId, date: todayStart },
      include: {
        food: { select: { id: true, name: true, category: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, servingG: true, servingLabel: true } },
        overrides: {
          where: { athleteId: userId },
          select: {
            overrideFoodId: true, overrideGrams: true,
            overrideFood: { select: { id: true, name: true, category: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, servingG: true, servingLabel: true } },
          },
          take: 1,
        },
      },
      orderBy: { mealType: 'asc' },
    }),
    prisma.foodLog.findMany({
      where: { userId, date: todayStart },
      include: {
        food: { select: { id: true, name: true, category: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, servingG: true, servingLabel: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.waterLog.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { mlLogged: true },
    }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: { template: { select: { days: { where: { dayOfWeek: todayDow }, select: { isRestDay: true } } } } },
    }),
    prisma.gymSession.findFirst({
      where: { athleteId: userId, date: { gte: todayStart }, completed: true },
      select: { caloriesBurned: true },
      orderBy: { createdAt: 'desc' },
    }),
    activePlan && currentWeek
      ? prisma.planWeek.findFirst({
          where: { planId: activePlan.id, weekNumber: currentWeek },
          select: { isRecoveryWeek: true, sessions: { select: { intensity: true } } },
        })
      : Promise.resolve(null),
    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, heightCm: true, age: true, gender: true, weightGoalKg: true },
    }),
    proposalRepo.listByUser(userId),
    prisma.foodLog.findMany({
      where: { userId, date: { gte: weekMonday, lte: weekSunday } },
      include: { food: { select: { kcalPer100g: true } } },
    }),
    activePlan
      ? prisma.plannedSession.findMany({
          where: { week: { planId: activePlan.id }, date: { gte: weekMonday, lte: weekSunday } },
          select: { date: true, intensity: true },
        })
      : Promise.resolve([]),
  ])

  // Resolve today's intensity
  const hasGymToday = !!(gymToday?.template.days[0] && !gymToday.template.days[0].isRestDay)
  const sessionIntensity = todaySession?.intensity ?? (hasGymToday ? 'MODERATE' : null)
  const intensity = intensityToDayType(sessionIntensity)

  const targets = nutritionPlan ? getDailyNutritionTarget(sessionIntensity, nutritionPlan) : null
  const dayTargets = nutritionPlan ? {
    hard: getDailyNutritionTarget('HIGH', nutritionPlan),
    easy: getDailyNutritionTarget('MODERATE', nutritionPlan),
    rest: getDailyNutritionTarget('REST', nutritionPlan),
  } : null

  // Template meals for today's dayType
  const dbDayType = sessionIntensity === 'HIGH' ? 'HARD' : sessionIntensity === 'REST' || !sessionIntensity ? 'REST' : 'EASY'
  const templateDay = assignedNutritionPlan?.template.days.find(d => d.dayType === dbDayType) ?? null
  const templateMeals = templateDay ? templateDay.meals : null

  // Adherence from today's food logs
  const kcalLogged = foodLogs.reduce((sum, log) => {
    const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
    return sum + kcal
  }, 0)
  const effectiveKcalTarget = targets?.kcal ?? 0
  const adherencePct = effectiveKcalTarget > 0 ? Math.round((kcalLogged / effectiveKcalTarget) * 100) : 0

  const todayDateStr = todayStart.toISOString().split('T')[0]
  const foodLogResponse = buildFoodLogResponse(foodLogs, nutritionPlan, sessionIntensity, todayDateStr)

  // Plan phase context
  const planPhaseContext = currentPlanWeek?.isRecoveryWeek
    ? 'Semana de descarga'
    : currentPlanWeek?.sessions.some(s => s.intensity === 'HIGH')
      ? 'Semana de carga alta'
      : currentPlanWeek?.sessions.some(s => s.intensity === 'MODERATE')
        ? 'Semana de carga media'
        : null

  const gymKcalBurned = gymSessionToday?.caloriesBurned ?? null

  const plannedMealsFlat = plannedMeals.map(({ overrides, ...meal }) => ({
    ...meal,
    override: overrides[0] ?? null,
  }))

  // Weekly summary
  const weeklySummaryResult = buildWeeklySummary(weekFoodLogs, weekMonday, weekSunday, nutritionPlan, weekPlannedSessions)

  const macros = targets
    ? { kcal: targets.kcal, proteinG: targets.proteinG, carbsG: targets.carbsG, fatG: targets.fatG, tdee: nutritionPlan!.tdee }
    : null

  // B2B detection
  const isB2B = !!assignedNutritionPlan
  const coachName = assignedNutritionPlan?.coach?.name ?? null
  const planName = assignedNutritionPlan?.template.name ?? null

  // Meal checklist
  const loggedMealTypes = new Set(foodLogs.map(l => String(l.mealType)).filter(Boolean))
  const mealPlanParsed = parseMealPlanData(mealPlanRow?.data ?? null)
  const assignedMealPlan = buildAssignedMealPlan(assignedNutritionPlan)
  const effectiveMealPlan = assignedMealPlan ?? mealPlanParsed
  const mealChecklist = buildMealChecklist(effectiveMealPlan, intensity, loggedMealTypes)

  // Next meal
  const nextMealItem = mealChecklist.find(m => !m.isLogged)
  const nextMeal = nextMealItem ? {
    label: nextMealItem.label,
    time: MEAL_TIMES[nextMealItem.mealType] ?? '12:00',
    foods: nextMealItem.foods,
    kcal: nextMealItem.kcal,
    proteinG: nextMealItem.proteinG,
  } : null

  const tip = TIPS[intensity] ?? null

  return {
    hasNutritionPlan: !!nutritionPlan,
    dayType: intensity,
    macros,
    targets,
    dayTargets,
    intensity,
    plannedMeals: plannedMealsFlat,
    templateMeals,
    foodLogs: foodLogResponse,
    adherence: {
      kcalLogged: Math.round(kcalLogged),
      kcalTarget: effectiveKcalTarget,
      pct: adherencePct,
    },
    waterMl: waterLog?.mlLogged ?? 0,
    waterTarget: nutritionPlan?.waterMlTarget ?? 2000,
    mealPlan: mealPlanParsed,
    gymKcalBurned,
    planPhaseContext,
    pendingAdjustment: null,
    isB2B,
    coachName,
    planName,
    mealChecklist,
    nextMeal,
    tip,
    proposals: proposals.map(p => ({
      id: p.id,
      status: p.status,
      food: { id: p.foodId ?? p.id, name: p.name, kcalPer100g: p.kcalPer100g, proteinPer100g: p.proteinPer100g, carbsPer100g: p.carbsPer100g, fatPer100g: p.fatPer100g },
      reviewNote: p.reviewNote,
      country: p.country,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
    weeklySummary: weeklySummaryResult,
  }
}

// ── Helpers ──

function buildWeeklySummary(
  weekFoodLogs: { date: Date; kcalLogged: number | null; grams: number; food: { kcalPer100g: number } }[],
  weekMonday: Date,
  weekSunday: Date,
  nutritionPlan: (NutritionPlanTargets & { targetKcalEasy: number; tdee: number; waterMlTarget: number | null }) | null,
  weekPlannedSessions: { date: Date; intensity: string }[],
) {
  const kcalByDay = new Map<string, number>()
  for (const log of weekFoodLogs) {
    const dateKey = log.date.toISOString().split('T')[0]
    const kcal = log.kcalLogged != null ? Math.round(log.kcalLogged) : Math.round((log.food.kcalPer100g * log.grams) / 100)
    kcalByDay.set(dateKey, (kcalByDay.get(dateKey) ?? 0) + kcal)
  }
  const daysWithLog = kcalByDay.size
  const totalKcal = [...kcalByDay.values()].reduce((a, b) => a + b, 0)
  const avgKcal = daysWithLog > 0 ? Math.round(totalKcal / daysWithLog) : 0

  let weeklyAdherencePct: number | null = null
  if (nutritionPlan && daysWithLog > 0) {
    const intensityByDate = new Map<string, string>()
    for (const s of weekPlannedSessions) {
      intensityByDate.set(s.date.toISOString().split('T')[0], s.intensity)
    }
    let totalAdherence = 0
    for (const [dateKey, consumed] of kcalByDay) {
      const dayIntensity = intensityByDate.get(dateKey) ?? null
      const target = getDailyNutritionTarget(dayIntensity, nutritionPlan)
      if (target.kcal > 0) totalAdherence += (consumed / target.kcal) * 100
    }
    weeklyAdherencePct = Math.round(totalAdherence / daysWithLog)
  }

  return {
    weekStart: weekMonday.toISOString().split('T')[0],
    weekEnd: weekSunday.toISOString().split('T')[0],
    daysWithLog,
    daysWithoutLog: 7 - daysWithLog,
    avgKcal,
    targetKcal: nutritionPlan?.targetKcalEasy ?? 0,
    adherencePct: weeklyAdherencePct,
  }
}

export function buildAssignedMealPlan(assignedNutritionPlan: any) {
  if (!assignedNutritionPlan) return null

  const templateDayToMeals = (day: any) => {
    if (!day?.meals) return []
    return day.meals.map((m: any) => ({
      label: MEAL_TYPE_LABELS[m.mealType] ?? m.mealType ?? 'Comida',
      foods: m.items?.map((it: any) => `${it.food?.name ?? 'Alimento'} ${it.grams}g`).join(', ') ?? '',
      kcal: m.items?.reduce((s: number, it: any) => s + Math.round((it.food?.kcalPer100g ?? 0) * it.grams / 100), 0) ?? 0,
      protein: m.items?.reduce((s: number, it: any) => s + Math.round((it.food?.proteinPer100g ?? 0) * it.grams / 100), 0) ?? 0,
    }))
  }

  const empty = { meals: [] as any[] }
  return {
    hard: { ...empty, meals: templateDayToMeals(assignedNutritionPlan.template.days.find((d: any) => d.dayType === 'HARD')) },
    easy: { ...empty, meals: templateDayToMeals(assignedNutritionPlan.template.days.find((d: any) => d.dayType === 'EASY')) },
    rest: { ...empty, meals: templateDayToMeals(assignedNutritionPlan.template.days.find((d: any) => d.dayType === 'REST')) },
  }
}

export function buildMealChecklist(
  effectiveMealPlan: any,
  intensity: string,
  loggedMealTypes: Set<string>,
) {
  if (!effectiveMealPlan) return []
  const dayKey = intensity as keyof typeof effectiveMealPlan
  const dayPlan = effectiveMealPlan[dayKey]
  if (!dayPlan || !('meals' in dayPlan)) return []
  type MealShape = { label: string; foods: string; kcal: number; protein?: number }
  return (dayPlan.meals as MealShape[]).map(m => {
    const mealType = Object.entries(MEAL_TYPE_LABELS).find(([, v]) => v === m.label)?.[0] ?? m.label
    return {
      mealType,
      label: m.label,
      foods: m.foods,
      kcal: m.kcal,
      proteinG: m.protein ?? 0,
      isLogged: loggedMealTypes.has(mealType),
    }
  })
}
