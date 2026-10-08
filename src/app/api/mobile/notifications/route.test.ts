import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rate_limit', () => ({
  rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/auth/mobile_auth', () => ({
  getMobileUser: vi.fn(),
}))

import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { GET } from './route'
import { PATCH } from './read-all/route'

const MOBILE_USER = { id: 'u1', email: 'atleta@test.com', role: 'ATHLETE' }

function req(method = 'GET', path = '/api/mobile/notifications') {
  return new NextRequest(new URL(path, 'http://localhost'), {
    method,
    headers: { Authorization: 'Bearer fake-token' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: true } as any)
  vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
})

describe('GET /api/mobile/notifications', () => {
  it('retorna 401 si no esta autenticado', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('retorna 429 si se excede el rate limit', async () => {
    vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: false } as any)
    const res = await GET(req())
    expect(res.status).toBe(429)
  })

  it('retorna notificaciones del usuario autenticado', async () => {
    const now = new Date()
    const notifications = [
      { id: 'n1', type: 'PLAN_ASSIGNED', title: 'Nuevo plan', body: 'Tu coach asigno un plan', read: false, metadata: null, createdAt: now },
      { id: 'n2', type: 'CHECKIN_REMINDER', title: 'Check-in', body: 'Registra tu check-in', read: true, metadata: null, createdAt: now },
    ]
    vi.mocked(prisma.notification.findMany).mockResolvedValue(notifications as any)

    const res = await GET(req())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.notifications).toHaveLength(2)
    expect(body.unreadCount).toBe(1)
  })

  it('retorna array vacio cuando no hay notificaciones', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([])

    const res = await GET(req())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.notifications).toEqual([])
    expect(body.unreadCount).toBe(0)
  })

  it('filtra por userId del usuario autenticado', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([])

    await GET(req())

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 30,
      })
    )
  })
})

describe('PATCH /api/mobile/notifications/read-all', () => {
  it('retorna 401 si no esta autenticado', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await PATCH(req('PATCH', '/api/mobile/notifications/read-all'))
    expect(res.status).toBe(401)
  })

  it('marca todas las notificaciones como leidas', async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 } as any)

    const res = await PATCH(req('PATCH', '/api/mobile/notifications/read-all'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.ok).toBe(true)

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', read: false },
      data: { read: true },
    })
  })
})
