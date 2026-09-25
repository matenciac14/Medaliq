import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, buildMobileTokenPayload, MOBILE_USER_SELECT } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

// PATCH /api/mobile/auth/me — actualizar timezone y locale desde la app mobile
export async function PATCH(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:auth-me-patch`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const { timezone, locale } = body as { timezone?: unknown; locale?: unknown }

  if (timezone !== undefined && typeof timezone !== 'string') {
    return NextResponse.json({ error: 'timezone inválido' }, { status: 400 })
  }
  if (locale !== undefined && typeof locale !== 'string') {
    return NextResponse.json({ error: 'locale inválido' }, { status: 400 })
  }

  const data: Record<string, string> = {}
  if (timezone) data.timezone = timezone as string
  if (locale) data.locale = locale as string

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: mobile.id }, data })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:auth-me`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const [user, coachRelation] = await Promise.all([
    prisma.user.findUnique({ where: { id: mobile.id }, select: MOBILE_USER_SELECT }),
    prisma.coachAthlete.findFirst({ where: { athleteId: mobile.id, status: 'ACTIVE' }, select: { id: true } }),
  ])

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const payload = buildMobileTokenPayload(user, { isB2B: !!coachRelation })

  return NextResponse.json({
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    onboardingCompleted: payload.onboardingCompleted,
    activated: payload.activated,
    isB2B: payload.isB2B,
    userPlan: payload.userPlan,
    profileComplete: payload.profileComplete,
    features: payload.features,
  })
}
