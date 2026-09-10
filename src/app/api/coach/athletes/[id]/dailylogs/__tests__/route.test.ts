import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    coachAthlete: {
      findUnique: vi.fn(),
    },
    dailyLog: {
      findMany: vi.fn(),
    },
    user: { findUnique: vi.fn().mockResolvedValue({ timezone: 'America/Bogota' }) },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { GET } from '../route'

const COACH_SESSION = { user: { id: 'coach-1', role: 'COACH' } }
const ATHLETE_SESSION = { user: { id: 'athlete-1', role: 'ATHLETE' } }

const MOCK_LOGS = [
  { date: new Date('2026-07-07'), weightKg: 72, energyLevel: 7, hrResting: 58, sleepHours: 8 },
  { date: new Date('2026-07-06'), weightKg: 71.8, energyLevel: 6, hrResting: null, sleepHours: 7.5 },
]

function makeReq(athleteId: string): NextRequest {
  return new NextRequest(`http://localhost/api/coach/athletes/${athleteId}/dailylogs`)
}

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/coach/athletes/[id]/dailylogs', () => {
  it('retorna 401 sin sesión o sin rol COACH', async () => {
    vi.mocked(auth).mockResolvedValue(ATHLETE_SESSION as any)
    const res = await GET(makeReq('athlete-1'), makeParams('athlete-1') as any)
    expect(res.status).toBe(401)
  })

  it('retorna 404 si el coach no tiene relación con el atleta', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findUnique).mockResolvedValue(null)

    const res = await GET(makeReq('athlete-x'), makeParams('athlete-x') as any)
    expect(res.status).toBe(404)
  })

  it('retorna logs de los últimos 7 días del atleta', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findUnique).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.dailyLog.findMany).mockResolvedValue(MOCK_LOGS as any)

    const res = await GET(makeReq('athlete-1'), makeParams('athlete-1') as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.logs).toHaveLength(2)
    expect(data.logs[0].weightKg).toBe(72)
  })

  it('filtra por athleteId y rango de fecha correcto', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findUnique).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.dailyLog.findMany).mockResolvedValue([])

    await GET(makeReq('athlete-1'), makeParams('athlete-1') as any)

    const callArgs = vi.mocked(prisma.dailyLog.findMany).mock.calls[0]?.[0]
    expect(callArgs?.where?.userId).toBe('athlete-1')
    const dateFilter = callArgs?.where?.date as { gte?: Date } | undefined
    expect(dateFilter?.gte).toBeInstanceOf(Date)
  })
})
