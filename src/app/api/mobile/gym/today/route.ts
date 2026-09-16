import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { requireFeature } from '@/lib/guards/feature_gate'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getTodaySession } from '@/domain/gym/get_today_session.use_case'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-today`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'gym')
  if (featureGuard) return featureGuard

  const userRecord = await prisma.user.findUnique({ where: { id: mobile.id }, select: { timezone: true } })
  const result = await getTodaySession(mobile.id, userRecord?.timezone ?? null, prisma)
  return NextResponse.json(result)
}
