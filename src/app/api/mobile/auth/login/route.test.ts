import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rate_limit', () => ({
  rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}))
vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn() },
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    coachAthlete: { findFirst: vi.fn() },
    healthProfile: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/auth/mobile_auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/mobile_auth')>()
  return {
    ...actual,
    signMobileToken: vi.fn().mockResolvedValue('signed-jwt'),
  }
})

import bcrypt from 'bcryptjs'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import { signMobileToken } from '@/lib/auth/mobile_auth'
import { POST } from './route'

const ACTIVE_USER = {
  id: 'u1',
  email: 'atleta@test.com',
  name: 'Atleta Test',
  password: 'hashed',
  role: 'ATHLETE',
  status: 'ACTIVE',
  emailVerified: new Date(),
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

function req(body: object) {
  return new NextRequest(new URL('/api/mobile/auth/login', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client': 'medaliq-mobile' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: true } as any)
  vi.mocked(prisma.healthProfile.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
})

describe('POST /api/mobile/auth/login', () => {
  it('retorna 429 si se excede el rate limit', async () => {
    vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: false } as any)
    const res = await POST(req({ email: 'atleta@test.com', password: 'Password123!' }))
    expect(res.status).toBe(429)
  })

  it('retorna 401 si el email no existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await POST(req({ email: 'noexiste@test.com', password: 'Password123!' }))
    expect(res.status).toBe(401)
  })

  it('retorna 401 si la contraseña es incorrecta', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(ACTIVE_USER as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    const res = await POST(req({ email: 'atleta@test.com', password: 'Wrong123!' }))
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el usuario está bloqueado', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...ACTIVE_USER, status: 'BLOCKED' } as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    const res = await POST(req({ email: 'atleta@test.com', password: 'Password123!' }))
    expect(res.status).toBe(403)
  })

  it('retorna 400 si el email tiene formato inválido', async () => {
    const res = await POST(req({ email: 'no-es-email', password: 'Password123!' }))
    expect(res.status).toBe(400)
  })

  it('retorna 200 con token y campos alineados en login exitoso', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(ACTIVE_USER as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await POST(req({ email: 'atleta@test.com', password: 'Password123!' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.token).toBe('signed-jwt')
    expect(body.user.features).toEqual({
      plan: true, checkin: true, nutrition: true,
      progress: true, log: true, coach: false, gym: true,
    })
    expect(body.user.isB2B).toBe(false)
    expect(body.user.activated).toBe(true)
    expect(body.user.profileComplete).toBe(false)
  })

  it('llama signMobileToken con payload construido por buildMobileTokenPayload', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(ACTIVE_USER as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    await POST(req({ email: 'atleta@test.com', password: 'Password123!' }))

    expect(signMobileToken).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'u1',
        email: 'atleta@test.com',
        role: 'ATHLETE',
        onboardingCompleted: true,
        activated: true,
        isB2B: false,
        profileComplete: false,
        features: expect.objectContaining({ plan: true, gym: true, coach: false }),
      })
    )
  })
})
