/**
 * Use case: complete athlete onboarding.
 *
 * Routing:
 *   B2B   — profile only, no plan, no features (coach activates later)
 *   New flow (goal-based) — TDEE + nutrition + WeeklyRoutine, sport deferred
 *   Legacy (activityType-based) — TDEE + nutrition + WeeklyRoutine, sport mapped
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

  // ── Idempotencia: si ya completó onboarding, no sobrescribir (protege nutrición ajustada por coach)
  const existingUser = await deps.db.user.findUnique({
    where: { id: userId },
    select: { onboardingCompleted: true },
  })
  if (existingUser?.onboardingCompleted) {
    const isB2B = await checkIsB2B(deps.db, userId)
    return { isB2B, planId: null }
  }

  const isB2B = await checkIsB2B(deps.db, userId)

  // ── Compute age from DOB or fallback ────────────────────────────────────
  const age = data.dateOfBirth
    ? Math.floor((Date.now() - new Date(data.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : data.age ?? 25

  // Mifflin-St Jeor requiere sexo biológico. 'other' → usa fórmula masculina (estimación conservadora, ~160 kcal/día más que femenina).
  const genderForCalc = data.gender === 'female' ? 'female' as const : 'male' as const
  const sessionMinutes = data.sessionMinutes ?? 60

  // ── Compute TDEE + macros ───────────────────────────────────────────────
  const tdee = calculateTDEE(data.weightKg!, data.heightCm!, age, genderForCalc, data.daysPerWeek, sessionMinutes)

  // New goal-based kcal adjustment (takes priority)
  let kcalAdjustment = 0
  if (data.goal === 'LOSE_FAT' || data.weightGoalKg) {
    kcalAdjustment = -500
  } else if (data.goal === 'GAIN_MUSCLE') {
    kcalAdjustment = 300
  } else if (data.goal === 'STAY_HEALTHY') {
    kcalAdjustment = 0
  }
  // Legacy fallback: if no goal but has gymGoal/activityType (mobile backward compat)
  if (!data.goal && data.gymGoal) {
    if (data.gymGoal === 'FAT_LOSS' || data.gymGoal === 'RECOMPOSITION') kcalAdjustment = -500
    else if (data.gymGoal === 'MUSCLE_GAIN') kcalAdjustment = 300
  }

  const macros = calculateMacros(tdee, data.weightKg!, kcalAdjustment)

  // ── Derive sport fields ─────────────────────────────────────────────────
  // Sport type: null if new flow (deferred to first activity log), mapped if legacy
  const sportType = data.goal ? null : activityToSport(data.activityType)

  // Sport goal from new `goal` field
  let sportGoal: string | null = null
  if (data.goal === 'LOSE_FAT') sportGoal = 'BODY_RECOMPOSITION'
  else if (data.goal === 'GAIN_MUSCLE') sportGoal = 'STRENGTH_TRAINING'
  else if (data.goal === 'STAY_HEALTHY') sportGoal = 'GENERAL_FITNESS'
  // Legacy fallback
  else sportGoal = activityToSportGoal(data.activityType, data.gymGoal, data.runningGoal)

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
      age,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      heightCm: data.heightCm!,
      weightKg: data.weightKg!,
      weightGoalKg: data.weightGoalKg ?? undefined,
      gender: data.gender ?? undefined,
      sport: sportType,
      sportGoal,
      experienceLevel: data.experienceLevel ?? null,
      sessionMinutes,
      injuries: parseListField(data.injuries ?? ''),
      conditions: parseListField(data.conditions ?? ''),
      sportDetails: data.goal
        ? { goal: data.goal }
        : buildSportDetails(data.activityType, data.gymGoal, data.runningGoal),
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
    }

    // WeeklyRoutine para TODOS (B2B y B2C) — el coach necesita saber cuántos días entrena el atleta
    await tx.weeklyRoutine.upsert({
      where: { userId },
      update: { daysPerWeek: data.daysPerWeek },
      create: { userId, daysPerWeek: data.daysPerWeek, days: [] },
    })
  })

  return { isB2B, planId: null }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString()
}

async function checkIsB2B(db: PrismaDbClient, userId: string): Promise<boolean> {
  const relation = await db.coachAthlete.findFirst({ where: { athleteId: userId, status: 'ACTIVE' } })
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

function buildSportDetails(
  activityType: WizardData['activityType'],
  gymGoal: WizardData['gymGoal'],
  runningGoal: WizardData['runningGoal'],
): Record<string, unknown> {
  const details: Record<string, unknown> = {}
  if (gymGoal) details.gymGoal = gymGoal
  if (runningGoal) details.runningGoal = runningGoal
  return details
}

function parseListField(value: string | string[] | undefined | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.split(',').map(s => s.trim()).filter(Boolean)
}
