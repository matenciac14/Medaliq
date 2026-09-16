import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'
import { todayInTz } from '@/lib/core/date_utils'

// GET /api/mobile/nutrition/plan?date=YYYY-MM-DD
// Retorna las comidas planificadas del atleta para la fecha indicada (hoy si no se pasa).
//
// Prioridad de comidas del atleta (cascada resuelta client-side en mobile):
// 1. PlannedMeal para esta fecha específica (escritos por coach vía CoachPlannedMealPlanner
//    o por el atleta al expandir un template). userId = athleteId en ambos casos.
// 2. AssignedNutritionPlan → comidas del template según dayType del día (HARD/EASY/REST).
//    Se obtiene desde GET /api/mobile/nutrition/assigned-plan.
// 3. Sin plan → el atleta registra libremente (modo tracking).
export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-plan`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const tz = req.nextUrl.searchParams.get('tz') || undefined
  const dateParam = req.nextUrl.searchParams.get('date') ?? todayInTz(tz).toISOString().split('T')[0]
  const dayStart = new Date(`${dateParam}T00:00:00.000Z`)
  const dayEnd   = new Date(`${dateParam}T23:59:59.999Z`)

  const meals = await prisma.plannedMeal.findMany({
    where: { userId, date: { gte: dayStart, lte: dayEnd } },
    include: {
      food: {
        select: {
          id: true, name: true, category: true,
          kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
          servingG: true, servingLabel: true,
        },
      },
      overrides: {
        where: { athleteId: userId },
        select: {
          overrideFoodId: true,
          overrideGrams: true,
          overrideFood: {
            select: {
              id: true, name: true, category: true,
              kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
              servingG: true, servingLabel: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: [{ mealType: 'asc' }],
  })

  const formatted = meals.map(({ overrides, ...m }) => ({
    ...m,
    override: overrides[0] ?? null,
  }))

  return NextResponse.json({ date: dateParam, meals: formatted })
}
