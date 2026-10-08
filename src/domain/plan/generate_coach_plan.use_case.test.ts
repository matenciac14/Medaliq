import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCoachPlanUseCase, generateCoachPlanSchema } from './generate_coach_plan.use_case'

// ── Mocks de infraestructura ──────────────────────────────────────────────────

vi.mock('@/domain/plan/generate_plan.use_case', () => ({
  generatePlanUseCase: vi.fn().mockResolvedValue({ planId: 'plan-generated-1' }),
}))

vi.mock('@/infrastructure/db/plan.repository', () => ({
  PrismaPlanRepository: vi.fn(),
}))

vi.mock('@/infrastructure/db/user.repository', () => ({
  PrismaUserRepository: vi.fn(),
}))

import { generatePlanUseCase } from '@/domain/plan/generate_plan.use_case'

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_PROFILE = {
  age: 28,
  heightCm: 175,
  weightKg: 70,
  gender: 'male',
  hrResting: 55,
  hrMax: 185,
  injuries: [],
  conditions: [],
  weightGoalKg: null,
}

function makeDb(overrides: Record<string, unknown> = {}) {
  return {
    coachAthlete: {
      findFirst: vi.fn().mockResolvedValue({ id: 'ca-1', coachId: 'coach-1', athleteId: 'athlete-1', status: 'ACTIVE' }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'athlete-1', profile: BASE_PROFILE }),
    },
    performanceBenchmark: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateCoachPlanSchema — validaciones', () => {
  it('goalType invalido → Zod parse falla con issues', () => {
    const result = generateCoachPlanSchema.safeParse({
      coachId: 'coach-1',
      athleteId: 'athlete-1',
      goalType: 'GOAL_INEXISTENTE',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.any(Array))
    }
  })
})

describe('generateCoachPlanUseCase — permisos', () => {
  it('coach no vinculado al atleta → lanza { status: 404 }', async () => {
    const db = makeDb({
      coachAthlete: { findFirst: vi.fn().mockResolvedValue(null) },
    })

    await expect(
      generateCoachPlanUseCase(
        { coachId: 'coach-1', athleteId: 'athlete-1', goalType: 'RACE_10K' },
        db as any
      )
    ).rejects.toMatchObject({ status: 404 })
  })
})

describe('generateCoachPlanUseCase — datos del atleta', () => {
  it('atleta sin perfil fisico → lanza { status: 400 }', async () => {
    const db = makeDb({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'athlete-1', profile: null }) },
    })

    await expect(
      generateCoachPlanUseCase(
        { coachId: 'coach-1', athleteId: 'athlete-1', goalType: 'RACE_10K' },
        db as any
      )
    ).rejects.toMatchObject({ status: 400 })
  })

  it('atleta no encontrado (user es null) → lanza { status: 400 }', async () => {
    const db = makeDb({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    })

    await expect(
      generateCoachPlanUseCase(
        { coachId: 'coach-1', athleteId: 'athlete-1', goalType: 'RACE_10K' },
        db as any
      )
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('generateCoachPlanUseCase — flujo feliz', () => {
  it('llama generatePlanUseCase con userId = athleteId', async () => {
    const db = makeDb()
    await generateCoachPlanUseCase(
      { coachId: 'coach-1', athleteId: 'athlete-1', goalType: 'RACE_10K' },
      db as any
    )

    expect(generatePlanUseCase).toHaveBeenCalledOnce()
    const [planInput] = (generatePlanUseCase as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(planInput.userId).toBe('athlete-1')
    expect(planInput.goalType).toBe('RACE_10K')
    expect(planInput.generatedBy).toBe('COACH')
  })

  it('retorna { success: true, planId }', async () => {
    const db = makeDb()
    const result = await generateCoachPlanUseCase(
      { coachId: 'coach-1', athleteId: 'athlete-1', goalType: 'RACE_10K' },
      db as any
    )

    expect(result.success).toBe(true)
    expect(result.planId).toBe('plan-generated-1')
  })

  it('aplica defaults: daysPerWeek=4, hoursPerSession=1 cuando no se especifican', async () => {
    const db = makeDb()
    await generateCoachPlanUseCase(
      { coachId: 'coach-1', athleteId: 'athlete-1', goalType: 'RACE_5K' },
      db as any
    )

    const [planInput] = (generatePlanUseCase as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(planInput.daysPerWeek).toBe(4)
    expect(planInput.hoursPerSession).toBe(1)
  })

  it('respeta daysPerWeek y hoursPerSession cuando se especifican', async () => {
    const db = makeDb()
    await generateCoachPlanUseCase(
      { coachId: 'coach-1', athleteId: 'athlete-1', goalType: 'RACE_5K', daysPerWeek: 5, hoursPerSession: 1.5 },
      db as any
    )

    const [planInput] = (generatePlanUseCase as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(planInput.daysPerWeek).toBe(5)
    expect(planInput.hoursPerSession).toBe(1.5)
  })

  it('pasa recentBenchmark5KSecs cuando existe benchmark en los ultimos 90 dias', async () => {
    const db = makeDb({
      performanceBenchmark: {
        findFirst: vi.fn().mockResolvedValue({ value: 1500 }), // 25 min en segundos
      },
    })

    await generateCoachPlanUseCase(
      { coachId: 'coach-1', athleteId: 'athlete-1', goalType: 'RACE_5K' },
      db as any
    )

    const [planInput] = (generatePlanUseCase as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(planInput.recentBenchmark5KSecs).toBe(1500)
  })

  it('omite recentBenchmark5KSecs cuando no hay benchmark', async () => {
    const db = makeDb()
    await generateCoachPlanUseCase(
      { coachId: 'coach-1', athleteId: 'athlete-1', goalType: 'RACE_5K' },
      db as any
    )

    const [planInput] = (generatePlanUseCase as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(planInput.recentBenchmark5KSecs).toBeUndefined()
  })
})
