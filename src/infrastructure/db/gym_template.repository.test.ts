import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCoachRoutines } from './gym_template.repository'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEMPLATE_A = {
  id: 'tpl-1',
  coachId: 'coach-1',
  createdAt: new Date('2026-06-10'),
  days: [],
  assignments: [{ id: 'asgn-1', athleteId: 'athlete-1' }],
}

const TEMPLATE_B = {
  id: 'tpl-2',
  coachId: 'coach-1',
  createdAt: new Date('2026-06-01'),
  days: [],
  assignments: [],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCoachRoutines', () => {
  it('llama findMany con coachId correcto y retorna templates', async () => {
    const mockDb = {
      workoutTemplate: {
        findMany: vi.fn().mockResolvedValue([TEMPLATE_A, TEMPLATE_B]),
      },
    }

    const result = await getCoachRoutines('coach-1', mockDb as any)

    expect(mockDb.workoutTemplate.findMany).toHaveBeenCalledOnce()
    expect(mockDb.workoutTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { coachId: 'coach-1' } })
    )
    expect(result).toHaveLength(2)
  })

  it('ordena por createdAt desc (más reciente primero)', async () => {
    const mockDb = {
      workoutTemplate: {
        findMany: vi.fn().mockResolvedValue([TEMPLATE_A, TEMPLATE_B]),
      },
    }

    await getCoachRoutines('coach-1', mockDb as any)

    const call = mockDb.workoutTemplate.findMany.mock.calls[0][0]
    expect(call.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('filtra assignments con isActive: true', async () => {
    const mockDb = {
      workoutTemplate: {
        findMany: vi.fn().mockResolvedValue([TEMPLATE_A]),
      },
    }

    await getCoachRoutines('coach-1', mockDb as any)

    const call = mockDb.workoutTemplate.findMany.mock.calls[0][0]
    expect(call.include.assignments.where).toEqual({ isActive: true })
  })

  it('limita a 100 resultados', async () => {
    const mockDb = {
      workoutTemplate: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    }

    await getCoachRoutines('coach-1', mockDb as any)

    const call = mockDb.workoutTemplate.findMany.mock.calls[0][0]
    expect(call.take).toBe(100)
  })

  it('retorna lista vacia cuando el coach no tiene templates', async () => {
    const mockDb = {
      workoutTemplate: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    }

    const result = await getCoachRoutines('coach-sin-templates', mockDb as any)
    expect(result).toEqual([])
  })

  it('incluye days con exercises y exercise anidado', async () => {
    const mockDb = {
      workoutTemplate: {
        findMany: vi.fn().mockResolvedValue([TEMPLATE_A]),
      },
    }

    await getCoachRoutines('coach-1', mockDb as any)

    const call = mockDb.workoutTemplate.findMany.mock.calls[0][0]
    expect(call.include.days.include.exercises.include).toEqual({ exercise: true })
    expect(call.include.days.orderBy).toEqual({ order: 'asc' })
  })
})
