import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/mobile_auth', () => ({
  getMobileUser: vi.fn(),
}))
vi.mock('@/lib/rate_limit', () => ({
  rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    performanceBenchmark: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import { GET, POST } from '../route'

const MOBILE_USER = { id: 'mobile-1', userId: 'mobile-1', role: 'ATHLETE', features: { progress: true } }

const MOCK_BENCHMARK = {
  id: 'bm-1',
  sport: 'RUNNING',
  metric: '5K_TIME',
  value: 1200,
  unit: 'seconds',
  testedAt: new Date('2026-01-01'),
  notes: null,
}

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mobile/progress/benchmarks', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: true } as any)
})

describe('GET /api/mobile/progress/benchmarks', () => {
  it('retorna 401 sin JWT', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
  })

  it('retorna benchmarks con JWT válido', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.performanceBenchmark.findMany).mockResolvedValue([MOCK_BENCHMARK] as any)

    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.benchmarks).toHaveLength(1)
    expect(data.benchmarks[0].sport).toBe('RUNNING')
  })

  it('retorna 429 si rate limit superado', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: false } as any)

    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(429)
  })
})

describe('POST /api/mobile/progress/benchmarks', () => {
  it('retorna 401 sin JWT', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await POST(makeReq('POST', { sport: 'RUNNING', metric: '5K_TIME', value: 1200, unit: 'seconds', testedAt: '2026-01-01' }))
    expect(res.status).toBe(401)
  })

  it('retorna 400 con métrica inválida', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    const res = await POST(makeReq('POST', { sport: 'RUNNING', metric: 'INVALID', value: 1200, unit: 'seconds', testedAt: '2026-01-01' }))
    expect(res.status).toBe(400)
  })

  it('crea benchmark válido → 201', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.performanceBenchmark.create).mockResolvedValue({ ...MOCK_BENCHMARK, userId: 'mobile-1', coachId: null } as any)

    const res = await POST(makeReq('POST', { sport: 'RUNNING', metric: '5K_TIME', value: 1200, unit: 'seconds', testedAt: '2026-01-01' }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.benchmark.sport).toBe('RUNNING')
  })

  it('retorna 429 si rate limit superado', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: false } as any)

    const res = await POST(makeReq('POST', { sport: 'RUNNING', metric: '5K_TIME', value: 1200, unit: 'seconds', testedAt: '2026-01-01' }))
    expect(res.status).toBe(429)
  })
})
