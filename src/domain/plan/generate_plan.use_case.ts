/**
 * Use case: generate a training plan for an athlete.
 *
 * Two-phase pattern:
 *
 * Phase 1 — reads + pure computation (OUTSIDE $transaction)
 *   Template selection, HR zones, TDEE, macros.
 *
 * Phase 2 — ALL DB writes inside a single $transaction (atomic)
 *   deactivateUserPlans → createPlan → createWeeks → createSessions → upsertNutrition
 *
 * Phase 3 — user config update (OUTSIDE $transaction)
 *   Avoids holding the connection open for a JSON read + deep-merge + write.
 */

import type { IPlanRepository, CreateWeekData } from '@/domain/ports/plan.repository'
import type { IUserRepository } from '@/domain/ports/user.repository'
import type { NutritionTargets } from '@/domain/ports/health_profile.repository'
import type { BuiltSession } from '@/domain/plan/session_builder'
import {
  getSessionIntensity,
  sessionDate,
} from '@/domain/plan/session_builder'
import { calculateHRZones, calculateMacros, calculateTDEE, estimateHRMax } from '@/domain/plan/formulas'
import { forceMonday } from '@/lib/core/date_utils'
import { getTemplate } from '@/domain/plan/templates'
import { resolveSportConfig } from '@/domain/onboarding/onboarding.utils'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import type { PrismaDbClient } from '@/lib/db/prisma_client'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Running goal types that include a weekly FUERZA session in their template. */
const RUNNING_GOALS = new Set([
  'RACE_5K', 'RACE_10K', 'RACE_HALF_MARATHON', 'RACE_MARATHON',
])

/**
 * Maps training phase → WorkoutDay ID for the "Fuerza corredor" system template.
 * IDs are stable — defined in prisma/seed.ts.
 *
 * BASE:       functional strength (3×12-15, sentadillas, lunges, hip thrust)
 * DESARROLLO+: specific runner strength (4×8-10, heavier load, calf emphasis)
 */
const FUERZA_CORREDOR_DAY: Record<string, string> = {
  BASE:        'system-fuerza-corredor-base',
  DESARROLLO:  'system-fuerza-corredor-especifico',
  ESPECIFICO:  'system-fuerza-corredor-especifico',
  AFINAMIENTO: 'system-fuerza-corredor-especifico',
}

/**
 * Pure function — resolves the WorkoutDay ID that should be linked to a planned session.
 * Returns null for all non-running plans or non-FUERZA sessions.
 * Exported for testing.
 */
export function resolveWorkoutDayId(
  goalType: string,
  sessionType: string,
  phase: string,
): string | null {
  if (!RUNNING_GOALS.has(goalType) || sessionType !== 'FUERZA') return null
  return FUERZA_CORREDOR_DAY[phase] ?? null
}

// ── Pace calibration ──────────────────────────────────────────────────────────

/** Converts seconds-per-km to "M:SS" string. */
function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} min/km`
}

export type PaceHints = {
  easy: string    // Z2 / rodaje / tirada larga
  tempo: string   // umbral / tempo
  interval: string // intervalos / VO2max
}

/**
 * Derives training pace targets from a recent 5K time using Riegel formula.
 * Easy: ~35% slower than race pace (Z2 aerobic).
 * Tempo: ~10% slower than race pace (lactate threshold).
 * Interval: race pace (VO2max effort).
 */
export function computePaceHints(fiveKTimeSecs: number): PaceHints {
  const racePaceSecPerKm = fiveKTimeSecs / 5
  return {
    easy:     formatPace(racePaceSecPerKm * 1.35),
    tempo:    formatPace(racePaceSecPerKm * 1.10),
    interval: formatPace(racePaceSecPerKm),
  }
}

const RUNNING_SESSION_TYPES = new Set([
  'RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS',
  'TIRADA_LARGA', 'TEST', 'SIMULACRO',
])

/** Appends benchmark pace hint to session detailText if relevant. */
function withPaceHint(
  type: string,
  existing: string | null | undefined,
  hints: PaceHints,
): string | null {
  if (!RUNNING_SESSION_TYPES.has(type)) return existing ?? null
  let hint: string | null = null
  if (type === 'RODAJE_Z2' || type === 'TIRADA_LARGA') hint = `Ritmo fácil: ~${hints.easy}`
  else if (type === 'TEMPO') hint = `Ritmo umbral: ~${hints.tempo}`
  else if (type === 'INTERVALOS') hint = `Ritmo objetivo: ~${hints.interval}`
  else if (type === 'TEST' || type === 'SIMULACRO') hint = `Ritmo carrera: ~${hints.interval}`
  if (!hint) return existing ?? null
  return existing ? `${existing}\n${hint}` : hint
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeneratePlanInput = {
  userId: string
  goalType: string
  raceDate?: string
  targetTimeSecs?: number
  weightGoalKg?: number
  age: number
  heightCm: number
  weightKg: number
  gender?: 'male' | 'female'
  hrResting?: number
  hrMax?: number
  daysPerWeek: number
  hoursPerSession: number
  injuries: string[]
  conditions: string[]
  nutritionCommitment: string
  generatedBy?: 'COACH'
  experienceLevel?: string
  /** Recent 5K time in seconds — used to calibrate pace hints in running sessions. */
  recentBenchmark5KSecs?: number
  /** IANA timezone — used to set plan start date in user's local date. */
  timezone?: string
}

export type GeneratePlanResult = {
  planId: string
  hrZones: ReturnType<typeof calculateHRZones>
  hrMax: number
  tdee: number
}

// ── Use case ──────────────────────────────────────────────────────────────────

export async function generatePlanUseCase(
  input: GeneratePlanInput,
  deps: {
    db: PrismaDbClient
    planRepo: IPlanRepository
    userRepo: IUserRepository
  }
): Promise<GeneratePlanResult> {

  // ── Phase 1: reads + pure computation ────────────────────────────────────

  const template = getTemplate(input.goalType)
  if (!template) {
    throw new Error(`goalType sin template: ${input.goalType}`)
  }
  const hrMax = input.hrMax && input.hrMax > 100 ? input.hrMax : estimateHRMax(input.age)
  const hrZones = calculateHRZones(hrMax, input.hrResting ?? 0)
  const tdee = calculateTDEE(input.weightKg, input.heightCm, input.age, input.gender ?? 'male', input.daysPerWeek)
  const macros = calculateMacros(tdee, input.weightKg, !!input.weightGoalKg)

  // Use timezone-aware "today" if provided, else UTC midnight — always force to Monday
  const rawStart = input.timezone
    ? (() => { const ds = new Date().toLocaleDateString('en-CA', { timeZone: input.timezone }); return new Date(`${ds}T00:00:00.000Z`) })()
    : (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d })()
  const planStart = forceMonday(rawStart)
  const totalWeeks = template.totalWeeks
  const planEnd = new Date(planStart)
  planEnd.setDate(planEnd.getDate() + totalWeeks * 7)

  // Compute benchmark-based pace hints for running plans if 5K time available
  const paceHints = input.recentBenchmark5KSecs
    ? computePaceHints(input.recentBenchmark5KSecs)
    : null

  // ── Phase 2: all writes inside $transaction ───────────────────────────────

  const planId = await deps.db.$transaction(async (tx) => {
    // Create a tx-scoped repo — tx satisfies PrismaDbClient (Prisma 7 keeps $transaction for nested tx)
    const repo = new PrismaPlanRepository(tx)

    await repo.deactivateUserPlans(input.userId)

    const { id } = await repo.createPlan({
      userId: input.userId,
      name: `Plan ${input.goalType} — ${planStart.toLocaleDateString('es-CO')}`,
      goalType: input.goalType,
      totalWeeks,
      startDate: planStart,
      endDate: planEnd,
      hrZones,
      generatedBy: 'COACH',
    })

    {
      const weekData: CreateWeekData[] = template.weeks.map(week => {
        const idx = week.weekNumber - 1
        const weekStart = new Date(planStart)
        weekStart.setDate(weekStart.getDate() + idx * 7)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return {
          planId: id,
          weekNumber: week.weekNumber,
          phase: week.phase,
          volumeKm: week.volumeKm,
          focusDescription: week.focusDescription,
          isRecoveryWeek: week.isRecoveryWeek,
          startDate: weekStart,
          endDate: weekEnd,
        }
      })

      const createdWeeks = await repo.createWeeks(weekData)

      const isRunning = RUNNING_GOALS.has(input.goalType)

      const allSessions: BuiltSession[] = template.weeks.flatMap((week, i) => {
        const planWeek = createdWeeks[i]
        const idx = week.weekNumber - 1

        return week.sessions.map(session => {
          // Link FUERZA sessions in running plans to the system WorkoutDay so the
          // gym tracker can load exercises automatically without coach assignment.
          const workoutDayId = resolveWorkoutDayId(input.goalType, session.type, week.phase)

          const baseDetail = session.structure ?? ''
          const detailText = paceHints
            ? (withPaceHint(session.type, baseDetail || null, paceHints) ?? '')
            : baseDetail

          return {
            weekId: planWeek.id,
            dayOfWeek: session.dayOfWeek,
            type: session.type,
            intensity: getSessionIntensity(session.type),
            durationMin: session.durationMin,
            zoneTarget: session.zoneTarget,
            detailText,
            date: sessionDate(planStart, idx, session.dayOfWeek),
            workoutDayId,
          }
        })
      })

      await repo.createSessions(allSessions)
    }

    const nutritionTargets: NutritionTargets = {
      tdee,
      targetKcalHard: macros.hard.kcal,
      targetKcalEasy: macros.easy.kcal,
      targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein,
      carbsHardG: macros.hard.carbs,
      carbsEasyG: macros.easy.carbs,
      fatG: macros.hard.fat,
    }
    await repo.upsertNutrition(input.userId, nutritionTargets)

    return id
  }, { timeout: 30_000 })

  // ── Phase 3: update user config (outside tx) ──────────────────────────────

  const { sportType, sportGoal } = resolveSportConfig(input.goalType)

  await Promise.all([
    deps.userRepo.completeOnboarding(input.userId, {
      features: undefined,
      onboarding: { completed: true, completedAt: new Date().toISOString() },
      sport: { type: sportType, goal: sportGoal },
    }),
    // Persiste hrMax calculado (Fox) en HealthProfile — fuente canónica para todas las vistas
    deps.db.healthProfile.update({ where: { userId: input.userId }, data: { hrMax } }).catch(() => {}),
  ])

  return { planId, hrZones, hrMax, tdee }
}
