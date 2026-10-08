import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { todayInTz } from '@/lib/core/date_utils'
import { rateLimitAsync } from '@/lib/rate_limit'

// GET /api/athlete/nutrition/adherence?from=YYYY-MM-DD&to=YYYY-MM-DD
// Adherencia calórica diaria: planificado (PlannedMeal) vs registrado (FoodLog)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-adherence`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id
  const sp = req.nextUrl.searchParams

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } })
  const today = todayInTz(u?.timezone ?? null)

  const to = parseDateParam(sp.get('to')) ?? today
  const from = parseDateParam(sp.get('from')) ?? (() => { const d = new Date(to); d.setDate(d.getDate() - 6); return d })()

  const [plannedMeals, foodLogs] = await Promise.all([
    prisma.plannedMeal.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: {
        date: true,
        grams: true,
        food: { select: { kcalPer100g: true } },
      },
    }),
    prisma.foodLog.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: {
        date: true,
        kcalLogged: true,
        grams: true,
        food: { select: { kcalPer100g: true } },
      },
    }),
  ])

  // Acumular kcal planificadas por fecha
  const plannedByDate: Record<string, number> = {}
  for (const pm of plannedMeals) {
    const key = pm.date.toISOString().slice(0, 10)
    plannedByDate[key] = (plannedByDate[key] ?? 0) + (pm.grams / 100) * (pm.food?.kcalPer100g ?? 0)
  }

  // Acumular kcal loggeadas por fecha (preferir snapshot kcalLogged si existe)
  const loggedByDate: Record<string, number> = {}
  for (const fl of foodLogs) {
    const key = fl.date.toISOString().slice(0, 10)
    const kcal = fl.kcalLogged ?? (fl.grams / 100) * (fl.food?.kcalPer100g ?? 0)
    loggedByDate[key] = (loggedByDate[key] ?? 0) + kcal
  }

  // Merge por fechas que tienen planificado o loggeado
  const dateSet = new Set([...Object.keys(plannedByDate), ...Object.keys(loggedByDate)])
  const adherence = Array.from(dateSet)
    .sort()
    .map((date) => {
      const plannedKcal = Math.round(plannedByDate[date] ?? 0)
      const loggedKcal = Math.round(loggedByDate[date] ?? 0)
      const adherencePct = plannedKcal > 0 ? Math.round((loggedKcal / plannedKcal) * 100) : null
      return { date, plannedKcal, loggedKcal, adherencePct }
    })

  return NextResponse.json({ adherence })
}

function parseDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return isNaN(d.getTime()) ? null : d
}
