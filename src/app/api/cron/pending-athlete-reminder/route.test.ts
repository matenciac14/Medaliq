import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { prisma } from '@/lib/db/prisma'
import { sendCoachPendingAthleteEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push/expo_push'

vi.mock('@/lib/db/prisma', () => ({ prisma: { coachAthlete: { findMany: vi.fn() } } }))
vi.mock('@/infrastructure/email/resend', () => ({ sendCoachPendingAthleteEmail: vi.fn() }))
vi.mock('@/lib/push/expo_push', () => ({ sendPushNotification: vi.fn().mockResolvedValue(undefined) }))

const mockFindMany = vi.mocked(prisma.coachAthlete.findMany)
const mockSendEmail = vi.mocked(sendCoachPendingAthleteEmail)
const mockSendPush = vi.mocked(sendPushNotification)

function makeRequest(authHeader?: string) {
  const headers = new Headers()
  if (authHeader !== undefined) headers.set('authorization', authHeader)
  return new NextRequest('http://localhost/api/cron/pending-athlete-reminder', { headers })
}

const CRON_SECRET = 'test-cron-secret'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = CRON_SECRET
})

describe('GET /api/cron/pending-athlete-reminder', () => {
  it('retorna 401 sin authorization header', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('retorna { notified: 0 } cuando no hay relaciones pendientes', async () => {
    mockFindMany.mockResolvedValue([])
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ notified: 0 })
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('envia email y push al coach con atleta pendiente >=48h', async () => {
    const createdAt = new Date(Date.now() - 50 * 3_600_000)
    mockFindMany.mockResolvedValue([
      {
        id: 'rel-1',
        createdAt,
        athleteId: 'athlete-1',
        athlete: { name: 'Ana Lopez' },
        coach: { id: 'coach-1', name: 'Carlos', email: 'carlos@coach.com', pushToken: 'push-token-abc' },
      },
    ] as any)
    mockSendEmail.mockResolvedValue(undefined as any)

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ notified: 1, total: 1 })

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledWith(
      'carlos@coach.com',
      'Carlos',
      'Ana Lopez',
      'athlete-1',
      expect.any(Number),
    )

    expect(mockSendPush).toHaveBeenCalledOnce()
    expect(mockSendPush).toHaveBeenCalledWith(
      'push-token-abc',
      'Ana Lopez espera activación',
      expect.stringContaining('panel sin acceso al plan'),
      { screen: 'athlete-athlete-1' },
    )
  })

  it('NO envia si el coach no tiene email', async () => {
    const createdAt = new Date(Date.now() - 72 * 3_600_000)
    mockFindMany.mockResolvedValue([
      {
        id: 'rel-2',
        createdAt,
        athleteId: 'athlete-2',
        athlete: { name: 'Luis' },
        coach: { id: 'coach-2', name: 'Sin Email', email: null, pushToken: null },
      },
    ] as any)

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ notified: 0, total: 1 })
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('retorna { notified, total } correctos con mezcla de coaches con y sin email', async () => {
    const createdAt = new Date(Date.now() - 60 * 3_600_000)
    mockFindMany.mockResolvedValue([
      {
        id: 'rel-3',
        createdAt,
        athleteId: 'athlete-3',
        athlete: { name: 'Pedro' },
        coach: { id: 'coach-3', name: 'Maria', email: 'maria@coach.com', pushToken: null },
      },
      {
        id: 'rel-4',
        createdAt,
        athleteId: 'athlete-4',
        athlete: { name: 'Sofia' },
        coach: { id: 'coach-4', name: 'Sin Email', email: null, pushToken: null },
      },
    ] as any)
    mockSendEmail.mockResolvedValue(undefined as any)

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ notified: 1, total: 2 })
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })
})
