import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    payment: { findMany: vi.fn() },
    paymentAuditLog: { createMany: vi.fn().mockResolvedValue(undefined) },
  },
}))
vi.mock('@/infrastructure/email/resend', () => ({
  sendPaymentOverdueCoachEmail: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/db/prisma'
import { sendPaymentOverdueCoachEmail } from '@/infrastructure/email/resend'
import { GET } from './route'

function req(secret?: string) {
  return new NextRequest(new URL('/api/cron/payment-overdue', 'http://localhost'), {
    method: 'GET',
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-cron-secret'
})

describe('GET /api/cron/payment-overdue', () => {
  it('retorna 401 sin authorization header', async () => {
    const res = await GET(req())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('retorna { notified: 0, sent: 0 } sin pagos vencidos', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([])

    const res = await GET(req('test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ notified: 0, sent: 0 })
    expect(sendPaymentOverdueCoachEmail).not.toHaveBeenCalled()
  })

  it('envía email agrupado por coach cuando hay pagos vencidos', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'pay-1',
        coachId: 'coach-1',
        amount: 50000,
        currency: 'COP',
        dueDate: new Date('2026-09-01'),
        athlete: { name: 'Ana García' },
        coach: { email: 'coach@test.com', name: 'Carlos' },
      },
      {
        id: 'pay-2',
        coachId: 'coach-1',
        amount: 75000,
        currency: 'COP',
        dueDate: new Date('2026-09-15'),
        athlete: { name: 'Luis Perez' },
        coach: { email: 'coach@test.com', name: 'Carlos' },
      },
    ] as any)

    const res = await GET(req('test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notified).toBe(2)
    expect(body.sent).toBe(1)
    expect(sendPaymentOverdueCoachEmail).toHaveBeenCalledTimes(1)
    expect(sendPaymentOverdueCoachEmail).toHaveBeenCalledWith(
      'coach@test.com',
      'Carlos',
      [
        { athleteName: 'Ana García', amount: 50000, currency: 'COP', dueDate: new Date('2026-09-01') },
        { athleteName: 'Luis Perez', amount: 75000, currency: 'COP', dueDate: new Date('2026-09-15') },
      ]
    )
  })

  it('crea PaymentAuditLog con action REMINDED por cada pago', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'pay-1',
        coachId: 'coach-1',
        amount: 50000,
        currency: 'COP',
        dueDate: new Date('2026-09-01'),
        athlete: { name: 'Ana García' },
        coach: { email: 'coach@test.com', name: 'Carlos' },
      },
    ] as any)

    await GET(req('test-cron-secret'))

    // createMany is fire-and-forget — wait one microtask tick
    await Promise.resolve()

    expect(prisma.paymentAuditLog.createMany).toHaveBeenCalledWith({
      data: [{ paymentId: 'pay-1', action: 'REMINDED', actorId: 'coach-1' }],
    })
  })

  it('no envía email si el coach no tiene email', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'pay-1',
        coachId: 'coach-2',
        amount: 50000,
        currency: 'COP',
        dueDate: new Date('2026-09-01'),
        athlete: { name: 'Ana García' },
        coach: { email: null, name: 'Sin Email' },
      },
    ] as any)

    const res = await GET(req('test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(sendPaymentOverdueCoachEmail).not.toHaveBeenCalled()
  })

  it('cuenta failed si sendPaymentOverdueCoachEmail lanza error', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'pay-1',
        coachId: 'coach-1',
        amount: 50000,
        currency: 'COP',
        dueDate: new Date('2026-09-01'),
        athlete: { name: 'Ana García' },
        coach: { email: 'coach@test.com', name: 'Carlos' },
      },
    ] as any)
    vi.mocked(sendPaymentOverdueCoachEmail).mockRejectedValue(new Error('SMTP error'))

    const res = await GET(req('test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(body.failed).toBe(1)
  })
})
