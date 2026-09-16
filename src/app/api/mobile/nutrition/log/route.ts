import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { rateLimitAsync } from '@/lib/rate_limit'
import { buildFoodLogResponse, parseFoodLogPost, calcMacros } from '@/domain/nutrition/calculate_food_log'
import { requireFeature } from '@/lib/guards/feature_gate'
import { todayInTz } from '@/lib/core/date_utils'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-log`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const rawDate = req.nextUrl.searchParams.get('date')
  if (rawDate && !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return NextResponse.json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' }, { status: 400 })
  }
  const tz = req.nextUrl.searchParams.get('tz') || undefined
  const dayStart = rawDate ? new Date(`${rawDate}T00:00:00.000Z`) : todayInTz(tz)
  const dateParam = dayStart.toISOString().split('T')[0]
  const dayEnd = new Date(dayStart.getTime() + 86_399_999)

  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, startDate: true, totalWeeks: true },
  })
  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : null

  const [logs, nutritionPlan, todaySession] = await Promise.all([
    prisma.foodLog.findMany({
      where: { userId, date: { gte: dayStart, lte: dayEnd } },
      include: { food: { select: { name: true, category: true, servingG: true, servingLabel: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    activePlan && currentWeek
      ? prisma.plannedSession.findFirst({
          where: { week: { planId: activePlan.id, weekNumber: currentWeek }, date: { gte: dayStart, lte: dayEnd } },
          select: { intensity: true },
        })
      : Promise.resolve(null),
  ])

  return NextResponse.json(buildFoodLogResponse(logs, nutritionPlan, todaySession?.intensity, dateParam))
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-log`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const parsed = parseFoodLogPost(await req.json())
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { foodId, gramsNum, mealType, logDate } = parsed
  const food = await prisma.food.findUnique({ where: { id: foodId }, select: { id: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } })
  if (!food) return NextResponse.json({ error: 'Alimento no encontrado' }, { status: 404 })

  const snapshot = calcMacros(gramsNum, food)

  // Atomic upsert: if same food+date+mealType exists, add grams (PERSIST-01)
  // Uses serializable transaction to avoid read-then-write race on parallel requests
  const foodSelect = { name: true, category: true, servingG: true, servingLabel: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } as const

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.foodLog.findUnique({
      where: { userId_foodId_date_mealType: { userId, foodId, date: logDate, mealType } },
      select: { id: true, grams: true },
    })

    if (existing) {
      const totalGrams = existing.grams + gramsNum
      const totalSnapshot = calcMacros(totalGrams, food)
      const log = await tx.foodLog.update({
        where: { id: existing.id },
        data: {
          grams: totalGrams,
          kcalLogged: totalSnapshot.kcal, proteinLogged: totalSnapshot.proteinG,
          carbsLogged: totalSnapshot.carbsG, fatLogged: totalSnapshot.fatG,
        },
        include: { food: { select: foodSelect } },
      })
      return { log: { ...log, ...totalSnapshot }, status: 200 as const }
    }

    const log = await tx.foodLog.create({
      data: {
        userId, foodId, grams: gramsNum, mealType, date: logDate,
        kcalLogged: snapshot.kcal, proteinLogged: snapshot.proteinG, carbsLogged: snapshot.carbsG, fatLogged: snapshot.fatG,
      },
      include: { food: { select: foodSelect } },
    })
    return { log: { ...log, ...snapshot }, status: 201 as const }
  })

  return NextResponse.json(result.log, { status: result.status })
}
