import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCheckInStatus } from './get_check_in_status.use_case'

vi.mock('@/lib/core/week_number', () => ({
  getPlanWeekNumber: vi.fn().mockReturnValue(1),
  getCurrentISOWeek: vi.fn().mockReturnValue(1),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    trainingPlan: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    weeklyCheckIn: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    checkInSuggestion: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    healthProfile: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCheckInStatus — sin plan activo', () => {
  it('retorna ISO week actual, submitted false, weekSessions vacio', async () => {
    const prisma = makePrisma()
    const result = await getCheckInStatus('user-1', prisma as any)

    expect(result.submitted).toBe(false)
    expect(result.totalWeeks).toBeNull()
    expect(result.weekSessions).toEqual([])
    // ISO week siempre es un entero >= 1
    expect(result.weekNumber).toBeGreaterThanOrEqual(1)
    expect(result.weekNumber).toBeLessThanOrEqual(53)
  })

  it('retorna hasAutoData false cuando no hay healthProfile', async () => {
    const prisma = makePrisma()
    const result = await getCheckInStatus('user-1', prisma as any)
    expect(result.hasAutoData).toBe(false)
  })

  it('retorna pendingSuggestions vacio cuando no hay sugerencias', async () => {
    const prisma = makePrisma()
    const result = await getCheckInStatus('user-1', prisma as any)
    expect(result.pendingSuggestions).toHaveLength(0)
  })
})

describe('getCheckInStatus — con plan activo y check-in ya hecho', () => {
  it('retorna submitted true con los datos del check-in', async () => {
    const existingCheckIn = {
      id: 'ci-1',
      weightKg: 70,
      hrResting: 55,
      sleepHours: 8,
      sleepScore: null,
      energyLevel: 7,
      stressLevel: 3,
      motivationLevel: 8,
      hardestSessionRpe: 6,
      painLevel: null,
      notes: 'Todo bien',
      recordedAt: new Date('2026-01-10'),
    }

    const activePlan = {
      startDate: new Date('2026-01-01'),
      totalWeeks: 12,
      weeks: [
        {
          weekNumber: 1,
          sessions: [
            { dayOfWeek: 2, type: 'RODAJE_Z2', log: { id: 'log-1' } },
            { dayOfWeek: 4, type: 'FARTLEK', log: null },
          ],
        },
      ],
    }

    const prisma = makePrisma({
      trainingPlan: { findFirst: vi.fn().mockResolvedValue(activePlan) },
      weeklyCheckIn: { findFirst: vi.fn().mockResolvedValue(existingCheckIn) },
    })

    const result = await getCheckInStatus('user-1', prisma as any)

    expect(result.submitted).toBe(true)
    expect(result.data).toEqual(existingCheckIn)
    expect(result.totalWeeks).toBe(12)
  })

  it('retorna weekSessions con completed correcto (excluye DESCANSO)', async () => {
    const activePlan = {
      startDate: new Date('2026-01-01'),
      totalWeeks: 4,
      weeks: [
        {
          weekNumber: 1,
          sessions: [
            { dayOfWeek: 1, type: 'FUERZA', log: { id: 'log-1' } },
            { dayOfWeek: 3, type: 'DESCANSO', log: null },       // debe excluirse
            { dayOfWeek: 5, type: 'RODAJE_Z2', log: null },
          ],
        },
      ],
    }

    const prisma = makePrisma({
      trainingPlan: { findFirst: vi.fn().mockResolvedValue(activePlan) },
    })

    const result = await getCheckInStatus('user-1', prisma as any)

    // DESCANSO excluido -> solo 2 sesiones
    expect(result.weekSessions).toHaveLength(2)
    expect(result.weekSessions.find(s => s.dayOfWeek === 1)?.completed).toBe(true)
    expect(result.weekSessions.find(s => s.dayOfWeek === 5)?.completed).toBe(false)
    expect(result.weekSessions.find(s => s.dayOfWeek === 3)).toBeUndefined()
  })
})

describe('getCheckInStatus — sugerencias pendientes', () => {
  it('retorna el count correcto de sugerencias pendientes', async () => {
    const suggestions = [
      { id: 'sg-1', type: 'INTENSITY_DOWN', title: 'Bajar intensidad', description: 'Descansa', expiresAt: FUTURE_DATE },
      { id: 'sg-2', type: 'ADD_REST', title: 'Dia de descanso', description: 'Recuperate', expiresAt: FUTURE_DATE },
    ]

    const prisma = makePrisma({
      checkInSuggestion: { findMany: vi.fn().mockResolvedValue(suggestions) },
    })

    const result = await getCheckInStatus('user-1', prisma as any)

    expect(result.pendingSuggestions).toHaveLength(2)
    expect(result.pendingSuggestions[0].id).toBe('sg-1')
    expect(result.pendingSuggestions[1].type).toBe('ADD_REST')
  })
})

describe('getCheckInStatus — hasAutoData', () => {
  it('es true cuando healthProfile tiene weightKg', async () => {
    const prisma = makePrisma({
      healthProfile: { findUnique: vi.fn().mockResolvedValue({ weightKg: 72, hrResting: null }) },
    })
    const result = await getCheckInStatus('user-1', prisma as any)
    expect(result.hasAutoData).toBe(true)
  })

  it('es true cuando healthProfile tiene hrResting', async () => {
    const prisma = makePrisma({
      healthProfile: { findUnique: vi.fn().mockResolvedValue({ weightKg: null, hrResting: 58 }) },
    })
    const result = await getCheckInStatus('user-1', prisma as any)
    expect(result.hasAutoData).toBe(true)
  })

  it('es false cuando ambos campos son null', async () => {
    const prisma = makePrisma({
      healthProfile: { findUnique: vi.fn().mockResolvedValue({ weightKg: null, hrResting: null }) },
    })
    const result = await getCheckInStatus('user-1', prisma as any)
    expect(result.hasAutoData).toBe(false)
  })
})
