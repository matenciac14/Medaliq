import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    trainingPlan: { findMany: vi.fn() },
    weeklyCheckIn: { findMany: vi.fn() },
  },
}))
vi.mock('@/infrastructure/email/resend', () => ({ sendCheckinReminderEmail: vi.fn() }))
vi.mock('@/lib/push/expo_push', () => ({ sendPushNotification: vi.fn().mockResolvedValue(undefined) }))

import { prisma } from '@/lib/db/prisma'
import { sendCheckinReminderEmail } from '@/infrastructure/email/resend'

const SECRET = 'test-secret'
process.env.CRON_SECRET = SECRET

function makeReq(auth = `Bearer ${SECRET}`) {
  return new NextRequest(new URL('/api/cron/checkin-reminder', 'http://localhost'), {
    headers: { authorization: auth },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/cron/checkin-reminder', () => {
  it('retorna 401 sin Authorization correcto', async () => {
    const res = await GET(makeReq('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('retorna { sent: 0, failed: 0 } si no hay planes activos', async () => {
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([])
    vi.mocked(prisma.weeklyCheckIn.findMany).mockResolvedValue([])
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ sent: 0, failed: 0 })
  })

  it('envía email a atleta con plan activo que NO hizo check-in esta semana', async () => {
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([
      { userId: 'user-1', user: { email: 'atleta@test.com', name: 'Ana', pushToken: null } },
    ] as any)
    vi.mocked(prisma.weeklyCheckIn.findMany).mockResolvedValue([])
    vi.mocked(sendCheckinReminderEmail).mockResolvedValue(undefined as any)

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(body.failed).toBe(0)
    expect(sendCheckinReminderEmail).toHaveBeenCalledWith('atleta@test.com', 'Ana')
  })

  it('NO envía a atleta que YA hizo check-in esta semana', async () => {
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([
      { userId: 'user-2', user: { email: 'checked@test.com', name: 'Carlos', pushToken: null } },
    ] as any)
    vi.mocked(prisma.weeklyCheckIn.findMany).mockResolvedValue([{ userId: 'user-2' }] as any)

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(body.failed).toBe(0)
    expect(sendCheckinReminderEmail).not.toHaveBeenCalled()
  })

  it('cuenta failed cuando sendCheckinReminderEmail lanza excepción', async () => {
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([
      { userId: 'user-3', user: { email: 'fail@test.com', name: 'Fail', pushToken: null } },
    ] as any)
    vi.mocked(prisma.weeklyCheckIn.findMany).mockResolvedValue([])
    vi.mocked(sendCheckinReminderEmail).mockRejectedValue(new Error('smtp error'))

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(body.failed).toBe(1)
  })

  it('cuenta failed si email es null (sendCheckinReminderEmail falla)', async () => {
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([
      { userId: 'user-4', user: { email: null, name: 'Sin Email', pushToken: null } },
    ] as any)
    vi.mocked(prisma.weeklyCheckIn.findMany).mockResolvedValue([])
    vi.mocked(sendCheckinReminderEmail).mockRejectedValue(new Error('Invalid email'))

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.failed).toBe(1)
  })
})
