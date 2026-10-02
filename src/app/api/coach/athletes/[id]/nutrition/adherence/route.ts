import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getDailyNutritionTarget, type NutritionPlanTargets } from '@/lib/nutrition/daily_target'
import { getIntensityMapForDateRange } from '@/lib/nutrition/get_intensity_for_date'

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

  const twentyEightDaysAgo = new Date()
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)
  const now = new Date()

  const [foodLogs, nutritionPlan, assignedNutritionPlan, intensityMap] = await Promise.all([
    prisma.foodLog.findMany({
      where: { userId: athleteId, date: { gte: twentyEightDaysAgo } },
      select: { date: true, kcalLogged: true, grams: true, food: { select: { kcalPer100g: true } } },
      orderBy: { date: 'asc' },
      take: 500,
    }),
    prisma.nutritionPlan.findUnique({
      where: { userId: athleteId },
      select: {
        targetKcalHard: true, targetKcalEasy: true, targetKcalRest: true,
        proteinG: true, carbsHardG: true, carbsEasyG: true, fatG: true,
      },
    }),
    prisma.assignedNutritionPlan.findUnique({
      where: { athleteId },
      include: {
        template: {
          select: {
            days: {
              include: {
                meals: { include: { items: { select: { kcal: true, proteinG: true, carbsG: true, fatG: true } } } },
              },
            },
          },
        },
      },
    }),
    getIntensityMapForDateRange(athleteId, twentyEightDaysAgo, now),
  ])

  // Determinar targets: NutritionPlan directo o sintetizado desde template
  let effectiveTargets: NutritionPlanTargets | null = nutritionPlan
  if (!effectiveTargets && assignedNutritionPlan) {
    effectiveTargets = synthesizeTargetsFromTemplate(assignedNutritionPlan)
  }

  const kcalByDay: Record<string, number> = {}
  for (const log of foodLogs) {
    const day = log.date.toISOString().slice(0, 10)
    const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
    kcalByDay[day] = (kcalByDay[day] ?? 0) + kcal
  }

  const days = Object.entries(kcalByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, kcalLogged]) => {
      const intensity = intensityMap.get(date) ?? 'REST'
      const target = effectiveTargets
        ? getDailyNutritionTarget(intensity, effectiveTargets)
        : null
      const targetKcal = target?.kcal ?? null
      return {
        date,
        kcalLogged: Math.round(kcalLogged),
        targetKcal,
        adherencePct: targetKcal && targetKcal > 0
          ? Math.min(Math.round((kcalLogged / targetKcal) * 100), 999)
          : null,
      }
    })

  return NextResponse.json({ days, targetKcal: effectiveTargets?.targetKcalEasy ?? null })
}

// Sintetiza NutritionPlanTargets desde los items del template asignado
type TemplateItem = { kcal: number; proteinG: number; carbsG: number; fatG: number }
type TemplateMeal = { items: TemplateItem[] }
type TemplateDay = { dayType: string; meals: TemplateMeal[] }
type AssignedPlanWithTemplate = { template: { days: TemplateDay[] } }

function synthesizeTargetsFromTemplate(plan: AssignedPlanWithTemplate): NutritionPlanTargets {
  function sumDay(dayType: string) {
    const day = plan.template.days.find((d: TemplateDay) => d.dayType === dayType)
    if (!day) return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    let kcal = 0, proteinG = 0, carbsG = 0, fatG = 0
    for (const m of day.meals) {
      for (const i of m.items) {
        kcal += i.kcal; proteinG += i.proteinG; carbsG += i.carbsG; fatG += i.fatG
      }
    }
    return { kcal, proteinG, carbsG, fatG }
  }
  const hard = sumDay('HARD')
  const easy = sumDay('EASY')
  const rest = sumDay('REST')
  return {
    targetKcalHard: hard.kcal,
    targetKcalEasy: easy.kcal,
    targetKcalRest: rest.kcal,
    proteinG: hard.proteinG,
    carbsHardG: hard.carbsG,
    carbsEasyG: easy.carbsG,
    fatG: hard.fatG,
  }
}
