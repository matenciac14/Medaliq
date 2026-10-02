import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'
import { z } from 'zod'
import type { SessionType } from '@/generated/prisma/enums'
import { calcNutritionAdjustment } from '@/domain/nutrition/calculate_nutrition_adjustment'

const INTENSITIES = ['HIGH', 'MODERATE', 'LOW', 'REST'] as const
const DISCIPLINES = ['RUNNING', 'STRENGTH', 'CYCLING', 'SWIMMING', 'OTHER'] as const

const DATA_SOURCES = ['MANUAL', 'STRAVA', 'GARMIN', 'HEALTHKIT'] as const

const LogSessionSchema = z.object({
  sessionId: z.string().min(1).optional(),
  sessionType: z.string().max(50).optional(),
  completed: z.boolean().optional(),
  actualDurationMin: z.number().int().min(0).max(600).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  hrAvg: z.number().int().min(30).max(250).optional(),
  hrMax: z.number().int().min(30).max(250).optional(),
  distanceKm: z.number().min(0).max(1000).optional(),
  notes: z.string().max(2000).optional(),
  actualIntensity: z.enum(INTENSITIES).optional(),
  discipline: z.enum(DISCIPLINES).optional(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Wearable fields — opcionales, solo cuando dataSource != MANUAL
  dataSource: z.enum(DATA_SOURCES).optional(),
  externalId: z.string().max(200).optional(),
  caloriesBurned: z.number().int().min(0).max(10000).optional(),
  avgPaceSecPerKm: z.number().int().min(0).max(3600).optional(),
}).refine(d => d.sessionId || d.sessionType, { message: 'sessionId o sessionType requerido' })

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:log-session`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'log')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const parsed = LogSessionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })
  const {
    sessionId, sessionType, completed, actualDurationMin, rpe,
    hrAvg, hrMax, distanceKm, notes, actualIntensity, discipline,
    sessionDate: sessionDateStr, dataSource, externalId, caloriesBurned, avgPaceSecPerKm,
  } = parsed.data
  const sessionDate = sessionDateStr ? new Date(`${sessionDateStr}T00:00:00.000Z`) : null

  // ── Deduplicación wearable: si ya existe un log con este externalId, saltar ──
  if (externalId) {
    const dup = await prisma.sessionLog.findFirst({
      where: { userId, externalId },
      select: { id: true },
    })
    if (dup) return NextResponse.json({ ok: true, id: dup.id, alreadyLogged: true })
  }

  // ── Log libre (sin plan) ──────────────────────────────────────────────────
  if (!sessionId) {
    if (!completed) return NextResponse.json({ ok: true, skipped: true })
    const log = await prisma.sessionLog.create({
      data: {
        userId,
        plannedSessionId: null,
        freeSessionType: sessionType as SessionType | undefined,
        completedAt: new Date(),
        sessionDate,
        rpe: rpe ?? null,
        hrAvg: hrAvg ?? null,
        hrMax: hrMax ?? null,
        durationMin: actualDurationMin ?? null,
        distanceKm: distanceKm ?? null,
        notes: notes ?? null,
        discipline: discipline ?? null,
        dataSource: dataSource ?? null,
        externalId: externalId ?? null,
        caloriesBurned: caloriesBurned ?? null,
        avgPaceSecPerKm: avgPaceSecPerKm ?? null,
      },
    })
    return NextResponse.json({ ok: true, id: log.id })
  }

  // ── Log vinculado a plan ──────────────────────────────────────────────────
  // Verificar ownership
  const planned = await prisma.plannedSession.findFirst({
    where: { id: sessionId, week: { plan: { userId } } },
    select: { id: true, intensity: true },
  })
  if (!planned) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  // Si no la completó, no creamos log (la sesión queda pendiente)
  if (!completed) return NextResponse.json({ ok: true, skipped: true })

  // Idempotente: si ya existe un log para esta sesión, devolver éxito
  const existing = await prisma.sessionLog.findUnique({
    where: { plannedSessionId: sessionId },
    select: { id: true },
  })
  if (existing) return NextResponse.json({ ok: true, id: existing.id, alreadyLogged: true })

  const log = await prisma.sessionLog.create({
    data: {
      userId,
      plannedSessionId: sessionId,
      completedAt: new Date(),
      sessionDate,
      rpe: rpe ?? null,
      hrAvg: hrAvg ?? null,
      hrMax: hrMax ?? null,
      durationMin: actualDurationMin ?? null,
      distanceKm: distanceKm ?? null,
      notes: notes ?? null,
      actualIntensity: actualIntensity ?? null,
      discipline: discipline ?? null,
    },
  })

  // ── Sugerencia nutricional informativa por intensidad real ────────────────
  // DEPRECATED: PendingNutritionAdjustment ya no se genera.
  // Solo notificación informativa si source=SYSTEM (plan de onboarding, no editado).
  if (actualIntensity && planned.intensity && actualIntensity !== planned.intensity) {
    try {
      const nutritionPlan = await prisma.nutritionPlan.findUnique({
        where: { userId },
        select: { source: true, targetKcalHard: true, targetKcalEasy: true, targetKcalRest: true, carbsHardG: true, carbsEasyG: true },
      })
      if (nutritionPlan && nutritionPlan.source === 'SYSTEM') {
        const { createNotification } = await import('@/infrastructure/db/notification')
        const adj = calcNutritionAdjustment(planned.intensity, actualIntensity, nutritionPlan)
        if (adj && Math.abs(adj.deltaKcal) >= 200) {
          const sign = adj.deltaKcal > 0 ? '+' : ''
          createNotification(
            userId,
            'SUGERENCIA_NUTRICIONAL',
            adj.deltaKcal > 0 ? 'Hoy necesitas más energía 💪' : 'Hoy puedes comer más ligero',
            adj.deltaKcal > 0
              ? `Tu sesión fue más intensa de lo planificado. Tu cuerpo necesita ~${adj.adjustedKcal} kcal y ~${adj.adjustedCarbsG}g de carbos para recuperarte bien.`
              : `Tu sesión fue más suave de lo planificado. Un target de ~${adj.adjustedKcal} kcal es suficiente para hoy.`,
          ).catch((err) => console.error('[mobile/log/session] createNotification nutrition-suggestion failed:', err))
        }
      }
    } catch {
      // No bloquear el response
    }
  }

  return NextResponse.json({ ok: true, id: log.id })
}
