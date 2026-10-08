import { describe, it, expect, vi, beforeEach } from 'vitest'
import { completeOnboardingUseCase } from './complete_onboarding.use_case'
import type { WizardData } from './onboarding.types'

// ── Test data ─────────────────────────────────────────────────────────────────

const NEW_FORMAT_DATA: WizardData = {
  dateOfBirth: '1996-01-15',
  heightCm: 175,
  weightKg: 80,
  gender: 'male',
  goal: 'LOSE_FAT',
  weightGoalKg: 72,
  daysPerWeek: 4,
}

const LEGACY_FORMAT_DATA: WizardData = {
  dateOfBirth: null,
  age: 30,
  heightCm: 175,
  weightKg: 80,
  gender: 'male',
  goal: null,
  weightGoalKg: null,
  daysPerWeek: 4,
  activityType: 'GYM',
  gymGoal: 'MUSCLE_GAIN',
  runningGoal: null,
  sessionMinutes: 60,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDeps(isB2B = false, alreadyCompleted = false) {
  const mockTx = {
    weeklyRoutine: { upsert: vi.fn().mockResolvedValue({}) },
  }

  const db = {
    user: { findUnique: vi.fn().mockResolvedValue({ onboardingCompleted: alreadyCompleted }) },
    coachAthlete: { findFirst: vi.fn().mockResolvedValue(isB2B ? { id: 'rel-1' } : null) },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  }

  const healthProfileRepo = { upsertProfile: vi.fn().mockResolvedValue(undefined) }
  const userRepo = { completeOnboarding: vi.fn().mockResolvedValue(undefined) }
  const planRepo = { upsertNutrition: vi.fn().mockResolvedValue(undefined) }

  const txRepoFactory = () => ({
    healthProfileRepo,
    userRepo,
    planRepo,
  })

  return { db, healthProfileRepo, userRepo, planRepo, txRepoFactory, mockTx }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('completeOnboardingUseCase', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('new format — goal-based', () => {
    it('retorna isB2B: false y planId: null', async () => {
      const deps = makeDeps(false)
      const result = await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-1', deps as any)
      expect(result).toEqual({ isB2B: false, planId: null })
    })

    it('activa todas las features del atleta B2C', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-1', deps as any)

      expect(deps.userRepo.completeOnboarding).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          features: { plan: true, nutrition: true, progress: true, log: true, checkin: true, gym: true },
          onboarding: expect.objectContaining({ completed: true }),
        })
      )
    })

    it('crea WeeklyRoutine con daysPerWeek', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-1', deps as any)

      expect(deps.mockTx.weeklyRoutine.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          update: { daysPerWeek: 4 },
          create: expect.objectContaining({ userId: 'user-1', daysPerWeek: 4 }),
        })
      )
    })

    it('guarda nutricion con TDEE calculado', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-1', deps as any)

      expect(deps.planRepo.upsertNutrition).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          tdee: expect.any(Number),
          proteinG: expect.any(Number),
        })
      )
      const call = deps.planRepo.upsertNutrition.mock.calls[0][1]
      expect(call.tdee).toBeGreaterThan(0)
    })

    it('sport type es null en new flow (deferred)', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-1', deps as any)
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.type).toBeNull()
    })
  })

  describe('goal → sportGoal mapping', () => {
    it('LOSE_FAT → BODY_RECOMPOSITION', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase({ ...NEW_FORMAT_DATA, goal: 'LOSE_FAT' }, 'user-1', deps as any)
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.goal).toBe('BODY_RECOMPOSITION')
    })

    it('GAIN_MUSCLE → STRENGTH_TRAINING', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase({ ...NEW_FORMAT_DATA, goal: 'GAIN_MUSCLE' }, 'user-1', deps as any)
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.goal).toBe('STRENGTH_TRAINING')
    })

    it('STAY_HEALTHY → GENERAL_FITNESS', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase({ ...NEW_FORMAT_DATA, goal: 'STAY_HEALTHY' }, 'user-1', deps as any)
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.goal).toBe('GENERAL_FITNESS')
    })
  })

  describe('goal → kcalAdjustment', () => {
    it('LOSE_FAT → -500', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase({ ...NEW_FORMAT_DATA, goal: 'LOSE_FAT' }, 'user-1', deps as any)
      const call = deps.planRepo.upsertNutrition.mock.calls[0][1]
      expect(call.kcalAdjustment).toBe(-500)
    })

    it('GAIN_MUSCLE → 300', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase({ ...NEW_FORMAT_DATA, goal: 'GAIN_MUSCLE', weightGoalKg: null }, 'user-1', deps as any)
      const call = deps.planRepo.upsertNutrition.mock.calls[0][1]
      expect(call.kcalAdjustment).toBe(300)
    })

    it('STAY_HEALTHY → 0', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase({ ...NEW_FORMAT_DATA, goal: 'STAY_HEALTHY', weightGoalKg: null }, 'user-1', deps as any)
      const call = deps.planRepo.upsertNutrition.mock.calls[0][1]
      expect(call.kcalAdjustment).toBe(0)
    })
  })

  describe('legacy format — backward compat', () => {
    it('retorna isB2B: false y planId: null', async () => {
      const deps = makeDeps(false)
      const result = await completeOnboardingUseCase(LEGACY_FORMAT_DATA, 'user-1', deps as any)
      expect(result).toEqual({ isB2B: false, planId: null })
    })

    it('GYM + MUSCLE_GAIN → sport STRENGTH, goal STRENGTH_TRAINING', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(LEGACY_FORMAT_DATA, 'user-1', deps as any)
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.type).toBe('STRENGTH')
      expect(callArg.sport.goal).toBe('STRENGTH_TRAINING')
    })

    it('legacy gymGoal MUSCLE_GAIN → kcalAdjustment 300', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(LEGACY_FORMAT_DATA, 'user-1', deps as any)
      const call = deps.planRepo.upsertNutrition.mock.calls[0][1]
      expect(call.kcalAdjustment).toBe(300)
    })

    it('legacy gymGoal FAT_LOSS → kcalAdjustment -500', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase({ ...LEGACY_FORMAT_DATA, gymGoal: 'FAT_LOSS' }, 'user-1', deps as any)
      const call = deps.planRepo.upsertNutrition.mock.calls[0][1]
      expect(call.kcalAdjustment).toBe(-500)
    })
  })

  describe('atleta B2B (con coach)', () => {
    it('retorna isB2B: true y planId: null', async () => {
      const deps = makeDeps(true)
      const result = await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-2', deps as any)
      expect(result).toEqual({ isB2B: true, planId: null })
    })

    it('checkIsB2B filtra por status ACTIVE', async () => {
      const deps = makeDeps(true)
      await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-2', deps as any)
      expect(deps.db.coachAthlete.findFirst).toHaveBeenCalledWith({
        where: { athleteId: 'user-2', status: 'ACTIVE' },
      })
    })

    it('relación inactiva → isB2B: false', async () => {
      const deps = makeDeps(false) // findFirst returns null (no ACTIVE relation)
      const result = await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-2', deps as any)
      expect(result.isB2B).toBe(false)
    })

    it('NO activa features — el coach las activa despues', async () => {
      const deps = makeDeps(true)
      await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-2', deps as any)
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.features).toBeUndefined()
    })

    it('crea WeeklyRoutine con daysPerWeek (el coach necesita esta info)', async () => {
      const deps = makeDeps(true)
      await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-2', deps as any)
      expect(deps.mockTx.weeklyRoutine.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-2' },
          update: { daysPerWeek: 4 },
          create: expect.objectContaining({ userId: 'user-2', daysPerWeek: 4 }),
        })
      )
    })
  })

  describe('idempotencia — re-submit no sobrescribe', () => {
    it('retorna early si onboardingCompleted ya es true', async () => {
      const deps = makeDeps(false, true)
      const result = await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-1', deps as any)

      expect(result).toEqual({ isB2B: false, planId: null })
      expect(deps.db.$transaction).not.toHaveBeenCalled()
      expect(deps.planRepo.upsertNutrition).not.toHaveBeenCalled()
      expect(deps.healthProfileRepo.upsertProfile).not.toHaveBeenCalled()
      expect(deps.userRepo.completeOnboarding).not.toHaveBeenCalled()
    })

    it('B2B re-submit tampoco sobrescribe', async () => {
      const deps = makeDeps(true, true)
      const result = await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-2', deps as any)

      expect(result.isB2B).toBe(true)
      expect(deps.db.$transaction).not.toHaveBeenCalled()
    })

    it('primera vez (onboardingCompleted=false) sí ejecuta todo', async () => {
      const deps = makeDeps(false, false)
      await completeOnboardingUseCase(NEW_FORMAT_DATA, 'user-1', deps as any)

      expect(deps.db.$transaction).toHaveBeenCalledTimes(1)
      expect(deps.planRepo.upsertNutrition).toHaveBeenCalled()
      expect(deps.userRepo.completeOnboarding).toHaveBeenCalled()
    })
  })
})
