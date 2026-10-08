import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/rate_limit', () => ({ rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    plannedMeal: { findMany: vi.fn(), create: vi.fn() },
    food: { findFirst: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const SESSION = { user: { id: 'user-1', features: { nutrition: true } } }

const FOOD = {
  id: 'f1', name: 'Arroz', category: 'GRAINS',
  kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3,
  servingG: 100, servingLabel: null,
}

const MEAL = {
  id: 'pm-1', userId: 'user-1', mealType: 'BREAKFAST', grams: 150,
  date: new Date('2026-07-28'), foodId: 'f1', food: FOOD,
  createdAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

// ──────────────────────────────────────────
// GET
// ──────────────────────────────────────────
describe('GET /api/athlete/nutrition/planned-meals', () => {
  it('retorna 401 sin sesion', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const req = new NextRequest(new URL('http://localhost/api/athlete/nutrition/planned-meals'))
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('retorna meals agrupados por fecha con ?date=', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findMany).mockResolvedValue([MEAL] as any)
    const req = new NextRequest(new URL('http://localhost/api/athlete/nutrition/planned-meals?date=2026-07-28'))
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meals['2026-07-28']).toHaveLength(1)
  })

  it('filtra por userId del usuario autenticado', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findMany).mockResolvedValue([])
    const req = new NextRequest(new URL('http://localhost/api/athlete/nutrition/planned-meals?date=2026-07-28'))
    await GET(req)
    expect(prisma.plannedMeal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      })
    )
  })
})

// ──────────────────────────────────────────
// POST
// ──────────────────────────────────────────
describe('POST /api/athlete/nutrition/planned-meals', () => {
  function makeReq(body: object) {
    return new NextRequest(new URL('http://localhost/api/athlete/nutrition/planned-meals'), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  it('retorna 401 sin sesion', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(makeReq({ date: '2026-07-28', mealType: 'BREAKFAST', foodId: 'f1', grams: 100 }))
    expect(res.status).toBe(401)
  })

  it('retorna 400 si faltan campos', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    const res = await POST(makeReq({ date: '2026-07-28' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si mealType es invalido', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    const res = await POST(makeReq({ date: '2026-07-28', mealType: 'INVALID', foodId: 'f1', grams: 100 }))
    expect(res.status).toBe(400)
  })

  it('retorna 404 si el alimento no existe', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.food.findFirst).mockResolvedValue(null)
    const res = await POST(makeReq({ date: '2026-07-28', mealType: 'BREAKFAST', foodId: 'f1', grams: 100 }))
    expect(res.status).toBe(404)
  })

  it('crea PlannedMeal y retorna 201', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.food.findFirst).mockResolvedValue({ id: 'f1' } as any)
    vi.mocked(prisma.plannedMeal.create).mockResolvedValue(MEAL as any)
    const res = await POST(makeReq({ date: '2026-07-28', mealType: 'BREAKFAST', foodId: 'f1', grams: 150 }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.meal.id).toBe('pm-1')
  })

  it('usa userId de la sesion, no del body', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.food.findFirst).mockResolvedValue({ id: 'f1' } as any)
    vi.mocked(prisma.plannedMeal.create).mockResolvedValue(MEAL as any)
    await POST(makeReq({ date: '2026-07-28', mealType: 'BREAKFAST', foodId: 'f1', grams: 100, userId: 'hacker' }))
    expect(prisma.plannedMeal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1' }),
      })
    )
  })
})
