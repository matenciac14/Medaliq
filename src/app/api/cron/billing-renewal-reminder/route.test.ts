import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/prisma', () => ({
  prisma: { userSubscription: { findMany: vi.fn() } },
}))
const mockCreateCoachCheckout = vi.fn().mockResolvedValue({ checkoutUrl: 'https://wompi.co/pay/coach-123' })
const mockCreateAthleteCheckout = vi.fn().mockResolvedValue({ checkoutUrl: 'https://wompi.co/pay/athlete-123' })
vi.mock('@/infrastructure/billing/wompi_payment_gateway', () => ({
  WompiPaymentGateway: class {
    createCoachCheckout = mockCreateCoachCheckout
    createAthleteCheckout = mockCreateAthleteCheckout
  },
}))
vi.mock('@/infrastructure/email/resend', () => ({
  sendBillingRenewalReminderEmail: vi.fn(),
}))

import { prisma } from '@/lib/db/prisma'
import { sendBillingRenewalReminderEmail } from '@/infrastructure/email/resend'
import { GET } from './route'

const CRON_SECRET = 'test-cron-secret'

function req(secret?: string) {
  return new NextRequest(
    new URL('/api/cron/billing-renewal-reminder', 'http://localhost'),
    {
      method: 'GET',
      headers: secret ? { authorization: `Bearer ${secret}` } : {},
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = CRON_SECRET
  process.env.NEXT_PUBLIC_APP_URL = 'https://medaliq.com'
  vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([])
})

describe('GET /api/cron/billing-renewal-reminder', () => {
  it('retorna 401 sin Authorization header', async () => {
    const res = await GET(req())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('retorna { sent: 0, failed: 0 } cuando no hay suscripciones por vencer', async () => {
    const res = await GET(req(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.sent).toBe(0)
    expect(body.failed).toBe(0)
    expect(typeof body.timestamp).toBe('string')
  })

  it('envía email a coach con link Wompi y tier name correcto', async () => {
    const periodEnd = new Date()
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([
      {
        id: 'sub-1',
        coachTier: 'GROWTH',
        tier: null,
        gateway: 'wompi',
        currentPeriodEnd: periodEnd,
        user: { id: 'u-coach', email: 'coach@test.com', name: 'Coach Test', role: 'COACH' },
      } as any,
    ])

    const res = await GET(req(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(body.failed).toBe(0)

    expect(sendBillingRenewalReminderEmail).toHaveBeenCalledWith(
      'coach@test.com',
      'Coach Test',
      'Growth',
      periodEnd,
      'https://wompi.co/pay/coach-123',
    )
  })

  it('envía email a atleta con tier "Pro"', async () => {
    const periodEnd = new Date()
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([
      {
        id: 'sub-2',
        coachTier: null,
        tier: 'PRO',
        gateway: 'wompi',
        currentPeriodEnd: periodEnd,
        user: { id: 'u-athlete', email: 'atleta@test.com', name: 'Atleta Test', role: 'ATHLETE' },
      } as any,
    ])

    const res = await GET(req(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(body.failed).toBe(0)

    expect(sendBillingRenewalReminderEmail).toHaveBeenCalledWith(
      'atleta@test.com',
      'Atleta Test',
      'Pro',
      periodEnd,
      'https://wompi.co/pay/athlete-123',
    )
  })

  it('no envía email si el usuario no tiene email', async () => {
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([
      {
        id: 'sub-3',
        coachTier: 'PRO',
        tier: 'PRO',
        gateway: 'wompi',
        currentPeriodEnd: new Date(),
        user: { id: 'u-noemail', email: null, name: 'Sin Email', role: 'ATHLETE' },
      } as any,
    ])

    const res = await GET(req(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(body.failed).toBe(0)
    expect(sendBillingRenewalReminderEmail).not.toHaveBeenCalled()
  })

  it('cuenta failed si gateway.createCoachCheckout lanza error', async () => {
    vi.mocked(prisma.userSubscription.findMany).mockResolvedValue([
      {
        id: 'sub-4',
        coachTier: 'GROWTH',
        tier: null,
        gateway: 'wompi',
        currentPeriodEnd: new Date(),
        user: { id: 'u-coach2', email: 'coach2@test.com', name: 'Coach 2', role: 'COACH' },
      } as any,
    ])

    // Override createCoachCheckout to throw on this test
    mockCreateCoachCheckout.mockRejectedValueOnce(new Error('Wompi error'))

    const res = await GET(req(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(body.failed).toBe(1)
    expect(sendBillingRenewalReminderEmail).not.toHaveBeenCalled()
  })
})
