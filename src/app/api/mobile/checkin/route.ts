import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import { processCheckIn } from '@/domain/checkin/process_check_in.use_case'
import { getCheckInStatus } from '@/domain/checkin/get_check_in_status.use_case'
import { PrismaCheckInRepository } from '@/infrastructure/db/checkin.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health_profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { unauthorized, ok, serverError, badRequest } from '@/lib/api/responses'
import { requireFeature } from '@/lib/guards/feature_gate'
import { sendPlanUpdatedEmail, sendCoachCheckInEmail } from '@/infrastructure/email/resend'
import { mapMobileCheckinBody } from '@/lib/api/checkin_mapper'
import { z } from 'zod'

const mobileCheckInSchema = z.object({
  energyLevel:     z.number().min(1).max(10),
  muscleSoreness:  z.number().min(1).max(10),
  stressLevel:     z.number().min(1).max(10).optional(),
  motivationLevel: z.number().min(0).max(10).optional(),
  sleepScore:      z.number().min(0).max(10).optional(),
  painLevel:       z.number().min(0).max(10).optional(),
  weightKg:        z.number().min(10).max(500).optional(),
  hrResting:       z.number().min(0).max(250).optional(),
  sleepHours:      z.number().min(0).max(24).optional(),
  nutritionAdherencePct: z.number().min(0).max(100).optional(),
  notes:           z.string().max(5000).optional(),
  waistCm:         z.number().min(40).max(200).optional(),
  armsCm:          z.number().min(10).max(100).optional(),
  hipsCm:          z.number().min(40).max(200).optional(),
  thighsCm:        z.number().min(20).max(120).optional(),
})


export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return unauthorized()
  const { allowed: rlOk } = await rateLimitAsync(`mobile-${mobile.id}:checkin`, { limit: 300, windowMs: 60_000 })
  if (!rlOk) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  try {
    const result = await getCheckInStatus(mobile.id, prisma)
    return ok(result)
  } catch (err) {
    console.error('[mobile/checkin GET]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return unauthorized()
  const { allowed: rlOk } = await rateLimitAsync(`mobile-${mobile.id}:checkin`, { limit: 100, windowMs: 60_000 })
  if (!rlOk) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'checkin')
  if (featureGuard) return featureGuard

  const raw = await req.json()
  const parsed = mobileCheckInSchema.safeParse(raw)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Datos inválidos.')
  }

  const body = parsed.data

  try {
    const result = await processCheckIn(
      {
        userId: mobile.id,
        data: mapMobileCheckinBody(body),
      },
      {
        db: prisma,
        checkInRepo: new PrismaCheckInRepository(),
        planRepo: new PrismaPlanRepository(),
        healthProfileRepo: new PrismaHealthProfileRepository(),
        userRepo: new PrismaUserRepository(),
      }
    )

    if (result.adjustments.length > 0) {
      sendPlanUpdatedEmail(mobile.email, mobile.name, result.adjustments).catch((err) => console.error('[mobile/checkin] sendPlanUpdatedEmail failed:', err))
    }

    // Notify coach (fire-and-forget, B2B athletes only)
    prisma.coachAthlete.findFirst({
      where: { athleteId: mobile.id, status: 'ACTIVE' },
      include: { coach: { select: { email: true, name: true } } },
    }).then((rel) => {
      if (rel?.coach.email) {
        return sendCoachCheckInEmail(rel.coach.email, rel.coach.name ?? '', mobile.name, mobile.id, {
          energyLevel: body.energyLevel,
          hardestRpe:  body.muscleSoreness,
          weightKg:    body.weightKg,
        })
      }
    }).catch((err) => console.error('[mobile/checkin] sendCoachCheckInEmail failed:', err))

    const suggestions = result.pendingSuggestions > 0
      ? await prisma.checkInSuggestion.findMany({
          where: { userId: mobile.id, status: 'PENDING', expiresAt: { gt: new Date() } },
          select: { id: true, type: true, title: true, description: true, expiresAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : []

    return ok({
      ok: true,
      adjustment: {
        severity: result.severity,
        recommendation: result.recommendation,
        adjustments: result.adjustments,
        triggers: result.triggers,
      },
      pendingSuggestions: result.pendingSuggestions,
      suggestions,
    })
  } catch (err) {
    console.error('[mobile/checkin] processCheckIn error:', err)
    return serverError()
  }
}
