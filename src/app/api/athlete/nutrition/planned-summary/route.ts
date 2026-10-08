import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { todayInTz } from '@/lib/core/date_utils'

/**
 * GET /api/athlete/nutrition/planned-summary?date=YYYY-MM-DD
 *
 * Resumen nutricional de un día: PlannedMeals + FoodLogs + totales comparativos.
 * Default: hoy (America/Bogota).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-planned-summary`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } })
  const todayStr = dateParam
    ?? todayInTz(user?.timezone ?? null).toISOString().slice(0, 10)

  const dayStart = new Date(`${todayStr}T00:00:00.000Z`)
  const dayEnd   = new Date(`${todayStr}T23:59:59.999Z`)

  const [plannedMeals, foodLogs] = await Promise.all([
    prisma.plannedMeal.findMany({
      where: { userId, date: { gte: dayStart, lte: dayEnd } },
      include: {
        food: {
          select: {
            name: true,
            kcalPer100g: true, proteinPer100g: true,
            carbsPer100g: true, fatPer100g: true,
          },
        },
      },
      orderBy: [{ mealType: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.foodLog.findMany({
      where: { userId, date: { gte: dayStart, lte: dayEnd } },
      include: {
        food: {
          select: {
            name: true,
            kcalPer100g: true, proteinPer100g: true,
            carbsPer100g: true, fatPer100g: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  function calcMacros(grams: number, food: { kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }) {
    const factor = grams / 100
    return {
      kcal:    Math.round(food.kcalPer100g    * factor),
      protein: Math.round(food.proteinPer100g * factor * 10) / 10,
      carbs:   Math.round(food.carbsPer100g   * factor * 10) / 10,
      fat:     Math.round(food.fatPer100g     * factor * 10) / 10,
    }
  }

  const plannedItems = plannedMeals.map(pm => {
    const macros = calcMacros(pm.grams, pm.food)
    return {
      id: pm.id,
      mealType: pm.mealType,
      foodName: pm.food.name,
      grams: pm.grams,
      ...macros,
    }
  })

  const loggedItems = foodLogs.map(fl => {
    const kcal = fl.kcalLogged ?? calcMacros(fl.grams, fl.food).kcal
    const macros = calcMacros(fl.grams, fl.food)
    return {
      id: fl.id,
      mealType: fl.mealType ?? null,
      foodName: fl.food?.name ?? 'Alimento',
      grams: fl.grams,
      kcal,
      protein: macros.protein,
      carbs:   macros.carbs,
      fat:     macros.fat,
    }
  })

  const sum = <T extends { kcal: number; protein: number; carbs: number; fat: number }>(items: T[]) =>
    items.reduce((acc, i) => ({
      kcal:    acc.kcal    + i.kcal,
      protein: acc.protein + i.protein,
      carbs:   acc.carbs   + i.carbs,
      fat:     acc.fat     + i.fat,
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  const plannedTotals = sum(plannedItems)
  const loggedTotals  = sum(loggedItems)
  const adherencePct  = plannedTotals.kcal > 0
    ? Math.min(150, Math.round((loggedTotals.kcal / plannedTotals.kcal) * 100))
    : null

  return NextResponse.json({
    date: todayStr,
    plannedItems,
    loggedItems,
    totals: {
      planned: plannedTotals,
      logged:  loggedTotals,
      adherencePct,
    },
  })
}
