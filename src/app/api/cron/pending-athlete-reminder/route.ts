import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendCoachPendingAthleteEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push/expo_push'

const THRESHOLD_HOURS = 48

// Cron: cada 24h — coaches con atletas en /pending ≥ 48h sin activar
// Vercel cron: "0 12 * * *" (12:00 UTC = 07:00 COT)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const thresholdDate = new Date(Date.now() - THRESHOLD_HOURS * 3_600_000)

  // CoachAthlete ACTIVE where athlete completed onboarding but featurePlan is still false
  const pendingRelations = await prisma.coachAthlete.findMany({
    where: {
      status:    'ACTIVE',
      createdAt: { lt: thresholdDate },
      athlete: {
        onboardingCompleted: true,
        featurePlan:         false,
      },
    },
    select: {
      id:       true,
      createdAt: true,
      athleteId: true,
      athlete: { select: { name: true } },
      coach: {
        select: {
          id: true, name: true, email: true, pushToken: true,
        },
      },
    },
  })

  if (pendingRelations.length === 0) return NextResponse.json({ notified: 0 })

  let notified = 0

  for (const rel of pendingRelations) {
    const coach = rel.coach
    if (!coach.email) continue

    const hoursPending = Math.round((Date.now() - rel.createdAt.getTime()) / 3_600_000)
    const athleteName = rel.athlete.name ?? 'tu asesorado'

    try {
      await sendCoachPendingAthleteEmail(
        coach.email,
        coach.name ?? 'Coach',
        athleteName,
        rel.athleteId,
        hoursPending,
      )

      sendPushNotification(
        coach.pushToken,
        `${athleteName} espera activación`,
        `Lleva ${hoursPending}h en tu panel sin acceso al plan. Actívalo ahora.`,
        { screen: `athlete-${rel.athleteId}` },
      ).catch((err) => console.error('[cron/pending-athlete-reminder] sendPushNotification failed:', err))

      notified++
    } catch {
      // fire-and-forget — log silenciado
    }
  }

  return NextResponse.json({ notified, total: pendingRelations.length })
}
