import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { BillingRepository } from '@/infrastructure/billing/billing.repository'
import { getPaymentGateway } from '@/infrastructure/billing/payment_gateway.factory'
import { createAthleteCheckout } from '@/domain/billing/checkout.use_case'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ATHLETE') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  // Atleta B2B activo nunca paga — su acceso lo gestiona el coach
  const b2bRelation = await prisma.coachAthlete.findFirst({
    where: { athleteId: session.user.id, status: 'ACTIVE' },
    select: { id: true },
  })
  if (b2bRelation) {
    return NextResponse.json(
      { error: 'Tienes un entrenador activo. Tu acceso está incluido en su plan.' },
      { status: 403 }
    )
  }

  const repo = new BillingRepository()
  const sub  = await repo.findByUserId(session.user.id)
  if (sub?.tier === 'PRO') {
    return NextResponse.json({ error: 'Ya tienes Plan Pro activo.' }, { status: 409 })
  }

  // returnTo permite que cada página caller reciba el redirect post-pago
  const body = await req.json().catch(() => ({})) as { returnTo?: string }
  const allowedReturns = ['/upgrade', '/settings/plan']
  const returnTo = allowedReturns.includes(body.returnTo ?? '') ? body.returnTo! : '/upgrade'

  const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medaliq.com'
  const successUrl = `${baseUrl}${returnTo}?billing=success`
  const cancelUrl  = `${baseUrl}${returnTo}?billing=cancelled`

  const result = await createAthleteCheckout(
    { userId: session.user.id, successUrl, cancelUrl },
    getPaymentGateway()
  )

  return NextResponse.json(result)
}
