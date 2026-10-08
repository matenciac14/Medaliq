/**
 * Endpoint stub para simular pagos exitosos en desarrollo.
 * Solo activo cuando PAYMENT_GATEWAY=stub (default en dev).
 * NUNCA llamar en producción.
 *
 * GET /api/billing/stub/simulate?type=coach&tier=GROWTH&userId=xxx&successUrl=...
 * → Dispara el webhook interno → redirige a successUrl
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  if (process.env.PAYMENT_GATEWAY && process.env.PAYMENT_GATEWAY !== 'stub') {
    return NextResponse.json({ error: 'Stub no disponible en producción.' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const type         = searchParams.get('type')       // 'coach' | 'athlete'
  const userId       = searchParams.get('userId')
  const tier         = searchParams.get('tier')
  const billingCycle = searchParams.get('billingCycle') ?? 'monthly'
  const successUrl   = searchParams.get('successUrl') ?? '/'

  if (!userId || !type) {
    return NextResponse.json({ error: 'Faltan parámetros.' }, { status: 400 })
  }

  // Construir el evento y disparar el webhook interno
  const newPeriodEnd = new Date()
  const days = billingCycle === 'annual' ? 365 : 30
  newPeriodEnd.setDate(newPeriodEnd.getDate() + days)

  const event = {
    eventId: `stub_evt_${Date.now()}`,
    eventType: 'charge.success',
    userId,
    userRole: type === 'coach' ? 'COACH' : 'ATHLETE',
    newPeriodEnd: newPeriodEnd.toISOString(),
    ...(type === 'coach' && tier ? { coachTargetTier: tier } : {}),
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:3000`
  await fetch(`${baseUrl}/api/webhooks/payment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-payment-signature': 'stub' },
    body: JSON.stringify(event),
  })

  return NextResponse.redirect(successUrl)
}
