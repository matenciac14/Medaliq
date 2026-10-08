import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push/expo_push'

// Cron: diario 20:00 UTC = 15:00 COT
// Atletas que entrenaron ayer pero no hoy y tienen racha activa ≥ 3 días → push
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = startOfDayUTC(new Date())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Phase 1: atletas con actividad ayer o hoy, para filtrar luego
  const candidates = await prisma.user.findMany({
    where: {
      role: 'ATHLETE',
      onboardingCompleted: true,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      pushToken: true,
      sessionLogs: {
        where: { completedAt: { gte: thirtyDaysAgo } },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
      },
      gymSessions: {
        where: { completed: true, date: { gte: thirtyDaysAgo } },
        select: { date: true },
        orderBy: { date: 'desc' },
      },
    },
  })

  let sent = 0

  for (const athlete of candidates) {
    // Combinar todas las fechas de actividad (normalizadas a día UTC)
    const activityDates = buildActivityDaySet(athlete.sessionLogs, athlete.gymSessions)

    // Necesita al menos 3 actividades en los últimos 30 días
    if (activityDates.size < 3) continue

    const todayKey = dayKey(today)
    const yesterdayKey = dayKey(yesterday)

    // Entrenó ayer
    if (!activityDates.has(yesterdayKey)) continue

    // No entrenó hoy
    if (activityDates.has(todayKey)) continue

    const streakDays = calculateStreakEndingYesterday(activityDates, yesterday)

    // Solo notificar si tiene racha real ≥ 3
    if (streakDays < 3) continue

    if (athlete.pushToken) {
      sendPushNotification(
        athlete.pushToken,
        'Tu racha está en riesgo 🔥',
        `Llevas ${streakDays} días seguidos entrenando. ¡No rompas la racha hoy!`,
        { screen: 'log' },
      ).catch((err) => console.error('[cron/streak-risk] sendPushNotification failed:', err))
      sent++
    }
  }

  return NextResponse.json({ sent })
}

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
}

function buildActivityDaySet(
  sessionLogs: { completedAt: Date }[],
  gymSessions: { date: Date }[],
): Set<string> {
  const keys = new Set<string>()
  for (const s of sessionLogs) keys.add(dayKey(startOfDayUTC(s.completedAt)))
  for (const g of gymSessions) keys.add(dayKey(startOfDayUTC(g.date)))
  return keys
}

// Cuenta días consecutivos de actividad terminando en `endDate` (inclusive)
function calculateStreakEndingYesterday(activityDays: Set<string>, endDate: Date): number {
  let streak = 0
  let cursor = startOfDayUTC(endDate)
  while (activityDays.has(dayKey(cursor))) {
    streak++
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000)
  }
  return streak
}
