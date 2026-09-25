import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, signMobileToken, buildMobileTokenPayload, MOBILE_USER_SELECT } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { roleSchema, parseBody } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:set-role`, { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(z.object({ role: roleSchema }), raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { role } = parsed.data

  const isCoach = role === 'COACH'
  const now = new Date()

  const updatedUser = await prisma.user.update({
    where: { id: mobile.id },
    data: {
      role,
      needsRoleSelection: false,
      ...(isCoach ? {
        featurePlan:      false,
        featureCheckin:   false,
        featureNutrition: false,
        featureProgress:  false,
        featureLog:       false,
        featureCoach:     true,
        featureGym:       false,
        onboardingCompleted:   true,
        onboardingCompletedAt: now,
      } : {}),
    },
    select: MOBILE_USER_SELECT,
  })

  const payload = buildMobileTokenPayload(updatedUser, { isB2B: false })
  const token = await signMobileToken(payload)

  return NextResponse.json({
    token,
    user: {
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
    },
  })
}
