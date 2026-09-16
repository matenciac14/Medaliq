/**
 * Use Case: Process Weekly Check-In
 *
 * Single source of business logic — shared by web and mobile routes.
 * Routes handle ONLY auth + input normalization, then delegate here.
 *
 * Two phases:
 *
 *  PHASE 1 — Reads (parallel, outside transaction)
 *    Load previous check-in, active plan, training adherence
 *
 *  PHASE 2 — Pure computation (outside transaction)
 *    Evaluate rules deterministically
 *    Build recommendation from adjustments (no AI)
 *
 *  PHASE 3 — All DB writes in ONE atomic $transaction (timeout 30s)
 *    Upsert WeeklyCheckIn
 *    Apply session adjustments to next week
 *    Sync weight → HealthProfile + recalculate TDEE/macros
 *    Activate progress feature on first check-in
 */
import type { ICheckInRepository } from '@/domain/ports/checkin.repository'
import type { IPlanRepository } from '@/domain/ports/plan.repository'
import type { IHealthProfileRepository } from '@/domain/ports/health_profile.repository'
import type { IUserRepository } from '@/domain/ports/user.repository'
import type { PrismaDbClient } from '@/lib/db/prisma_client'
import type { CheckInInput, PlanContext } from './check_in.types'
import { CHECK_IN_THRESHOLDS } from './check_in.types'
import { evaluateCheckInRules, buildSessionAdjustments } from './evaluate_rules'
import { getPlanWeekNumber, getCurrentISOWeek } from '@/lib/core/week_number'
import { calculateTDEE, calculateMacros } from '@/domain/plan/formulas'
import { calcAge } from '@/lib/utils/calc_age'
import { PrismaCheckInRepository } from '@/infrastructure/db/checkin.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health_profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { PrismaSuggestionRepository } from '@/infrastructure/db/suggestion.repository'
import { generateSuggestions } from './generate_suggestions'

export type ProcessCheckInInput = {
  userId: string
  data: CheckInInput
}

export type ProcessCheckInResult = {
  weekNumber: number
  triggers: string[]
  adjustments: string[]
  recommendation: string
  severity: 'ok' | 'warning' | 'critical'
  sessionsAdjusted: number
  /** Populated only when plan.source === 'COACH' — suggestions created instead of auto-applying. */
  pendingSuggestions: number
  /** Numeric plan changes when auto-apply fired. */
  planChanges?: {
    volumeDeltaPct?: number  // negative = reduction (e.g. -20 = 20% less volume)
    zonesAdjusted?: boolean  // true when session zones were lowered due to high RPE
  }
  /** Recalculated nutrition targets when weight synced and profile has nutrition plan. */
  nutritionChanges?: {
    newKcalHard?: number
    newKcalEasy?: number
  }
}

/** Full Prisma client (not transaction client) — needed to open $transaction. */
type PrismaFullClient = PrismaDbClient & {
  $transaction<R>(fn: (tx: PrismaDbClient) => Promise<R>, options?: { timeout?: number }): Promise<R>
}

const RECOMMENDATION_FALLBACK =
  '¡Excelente semana! Tus métricas están en rango óptimo. Mantén el ritmo y sigue el plan como está.'

export async function processCheckIn(
  input: ProcessCheckInInput,
  deps: {
    db: PrismaFullClient
    checkInRepo: ICheckInRepository
    planRepo: IPlanRepository
    healthProfileRepo: IHealthProfileRepository
    userRepo: IUserRepository
  }
): Promise<ProcessCheckInResult> {
  const { userId, data } = input

  // ─────────────────────────────────────────────────────────
  // PHASE 1 — Reads (parallel, no side effects, outside tx)
  // ─────────────────────────────────────────────────────────
  const [prevCheckIn, activePlan, assignedWorkout, recentCheckIns, weekActivity] = await Promise.all([
    deps.checkInRepo.findLatest(userId),
    deps.planRepo.findActive(userId),
    deps.db.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      include: {
        template: {
          include: {
            days: {
              where: { isRestDay: false },
              select: { id: true, warmupNotes: true },
            },
          },
        },
      },
    }),
    // Last 4 check-ins to compute consecutiveLowEnergyWeeks
    deps.db.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { weekNumber: 'desc' },
      take: 4,
      select: { energyLevel: true },
    }),
    // Objective training data from the week
    deps.checkInRepo.getWeekActivitySummary(userId),
  ])

  const weekNumber = activePlan
    ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    : getCurrentISOWeek()

  const trainingAdherence = activePlan
    ? await deps.planRepo.getTrainingAdherence(activePlan.id, activePlan.currentWeek)
    : 0

  // ─────────────────────────────────────────────────────────
  // PHASE 2 — Pure evaluation (deterministic, no external I/O)
  // ─────────────────────────────────────────────────────────
  const hasGymPlan = !!assignedWorkout
  const sport = hasGymPlan ? 'STRENGTH' : activePlan ? 'RUNNING' : undefined
  const consecutiveLowEnergyWeeks = countConsecutiveLowEnergy(recentCheckIns)

  const planContext: PlanContext = {
    planId: activePlan?.id ?? '',
    currentWeek: activePlan?.currentWeek ?? 1,
    totalWeeks: activePlan?.totalWeeks ?? 18,
    phase: activePlan?.phase ?? 'BASE',
    weekNumber,
    hrRestingBaseline: prevCheckIn?.heartRate ?? undefined,
    previousWeight: prevCheckIn?.weight ?? undefined,
    sport,
    hasGymPlan,
    consecutiveLowEnergyWeeks,
    weekActivity,
  }

  const { triggers, adjustments, severity } = evaluateCheckInRules(data, planContext)

  const recommendation = triggers.length > 0
    ? adjustments.join('. ')
    : RECOMMENDATION_FALLBACK

  // Pre-compute volume and zone deltas for result — pure, no DB needed
  const { hasVolumeTrigger, volumeReduction, hasPain, hasRpe } = buildSessionAdjustments(triggers)
  const volumeDeltaPct = hasVolumeTrigger && !hasPain
    ? Math.round((volumeReduction - 1) * 100)  // e.g. 0.8 → -20
    : undefined
  const zonesAdjusted = hasRpe && !hasPain

  // ─────────────────────────────────────────────────────────
  // PHASE 3 — All DB writes in ONE atomic $transaction
  // If any step fails, the entire check-in is rolled back.
  // ─────────────────────────────────────────────────────────
  let sessionsAdjusted = 0
  let pendingSuggestions = 0
  let nutritionChanges: ProcessCheckInResult['nutritionChanges']

  await deps.db.$transaction(async (tx) => {
    const txCheckIn = new PrismaCheckInRepository(tx)
    const txPlan = new PrismaPlanRepository(tx)
    const txHealthProfile = new PrismaHealthProfileRepository(tx)
    const txUser = new PrismaUserRepository(tx)

    // 1. Persist check-in — capture id for linking suggestions
    const { id: checkInId } = await txCheckIn.save(userId, {
      ...data,
      trainingAdherence,
      triggers,
      weekNumber,
      planId: activePlan?.id ?? null,
    })

    // 2a. COACH plan → generate suggestions instead of auto-applying
    if (activePlan?.source === 'COACH' && triggers.length > 0) {
      const nextWeek = activePlan.currentWeek + 1
      if (nextWeek <= activePlan.totalWeeks) {
        const suggestions = generateSuggestions(triggers, adjustments, {
          ...planContext,
          planId: activePlan.id,
          nextWeek,
        })
        if (suggestions.length > 0) {
          const txSuggestion = new PrismaSuggestionRepository(tx)
          await txSuggestion.createMany(userId, checkInId, suggestions)
          pendingSuggestions = suggestions.length
        }
      }
    }

    // 2b. Add gym note when pain/RPE triggers fire for GYM athletes (GYM-01)
    // GYM-GAP-03: strip previous [AUTO] notes before writing — prevents indefinite accumulation
    const gymTrigger = triggers.includes('dolor_activo') || triggers.includes('rpe_excesivo')
    if (assignedWorkout) {
      const gymNote = gymTrigger
        ? (triggers.includes('dolor_activo')
            ? '[AUTO] Dolor activo la semana anterior — sesión opcional. No forzar si hay molestia.'
            : '[AUTO] RPE elevado la semana anterior — ajusta intensidad según cómo te sientas hoy.')
        : null
      for (const day of assignedWorkout.template.days) {
        // Strip any previous [AUTO] suffix (everything from [AUTO] to end of string)
        const baseNotes = day.warmupNotes?.replace(/\s*\[AUTO\][\s\S]*$/, '').trim() || null
        const nextNotes = gymNote ? (baseNotes ? `${baseNotes} ${gymNote}` : gymNote) : baseNotes || null
        // Only write if something actually changed
        if (nextNotes !== (day.warmupNotes ?? null)) {
          await tx.workoutDay.update({
            where: { id: day.id },
            data: { warmupNotes: nextNotes },
          })
        }
      }
    }

    // 3. Sync weight → HealthProfile + recalculate TDEE/macros
    if (data.weight) {
      nutritionChanges = await syncWeight(userId, data.weight, prevCheckIn?.weight ?? null, txHealthProfile)
    }

    // 3b. Sync FC reposo → HealthProfile (always update when provided)
    if (data.heartRate && data.heartRate > 0) {
      await txHealthProfile.updateHrResting(userId, data.heartRate)
    }

    // 4. First check-in → enable progress feature
    const total = await txCheckIn.count(userId)
    if (total === 1) {
      await txUser.enableFeature(userId, 'progress')
    }
  }, { timeout: 30_000 })

  const planChanges: ProcessCheckInResult['planChanges'] = sessionsAdjusted > 0
    ? { volumeDeltaPct, zonesAdjusted: zonesAdjusted || undefined }
    : undefined

  return { weekNumber, triggers, adjustments, recommendation, severity, sessionsAdjusted, pendingSuggestions, planChanges, nutritionChanges }
}

// ─────────────────────────────────────────────────────────
// Helpers (exported for use in accept suggestion endpoint)
// ─────────────────────────────────────────────────────────

export async function applySessionAdjustments(
  planId: string,
  nextWeekNumber: number,
  triggers: string[],
  planRepo: IPlanRepository
): Promise<number> {
  const sessions = await planRepo.findWeekSessions(planId, nextWeekNumber)
  if (sessions.length === 0) return 0

  const { hasPain, hasVolumeTrigger, hasRpe, volumeReduction } = buildSessionAdjustments(triggers)
  const HIGH_INTENSITY_TYPES = ['INTERVALOS', 'TIRADA_LARGA', 'FARTLEK', 'SIMULACRO', 'TEST']
  let count = 0

  for (const session of sessions) {
    // Skip sessions manually edited by the coach (coachNotes present but not [AUTO]-generated)
    if (session.coachNotes && !session.coachNotes.includes('[AUTO]')) continue

    const updates: Record<string, unknown> = {}
    const notes: string[] = []

    if (hasPain && HIGH_INTENSITY_TYPES.includes(session.type)) {
      updates.type = 'RODAJE_Z2'
      updates.intensity = 'LOW'
      updates.durationMin = Math.min(session.durationMin, 40)
      notes.push('Sesión convertida a recuperación activa por dolor reportado. Consulta médica recomendada.')
    } else if (hasPain) {
      notes.push('Dolor activo — sesión opcional. No forzar si hay molestia.')
    }

    if (hasVolumeTrigger && !hasPain) {
      updates.durationMin = Math.round(session.durationMin * volumeReduction)
      const label = triggers.includes('estres_alto') ? 'estrés elevado' : 'señales de fatiga'
      notes.push(`Volumen reducido ${Math.round((1 - volumeReduction) * 100)}% por ${label}.`)
    }

    if (hasRpe && session.zone && !hasPain) {
      const zoneMap: Record<string, string> = { Z5: 'Z4', Z4: 'Z3', Z3: 'Z2', Z2: 'Z1', Z1: 'Z1' }
      const lowerZone = zoneMap[session.zone]
      if (lowerZone && lowerZone !== session.zone) {
        updates.zone = lowerZone
        notes.push(`Zona bajada de ${session.zone} a ${lowerZone} por RPE elevado.`)
      }
    }

    if (notes.length > 0) {
      const base = session.coachNotes ? session.coachNotes + ' ' : ''
      updates.coachNotes = base + '[AUTO] ' + notes.join(' ')
    }

    if (Object.keys(updates).length > 0) {
      await planRepo.updateSession(session.id, updates)
      count++
    }
  }

  return count
}

function countConsecutiveLowEnergy(checkIns: { energyLevel: number | null }[]): number {
  let count = 0
  for (const c of checkIns) {
    if (c.energyLevel !== null && c.energyLevel <= 3) count++
    else break
  }
  return count
}

async function syncWeight(
  userId: string,
  newWeight: number,
  previousWeight: number | null,
  healthProfileRepo: IHealthProfileRepository
): Promise<{ newKcalHard?: number; newKcalEasy?: number } | undefined> {
  const profile = await healthProfileRepo.find(userId)
  const runtimeAge = profile?.dateOfBirth ? calcAge(profile.dateOfBirth) : (profile?.age ?? null)
  if (!profile?.heightCm || !runtimeAge) return undefined

  // BUG-055: comparar siempre vs el peso base del perfil, no vs el check-in anterior
  // Evita que ajustes de 0.3kg entre check-ins nunca actualicen el perfil base
  const prev = profile.weightKg ?? newWeight
  if (Math.abs(newWeight - prev) < CHECK_IN_THRESHOLDS.WEIGHT_DELTA_MIN) return undefined

  await healthProfileRepo.updateWeight(userId, newWeight)

  const hasNutritionPlan = await healthProfileRepo.hasNutritionPlan(userId)
  if (!hasNutritionPlan) return undefined

  const kcalAdjustment = await healthProfileRepo.getNutritionKcalAdjustment(userId)

  const tdee = calculateTDEE(
    newWeight,
    profile.heightCm,
    runtimeAge,
    (profile.gender ?? 'male') as 'male' | 'female',
    profile.daysPerWeek ?? 5,
    profile.sessionMinutes,
  )
  const macros = calculateMacros(tdee, newWeight, kcalAdjustment)

  await healthProfileRepo.updateNutritionTargets(userId, {
    tdee,
    targetKcalHard: macros.hard.kcal,
    targetKcalEasy: macros.easy.kcal,
    targetKcalRest: macros.rest.kcal,
    proteinG: macros.hard.protein,
    carbsHardG: macros.hard.carbs,
    carbsEasyG: macros.easy.carbs,
    fatG: macros.hard.fat,
  })

  return { newKcalHard: macros.hard.kcal, newKcalEasy: macros.easy.kcal }
}
