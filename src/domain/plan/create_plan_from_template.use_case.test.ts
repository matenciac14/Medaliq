import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPlanFromTemplateUseCase } from './create_plan_from_template.use_case'

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/domain/plan/templates', () => ({
  getTemplate: vi.fn((id: string) => {
    if (id === 'valid-template') {
      return {
        goalType: '5K',
        totalWeeks: 2,
        weeks: [
          {
            weekNumber: 1,
            phase: 'BASE',
            volumeKm: 20,
            isRecoveryWeek: false,
            focusDescription: 'Semana base',
            sessions: [
              { dayOfWeek: 1, type: 'EASY_RUN', durationMin: 30, zoneTarget: '2', structure: 'Trote suave' },
              { dayOfWeek: 3, type: 'INTERVALS', durationMin: 45, zoneTarget: '4', structure: 'Intervalos' },
            ],
          },
          {
            weekNumber: 2,
            phase: 'BASE',
            volumeKm: 22,
            isRecoveryWeek: false,
            focusDescription: 'Progresion',
            sessions: [
              { dayOfWeek: 2, type: 'TEMPO', durationMin: 40, zoneTarget: '3', structure: 'Tempo run' },
            ],
          },
        ],
      }
    }
    return null
  }),
}))

vi.mock('@/domain/plan/intensity', () => ({
  getSessionIntensity: vi.fn(() => 'MODERATE'),
}))

vi.mock('@/domain/plan/custom_plan', () => ({
  calcPlanEndDate: vi.fn((start: Date, weeks: number) => {
    const end = new Date(start)
    end.setDate(end.getDate() + weeks * 7 - 1)
    return end
  }),
}))

vi.mock('@/lib/core/date_utils', () => ({
  forceMonday: vi.fn((d: Date) => d),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockDb() {
  const createdPlanId = 'plan-123'
  const createdWeeks = [
    { id: 'w1', weekNumber: 1, startDate: new Date('2026-01-05') },
    { id: 'w2', weekNumber: 2, startDate: new Date('2026-01-12') },
  ]

  const txProxy = {
    trainingPlan: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: createdPlanId }),
    },
    planWeek: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      findMany: vi.fn().mockResolvedValue(createdWeeks),
    },
    plannedSession: {
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
  }

  const db = {
    coachAthlete: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: typeof txProxy) => Promise<string>) => fn(txProxy)),
    trainingPlan: {
      findUnique: vi.fn().mockResolvedValue({
        id: createdPlanId,
        name: 'Mi plan',
        totalWeeks: 2,
        startDate: new Date('2026-01-05'),
        weeks: [
          {
            id: 'w1', weekNumber: 1, phase: 'BASE', focusDescription: 'Semana base',
            isRecoveryWeek: false, volumeKm: 20,
            startDate: new Date('2026-01-05'), endDate: new Date('2026-01-11'),
            sessions: [
              { id: 's1', dayOfWeek: 0, type: 'EASY_RUN', durationMin: 30, zoneTarget: '2', detailText: null, sportLabel: null, workoutDayId: null },
            ],
          },
        ],
      }),
    },
  }

  return { db: db as unknown as import('../../generated/prisma/client').PrismaClient, txProxy }
}

const BASE_INPUT = {
  coachId: 'coach-1',
  athleteId: 'athlete-1',
  templateId: 'valid-template',
  name: 'Mi plan',
  startDate: '2026-01-05',
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('createPlanFromTemplateUseCase', () => {
  let db: ReturnType<typeof createMockDb>['db']
  let txProxy: ReturnType<typeof createMockDb>['txProxy']

  beforeEach(() => {
    vi.clearAllMocks()
    const mock = createMockDb()
    db = mock.db
    txProxy = mock.txProxy
  })

  it('lanza error 404 si no hay relacion coach-atleta activa', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await expect(createPlanFromTemplateUseCase(BASE_INPUT, db)).rejects.toEqual({
      status: 404,
      message: 'Asesorado no encontrado.',
    })
  })

  it('lanza error 400 si templateId esta vacio', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rel-1' })

    await expect(
      createPlanFromTemplateUseCase({ ...BASE_INPUT, templateId: '' }, db),
    ).rejects.toEqual({ status: 400, message: 'templateId es requerido.' })
  })

  it('lanza error 400 si el template no existe', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rel-1' })

    await expect(
      createPlanFromTemplateUseCase({ ...BASE_INPUT, templateId: 'nonexistent' }, db),
    ).rejects.toEqual({ status: 400, message: 'Template no encontrado.' })
  })

  it('lanza error 400 si el nombre esta vacio', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rel-1' })

    await expect(
      createPlanFromTemplateUseCase({ ...BASE_INPUT, name: '   ' }, db),
    ).rejects.toEqual({ status: 400, message: 'El nombre del plan es requerido.' })
  })

  it('lanza error 400 si startDate es invalido', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rel-1' })

    await expect(
      createPlanFromTemplateUseCase({ ...BASE_INPUT, startDate: 'not-a-date' }, db),
    ).rejects.toEqual({ status: 400, message: 'startDate inválido.' })
  })

  it('desactiva planes activos existentes antes de crear uno nuevo', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rel-1' })

    await createPlanFromTemplateUseCase(BASE_INPUT, db)

    expect(txProxy.trainingPlan.updateMany).toHaveBeenCalledWith({
      where: { userId: 'athlete-1', status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    })
  })

  it('usa $transaction para atomicidad', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rel-1' })

    await createPlanFromTemplateUseCase(BASE_INPUT, db)

    expect(db.$transaction).toHaveBeenCalledTimes(1)
  })

  it('crea plan con estructura correcta desde el template', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rel-1' })

    const result = await createPlanFromTemplateUseCase(BASE_INPUT, db)

    expect(result.planId).toBe('plan-123')
    expect(result.plan).toBeDefined()
    expect(result.plan.name).toBe('Mi plan')
    expect(result.plan.totalWeeks).toBe(2)
    expect(txProxy.trainingPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'athlete-1',
          name: 'Mi plan',
          status: 'ACTIVE',
          generatedBy: 'COACH',
        }),
      }),
    )
  })

  it('crea weeks y sessions a partir del template', async () => {
    ;(db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rel-1' })

    await createPlanFromTemplateUseCase(BASE_INPUT, db)

    expect(txProxy.planWeek.createMany).toHaveBeenCalledTimes(1)
    const weeksData = txProxy.planWeek.createMany.mock.calls[0][0].data
    expect(weeksData).toHaveLength(2)
    expect(weeksData[0].weekNumber).toBe(1)
    expect(weeksData[1].weekNumber).toBe(2)

    expect(txProxy.plannedSession.createMany).toHaveBeenCalledTimes(1)
    const sessionsData = txProxy.plannedSession.createMany.mock.calls[0][0].data
    expect(sessionsData).toHaveLength(3) // 2 sessions week 1 + 1 session week 2
  })
})
