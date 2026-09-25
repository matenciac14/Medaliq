import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, signMobileToken, buildMobileTokenPayload, MOBILE_USER_SELECT } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:auth-refresh`, { limit: 10, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const [user, coachRelation] = await Promise.all([
    prisma.user.findUnique({ where: { id: mobile.id }, select: MOBILE_USER_SELECT }),
    prisma.coachAthlete.findFirst({ where: { athleteId: mobile.id, status: 'ACTIVE' }, select: { id: true } }),
  ])
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const payload = buildMobileTokenPayload(user, { isB2B: !!coachRelation })
  const token = await signMobileToken(payload)

  return NextResponse.json({ token, features: payload.features })
}
