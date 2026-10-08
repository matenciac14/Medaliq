import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { processCheckIn } from '@/domain/checkin/process_check_in.use_case'
import { PrismaCheckInRepository } from '@/infrastructure/db/checkin.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health_profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { unauthorized, ok, serverError, badRequest } from '@/lib/api/responses'
import { sendPlanUpdatedEmail, sendCoachCheckInEmail } from '@/infrastructure/email/resend'
import { mapWebCheckinBody } from '@/lib/api/checkin_mapper'
import { createNotification } from '@/infrastructure/db/notification'

const checkInBodySchema = z.object({
  hardestRpe:            z.number().min(1).max(10).optional(),
  sleepHours:            z.number().min(0).max(24).optional(),
  sleepScore:            z.number().min(0).max(10).optional(),
  energyLevel:           z.number().min(1).max(10).optional(),
  stressLevel:           z.number().min(0).max(10).optional(),
  weightKg:              z.number().min(10).max(500).optional(),
  hrResting:             z.number().min(0).max(250).optional(),
  painLevel:             z.number().min(0).max(10).optional(),
  nutritionAdherencePct: z.number().min(0).max(100).optional(),
  motivationLevel:       z.number().min(0).max(10).optional(),
  notes:                 z.string().max(5000).optional(),
  painDescription:       z.string().max(500).optional(),
  waistCm:               z.number().min(40).max(200).optional(),
  armsCm:                z.number().min(10).max(100).optional(),
  hipsCm:                z.number().min(40).max(200).optional(),
  thighsCm:              z.number().min(20).max(120).optional(),
})

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const [last, pendingSuggestions] = await Promise.all([
    prisma.weeklyCheckIn.findFirst({
      where: { userId: session.user.id },
      orderBy: { recordedAt: 'desc' },
      select: {
        weightKg: true, hrResting: true, sleepHours: true, energyLevel: true,
        hardestSessionRpe: true, sleepScore: true, stressLevel: true,
        motivationLevel: true, nutritionAdherencePct: true,
      },
    }),
    prisma.checkInSuggestion.findMany({
      where: { userId: session.user.id, status: 'PENDING', expiresAt: { gt: new Date() } },
      select: { id: true, type: true, title: true, description: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return ok({
    weightKg: last?.weightKg ?? null,
    hrResting: last?.hrResting ?? null,
    sleepHours: last?.sleepHours ?? null,
    energyLevel: last?.energyLevel ?? null,
    hardestSessionRpe: last?.hardestSessionRpe ?? null,
    sleepScore: last?.sleepScore ?? null,
    stressLevel: last?.stressLevel ?? null,
    motivationLevel: last?.motivationLevel ?? null,
    nutritionAdherencePct: last?.nutritionAdherencePct ?? null,
    pendingSuggestions,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const raw = await req.json()
  const parsed = checkInBodySchema.safeParse(raw)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Datos inválidos.')
  }

  const body = parsed.data

  if (body.energyLevel == null && body.hardestRpe == null) {
    return badRequest('Completa al menos la energía percibida o el RPE.')
  }

  try {
    const result = await processCheckIn(
      {
        userId: session.user.id,
        data: mapWebCheckinBody(body),
      },
      {
        db: prisma,
        checkInRepo: new PrismaCheckInRepository(),
        planRepo: new PrismaPlanRepository(),
        healthProfileRepo: new PrismaHealthProfileRepository(),
        userRepo: new PrismaUserRepository(),
      }
    )

    if (result.adjustments.length > 0 && session.user.email && session.user.name) {
      sendPlanUpdatedEmail(session.user.email, session.user.name, result.adjustments).catch((err) => console.error('[athlete/checkin] sendPlanUpdatedEmail failed:', err))
    }

    // PLT-11: notificar al atleta cuando el check-in ajustó sesiones de la próxima semana
    if (result.sessionsAdjusted > 0) {
      createNotification(
        session.user.id,
        'PLAN_ACTUALIZADO',
        'Plan ajustado por tu check-in',
        `Se ajustaron ${result.sessionsAdjusted} sesión${result.sessionsAdjusted > 1 ? 'es' : ''} de la próxima semana según tus señales de fatiga.`,
      ).catch((err) => console.error('[athlete/checkin] createNotification plan-adjusted failed:', err))
    }

    // Notify coach (fire-and-forget, B2B athletes only)
    const athleteId = session.user.id
    const athleteName = session.user.name ?? ''
    prisma.coachAthlete.findFirst({
      where: { athleteId, status: 'ACTIVE' },
      include: { coach: { select: { email: true, name: true } } },
    }).then((rel) => {
      if (rel?.coach.email) {
        return sendCoachCheckInEmail(rel.coach.email, rel.coach.name ?? '', athleteName, athleteId, {
          energyLevel: body.energyLevel,
          hardestRpe:  body.hardestRpe,
          weightKg:    body.weightKg,
        })
      }
    }).catch((err) => console.error('[athlete/checkin] sendCoachCheckInEmail failed:', err))

    // Fetch suggestions created by this check-in (fire after tx completes)
    const suggestions = result.pendingSuggestions > 0
      ? await prisma.checkInSuggestion.findMany({
          where: { userId: session.user.id, status: 'PENDING', expiresAt: { gt: new Date() } },
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
        planChanges: result.planChanges,
        nutritionChanges: result.nutritionChanges,
      },
      pendingSuggestions: result.pendingSuggestions,
      suggestions,
    })
  } catch (err) {
    console.error('[checkin] processCheckIn error:', err)
    return serverError()
  }
}
