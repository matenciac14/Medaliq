import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendPaymentOverdueCoachEmail } from '@/infrastructure/email/resend'

// Cron: diario 14:00 UTC = 09:00 COT
// Notifica a cada coach con pagos PENDING vencidos (OVERDUE es estado derivado — no se almacena)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const newlyOverdue = await prisma.payment.findMany({
    where: { status: 'PENDING', dueDate: { lt: now } },
    select: {
      id: true,
      coachId: true,
      amount: true,
      currency: true,
      dueDate: true,
      athlete: { select: { name: true } },
      coach: { select: { email: true, name: true } },
    },
  })

  if (newlyOverdue.length === 0) {
    return NextResponse.json({ notified: 0, sent: 0 })
  }

  // Agrupar por coach y enviar un email por coach
  const byCoach = new Map<string, typeof newlyOverdue>()
  for (const p of newlyOverdue) {
    const list = byCoach.get(p.coachId) ?? []
    list.push(p)
    byCoach.set(p.coachId, list)
  }

  let sent = 0
  let failed = 0
  for (const [coachId, items] of byCoach) {
    const { email, name } = items[0].coach
    if (!email) continue
    try {
      await sendPaymentOverdueCoachEmail(
        email,
        name ?? 'Coach',
        items.map(i => ({
          athleteName: i.athlete?.name ?? 'Atleta',
          amount: Number(i.amount),
          currency: i.currency,
          dueDate: i.dueDate,
        })),
      )
      // Registrar audit log por cada pago recordado (fire-and-forget, no bloquea el cron)
      prisma.paymentAuditLog.createMany({
        data: items.map(i => ({ paymentId: i.id, action: 'REMINDED', actorId: coachId })),
      }).catch((err) => console.error('[cron/payment-overdue] paymentAuditLog.createMany failed:', err))
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ notified: newlyOverdue.length, sent, failed })
}
