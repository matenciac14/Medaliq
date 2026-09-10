import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    food: { findMany: vi.fn(), create: vi.fn() },
    foodProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    user: { findUnique: vi.fn().mockResolvedValue({ timezone: 'America/Bogota' }) },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const SESSION = { user: { id: 'user-1' } }

function getReq(qs = '') {
  return new NextRequest(new URL(`/api/athlete/nutrition/foods${qs}`, 'http://localhost'))
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/athlete/nutrition/foods', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('llama findMany con take: 80 y sin filtro de nombre cuando no hay ?q=', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.food.findMany).mockResolvedValue([])
    await GET(getReq())
    expect(prisma.food.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 80, where: { isActive: true } })
    )
  })

  it('filtra por nombre con ?q=pollo', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.food.findMany).mockResolvedValue([])
    await GET(getReq('?q=pollo'))
    expect(prisma.food.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 80,
        where: {
          isActive: true,
          name: { contains: 'pollo', mode: 'insensitive' },
        },
      })
    )
  })

  it('devuelve array de alimentos en 200', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    const foods = [{ id: 'f1', name: 'Arroz', category: 'GRAINS', kcalPer100g: 130 }]
    vi.mocked(prisma.food.findMany).mockResolvedValue(foods as any)
    const res = await GET(getReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(foods)
  })
})
