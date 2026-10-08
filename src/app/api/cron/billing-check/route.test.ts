import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/infrastructure/billing/billing.repository', () => ({
  BillingRepository: class {},
}))
vi.mock('@/domain/billing/downgrade.use_case', () => ({
  runBillingCheck: vi.fn(),
}))

import { runBillingCheck } from '@/domain/billing/downgrade.use_case'
import { POST } from './route'

function makeReq(authHeader?: string) {
  return new NextRequest(new URL('/api/cron/billing-check', 'http://localhost'), {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-cron-secret'
})

describe('POST /api/cron/billing-check', () => {
  it('retorna 401 sin authorization header', async () => {
    const res = await POST(makeReq())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('retorna { ok: true, downgradedCount: 3 } cuando hay subs para degradar', async () => {
    vi.mocked(runBillingCheck).mockResolvedValue({ downgradedCount: 3 })
    const res = await POST(makeReq('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.downgradedCount).toBe(3)
  })

  it('retorna { ok: true, downgradedCount: 0 } sin subs expiradas', async () => {
    vi.mocked(runBillingCheck).mockResolvedValue({ downgradedCount: 0 })
    const res = await POST(makeReq('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.downgradedCount).toBe(0)
  })

  it('incluye timestamp en la response', async () => {
    vi.mocked(runBillingCheck).mockResolvedValue({ downgradedCount: 0 })
    const res = await POST(makeReq('Bearer test-cron-secret'))
    const body = await res.json()
    expect(body.timestamp).toBeDefined()
    expect(typeof body.timestamp).toBe('string')
    expect(new Date(body.timestamp).getTime()).not.toBeNaN()
  })
})
