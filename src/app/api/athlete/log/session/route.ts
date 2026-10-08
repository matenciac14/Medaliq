import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push/expo_push'
import { z } from 'zod'
import { calcNutritionAdjustment } from '@/domain/nutrition/calculate_nutrition_adjustment'
import { rateLimitAsync } from '@/lib/rate_limit'
import { createNotification } from '@/infrastructure/db/notification'
import { resolveDisciplineId } from '@/domain/discipline/discipline_resolver'

const INTENSITIES = ['HIGH', 'MODERATE', 'LOW', 'REST'] as const

const DISCIPLINES = ['RUNNING', 'STRENGTH', 'CYCLING', 'SWIMMING', 'OTHER'] as const

const LogSessionSchema = z.object({
  plannedSessionId: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  distanceKm: z.number().min(0).max(1000).optional(),
  durationMin: z.number().int().min(0).max(600).optional(),
  hrAvg: z.number().int().min(30).max(250).optional(),
  hrMax: z.number().int().min(30).max(250).optional(),
  notes: z.string().max(2000).optional(),
  actualIntensity: z.enum(INTENSITIES).optional(),
  discipline: z.enum(DISCIPLINES).optional(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // fecha real de la sesión (YYYY-MM-DD)
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`web-${session.user.id}:log-session`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id
  const parsed = LogSessionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })
  const body = parsed.data
  const sessionDate = body.sessionDate ? new Date(`${body.sessionDate}T00:00:00.000Z`) : null
  const discipline = body.discipline ?? null
  const disciplineId = await resolveDisciplineId(discipline)

  // Si completed === false, no registrar (la sesión queda pendiente)
  if (body.completed === false) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // Verificar ownership si viene plannedSessionId + leer intensity para ajuste nutricional
  let plannedIntensity: string | null = null
  if (body.plannedSessionId) {
    const planned = await prisma.plannedSession.findFirst({
      where: { id: body.plannedSessionId, week: { plan: { userId } } },
      select: { id: true, intensity: true },
    })
    if (!planned) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }
    plannedIntensity = planned.intensity

    // Idempotente: si ya existe log, devolver éxito
    const existing = await prisma.sessionLog.findUnique({
      where: { plannedSessionId: body.plannedSessionId },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ ok: true, id: existing.id, alreadyLogged: true })
  }

  // PERSIST-06: catch P2002 específicamente en create para devolver 409 en doble submit
  let log: Awaited<ReturnType<typeof prisma.sessionLog.create>>
  try {
    log = await prisma.sessionLog.create({
      data: {
        userId,
        plannedSessionId: body.plannedSessionId ?? null,
        completedAt: new Date(),
        sessionDate,
        rpe: body.rpe,
        hrAvg: body.hrAvg,
        hrMax: body.hrMax,
        distanceKm: body.distanceKm,
        durationMin: body.durationMin,
        notes: body.notes,
        actualIntensity: body.actualIntensity ?? null,
        discipline,
        disciplineId,
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return NextResponse.json({ ok: true, alreadyLogged: true }, { status: 200 })
    }
    throw err
  }
  const coachRelation = await prisma.coachAthlete.findFirst({
    where: { athleteId: userId, status: 'ACTIVE' },
    select: { coach: { select: { pushToken: true } }, athlete: { select: { name: true } } },
  })

  if (coachRelation?.coach.pushToken) {
    const name = coachRelation.athlete.name ?? 'Tu atleta'
    sendPushNotification(coachRelation.coach.pushToken, `${name} completó una sesión`, 'Sesión registrada 🏃', { screen: 'coach' }).catch((err) => console.error('[athlete/log/session] sendPushNotification to coach failed:', err))
  }

  // ── Sugerencia nutricional informativa por intensidad real ────────────────
  // R6: PendingNutritionAdjustment eliminado del sistema.
  // Solo se envía notificación informativa si source=SYSTEM (plan de onboarding, no editado).
  if (body.actualIntensity && plannedIntensity && body.actualIntensity !== plannedIntensity) {
    try {
      const nutritionPlan = await prisma.nutritionPlan.findUnique({
        where: { userId },
        select: { source: true, targetKcalHard: true, targetKcalEasy: true, targetKcalRest: true, carbsHardG: true, carbsEasyG: true },
      })
      if (nutritionPlan && nutritionPlan.source === 'SYSTEM') {
        const adj = calcNutritionAdjustment(
          plannedIntensity as 'HIGH' | 'MODERATE' | 'LOW' | 'REST',
          body.actualIntensity,
          nutritionPlan,
        )
        if (adj && Math.abs(adj.deltaKcal) >= 200) {
          const sign = adj.deltaKcal > 0 ? '+' : ''
          createNotification(
            userId,
            'SUGERENCIA_NUTRICIONAL',
            adj.deltaKcal > 0 ? 'Hoy necesitas más energía 💪' : 'Hoy puedes comer más ligero',
            adj.deltaKcal > 0
              ? `Tu sesión fue más intensa de lo planificado. Tu cuerpo necesita ~${adj.adjustedKcal} kcal y ~${adj.adjustedCarbsG}g de carbos para recuperarte bien.`
              : `Tu sesión fue más suave de lo planificado. Un target de ~${adj.adjustedKcal} kcal es suficiente para hoy.`,
          ).catch((err) => console.error('[athlete/log/session] createNotification nutrition-suggestion failed:', err))
        }
      }
    } catch {
      // No bloquear el response
    }
  }

  return NextResponse.json({ ok: true, id: log.id })
}
