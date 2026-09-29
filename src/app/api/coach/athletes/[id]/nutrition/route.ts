import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _req: Request,
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

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [mealPlan, foodProfile, foodLogs, assignedPlan] = await Promise.all([
    prisma.mealPlan.findUnique({ where: { userId: athleteId } }),
    prisma.foodProfile.findUnique({ where: { userId: athleteId } }),
    prisma.foodLog.findMany({
      where: { userId: athleteId, date: { gte: sevenDaysAgo } },
      select: {
        id: true,
        date: true,
        mealType: true,
        grams: true,
        kcalLogged: true,
        proteinLogged: true,
        carbsLogged: true,
        fatLogged: true,
        food: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { mealType: 'asc' }],
    }),
    prisma.assignedNutritionPlan.findUnique({
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

  // Resolver alimentos del atleta desde el catálogo (para el constructor visual)
  const athleteFoods = foodProfile?.availableFoodIds?.length
    ? await prisma.food.findMany({
        where: { id: { in: foodProfile.availableFoodIds }, isActive: true },
        select: {
          id: true, name: true, category: true,
          kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
          servingG: true, servingLabel: true,
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })
    : []

  // Compute totals per day type from the assigned template
  let assignedTemplate: {
    id: string; templateId: string; assignedAt: Date
    template: { id: string; name: string; goal: string | null }
  } | null = null
  let templateTotals: Record<string, { kcal: number; proteinG: number; carbsG: number; fatG: number }> | null = null

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

  return NextResponse.json({ mealPlan, foodProfile, athleteFoods, foodLogs, assignedTemplate, templateTotals })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  // Verify coach-athlete relationship
  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = (await request.json()) as Record<string, unknown>
  const fields = [
    'tdee',
    'targetKcalHard',
    'targetKcalEasy',
    'targetKcalRest',
    'proteinG',
    'carbsHardG',
    'carbsEasyG',
    'fatG',
  ]
  const data: Record<string, number> = {}
  for (const f of fields) {
    const v = Number(body[f])
    if (!isNaN(v) && v > 0) data[f] = Math.round(v)
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  const defaults = {
    tdee: 2000,
    targetKcalHard: 2200,
    targetKcalEasy: 1800,
    targetKcalRest: 1600,
    proteinG: 120,
    carbsHardG: 250,
    carbsEasyG: 200,
    fatG: 80,
  }

  const updated = await prisma.nutritionPlan.upsert({
    where: { userId: athleteId },
    update: { ...data, source: 'COACH' },
    create: { userId: athleteId, ...defaults, ...data, source: 'COACH' },
  })

  return NextResponse.json({ ok: true, plan: updated })
}
