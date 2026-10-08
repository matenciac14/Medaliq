/**
 * PERSIST-06: catch P2002 en sessionLog.create → idempotencia (409 en doble submit).
 * PERSIST-06: si ya existe un log para la sesión planificada, devolver 200 alreadyLogged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    plannedSession: { findFirst: vi.fn() },
    sessionLog: { findUnique: vi.fn(), create: vi.fn() },
    coachAthlete: { findFirst: vi.fn().mockResolvedValue(null) },
    pendingNutritionAdjustment: { findUnique: vi.fn() },
    nutritionPlan: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/rate_limit', () => ({
  rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}))
vi.mock('@/lib/push/expo_push', () => ({ sendPushNotification: vi.fn() }))
vi.mock('@/domain/nutrition/calculate_nutrition_adjustment', () => ({
  calcNutritionAdjustment: vi.fn().mockReturnValue(null),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { POST } from './route'

const SESSION = { user: { id: 'user-1', features: { log: true } } }
const VALID_SESSION_ID = 'planned-session-1'

function postReq(body: object) {
  return new NextRequest(new URL('/api/athlete/log/session', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe('POST /api/athlete/log/session — PERSIST-06', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(postReq({ plannedSessionId: VALID_SESSION_ID }))
    expect(res.status).toBe(401)
  })

  it('retorna 200 con alreadyLogged si ya existe un sessionLog para esa sesión', async () => {
    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({ id: VALID_SESSION_ID, intensity: 'HIGH' } as any)
    vi.mocked(prisma.sessionLog.findUnique).mockResolvedValue({ id: 'existing-log' } as any)

    const res = await POST(postReq({ plannedSessionId: VALID_SESSION_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alreadyLogged).toBe(true)
    expect(prisma.sessionLog.create).not.toHaveBeenCalled()
  })

  it('retorna 200 con alreadyLogged si create lanza P2002 (doble submit concurrente)', async () => {
    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({ id: VALID_SESSION_ID, intensity: 'MODERATE' } as any)
    vi.mocked(prisma.sessionLog.findUnique).mockResolvedValue(null) // no existe aún
    const p2002Error = Object.assign(new Error('Unique constraint'), { code: 'P2002' })
    vi.mocked(prisma.sessionLog.create).mockRejectedValue(p2002Error)

    const res = await POST(postReq({ plannedSessionId: VALID_SESSION_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alreadyLogged).toBe(true)
  })

  it('relanza errores que no son P2002', async () => {
    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({ id: VALID_SESSION_ID, intensity: 'LOW' } as any)
    vi.mocked(prisma.sessionLog.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.sessionLog.create).mockRejectedValue(new Error('Connection refused'))

    await expect(POST(postReq({ plannedSessionId: VALID_SESSION_ID }))).rejects.toThrow('Connection refused')
  })

  it('retorna 200 con id en registro exitoso', async () => {
    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({ id: VALID_SESSION_ID, intensity: 'HIGH' } as any)
    vi.mocked(prisma.sessionLog.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.sessionLog.create).mockResolvedValue({ id: 'new-log' } as any)

    const res = await POST(postReq({ plannedSessionId: VALID_SESSION_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.id).toBe('new-log')
  })
})
