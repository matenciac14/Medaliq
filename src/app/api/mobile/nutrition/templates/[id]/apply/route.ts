// MOB-NUT-04 — POST /api/mobile/nutrition/templates/[id]/apply
// Aplica una NutritionTemplate a la semana indicada (misma lógica que el endpoint web)
// Body: { weekStart: 'YYYY-MM-DD', intensityMap: { 'YYYY-MM-DD': 'HARD'|'EASY'|'REST' } }

import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import { MealType, NutritionDayType } from '@/generated/prisma/enums'
import { z } from 'zod'

const bodySchema = z.object({
  weekStart:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  intensityMap: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.enum(['HARD', 'EASY', 'REST'])),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:template-apply`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const rawBody = await req.json()
  const parsed  = bodySchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido.' }, { status: 400 })

  const { weekStart: weekStartStr, intensityMap } = parsed.data
  const userId = mobile.id

  const template = await prisma.nutritionTemplate.findUnique({
    where: { id, athleteId: userId },
    include: {
      days: {
        include: { meals: { include: { items: { select: { foodId: true, grams: true } } } } },
      },
    },
  })
  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })

  // YYYY-MM-DD → UTC midnight (no usar setHours que depende del TZ del server)
  const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  const daysByType = new Map(template.days.map((d) => [d.dayType, d]))

  const records: Array<{ userId: string; date: Date; mealType: MealType; foodId: string; grams: number }> = []
  for (const [dateStr, dayType] of Object.entries(intensityMap)) {
    const templateDay = daysByType.get(dayType as NutritionDayType)
    if (!templateDay) continue
    const date = new Date(`${dateStr}T00:00:00.000Z`)
    date.setUTCHours(12, 0, 0, 0)
    for (const meal of templateDay.meals) {
      for (const item of meal.items) {
        records.push({ userId, date, mealType: meal.mealType as MealType, foodId: item.foodId, grams: item.grams })
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.plannedMeal.deleteMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } })
    if (records.length > 0) await tx.plannedMeal.createMany({ data: records })
  })

  return NextResponse.json({ ok: true, created: records.length })
}
