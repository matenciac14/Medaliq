import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendReengagementEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push/expo_push'

// Cron: diario 14:00 UTC = 09:00 COT
// Atletas con historial pero sin actividad en 3+ días → push + email re-engagement
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  // Phase 1: atletas activos con onboarding completado
  const candidates = await prisma.user.findMany({
    where: {
      role: 'ATHLETE',
      onboardingCompleted: true,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      name: true,
      pushToken: true,
      sessionLogs: {
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
      gymSessions: {
        where: { completed: true },
        select: { date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })

  let sent = 0
  let failed = 0

  for (const athlete of candidates) {
    const lastSessionLog = athlete.sessionLogs[0]?.completedAt ?? null
    const lastGymSession = athlete.gymSessions[0]?.date ?? null

    // Calcular la última actividad entre SessionLog y GymSession
    const lastActivity = latestDate(lastSessionLog, lastGymSession)

    // Descartar atletas sin historial (nuevos sin actividad)
    if (!lastActivity) continue

    // Descartar atletas que entrenaron dentro del cutoff
    if (lastActivity >= cutoff) continue

    const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / 86400000)

    try {
      if (athlete.pushToken) {
        sendPushNotification(
          athlete.pushToken,
          '¿Todo bien? 💪',
          `Llevas ${daysSince} días sin registrar actividad. Tu plan te espera.`,
        ).catch((err) => console.error('[cron/inactive-athlete-reminder] sendPushNotification failed:', err))
      }
      if (athlete.email) {
        await sendReengagementEmail(athlete.email, athlete.name ?? 'Atleta', daysSince)
      }
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ sent, failed })
}

function latestDate(a: Date | null, b: Date | null): Date | null {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}
