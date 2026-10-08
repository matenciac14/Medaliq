import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies before imports
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
  encode: vi.fn(),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    coachAthlete: { findFirst: vi.fn() },
    userSubscription: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/config/user_config', () => ({
  getUserPlan: vi.fn(),
}))

import { getToken, encode } from 'next-auth/jwt'
import { prisma } from '@/lib/db/prisma'
import { getUserPlan } from '@/lib/config/user_config'
import { setFreshJwtCookie } from './refresh_jwt_cookie'

const mockReq = () => new NextRequest(new URL('http://localhost/api/test'))

const mockDbUser = {
  role: 'ATHLETE',
  status: 'ACTIVE',
  onboardingCompleted: true,
  needsRoleSelection: false,
  featurePlan: true,
  featureCheckin: true,
  featureNutrition: true,
  featureProgress: true,
  featureLog: true,
  featureCoach: false,
  featureGym: true,
  identification: null,
  phoneWa: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setFreshJwtCookie', () => {
  it('no-ops if getToken returns null', async () => {
    vi.mocked(getToken).mockResolvedValue(null)
    const response = NextResponse.json({ ok: true })
    await setFreshJwtCookie(mockReq(), response, 'user-1')
    expect(encode).not.toHaveBeenCalled()
    expect(response.cookies.get('authjs.session-token')).toBeUndefined()
  })

  it('no-ops if user not found in DB', async () => {
    vi.mocked(getToken).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null)

    const response = NextResponse.json({ ok: true })
    await setFreshJwtCookie(mockReq(), response, 'user-1')
    expect(encode).not.toHaveBeenCalled()
  })

  it('encodes JWT with fresh DB state and sets cookie', async () => {
    vi.mocked(getToken).mockResolvedValue({ id: 'user-1', iat: 100 } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockDbUser as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue({ tier: 'PRO', trialEndsAt: null } as any)
    vi.mocked(getUserPlan).mockReturnValue('PRO')
    vi.mocked(encode).mockResolvedValue('new-jwt-token')

    const response = NextResponse.json({ ok: true })
    await setFreshJwtCookie(mockReq(), response, 'user-1')

    // Verify encode was called with updated token
    expect(encode).toHaveBeenCalledTimes(1)
    const tokenArg = vi.mocked(encode).mock.calls[0][0].token as any
    expect(tokenArg.onboardingCompleted).toBe(true)
    expect(tokenArg.role).toBe('ATHLETE')
    expect(tokenArg.activated).toBe(true)
    expect(tokenArg.isB2B).toBe(false)
    expect(tokenArg.userPlan).toBe('PRO')
    expect(tokenArg.userExistsCheckedAt).toBeTypeOf('number')

    // Verify cookie was set
    const cookie = response.cookies.get('authjs.session-token')
    expect(cookie).toBeDefined()
    expect(cookie!.value).toBe('new-jwt-token')
  })

  it('sets isB2B=true when coachAthlete relation exists', async () => {
    vi.mocked(getToken).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockDbUser as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue({ tier: 'PRO', trialEndsAt: null } as any)
    vi.mocked(getUserPlan).mockReturnValue('PRO')
    vi.mocked(encode).mockResolvedValue('jwt-b2b')

    const response = NextResponse.json({ ok: true })
    await setFreshJwtCookie(mockReq(), response, 'user-1')

    const tokenArg = vi.mocked(encode).mock.calls[0][0].token as any
    expect(tokenArg.isB2B).toBe(true)
  })

  it('computes trialDaysLeft for TRIAL tier', async () => {
    const trialEnds = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    vi.mocked(getToken).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockDbUser as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue({ tier: 'TRIAL', trialEndsAt: trialEnds } as any)
    vi.mocked(getUserPlan).mockReturnValue('PRO')
    vi.mocked(encode).mockResolvedValue('jwt-trial')

    const response = NextResponse.json({ ok: true })
    await setFreshJwtCookie(mockReq(), response, 'user-1')

    const tokenArg = vi.mocked(encode).mock.calls[0][0].token as any
    expect(tokenArg.trialDaysLeft).toBe(5)
  })

  it('sets profileComplete=true when identification and phoneWa exist', async () => {
    vi.mocked(getToken).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockDbUser,
      identification: '123456',
      phoneWa: '+57300000000',
    } as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null)
    vi.mocked(getUserPlan).mockReturnValue('FREE')
    vi.mocked(encode).mockResolvedValue('jwt-complete')

    const response = NextResponse.json({ ok: true })
    await setFreshJwtCookie(mockReq(), response, 'user-1')

    const tokenArg = vi.mocked(encode).mock.calls[0][0].token as any
    expect(tokenArg.profileComplete).toBe(true)
  })

  it('preserves existing token fields (iat, exp, sub, etc.)', async () => {
    vi.mocked(getToken).mockResolvedValue({ id: 'user-1', iat: 1000, exp: 9999, sub: 'user-1', email: 'a@b.com' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockDbUser as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null)
    vi.mocked(getUserPlan).mockReturnValue('FREE')
    vi.mocked(encode).mockResolvedValue('jwt-preserved')

    const response = NextResponse.json({ ok: true })
    await setFreshJwtCookie(mockReq(), response, 'user-1')

    const tokenArg = vi.mocked(encode).mock.calls[0][0].token as any
    expect(tokenArg.iat).toBe(1000)
    expect(tokenArg.email).toBe('a@b.com')
    expect(tokenArg.sub).toBe('user-1')
  })
})
