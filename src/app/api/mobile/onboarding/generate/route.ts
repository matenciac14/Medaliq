import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, signMobileToken, buildMobileTokenPayload, MOBILE_USER_SELECT } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { completeOnboardingUseCase } from '@/domain/onboarding/complete_onboarding.use_case'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health_profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { sendAthleteReadyEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push/expo_push'
import { wizardDataSchema } from '@/domain/onboarding/onboarding.schema'
import { mapMobilePayload } from '@/domain/onboarding/mobile_payload_mapper'
import type { MobileOnboardingPayload } from '@/domain/onboarding/mobile_payload_mapper'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`onboarding-mobile:${mobile.id}`, { limit: 5, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  try {
    const raw: MobileOnboardingPayload = await req.json()
    const mapped = mapMobilePayload(raw)

    const parsed = wizardDataSchema.safeParse(mapped)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Datos inválidos.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const result = await completeOnboardingUseCase(parsed.data, mobile.id, {
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
        where: { athleteId: mobile.id },
        select: { coach: { select: { email: true, name: true, pushToken: true } } },
      })
      if (coachRel?.coach) {
        const { coach } = coachRel
        const athleteName = mobile.name ?? 'Tu atleta'
        sendPushNotification(coach.pushToken ?? null, `${athleteName} completó su perfil`, 'Entra al panel para asignarle un plan de entrenamiento.').catch((err) => console.error('[mobile/onboarding] sendPushNotification to coach failed:', err))
        sendAthleteReadyEmail(coach.email ?? '', coach.name ?? 'Coach', athleteName, mobile.id).catch((err) => console.error('[mobile/onboarding] sendAthleteReadyEmail failed:', err))
      }
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: mobile.id },
      select: MOBILE_USER_SELECT,
    })
    const payload = updatedUser
      ? buildMobileTokenPayload(updatedUser, { isB2B: mobile.isB2B ?? false })
      : { ...mobile, onboardingCompleted: true as const }
    const token = await signMobileToken(payload)

    return NextResponse.json({ success: true, ...result, token })
  } catch (error) {
    console.error('[mobile/onboarding/generate]', error)
    return NextResponse.json({ error: 'Error generando el plan. Intenta de nuevo.' }, { status: 500 })
  }
}
