import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { BillingRepository } from '@/infrastructure/billing/billing.repository'
import { getPaymentGateway } from '@/infrastructure/billing/payment_gateway.factory'
import { createCoachCheckout } from '@/domain/billing/checkout.use_case'
import type { CoachTier } from '@/domain/subscription/tier_features'

const VALID_TIERS = new Set<string>(['STARTER', 'GROWTH', 'PRO', 'SCALE'])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:billing-checkout`, { limit: 5, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await req.json().catch(() => null) as { targetTier?: unknown } | null
  const targetTier = body?.targetTier
  if (typeof targetTier !== 'string' || !VALID_TIERS.has(targetTier)) {
    return NextResponse.json({ error: 'targetTier inválido. Valores permitidos: GROWTH, PRO, SCALE.' }, { status: 400 })
  }

  const repo    = new BillingRepository()
  const sub     = await repo.findByUserId(session.user.id)
  const current: CoachTier = sub?.coachTier ?? 'STARTER'

  const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medaliq.com'
  const successUrl = `${baseUrl}/coach/settings/plan?billing=success`
  const cancelUrl  = `${baseUrl}/coach/settings/plan?billing=cancelled`

  try {
    const result = await createCoachCheckout(
      { userId: session.user.id, currentTier: current, targetTier: targetTier as CoachTier, successUrl, cancelUrl },
      getPaymentGateway()
    )
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear checkout.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
