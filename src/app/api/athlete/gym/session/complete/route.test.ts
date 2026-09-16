import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/push/expo_push', () => ({ sendPushNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/infrastructure/db/auto_complete_strength', () => ({
  autoCompleteStrengthSession: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/infrastructure/db/notification', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    gymSession: { create: vi.fn(), findFirst: vi.fn() },
    assignedWorkout: { findFirst: vi.fn() },
    plannedSession: { findFirst: vi.fn() },
    workoutExercise: { findMany: vi.fn(), update: vi.fn() },
    setLog: { findMany: vi.fn() },
    coachAthlete: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { POST } from './route'

const ATHLETE = { id: 'a1', email: 'test@test.com', name: 'Test', role: 'ATHLETE' }

function postReq(body: object) {
  return new NextRequest(new URL('/api/athlete/gym/session/complete', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: ATHLETE } as any)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ featureGym: true, name: 'Test' } as any)
  vi.mocked(prisma.workoutExercise.findMany).mockResolvedValue([])
  vi.mocked(prisma.setLog.findMany).mockResolvedValue([])
  vi.mocked(prisma.gymSession.create).mockResolvedValue({ id: 'gs1' } as any)
  vi.mocked(prisma.gymSession.findFirst).mockResolvedValue(null)
})

describe('POST /api/athlete/gym/session/complete', () => {
  it('retorna 401 sin usuario autenticado', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(postReq({ dayOfWeek: 1 }))
    expect(res.status).toBe(401)
  })

  it('retorna 403 sin feature gym', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ featureGym: false, name: 'Test' } as any)
    const res = await POST(postReq({ dayOfWeek: 1 }))
    expect(res.status).toBe(403)
  })

  it('valida energyState y discomfort en el schema', async () => {
    const res = await POST(postReq({
      dayOfWeek: 1,
      energyState: 'INVALID',
    }))
    expect(res.status).toBe(400)
  })

  it('acepta energyState y discomfort validos en sesion libre', async () => {
    const res = await POST(postReq({
      dayOfWeek: 3,
      rpe: 7,
      durationMin: 45,
      energyState: 'EXHAUSTED',
      discomfort: 'MILD',
      sets: [],
    }))

    expect(res.status).toBe(201)
    expect(prisma.gymSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          energyState: 'EXHAUSTED',
          discomfort: 'MILD',
        }),
      })
    )
  })

  it('persiste energyState null cuando no se envía', async () => {
    const res = await POST(postReq({
      dayOfWeek: 3,
      rpe: 7,
      sets: [],
    }))

    expect(res.status).toBe(201)
    expect(prisma.gymSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          energyState: null,
          discomfort: null,
        }),
      })
    )
  })

  it('persiste energyState en sesion con assignedWorkout', async () => {
    vi.mocked(prisma.assignedWorkout.findFirst).mockResolvedValue({ id: 'aw1' } as any)

    const res = await POST(postReq({
      assignedWorkoutId: 'aw1',
      dayOfWeek: 1,
      rpe: 8,
      energyState: 'ENERGIZED',
      discomfort: 'NONE',
      sets: [],
    }))

    expect(res.status).toBe(201)
    expect(prisma.gymSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          energyState: 'ENERGIZED',
          discomfort: 'NONE',
          assignedWorkoutId: 'aw1',
        }),
      })
    )
  })

  it('persiste energyState en sesion con plannedSession', async () => {
    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({ id: 'ps1' } as any)

    const res = await POST(postReq({
      plannedSessionId: 'ps1',
      dayOfWeek: 2,
      rpe: 6,
      energyState: 'NORMAL',
      discomfort: 'MODERATE',
      sets: [],
    }))

    expect(res.status).toBe(201)
    expect(prisma.gymSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          energyState: 'NORMAL',
          discomfort: 'MODERATE',
          plannedSessionId: 'ps1',
        }),
      })
    )
  })

  it('retorna newPRs vacío en sesion libre sin sets', async () => {
    const res = await POST(postReq({
      dayOfWeek: 1,
      sets: [],
    }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.newPRs).toEqual([])
    expect(body.sessionId).toBe('gs1')
  })
})
