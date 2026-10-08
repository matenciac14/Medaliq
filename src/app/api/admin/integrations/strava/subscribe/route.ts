import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const STRAVA_SUBSCRIPTIONS_URL = 'https://www.strava.com/api/v3/push_subscriptions'

/**
 * POST — suscribir webhook de Strava.
 * Ejecutar UNA sola vez al hacer deploy en producción.
 * Solo ADMIN puede llamar este endpoint.
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (adminUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const callbackUrl = `${baseUrl}/api/webhooks/strava`

  const res = await fetch(STRAVA_SUBSCRIPTIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:    process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      callback_url: callbackUrl,
      verify_token: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('[strava subscribe] failed', data)
    return NextResponse.json({ error: 'Strava subscription failed', detail: data }, { status: 502 })
  }

  console.log('[strava subscribe] subscription created', data)
  return NextResponse.json({ ok: true, subscriptionId: data.id })
}

/** GET — consultar suscripción activa */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (adminUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const res = await fetch(
    `${STRAVA_SUBSCRIPTIONS_URL}?client_id=${process.env.STRAVA_CLIENT_ID}&client_secret=${process.env.STRAVA_CLIENT_SECRET}`,
    { signal: AbortSignal.timeout(5_000) },
  )
  const data = await res.json()
  return NextResponse.json(data)
}
