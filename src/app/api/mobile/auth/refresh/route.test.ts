import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/lib/auth/mobile_auth', () => ({
  getMobileUser: vi.fn(),
  signMobileToken: vi.fn(),
  buildMobileTokenPayload: vi.fn(),
  MOBILE_USER_SELECT: {},
}))
vi.mock('@/lib/rate_limit', () => ({
  rateLimitAsync: vi.fn(),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    coachAthlete: { findFirst: vi.fn() },
  },
}))

import { getMobileUser, signMobileToken, buildMobileTokenPayload } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'

const MOBILE_USER = { id: 'user-1', email: 'test@test.com', role: 'ATHLETE' }

const DB_USER = {
  id: 'user-1',
  email: 'test@test.com',
  name: 'Test User',
  role: 'ATHLETE',
  status: 'ACTIVE',
  featurePlan: true,
  featureCheckin: true,
  featureNutrition: true,
  featureProgress: true,
  featureLog: true,
  featureCoach: false,
  featureGym: true,
  onboardingCompleted: true,
  needsRoleSelection: false,
  identification: null,
  phoneWa: null,
}

const MOCK_PAYLOAD = {
  id: 'user-1',
  email: 'test@test.com',
  name: 'Test User',
  role: 'ATHLETE',
  status: 'ACTIVE',
  onboardingCompleted: true,
  activated: true,
  isB2B: false,
  userPlan: 'PRO',
  profileComplete: false,
  features: {
    plan: true, checkin: true, nutrition: true,
    progress: true, log: true, coach: false, gym: true,
  },
}

function makeReq() {
  return new NextRequest(new URL('/api/mobile/auth/refresh', 'http://localhost'), {
    method: 'POST',
    headers: { 'X-Client': 'medaliq-mobile', 'Authorization': 'Bearer token' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: true } as any)
})

describe('POST /api/mobile/auth/refresh', () => {
  it('retorna 401 si no hay token válido', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await POST(makeReq())
    expect(res.status).toBe(401)
  })

  it('retorna 429 si se excede el rate limit', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: false } as any)
    const res = await POST(makeReq())
    expect(res.status).toBe(429)
  })

  it('retorna 404 si el usuario no existe en DB', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    const res = await POST(makeReq())
    expect(res.status).toBe(404)
  })

  it('retorna 200 con token y features actualizadas', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(DB_USER as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(buildMobileTokenPayload).mockReturnValue(MOCK_PAYLOAD as any)
    vi.mocked(signMobileToken).mockResolvedValue('new-jwt-token')

    const res = await POST(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.token).toBe('new-jwt-token')
    expect(body.features).toEqual(MOCK_PAYLOAD.features)
  })

  it('pasa isB2B=true cuando hay coachRelation activa', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(DB_USER as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(buildMobileTokenPayload).mockReturnValue({ ...MOCK_PAYLOAD, isB2B: true } as any)
    vi.mocked(signMobileToken).mockResolvedValue('token-b2b')

    await POST(makeReq())

    expect(buildMobileTokenPayload).toHaveBeenCalledWith(
      DB_USER,
      expect.objectContaining({ isB2B: true })
    )
  })
})
