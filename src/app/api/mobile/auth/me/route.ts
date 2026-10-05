import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, buildMobileTokenPayload, MOBILE_USER_SELECT } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { parseBody } from '@/lib/validation'

const patchMeSchema = z.object({
  timezone: z.string().min(1).max(100).optional(),
  locale: z.string().min(2).max(10).optional(),
}).refine(d => d.timezone || d.locale, { message: 'Nada que actualizar' })

// PATCH /api/mobile/auth/me — actualizar timezone y locale desde la app mobile
export async function PATCH(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:auth-me-patch`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(patchMeSchema, raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const data: Record<string, string> = {}
  if (parsed.data.timezone) data.timezone = parsed.data.timezone
  if (parsed.data.locale) data.locale = parsed.data.locale

  await prisma.user.update({ where: { id: mobile.id }, data })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:auth-me`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const [user, coachRelation, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: mobile.id }, select: MOBILE_USER_SELECT }),
    prisma.coachAthlete.findFirst({ where: { athleteId: mobile.id, status: 'ACTIVE' }, select: { id: true } }),
    prisma.userSubscription.findUnique({ where: { userId: mobile.id }, select: { tier: true, trialEndsAt: true } }),
  ])

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const payload = buildMobileTokenPayload(user, {
    isB2B: !!coachRelation,
    subscriptionTier: subscription?.tier,
    trialEndsAt: subscription?.trialEndsAt,
  })

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
