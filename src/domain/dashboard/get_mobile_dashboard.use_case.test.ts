import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMobileDashboard } from './get_mobile_dashboard.use_case'

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/core/week_number', () => ({
  getPlanWeekNumber: vi.fn(() => 1),
}))

vi.mock('@/lib/core/date_utils', () => ({
  todayDowInTz: vi.fn(() => 3), // Wednesday
}))

vi.mock('@/domain/plan/formulas', () => ({
  calculateHRZones: vi.fn(() => ({ z1: { min: 100, max: 120 }, z2: { min: 120, max: 140 } })),
}))

const mockSummary = {
  planState: 'NO_PLAN' as const,
  weekSessions: [],
  completedCount: 0,
  totalTraining: 0,
  weekLabel: null,
  todaySession: null,
  hasPlan: false,
  hasEverLogged: false,
  streakDays: 0,
  userName: 'Test',
  recentActivity: [],
  athleteGoal: null,
  planName: null,
  weekProgress: null,
  nutritionSummary: null,
}

vi.mock('@/domain/dashboard/get_dashboard_summary.use_case', () => ({
  getDashboardSummary: vi.fn(() => ({
    summary: { ...mockSummary },
    planIdToComplete: null,
  })),
}))

const baseCoreData = {
  dbUser: {
    checkIns: [],
    profile: { hrMax: null, hrResting: null },
  },
  recentGymSessions: [],
  coachRelation: null,
  weeklyRoutine: null,
  nutritionPlan: null,
  assignedWorkout: null,
  pendingSuggestionsCount: 0,
  todayLog: null,
  todayFoodLogs: [],
  todayWaterLog: null,
}

vi.mock('@/infrastructure/db/dashboard_queries', () => ({
  fetchCoreDashboardData: vi.fn(async () => ({ ...baseCoreData })),
  buildDashboardSummaryInput: vi.fn(() => ({})),
  computeFoodTotals: vi.fn(() => ({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 })),
  computeMealSlotLogs: vi.fn(() => []),
  buildWaterData: vi.fn(() => ({ current: 0, target: 2000 })),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockDb(overrides: {
  planMeta?: unknown
  lastCompleted?: unknown
  currentWeek?: unknown
  recentlyCompleted?: unknown
} = {}) {
  const db = {
    trainingPlan: {
      findFirst: vi.fn()
        .mockResolvedValueOnce(overrides.planMeta ?? null)      // active plan
        .mockResolvedValueOnce(overrides.lastCompleted ?? null)  // last completed
        .mockResolvedValueOnce(overrides.recentlyCompleted ?? null), // recently completed (fallback)
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    planWeek: {
      findFirst: vi.fn().mockResolvedValue(overrides.currentWeek ?? null),
    },
    sessionLog: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { distanceKm: null } }),
    },
    plannedSession: {
      count: vi.fn().mockResolvedValue(0),
    },
  }
  return db as unknown as import('../../generated/prisma/client').PrismaClient
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('getMobileDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve shape esperado sin plan activo', async () => {
    const db = createMockDb()

    const result = await getMobileDashboard('user-1', 'America/Bogota', db)

    expect(result).toHaveProperty('weekSessions')
    expect(result).toHaveProperty('todaySession')
    expect(result).toHaveProperty('isB2B', false)
    expect(result).toHaveProperty('coach', null)
    expect(result).toHaveProperty('todayFoodTotals')
    expect(result).toHaveProperty('waterData')
    expect(result).toHaveProperty('mealSlotLogs')
    expect(result).toHaveProperty('checkInData', null)
    expect(result).toHaveProperty('hrZones', null)
    expect(result).toHaveProperty('justCompletedPlan', null)
    expect(result).toHaveProperty('workoutName', null)
    expect(result).toHaveProperty('pendingSuggestionsCount', 0)
  })

  it('devuelve hrZones cuando el atleta tiene hrMax', async () => {
    const { fetchCoreDashboardData } = await import('@/infrastructure/db/dashboard_queries')
    ;(fetchCoreDashboardData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...baseCoreData,
      dbUser: {
        checkIns: [],
        profile: { hrMax: 190, hrResting: 60 },
      },
    })

    const db = createMockDb()
    const result = await getMobileDashboard('user-1', undefined, db)

    expect(result.hrZones).toEqual({ z1: { min: 100, max: 120 }, z2: { min: 120, max: 140 } })
  })

  it('devuelve coach info cuando el atleta es B2B', async () => {
    const { fetchCoreDashboardData } = await import('@/infrastructure/db/dashboard_queries')
    ;(fetchCoreDashboardData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...baseCoreData,
      coachRelation: {
        coach: {
          name: 'Coach Pedro',
          coachProfile: { headline: 'Running coach' },
        },
      },
    })

    const db = createMockDb()
    const result = await getMobileDashboard('user-1', undefined, db)

    expect(result.isB2B).toBe(true)
    expect(result.coach).toEqual({
      name: 'Coach Pedro',
      headline: 'Running coach',
      initial: 'C',
    })
  })

  it('devuelve checkInData cuando hay check-in reciente', async () => {
    const recordedAt = new Date('2026-01-05T10:00:00Z')
    const { fetchCoreDashboardData } = await import('@/infrastructure/db/dashboard_queries')
    ;(fetchCoreDashboardData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...baseCoreData,
      dbUser: {
        checkIns: [{
          energyLevel: 4,
          sleepHours: 7,
          stressLevel: 3,
          motivationLevel: 5,
          recordedAt,
        }],
        profile: { hrMax: null, hrResting: null },
      },
    })

    const db = createMockDb()
    const result = await getMobileDashboard('user-1', undefined, db)

    expect(result.checkInData).toEqual({
      energyLevel: 4,
      sleepHours: 7,
      stressLevel: 3,
      motivationLevel: 5,
      recordedAt: recordedAt.toISOString(),
    })
  })

  it('busca plan activo en la DB', async () => {
    const db = createMockDb({
      planMeta: {
        id: 'plan-1',
        name: 'Mi plan 5K',
        startDate: new Date('2026-01-05'),
        endDate: new Date('2026-03-29'),
        totalWeeks: 12,
      },
      currentWeek: {
        weekNumber: 1,
        phase: 'BASE',
        sessions: [
          {
            id: 's1', dayOfWeek: 1, type: 'EASY_RUN', durationMin: 30,
            zoneTarget: '2', detailText: null, coachNote: null, intensity: 'LOW',
            log: null,
          },
        ],
      },
    })

    const result = await getMobileDashboard('user-1', undefined, db)

    // Should have queried for active plan
    expect(db.trainingPlan.findFirst).toHaveBeenCalled()
    expect(db.planWeek.findFirst).toHaveBeenCalled()
    // Result should exist (shape validated by first test)
    expect(result).toBeDefined()
  })

  it('redondea macros de todayFoodTotals a 1 decimal', async () => {
    const { computeFoodTotals } = await import('@/infrastructure/db/dashboard_queries')
    ;(computeFoodTotals as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      kcal: 1500, proteinG: 123.456, carbsG: 200.789, fatG: 55.1234,
    })

    const db = createMockDb()
    const result = await getMobileDashboard('user-1', undefined, db)

    expect(result.todayFoodTotals.proteinG).toBe(123.5)
    expect(result.todayFoodTotals.carbsG).toBe(200.8)
    expect(result.todayFoodTotals.fatG).toBe(55.1)
  })
})
