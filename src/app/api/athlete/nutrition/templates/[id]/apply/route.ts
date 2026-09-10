// NUT-09 — POST /api/athlete/nutrition/templates/[id]/apply
// Expande NutritionTemplate propio del atleta → PlannedMeal para una semana (web)

import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const userId = session.user.id
  const { id } = await params

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido.' }, { status: 400 })
  }

  // YYYY-MM-DD → UTC midnight (no usar setHours que depende del TZ del server)
  const weekStart = new Date(`${parsed.data.weekStartDate}T00:00:00.000Z`)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  // Phase 1: reads paralelos
  const [template, intensityMap] = await Promise.all([
    prisma.nutritionTemplate.findFirst({
      where: { id, athleteId: userId, coachId: null },
      include: {
        days: {
          include: { meals: { include: { items: { select: { foodId: true, grams: true } } } } },
        },
      },
    }),
    getIntensityMapForDateRange(userId, weekStart, weekEnd),
  ])
  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })

  const daysByType = new Map(template.days.map((d) => [d.dayType, d]))

  // Construir registros PlannedMeal mapeando intensidad a dayType
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
        records.push({ userId, date: mealDate, mealType: meal.mealType as MealType, foodId: item.foodId, grams: item.grams })
      }
    }
  }

  // Phase 3: transaction — delete + create
  await prisma.$transaction(async (tx) => {
    await tx.plannedMeal.deleteMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } })
    if (records.length > 0) await tx.plannedMeal.createMany({ data: records })
  })

  return NextResponse.json({ ok: true, created: records.length, weekStart: parsed.data.weekStartDate })
}
