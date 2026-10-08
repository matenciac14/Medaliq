import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/db/prisma', () => ({ prisma: { user: { findMany: vi.fn() } } }))
vi.mock('@/lib/push/expo_push', () => ({ sendPushNotification: vi.fn().mockResolvedValue(undefined) }))

import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push/expo_push'

const findMany = vi.mocked(prisma.user.findMany)
const pushMock = vi.mocked(sendPushNotification)

process.env.CRON_SECRET = 'test-secret'

function makeRequest(auth?: string) {
  return new NextRequest('http://localhost/api/cron/streak-risk', {
    headers: auth ? { authorization: auth } : {},
  })
}

// Build an array of { completedAt } for N consecutive days ending yesterday
function sessionLogsForStreak(days: number): { completedAt: Date }[] {
  const logs: { completedAt: Date }[] = []
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  for (let i = 1; i <= days; i++) {
    logs.push({ completedAt: new Date(todayUTC.getTime() - i * 24 * 60 * 60 * 1000) })
  }
  return logs
}

// A session log for today
function sessionLogToday(): { completedAt: Date } {
  const now = new Date()
  return { completedAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/cron/streak-risk', () => {
  it('returns 401 without valid auth header', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 with wrong secret', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns { sent: 0 } when no candidates', async () => {
    findMany.mockResolvedValue([])
    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('sends push when athlete has streak >= 3, trained yesterday, not today', async () => {
    findMany.mockResolvedValue([
      {
        id: 'u1',
        name: 'Carlos',
        pushToken: 'ExponentPushToken[xxx]',
        sessionLogs: sessionLogsForStreak(5),
        gymSessions: [],
      },
    ] as any)

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(pushMock).toHaveBeenCalledOnce()
    expect(pushMock).toHaveBeenCalledWith(
      'ExponentPushToken[xxx]',
      'Tu racha está en riesgo 🔥',
      expect.stringContaining('5'),
      { screen: 'log' },
    )
  })

  it('does NOT send if athlete trained today', async () => {
    const logs = [sessionLogToday(), ...sessionLogsForStreak(4)]
    findMany.mockResolvedValue([
      {
        id: 'u2',
        name: 'Ana',
        pushToken: 'ExponentPushToken[yyy]',
        sessionLogs: logs,
        gymSessions: [],
      },
    ] as any)

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('does NOT send if athlete did not train yesterday', async () => {
    // Only has activity from 2+ days ago — yesterday is missing
    const now = new Date()
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const twoDaysAgo = new Date(todayUTC.getTime() - 2 * 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(todayUTC.getTime() - 3 * 24 * 60 * 60 * 1000)
    const fourDaysAgo = new Date(todayUTC.getTime() - 4 * 24 * 60 * 60 * 1000)

    findMany.mockResolvedValue([
      {
        id: 'u3',
        name: 'Luis',
        pushToken: 'ExponentPushToken[zzz]',
        sessionLogs: [
          { completedAt: twoDaysAgo },
          { completedAt: threeDaysAgo },
          { completedAt: fourDaysAgo },
        ],
        gymSessions: [],
      },
    ] as any)

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('does NOT send if streak < 3 days', async () => {
    // Trained yesterday and the day before — only 2-day streak
    findMany.mockResolvedValue([
      {
        id: 'u4',
        name: 'Sofia',
        pushToken: 'ExponentPushToken[aaa]',
        sessionLogs: sessionLogsForStreak(2),
        gymSessions: [],
      },
    ] as any)

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('does NOT send if athlete has no pushToken', async () => {
    findMany.mockResolvedValue([
      {
        id: 'u5',
        name: 'Pedro',
        pushToken: null,
        sessionLogs: sessionLogsForStreak(5),
        gymSessions: [],
      },
    ] as any)

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(pushMock).not.toHaveBeenCalled()
  })
})
