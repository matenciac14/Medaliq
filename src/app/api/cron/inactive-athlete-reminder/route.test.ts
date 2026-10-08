import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/db/prisma', () => ({ prisma: { user: { findMany: vi.fn() } } }))
vi.mock('@/infrastructure/email/resend', () => ({ sendReengagementEmail: vi.fn() }))
vi.mock('@/lib/push/expo_push', () => ({ sendPushNotification: vi.fn().mockResolvedValue(undefined) }))

import { prisma } from '@/lib/db/prisma'
import { sendReengagementEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push/expo_push'

const SECRET = 'test-secret'
process.env.CRON_SECRET = SECRET

function makeReq(auth = `Bearer ${SECRET}`) {
  return new NextRequest(new URL('/api/cron/inactive-athlete-reminder', 'http://localhost'), {
    headers: { authorization: auth },
  })
}

/** Builds a fake athlete record. lastSessionDaysAgo / lastGymDaysAgo = null means no history. */
function makeAthlete(opts: {
  id?: string
  email?: string | null
  pushToken?: string | null
  lastSessionDaysAgo?: number | null
  lastGymDaysAgo?: number | null
}) {
  const now = Date.now()
  const sessionLog =
    opts.lastSessionDaysAgo != null
      ? [{ completedAt: new Date(now - opts.lastSessionDaysAgo * 86400000) }]
      : []
  const gymSession =
    opts.lastGymDaysAgo != null
      ? [{ date: new Date(now - opts.lastGymDaysAgo * 86400000) }]
      : []
  return {
    id: opts.id ?? 'athlete-1',
    email: opts.email ?? 'atleta@test.com',
    name: 'Atleta Test',
    pushToken: opts.pushToken ?? null,
    sessionLogs: sessionLog,
    gymSessions: gymSession,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/cron/inactive-athlete-reminder', () => {
  it('retorna 401 sin Authorization correcto', async () => {
    const res = await GET(makeReq('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('retorna { sent: 0, failed: 0 } si no hay candidatos', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ sent: 0, failed: 0 })
  })

  it('envía push y email a atleta inactivo >= 3 días', async () => {
    const athlete = makeAthlete({
      pushToken: 'ExponentPushToken[xxx]',
      lastSessionDaysAgo: 5,
      lastGymDaysAgo: 4,
    })
    vi.mocked(prisma.user.findMany).mockResolvedValue([athlete] as any)
    vi.mocked(sendReengagementEmail).mockResolvedValue(undefined as any)

    const res = await GET(makeReq())
    const body = await res.json()

    expect(body.sent).toBe(1)
    expect(body.failed).toBe(0)
    expect(sendPushNotification).toHaveBeenCalledWith(
      'ExponentPushToken[xxx]',
      '¿Todo bien? 💪',
      expect.stringContaining('días')
    )
    expect(sendReengagementEmail).toHaveBeenCalledWith(
      'atleta@test.com',
      'Atleta Test',
      expect.any(Number)
    )
  })

  it('NO envía si el atleta entrenó dentro de los últimos 3 días', async () => {
    const athlete = makeAthlete({ lastSessionDaysAgo: 1, lastGymDaysAgo: null })
    vi.mocked(prisma.user.findMany).mockResolvedValue([athlete] as any)

    const res = await GET(makeReq())
    const body = await res.json()

    expect(body.sent).toBe(0)
    expect(body.failed).toBe(0)
    expect(sendReengagementEmail).not.toHaveBeenCalled()
    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('NO envía si el atleta no tiene historial (lastActivity === null)', async () => {
    const athlete = makeAthlete({ lastSessionDaysAgo: null, lastGymDaysAgo: null })
    vi.mocked(prisma.user.findMany).mockResolvedValue([athlete] as any)

    const res = await GET(makeReq())
    const body = await res.json()

    expect(body.sent).toBe(0)
    expect(body.failed).toBe(0)
    expect(sendReengagementEmail).not.toHaveBeenCalled()
    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('cuenta failed si sendReengagementEmail lanza error', async () => {
    const athlete = makeAthlete({ lastSessionDaysAgo: 7, lastGymDaysAgo: null })
    vi.mocked(prisma.user.findMany).mockResolvedValue([athlete] as any)
    vi.mocked(sendReengagementEmail).mockRejectedValue(new Error('smtp error'))

    const res = await GET(makeReq())
    const body = await res.json()

    expect(body.sent).toBe(0)
    expect(body.failed).toBe(1)
  })
})
