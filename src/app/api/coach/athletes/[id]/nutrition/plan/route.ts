import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getWeekMonday } from '@/lib/core/date_utils'
import { MealType } from '@/generated/prisma/enums'
import { rateLimitAsync } from '@/lib/rate_limit'

const VALID_MEAL_TYPES = new Set(Object.values(MealType))

// GET /api/coach/athletes/[id]/nutrition/plan?week=YYYY-MM-DD
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
    select: { id: true, athlete: { select: { timezone: true } } },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const weekParam = req.nextUrl.searchParams.get('week')
  const weekStart = weekParam ? new Date(`${weekParam}T00:00:00.000Z`) : getWeekMonday(0, link.athlete.timezone)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  const meals = await prisma.plannedMeal.findMany({
    where: { userId: athleteId, date: { gte: weekStart, lte: weekEnd } },
    include: {
      food: {
        select: {
          id: true, name: true, category: true,
          kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
          servingG: true, servingLabel: true,
        },
      },
      overrides: {
        where: { athleteId },
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
    orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
  })

  const byDate: Record<string, unknown[]> = {}
  for (const { overrides, ...meal } of meals) {
    const dateStr = meal.date.toISOString().slice(0, 10)
    if (!byDate[dateStr]) byDate[dateStr] = []
    byDate[dateStr].push({ ...meal, override: overrides[0] ?? null })
  }

  return NextResponse.json({ weekStart: weekStart.toISOString().slice(0, 10), meals: byDate })
}

// POST /api/coach/athletes/[id]/nutrition/plan
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-plan-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = (await req.json()) as { date?: string; mealType?: string; foodId?: string; grams?: number }

  if (!body.date || !body.mealType || !body.foodId || !body.grams) {
    return NextResponse.json({ error: 'date, mealType, foodId y grams son requeridos.' }, { status: 400 })
  }
  if (!VALID_MEAL_TYPES.has(body.mealType as MealType)) {
    return NextResponse.json({ error: 'mealType inválido.' }, { status: 400 })
  }
  const grams = Number(body.grams)
  if (isNaN(grams) || grams <= 0) {
    return NextResponse.json({ error: 'grams debe ser un número positivo.' }, { status: 400 })
  }

  const food = await prisma.food.findFirst({ where: { id: body.foodId, isActive: true }, select: { id: true } })
  if (!food) return NextResponse.json({ error: 'Alimento no encontrado.' }, { status: 404 })

  const meal = await prisma.plannedMeal.create({
    data: {
      userId: athleteId,
      date: new Date(body.date),
      mealType: body.mealType as MealType,
      foodId: body.foodId,
      grams,
    },
    include: {
      food: {
        select: {
          id: true, name: true, category: true,
          kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
          servingG: true, servingLabel: true,
        },
      },
    },
  })

  return NextResponse.json({ meal }, { status: 201 })
}
