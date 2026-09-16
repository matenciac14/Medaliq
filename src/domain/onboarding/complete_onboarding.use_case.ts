/**
 * Use case: complete athlete onboarding.
 *
 * Routing:
 *   B2B   — profile only, no plan, no features (coach activates later)
 *   GYM   — TDEE + nutrition + WeeklyRoutine, sport=STRENGTH
 *   RUNNING / BOTH — TDEE + nutrition + WeeklyRoutine, sport=RUNNING|BOTH
 *   FREE  — TDEE + nutrition + WeeklyRoutine, no sport
 *
 * No path generates a TrainingPlan during onboarding.
 * Structured plans are assigned by the coach (B2B).
 */

import type { IHealthProfileRepository } from '@/domain/ports/health_profile.repository'
import type { IUserRepository } from '@/domain/ports/user.repository'
import type { IPlanRepository } from '@/domain/ports/plan.repository'
import type { WizardData } from '@/domain/onboarding/onboarding.types'
import { calculateTDEE, calculateMacros } from '@/domain/plan/formulas'
import type { PrismaDbClient } from '@/lib/db/prisma_client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompleteOnboardingResult = {
  isB2B: boolean
  planId: string | null
}

// ── Use case ──────────────────────────────────────────────────────────────────

export async function completeOnboardingUseCase(
  data: WizardData,
  userId: string,
  deps: {
    db: PrismaDbClient
    planRepo: IPlanRepository
    healthProfileRepo: IHealthProfileRepository
    userRepo: IUserRepository
    // Factory que crea repos con scope de transacción — evita imports de infra en el dominio
    txRepoFactory: (tx: PrismaDbClient) => {
      healthProfileRepo: IHealthProfileRepository
      userRepo: IUserRepository
      planRepo: IPlanRepository
    }
  }
): Promise<CompleteOnboardingResult> {

  const isB2B = await checkIsB2B(deps.db, userId)

  // ── Compute TDEE + macros (common to all paths) ───────────────────────────
  const tdee = calculateTDEE(
    data.weightKg!,
    data.heightCm!,
    data.age!,
    (data.gender === 'female' ? 'female' : 'male'),
    data.daysPerWeek
  )
  const hasDeficit = !!data.weightGoalKg || data.gymGoal === 'FAT_LOSS' || data.gymGoal === 'RECOMPOSITION'
  const kcalAdjustment = hasDeficit ? -500 : 0
  const macros = calculateMacros(tdee, data.weightKg!, kcalAdjustment)

  // ── Derive sport fields from activityType ─────────────────────────────────
  const sportType = activityToSport(data.activityType)
  const sportGoal = activityToSportGoal(data.activityType, data.gymGoal, data.runningGoal)

  const nutritionTargets = {
    tdee,
    targetKcalHard: macros.hard.kcal,
    targetKcalEasy: macros.easy.kcal,
    targetKcalRest: macros.rest.kcal,
    proteinG: macros.hard.protein,
    carbsHardG: macros.hard.carbs,
    carbsEasyG: macros.easy.carbs,
    fatG: macros.hard.fat,
    kcalAdjustment,
  }

  // ── Profile + nutrition + onboarding completion — all atomic ──────────────
  await deps.db.$transaction(async (tx) => {
    const { healthProfileRepo: txHealthProfile, userRepo: txUser, planRepo: txPlan } = deps.txRepoFactory(tx)

    await txPlan.upsertNutrition(userId, nutritionTargets)

    await txHealthProfile.upsertProfile(userId, {
      age: data.age!,
      heightCm: data.heightCm!,
      weightKg: data.weightKg!,
      weightGoalKg: data.weightGoalKg ?? undefined,
      gender: data.gender ?? undefined,
      sport: sportType,
      experienceLevel: data.experienceLevel ?? undefined,
      sessionMinutes: data.sessionMinutes ?? undefined,
      injuries: parseListField(data.injuries),
      conditions: parseListField(data.conditions),
      sportDetails: buildSportDetails(data),
      dataSources: {},
    })

    // B2B: only save profile, coach activates features later
    if (isB2B) {
      await txUser.completeOnboarding(userId, {
        onboarding: { completed: true, completedAt: now() },
        sport: { type: sportType, goal: sportGoal },
      })
    } else {
      await txUser.completeOnboarding(userId, {
        features: { plan: true, nutrition: true, progress: true, log: true, checkin: true, gym: true },
        onboarding: { completed: true, completedAt: now() },
        sport: { type: sportType, goal: sportGoal },
      })
      // DEBT-02: WeeklyRoutine dentro del $transaction — evita estado inconsistente si falla el upsert
      await tx.weeklyRoutine.upsert({
        where: { userId },
        update: { daysPerWeek: data.daysPerWeek },
        create: { userId, daysPerWeek: data.daysPerWeek, days: [] },
      })
    }
  })

  return { isB2B, planId: null }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString()
}

async function checkIsB2B(db: PrismaDbClient, userId: string): Promise<boolean> {
  const relation = await db.coachAthlete.findFirst({ where: { athleteId: userId } })
  return !!relation
}

function activityToSport(activityType: WizardData['activityType']): string {
  switch (activityType) {
    case 'GYM':     return 'STRENGTH'
    case 'RUNNING': return 'RUNNING'
    case 'BOTH':    return 'RUNNING'  // primary sport; gym is secondary
    default:        return 'GENERAL'
  }
}

function activityToSportGoal(
  activityType: WizardData['activityType'],
  gymGoal: WizardData['gymGoal'],
  runningGoal: WizardData['runningGoal'],
): string {
  if (activityType === 'GYM' || activityType === 'BOTH') {
    // Preserve gym goal granularity — MUSCLE_GAIN is a distinct goal from body recomposition
    if (gymGoal === 'MUSCLE_GAIN') return 'STRENGTH_TRAINING'
    return 'BODY_RECOMPOSITION'  // FAT_LOSS | RECOMPOSITION
  }
  if (activityType === 'RUNNING') {
    if (runningGoal === 'RACE_5K') return 'RACE_5K'
    if (runningGoal === 'RACE_10K') return 'RACE_10K'
  }
  return 'GENERAL_FITNESS'
}

function buildSportDetails(data: WizardData): Record<string, unknown> {
  const details: Record<string, unknown> = {}
  if (data.gymGoal) details.gymGoal = data.gymGoal
  if (data.runningGoal) details.runningGoal = data.runningGoal
  return details
}

function parseListField(value: string | string[] | undefined | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.split(',').map(s => s.trim()).filter(Boolean)
}
