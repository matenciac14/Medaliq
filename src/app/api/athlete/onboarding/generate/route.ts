import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { completeOnboardingUseCase } from '@/domain/onboarding/complete_onboarding.use_case'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health_profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { sendAthleteReadyEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push/expo_push'
import { setFreshJwtCookie } from '@/lib/auth/refresh_jwt_cookie'
import { wizardDataSchema } from '@/domain/onboarding/onboarding.schema'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`onboarding:${session.user.id}`, { limit: 5, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
  }

  try {
    const raw = await req.json()
    const parsed = wizardDataSchema.safeParse(raw)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Datos inválidos.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const data = parsed.data

    const result = await completeOnboardingUseCase(data, session.user.id, {
      db: prisma,
      planRepo: new PrismaPlanRepository(),
      healthProfileRepo: new PrismaHealthProfileRepository(),
      userRepo: new PrismaUserRepository(),
      txRepoFactory: (tx) => ({
        healthProfileRepo: new PrismaHealthProfileRepository(tx),
        userRepo: new PrismaUserRepository(tx),
        planRepo: new PrismaPlanRepository(tx),
      }),
    })

    if (result.isB2B) {
      const coachRel = await prisma.coachAthlete.findFirst({
        where: { athleteId: session.user.id },
        select: { coach: { select: { email: true, name: true, pushToken: true } } },
      })
      if (coachRel?.coach) {
        const { coach } = coachRel
        const athleteName = session.user.name ?? 'Tu atleta'
        sendPushNotification(coach.pushToken ?? null, `${athleteName} completó su perfil`, 'Entra al panel para asignarle un plan de entrenamiento.').catch((err) => console.error('[athlete/onboarding] sendPushNotification to coach failed:', err))
        sendAthleteReadyEmail(coach.email ?? '', coach.name ?? 'Coach', athleteName, session.user.id).catch((err) => console.error('[athlete/onboarding] sendAthleteReadyEmail failed:', err))
      }
    }

    const response = NextResponse.json({ success: true, ...result })
    await setFreshJwtCookie(req, response, session.user.id).catch((err) => console.error('[athlete/onboarding] setFreshJwtCookie failed:', err))
    return response
  } catch (error) {
    console.error('[onboarding/generate] Error:', error)
    return NextResponse.json({ error: 'Error configurando la cuenta. Intenta de nuevo.' }, { status: 500 })
  }
}
