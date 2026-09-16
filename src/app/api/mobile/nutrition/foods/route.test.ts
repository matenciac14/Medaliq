import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/auth/mobile_auth', () => ({ getMobileUser: vi.fn() }))
vi.mock('@/lib/rate_limit', () => ({ rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    food: { findMany: vi.fn() },
    foodProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    user: { findUnique: vi.fn().mockResolvedValue({ timezone: 'America/Bogota' }) },
  },
}))

import { getMobileUser } from '@/lib/auth/mobile_auth'
import { prisma } from '@/lib/db/prisma'

const MOBILE_USER = { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'ATHLETE', features: {}, onboardingCompleted: true, userPlan: 'PRO' }

function getReq(qs = '') {
  return new NextRequest(new URL(`/api/mobile/nutrition/foods${qs}`, 'http://localhost'), {
    headers: { 'X-Client': 'medaliq-mobile' },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/mobile/nutrition/foods', () => {
  it('retorna 401 sin usuario mobile', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('llama findMany con take: 80 sin filtro cuando no hay ?q=', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.food.findMany).mockResolvedValue([])
    await GET(getReq())
    expect(prisma.food.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 80, where: { isActive: true } })
    )
  })

  it('filtra por nombre con ?q=arroz', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.food.findMany).mockResolvedValue([])
    await GET(getReq('?q=arroz'))
    expect(prisma.food.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 80,
        where: {
          isActive: true,
          name: { contains: 'arroz', mode: 'insensitive' },
        },
      })
    )
  })

  it('devuelve alimentos en 200', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    const foods = [{ id: 'f1', name: 'Arroz', category: 'GRAINS', kcalPer100g: 130 }]
    vi.mocked(prisma.food.findMany).mockResolvedValue(foods as any)
    const res = await GET(getReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(foods)
  })
})
