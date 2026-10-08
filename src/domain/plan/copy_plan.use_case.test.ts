import { describe, it, expect, vi, beforeEach } from 'vitest'
import { copyPlanUseCase } from './copy_plan.use_case'

// ── Mock date_utils ─────────────────────────────────────────────────────────

vi.mock('@/lib/core/date_utils', () => ({
  forceMonday: vi.fn((d: Date) => d),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

const SOURCE_PLAN = {
  id: 'source-plan-1',
  userId: 'source-athlete',
  name: 'Plan 5K',
  totalWeeks: 2,
  goalType: '5K',
  hrZones: { z1: 120, z2: 140 },
  weeks: [
    {
      weekNumber: 1,
      phase: 'BASE',
      focusDescription: 'Semana base',
      isRecoveryWeek: false,
      volumeKm: 20,
      sessions: [
        {
          dayOfWeek: 1, type: 'EASY_RUN', intensity: 'LOW', durationMin: 30,
          zoneTarget: '2', structure: 'Trote', detailText: 'Detalles', sportLabel: null, workoutDayId: null,
        },
        {
          dayOfWeek: 3, type: 'INTERVALS', intensity: 'HIGH', durationMin: 45,
          zoneTarget: '4', structure: null, detailText: null, sportLabel: null, workoutDayId: null,
        },
      ],
    },
    {
      weekNumber: 2,
      phase: 'DESARROLLO',
      focusDescription: 'Progresion',
      isRecoveryWeek: false,
      volumeKm: 25,
      sessions: [
        {
          dayOfWeek: 2, type: 'TEMPO', intensity: 'MODERATE', durationMin: 40,
          zoneTarget: '3', structure: null, detailText: null, sportLabel: null, workoutDayId: null,
        },
      ],
    },
  ],
}

function createMockDb() {
  const txProxy = {
    trainingPlan: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: 'new-plan-1' }),
    },
    planWeek: {
      create: vi.fn()
        .mockResolvedValueOnce({ id: 'nw1' })
        .mockResolvedValueOnce({ id: 'nw2' }),
    },
    plannedSession: {
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
  }

  const db = {
    coachAthlete: {
      findFirst: vi.fn(),
    },
    trainingPlan: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: typeof txProxy) => Promise<unknown>) => fn(txProxy)),
  }

  return { db: db as unknown as import('../../generated/prisma/client').PrismaClient, txProxy }
}

const BASE_INPUT = {
  coachId: 'coach-1',
  targetAthleteId: 'target-athlete',
  sourcePlanId: 'source-plan-1',
  startDate: '2026-02-02',
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('copyPlanUseCase', () => {
  let db: ReturnType<typeof createMockDb>['db']
  let txProxy: ReturnType<typeof createMockDb>['txProxy']

  beforeEach(() => {
    vi.clearAllMocks()
    const mock = createMockDb()
    db = mock.db
    txProxy = mock.txProxy
  })

  it('lanza 404 si no hay relacion coach-target athlete', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await expect(copyPlanUseCase(BASE_INPUT, db)).rejects.toEqual({
      status: 404,
      message: 'Atleta no encontrado.',
    })
  })

  it('lanza 404 si el plan de origen no existe', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rel-1' })
    ;(db.trainingPlan.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await expect(copyPlanUseCase(BASE_INPUT, db)).rejects.toEqual({
      status: 404,
      message: 'Plan de origen no encontrado.',
    })
  })

  it('lanza 403 si el coach no tiene acceso al plan de origen', async () => {
    // Primera llamada: target relation OK
    // Segunda llamada (source relation): null
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'rel-target' })
      .mockResolvedValueOnce(null)
    ;(db.trainingPlan.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(SOURCE_PLAN)

    await expect(copyPlanUseCase(BASE_INPUT, db)).rejects.toEqual({
      status: 403,
      message: 'No tienes acceso al plan de origen.',
    })
  })

  it('desactiva planes activos del target antes de copiar', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'rel-target' })
      .mockResolvedValueOnce({ id: 'rel-source' })
    ;(db.trainingPlan.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(SOURCE_PLAN)

    await copyPlanUseCase(BASE_INPUT, db)

    expect(txProxy.trainingPlan.updateMany).toHaveBeenCalledWith({
      where: { userId: 'target-athlete', status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    })
  })

  it('crea plan copiado con nombre + " (copia)"', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'rel-target' })
      .mockResolvedValueOnce({ id: 'rel-source' })
    ;(db.trainingPlan.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(SOURCE_PLAN)

    const result = await copyPlanUseCase(BASE_INPUT, db)

    expect(result.planId).toBe('new-plan-1')
    expect(txProxy.trainingPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'target-athlete',
          name: 'Plan 5K (copia)',
          totalWeeks: 2,
          status: 'ACTIVE',
          generatedBy: 'COACH',
        }),
      }),
    )
  })

  it('copia semanas y sesiones dentro de $transaction', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'rel-target' })
      .mockResolvedValueOnce({ id: 'rel-source' })
    ;(db.trainingPlan.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(SOURCE_PLAN)

    await copyPlanUseCase(BASE_INPUT, db)

    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(txProxy.planWeek.create).toHaveBeenCalledTimes(2)
    expect(txProxy.plannedSession.createMany).toHaveBeenCalledTimes(1)

    const sessionsData = txProxy.plannedSession.createMany.mock.calls[0][0].data
    expect(sessionsData).toHaveLength(3) // 2 from week 1 + 1 from week 2
  })
})
