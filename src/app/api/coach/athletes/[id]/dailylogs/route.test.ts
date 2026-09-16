import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    coachAthlete: { findUnique: vi.fn() },
    dailyLog: { findMany: vi.fn() },
    user: { findUnique: vi.fn().mockResolvedValue({ timezone: 'America/Bogota' }) },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const COACH_SESSION = {
  user: { id: 'coach-1', role: 'COACH' },
}

function makeReq() {
  return new NextRequest('http://localhost/api/coach/athletes/athlete-1/dailylogs')
}

function makeParams(id = 'athlete-1') {
  return Promise.resolve({ id })
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/coach/athletes/[id]/dailylogs', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET(makeReq(), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 401 si rol no es COACH', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'ATHLETE' } } as any)
    const res = await GET(makeReq(), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 404 si el coach no tiene relación con el atleta', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findUnique).mockResolvedValue(null)
    const res = await GET(makeReq(), { params: makeParams() })
    expect(res.status).toBe(404)
  })

  it('retorna logs de los últimos 7 días del atleta', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findUnique).mockResolvedValue({ id: 'rel-1' } as any)
    const logs = [
      { date: '2026-07-07T00:00:00.000Z', weightKg: 70, energyLevel: 8, hrResting: 55, sleepHours: 7.5 },
    ]
    vi.mocked(prisma.dailyLog.findMany).mockResolvedValue(logs as any)

    const res = await GET(makeReq(), { params: makeParams() })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.logs).toEqual(logs)
    expect(prisma.dailyLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'athlete-1' }) })
    )
  })

  it('verifica ownership: coachId del query usa el id del coach autenticado', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findUnique).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.dailyLog.findMany).mockResolvedValue([])

    await GET(makeReq(), { params: makeParams() })

    expect(prisma.coachAthlete.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { coachId_athleteId: { coachId: 'coach-1', athleteId: 'athlete-1' } },
      })
    )
  })
})
