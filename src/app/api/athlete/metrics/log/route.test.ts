/**
 * POST /api/athlete/metrics/log — validación Zod + upsert de DailyLog
 * Contrato alineado con /api/mobile/metrics/log
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    dailyLog: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ weightKg: 75, energyLevel: null, hrResting: null, sleepHours: null, date: new Date() }),
    },
    user: { findUnique: vi.fn().mockResolvedValue({ timezone: 'America/Bogota' }) },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { POST } from './route'

const SESSION = { user: { id: 'user-1' } }

function postReq(body: object) {
  return new NextRequest(new URL('/api/athlete/metrics/log', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe('POST /api/athlete/metrics/log', () => {
  it('retorna 401 sin sesion', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(postReq({ weightKg: 75 }))
    expect(res.status).toBe(401)
  })

  it('retorna 400 si no viene ningun campo', async () => {
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si weightKg es negativo', async () => {
    const res = await POST(postReq({ weightKg: -5 }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si energyLevel > 5', async () => {
    const res = await POST(postReq({ energyLevel: 8 }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si body es invalido', async () => {
    const res = await POST(postReq({ weightKg: 'abc' }))
    expect(res.status).toBe(400)
  })

  it('upsert usa fecha de hoy (timezone-aware), no del body', async () => {
    await POST(postReq({ weightKg: 75 }))

    const upsertCall = vi.mocked(prisma.dailyLog.upsert).mock.calls[0][0]
    const upsertDate = (upsertCall.where as any).userId_date.date as Date
    // Verifica que la fecha es medianoche UTC (todayInTz retorna midnight UTC)
    expect(upsertDate.getUTCHours()).toBe(0)
    expect(upsertDate.getUTCMinutes()).toBe(0)
    expect(upsertDate.getUTCSeconds()).toBe(0)
  })

  it('el update NO incluye campos no enviados (PERSIST-10)', async () => {
    await POST(postReq({ weightKg: 75 }))

    const upsertCall = vi.mocked(prisma.dailyLog.upsert).mock.calls[0][0]
    expect(upsertCall.update).toHaveProperty('weightKg', 75)
    expect(upsertCall.update).not.toHaveProperty('sleepHours')
    expect(upsertCall.update).not.toHaveProperty('energyLevel')
    expect(upsertCall.update).not.toHaveProperty('hrResting')
  })

  it('acepta multiples campos validos', async () => {
    await POST(postReq({ sleepHours: 7.5, energyLevel: 4 }))

    const upsertCall = vi.mocked(prisma.dailyLog.upsert).mock.calls[0][0]
    expect(upsertCall.update).toEqual({ sleepHours: 7.5, energyLevel: 4 })
    expect(upsertCall.update).not.toHaveProperty('weightKg')
  })

  it('retorna { log } con status 200', async () => {
    const res = await POST(postReq({ weightKg: 75 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.log).toBeDefined()
    expect(body.log.weightKg).toBe(75)
  })
})
