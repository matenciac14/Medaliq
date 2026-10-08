import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getWeekMonday } from '@/lib/core/date_utils'
import { MealType } from '@/generated/prisma/enums'
import { z } from 'zod'
import { rateLimitAsync } from '@/lib/rate_limit'

const VALID_MEAL_TYPES = new Set(Object.values(MealType))

const FOOD_SELECT = {
  id: true, name: true, category: true,
  kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
  servingG: true, servingLabel: true,
} as const

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date debe ser YYYY-MM-DD'),
  mealType: z.string().refine((v) => VALID_MEAL_TYPES.has(v as MealType), 'mealType invalido'),
  foodId: z.string().min(1, 'foodId requerido'),
  grams: z.number().positive('grams debe ser positivo'),
})

/**
 * GET /api/athlete/nutrition/planned-meals?date=YYYY-MM-DD | ?weekStart=YYYY-MM-DD
 * Retorna PlannedMeal del atleta para una fecha o semana, con food details.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed: rlGet } = await rateLimitAsync(`web-${session.user.id}:nutrition-planned-meals`, { limit: 300, windowMs: 60_000 })
  if (!rlGet) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const weekStartParam = searchParams.get('weekStart')

  let startDate: Date
  let endDate: Date

  if (dateParam) {
    startDate = new Date(`${dateParam}T00:00:00.000Z`)
    endDate = new Date(`${dateParam}T23:59:59.999Z`)
  } else {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } })
    const monday = weekStartParam ? new Date(`${weekStartParam}T00:00:00.000Z`) : getWeekMonday(0, u?.timezone)
    startDate = monday
    endDate = new Date(monday)
    endDate.setUTCDate(endDate.getUTCDate() + 6)
    endDate.setUTCHours(23, 59, 59, 999)
  }

  const meals = await prisma.plannedMeal.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    include: { food: { select: FOOD_SELECT } },
    orderBy: [{ date: 'asc' }, { mealType: 'asc' }, { createdAt: 'asc' }],
  })

  const byDate: Record<string, typeof meals> = {}
  for (const meal of meals) {
    const ds = meal.date.toISOString().slice(0, 10)
    if (!byDate[ds]) byDate[ds] = []
    byDate[ds].push(meal)
  }

  return NextResponse.json({ meals: byDate })
}

/**
 * POST /api/athlete/nutrition/planned-meals
 * Crea un PlannedMeal individual. B2B puede agregar (suplementa plan del coach).
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed: rlPost } = await rateLimitAsync(`web-${session.user.id}:nutrition-planned-meals-post`, { limit: 100, windowMs: 60_000 })
  if (!rlPost) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id
  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body invalido.' }, { status: 400 })
  }

  const { date, mealType, foodId, grams } = parsed.data

  const food = await prisma.food.findFirst({ where: { id: foodId, isActive: true }, select: { id: true } })
  if (!food) return NextResponse.json({ error: 'Alimento no encontrado.' }, { status: 404 })

  const meal = await prisma.plannedMeal.create({
    data: {
      userId,
      date: new Date(date),
      mealType: mealType as MealType,
      foodId,
      grams,
    },
    include: { food: { select: FOOD_SELECT } },
  })

  return NextResponse.json({ meal }, { status: 201 })
}

