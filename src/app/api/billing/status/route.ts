/**
 * GET /api/billing/status
 * Devuelve el tier actual del usuario autenticado.
 * Usado por el cliente para detectar cuando el webhook de Wompi procesó el upgrade.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:billing-status`, { limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const sub = await prisma.userSubscription.findUnique({
    where: { userId: session.user.id },
    select: { tier: true, coachTier: true, currentPeriodEnd: true },
  })

  return NextResponse.json({
    tier: sub?.tier ?? 'FREE',
    coachTier: sub?.coachTier ?? 'STARTER',
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
  })
}
