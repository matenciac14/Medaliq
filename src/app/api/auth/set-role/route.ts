import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { roleSchema, parseBody } from '@/lib/validation'
import { setFreshJwtCookie } from '@/lib/auth/refresh_jwt_cookie'

const SetRoleSchema = z.object({ role: roleSchema })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  // Only Google OAuth users pending role selection can use this endpoint
  if (!session.user.needsRoleSelection) {
    return NextResponse.json({ error: 'Operación no permitida.' }, { status: 403 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(SetRoleSchema, raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { role } = parsed.data
  const isCoach = role === 'COACH'
  const now = new Date()
  const userId = session.user.id

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
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
    })

    // Create UserSubscription (Google OAuth doesn't go through /register)
    await tx.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: 'PRO', // Beta: todos PRO
        ...(isCoach ? { coachTier: 'STARTER' } : {}),
      },
      update: {},
    })

    // Create CoachProfile for COACH role
    if (isCoach) {
      const name = session.user.name ?? 'Coach'
      const baseSlug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const slug = `${baseSlug}-${userId.slice(-6)}`
      await tx.coachProfile.upsert({
        where: { coachId: userId },
        create: { coachId: userId, slug },
        update: {},
      })
    }
  })

  const response = NextResponse.json({ ok: true, role })
  await setFreshJwtCookie(req, response, userId).catch((err) => console.error('[auth/set-role] setFreshJwtCookie failed:', err))
  return response
}
