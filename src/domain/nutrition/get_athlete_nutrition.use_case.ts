import type { PrismaClient } from '../../generated/prisma/client'

// ── Types ────────────────────────────────────────────────────────────────────

type MacroTotals = { kcal: number; proteinG: number; carbsG: number; fatG: number }

export type AthleteNutritionResult = {
  mealPlan: unknown
  foodProfile: unknown
  athleteFoods: unknown[]
  foodLogs: unknown[]
  assignedTemplate: {
    id: string; templateId: string; assignedAt: Date
    template: { id: string; name: string; goal: string | null }
  } | null
  templateTotals: Record<string, MacroTotals> | null
}

// ── Use case ─────────────────────────────────────────────────────────────────

export async function getAthleteNutrition(
  coachId: string,
  athleteId: string,
  db: PrismaClient,
): Promise<AthleteNutritionResult> {
  const link = await db.coachAthlete.findFirst({
    where: { coachId, athleteId, status: 'ACTIVE' },
  })
  if (!link) {
    throw { status: 403, message: 'Acceso denegado' }
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [mealPlan, foodProfile, foodLogs, assignedPlan] = await Promise.all([
    db.mealPlan.findUnique({ where: { userId: athleteId } }),
    db.foodProfile.findUnique({ where: { userId: athleteId } }),
    db.foodLog.findMany({
      where: { userId: athleteId, date: { gte: sevenDaysAgo } },
      select: {
        id: true, date: true, mealType: true, grams: true,
        kcalLogged: true, proteinLogged: true, carbsLogged: true, fatLogged: true,
        food: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { mealType: 'asc' }],
    }),
    db.assignedNutritionPlan.findUnique({
      where: { athleteId },
      include: {
        template: {
          include: {
            days: {
              include: {
                meals: {
                  include: { items: { include: { food: { select: { name: true } } } } },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    }),
  ])

  const athleteFoods = foodProfile?.availableFoodIds?.length
    ? await db.food.findMany({
        where: { id: { in: foodProfile.availableFoodIds }, isActive: true },
        select: {
          id: true, name: true, category: true,
          kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
          servingG: true, servingLabel: true,
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })
    : []

  let assignedTemplate: AthleteNutritionResult['assignedTemplate'] = null
  let templateTotals: Record<string, MacroTotals> | null = null

  if (assignedPlan) {
    assignedTemplate = {
      id: assignedPlan.id,
      templateId: assignedPlan.templateId,
      assignedAt: assignedPlan.assignedAt,
      template: {
        id: assignedPlan.template.id,
        name: assignedPlan.template.name,
        goal: assignedPlan.template.goal,
      },
    }
    templateTotals = {}
    for (const day of assignedPlan.template.days) {
      let kcal = 0, proteinG = 0, carbsG = 0, fatG = 0
      for (const meal of day.meals) {
        for (const item of meal.items) {
          kcal += item.kcal
          proteinG += item.proteinG
          carbsG += item.carbsG
          fatG += item.fatG
        }
      }
      templateTotals[day.dayType] = {
        kcal: Math.round(kcal),
        proteinG: Math.round(proteinG),
        carbsG: Math.round(carbsG),
        fatG: Math.round(fatG),
      }
    }
  }

  return { mealPlan, foodProfile, athleteFoods, foodLogs, assignedTemplate, templateTotals }
}
