import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily_target'
import { requireFeature } from '@/lib/guards/feature_gate'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'nutrition')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-summary`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const userId = mobile.id

  // ISO week: Monday 00:00 UTC → Sunday 23:59 UTC
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon, ...
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const weekStart = new Date(now)
  weekStart.setUTCDate(now.getUTCDate() + diffToMonday)
  weekStart.setUTCHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  const [logs, nutritionPlan, activePlan] = await Promise.all([
    prisma.foodLog.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      include: {
        food: { select: { kcalPer100g: true } },
      },
    }),
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
  ])

  // Group logs by date (YYYY-MM-DD UTC) and sum kcal per day
  const kcalByDay = new Map<string, number>()
  for (const log of logs) {
    const dateKey = log.date.toISOString().split('T')[0]
    const kcal = Math.round((log.food.kcalPer100g * log.grams) / 100)
    kcalByDay.set(dateKey, (kcalByDay.get(dateKey) ?? 0) + kcal)
  }

  const daysWithLog = kcalByDay.size
  const daysWithoutLog = 7 - daysWithLog
  const totalKcal = [...kcalByDay.values()].reduce((a, b) => a + b, 0)
  const avgKcal = daysWithLog > 0 ? Math.round(totalKcal / daysWithLog) : 0

  // Per-day target: use planned session intensity when available
  let intensityByDate = new Map<string, string>()
  if (activePlan) {
    const plannedSessions = await prisma.plannedSession.findMany({
      where: { week: { planId: activePlan.id }, date: { gte: weekStart, lte: weekEnd } },
      select: { date: true, intensity: true },
    })
    for (const s of plannedSessions) {
      intensityByDate.set(s.date.toISOString().split('T')[0], s.intensity)
    }
  }

  let adherencePct: number | null = null
  if (nutritionPlan && daysWithLog > 0) {
    let totalAdherence = 0
    for (const [dateKey, consumed] of kcalByDay) {
      const intensity = intensityByDate.get(dateKey) ?? null
      const target = getDailyNutritionTarget(intensity, nutritionPlan)
      if (target.kcal > 0) totalAdherence += (consumed / target.kcal) * 100
    }
    adherencePct = Math.round(totalAdherence / daysWithLog)
  }

  const targetKcal = nutritionPlan?.targetKcalEasy ?? 0

  return NextResponse.json({
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    daysWithLog,
    daysWithoutLog,
    avgKcal,
    targetKcal,
    adherencePct,
  })
}
