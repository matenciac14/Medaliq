import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { sendSessionReminderEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push/expo_push'

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2',
  FARTLEK: 'Fartlek',
  TEMPO: 'Tempo',
  INTERVALOS: 'Intervalos',
  TIRADA_LARGA: 'Tirada larga',
  FUERZA: 'Fuerza',
  TEST: 'Test de rendimiento',
  SIMULACRO: 'Simulacro de carrera',
  OTRO: 'Entrenamiento',
}

// Cron: lunes 12:00 UTC = 07:00 COT
// Envia a atletas con plan activo cuya sesión del lunes no es descanso
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const MONDAY = 1

  // Phase 1: load active plans (minimal — no weeks)
  const activePlans = await prisma.trainingPlan.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      startDate: true,
      totalWeeks: true,
      user: { select: { email: true, name: true, pushToken: true } },
    },
  })

  if (activePlans.length === 0) return NextResponse.json({ sent: 0, failed: 0 })

  // Phase 2: compute current week per plan and batch-load only the relevant Monday sessions
  const planFilters = activePlans
    .map(p => ({ planId: p.id, weekNumber: getPlanWeekNumber(p.startDate, p.totalWeeks) }))
    .filter(f => f.weekNumber >= 1)

  const mondaySessions = await prisma.plannedSession.findMany({
    where: {
      dayOfWeek: MONDAY,
      week: { OR: planFilters },
    },
    select: {
      type: true,
      durationMin: true,
      detailText: true,
      week: { select: { planId: true } },
    },
  })

  const sessionByPlan = new Map(mondaySessions.map(s => [s.week.planId, s]))
  const userByPlan = new Map(activePlans.map(p => [p.id, p.user]))

  let sent = 0
  let failed = 0

  for (const [planId, session] of sessionByPlan) {
    if (session.type === 'DESCANSO') continue
    const user = userByPlan.get(planId)
    if (!user?.email) continue

    try {
      const typeLabel = SESSION_LABELS[session.type] ?? session.type
      await sendSessionReminderEmail(user.email, user.name ?? 'Atleta', {
        typeLabel,
        durationMin: session.durationMin,
        detail: session.detailText,
      })
      const pushBody = session.durationMin
        ? `${typeLabel} · ${session.durationMin} min — ¡a entrenar!`
        : `${typeLabel} — ¡a entrenar!`
      sendPushNotification(user.pushToken, 'Sesión de hoy 🏃', pushBody, { screen: 'plan' }).catch((err) => console.error('[cron/session-reminder] sendPushNotification failed:', err))
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ sent, failed })
}
