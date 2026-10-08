import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWeekSessions } from './get_week_sessions.use_case'

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/core/date_utils', () => ({
  jsToOurDow: vi.fn((d: number) => (d === 0 ? 7 : d)),
  MONTHS: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
  getWeekMonday: vi.fn(() => new Date('2026-01-05T00:00:00.000Z')),
  todayDowInTz: vi.fn(() => 1), // Monday
}))

vi.mock('@/lib/core/week_number', () => ({
  getPlanWeekNumber: vi.fn(() => 1),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockDb(overrides: {
  planMeta?: unknown
  selectedWeek?: unknown
  assignedWorkout?: unknown
  gymSessions?: unknown[]
  sessionLogs?: unknown[]
} = {}) {
  const db = {
    trainingPlan: {
      findFirst: vi.fn().mockResolvedValue(overrides.planMeta ?? null),
    },
    planWeek: {
      findFirst: vi.fn().mockResolvedValue(overrides.selectedWeek ?? null),
    },
    assignedWorkout: {
      findFirst: vi.fn().mockResolvedValue(overrides.assignedWorkout ?? null),
    },
    gymSession: {
      findMany: vi.fn().mockResolvedValue(overrides.gymSessions ?? []),
    },
    sessionLog: {
      findMany: vi.fn().mockResolvedValue(overrides.sessionLogs ?? []),
    },
  }
  return db as unknown as import('../../generated/prisma/client').PrismaClient
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('getWeekSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve 7 slots vacios sin plan y sin gym', async () => {
    const db = createMockDb()

    const result = await getWeekSessions({ userId: 'u1', weekOffset: 0 }, db)

    expect(result.weekSessions).toHaveLength(7)
    expect(result.totalTraining).toBe(0)
    expect(result.completedCount).toBe(0)
    expect(result.isCurrentWeek).toBe(true)
    result.weekSessions.forEach((slot, i) => {
      expect(slot.dayIndex).toBe(i)
      expect(slot.done).toBe(false)
    })
  })

  it('marca isToday correctamente en weekOffset=0', async () => {
    const db = createMockDb()

    const result = await getWeekSessions({ userId: 'u1', weekOffset: 0 }, db)

    // todayDowInTz mocked to return 1 (Monday) -> isToday at index 0
    expect(result.weekSessions[0].isToday).toBe(true)
    expect(result.weekSessions[1].isToday).toBe(false)
  })

  it('llena sesiones planificadas correctamente con plan activo', async () => {
    const db = createMockDb({
      planMeta: { id: 'plan-1', startDate: new Date('2026-01-05'), totalWeeks: 12 },
      selectedWeek: {
        startDate: new Date('2026-01-05'),
        endDate: new Date('2026-01-11'),
        sessions: [
          { id: 's1', type: 'EASY_RUN', dayOfWeek: 1, durationMin: 30, zoneTarget: '2', log: null },
          { id: 's2', type: 'INTERVALS', dayOfWeek: 3, durationMin: 45, zoneTarget: '4', log: { id: 'log-1' } },
          { id: 's3', type: 'LONG_RUN', dayOfWeek: 6, durationMin: 90, zoneTarget: '2', log: null },
        ],
      },
    })

    const result = await getWeekSessions({ userId: 'u1', weekOffset: 0 }, db)

    expect(result.totalTraining).toBe(3)
    expect(result.completedCount).toBe(1) // solo s2 tiene log

    // Monday (dayOfWeek=1 -> index 0)
    expect(result.weekSessions[0].type).toBe('EASY_RUN')
    expect(result.weekSessions[0].done).toBe(false)
    expect(result.weekSessions[0].id).toBe('s1')

    // Wednesday (dayOfWeek=3 -> index 2)
    expect(result.weekSessions[2].type).toBe('INTERVALS')
    expect(result.weekSessions[2].done).toBe(true)

    // Saturday (dayOfWeek=6 -> index 5)
    expect(result.weekSessions[5].type).toBe('LONG_RUN')
    expect(result.weekSessions[5].done).toBe(false)

    // Empty slot
    expect(result.weekSessions[1].type).toBeNull()
  })

  it('genera weekLabel a partir de las fechas de la semana', async () => {
    const db = createMockDb({
      planMeta: { id: 'plan-1', startDate: new Date('2026-01-05'), totalWeeks: 12 },
      selectedWeek: {
        startDate: new Date('2026-01-05'),
        endDate: new Date('2026-01-11'),
        sessions: [],
      },
    })

    const result = await getWeekSessions({ userId: 'u1', weekOffset: 0 }, db)

    // formatWeekLabel uses getDate() which depends on local TZ — just verify format
    expect(result.weekLabel).toMatch(/^\d{1,2}–\d{1,2} ene$/)
  })

  it('overlay gym sessions sobre slots vacios', async () => {
    const db = createMockDb({
      assignedWorkout: {
        template: {
          days: [
            { dayOfWeek: 2, isRestDay: false, label: 'Pecho y biceps' },
            { dayOfWeek: 4, isRestDay: false, label: 'Pierna' },
          ],
        },
      },
      gymSessions: [
        { dayOfWeek: 2, date: new Date('2026-01-06'), completed: true, durationMin: 55 },
      ],
    })

    const result = await getWeekSessions({ userId: 'u1', weekOffset: 0 }, db)

    // dayOfWeek 2 -> index 1 (Tuesday)
    expect(result.weekSessions[1].type).toBe('FUERZA')
    expect(result.weekSessions[1].done).toBe(true)
    expect(result.weekSessions[1].gymLabel).toBe('Pecho y biceps')
    expect(result.weekSessions[1].durationMin).toBe(55)

    // dayOfWeek 4 -> index 3 (Thursday) — not completed
    expect(result.weekSessions[3].type).toBe('FUERZA')
    expect(result.weekSessions[3].done).toBe(false)
    expect(result.weekSessions[3].gymLabel).toBe('Pierna')

    expect(result.totalTraining).toBe(2)
    expect(result.completedCount).toBe(1)
  })

  it('isCurrentWeek es false cuando weekOffset != 0', async () => {
    const db = createMockDb()

    const result = await getWeekSessions({ userId: 'u1', weekOffset: -1 }, db)

    expect(result.isCurrentWeek).toBe(false)
    expect(result.weekOffset).toBe(-1)
  })
})
