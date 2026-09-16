// NUT-07 — POST /api/coach/athletes/[id]/nutrition/apply-template
// Expande el NutritionTemplate asignado en PlannedMeal records para una semana

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { MealType, NutritionDayType } from '@/generated/prisma/enums'
import { z } from 'zod'
import { getIntensityMapForDateRange } from '@/lib/nutrition/get_intensity_for_date'

const bodySchema = z.object({
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
})

function intensityToDayType(intensity: string): NutritionDayType {
  if (intensity === 'HIGH') return 'HARD'
  if (intensity === 'MODERATE') return 'EASY'
  return 'REST'
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const rawBody = await request.json()
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body invalido.' }, { status: 400 })
  }

  // YYYY-MM-DD → UTC midnight (no usar setHours que depende del TZ del server)
  const weekStart = new Date(`${parsed.data.weekStartDate}T00:00:00.000Z`)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  // Phase 1: reads paralelos
  const [assignedPlan, intensityMap] = await Promise.all([
    prisma.assignedNutritionPlan.findUnique({
      where: { athleteId },
      include: {
        template: {
          include: {
            days: {
              include: { meals: { include: { items: { select: { foodId: true, grams: true } } } } },
            },
          },
        },
      },
    }),
    getIntensityMapForDateRange(athleteId, weekStart, weekEnd),
  ])

  if (!assignedPlan) {
    return NextResponse.json({ error: 'No hay template asignado' }, { status: 404 })
  }

  const daysByType = new Map(assignedPlan.template.days.map((d) => [d.dayType, d]))

  const records: Array<{ userId: string; date: Date; mealType: MealType; foodId: string; grams: number }> = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    const dateKey = date.toISOString().slice(0, 10)
    const intensity = intensityMap.get(dateKey) ?? 'REST'
    const dayType = intensityToDayType(intensity)

    const templateDay = daysByType.get(dayType)
    if (!templateDay) continue

    const mealDate = new Date(date)
    mealDate.setUTCHours(12, 0, 0, 0)

    for (const meal of templateDay.meals) {
      for (const item of meal.items) {
        records.push({
          userId: athleteId,
          date: mealDate,
          mealType: meal.mealType as MealType,
          foodId: item.foodId,
          grams: item.grams,
        })
      }
    }
  }

  // Phase 3: transaction — delete + create
  await prisma.$transaction(async (tx) => {
    await tx.plannedMeal.deleteMany({
      where: { userId: athleteId, date: { gte: weekStart, lte: weekEnd } },
    })
    if (records.length > 0) {
      await tx.plannedMeal.createMany({ data: records })
    }
  })

  return NextResponse.json({
    ok: true,
    created: records.length,
    weekStart: parsed.data.weekStartDate,
  })
}
