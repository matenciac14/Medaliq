/**
 * Cron diario: recordatorio de renovación 7 días antes de que expire la suscripción.
 * Solo aplica a suscripciones con gateway='wompi' (Wompi no renueva automáticamente).
 * Mercado Pago renueva solo — no necesita este cron.
 *
 * Vercel: schedule "0 13 * * *" (1pm UTC = 8am COT)
 * Auth: header Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { WompiPaymentGateway } from '@/infrastructure/billing/wompi_payment_gateway'
import { sendBillingRenewalReminderEmail } from '@/infrastructure/email/resend'
import type { CoachTier } from '@/domain/subscription/tier_features'

const TIER_NAMES: Record<string, string> = {
  STARTER: 'Starter',
  GROWTH: 'Growth',
  PRO: 'Pro',
  SCALE: 'Scale',
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const now    = new Date()
  const inSeven = new Date(now)
  inSeven.setDate(inSeven.getDate() + 7)
  const inEight = new Date(now)
  inEight.setDate(inEight.getDate() + 8)

  // Suscripciones Wompi que vencen entre 7 y 8 días (ventana de 1 día para evitar duplicados)
  const subs = await prisma.userSubscription.findMany({
    where: {
      gateway: 'wompi',
      currentPeriodEnd: { gte: inSeven, lt: inEight },
      OR: [
        { tier: 'PRO' },
        { coachTier: { not: 'STARTER' } },
      ],
    },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medaliq.com'
  const gateway = new WompiPaymentGateway()

  let sent = 0
  let failed = 0

  for (const sub of subs) {
    const { user } = sub
    if (!user.email) continue

    try {
      let renewalLink: string
      let tierName: string

      if (user.role === 'COACH') {
        const tier = sub.coachTier as CoachTier
        // createCoachCheckout en gateway directo (no use case) para evitar que
        // validateCoachUpgrade rechace currentTier === targetTier en renovaciones
        const checkout = await gateway.createCoachCheckout({
          userId: user.id,
          currentTier: tier,
          targetTier: tier,
          successUrl: `${baseUrl}/coach/settings/plan?billing=success`,
          cancelUrl:  `${baseUrl}/coach/settings/plan?billing=cancelled`,
        })
        renewalLink = checkout.checkoutUrl
        tierName = TIER_NAMES[tier] ?? tier
      } else {
        const checkout = await gateway.createAthleteCheckout({
          userId: user.id,
          billingCycle: 'monthly',
          successUrl: `${baseUrl}/settings/plan?billing=success`,
          cancelUrl:  `${baseUrl}/settings/plan?billing=cancelled`,
        })
        renewalLink = checkout.checkoutUrl
        tierName = 'Pro'
      }

      await sendBillingRenewalReminderEmail(
        user.email,
        user.name ?? 'Atleta',
        tierName,
        sub.currentPeriodEnd!,
        renewalLink,
      )
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed, timestamp: now.toISOString() })
}
