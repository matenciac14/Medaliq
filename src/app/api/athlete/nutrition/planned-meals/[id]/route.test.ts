import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE, PATCH } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/rate_limit', () => ({ rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    plannedMeal: { findFirst: vi.fn(), delete: vi.fn(), update: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const SESSION = { user: { id: 'user-1', features: { nutrition: true } } }

const MEAL = {
  id: 'pm-1', userId: 'user-1', mealType: 'BREAKFAST', grams: 100,
  date: new Date('2026-07-28'),
  food: { id: 'f1', name: 'Arroz', category: 'GRAINS', kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, servingG: 100, servingLabel: null },
}

function makeReq(method: string, body?: object) {
  return new NextRequest(new URL('http://localhost/api/athlete/nutrition/planned-meals/pm-1'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
}

function makeParams(id = 'pm-1') {
  return Promise.resolve({ id })
}

beforeEach(() => vi.clearAllMocks())

// ─────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────
describe('DELETE /api/athlete/nutrition/planned-meals/[id]', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await DELETE(makeReq('DELETE'), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 404 si la comida no existe o no pertenece al usuario', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(null)
    const res = await DELETE(makeReq('DELETE'), { params: makeParams() })
    expect(res.status).toBe(404)
  })

  it('elimina la comida y retorna ok: true', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(MEAL as any)
    vi.mocked(prisma.plannedMeal.delete).mockResolvedValue(MEAL as any)
    const res = await DELETE(makeReq('DELETE'), { params: makeParams() })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(prisma.plannedMeal.delete).toHaveBeenCalledWith({ where: { id: 'pm-1' } })
  })

  it('filtra por userId del usuario autenticado (ownership)', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(null)
    await DELETE(makeReq('DELETE'), { params: makeParams() })
    expect(prisma.plannedMeal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'pm-1', userId: 'user-1' }),
      })
    )
  })
})

// ─────────────────────────────────────────────────────────
// PATCH
// ─────────────────────────────────────────────────────────
describe('PATCH /api/athlete/nutrition/planned-meals/[id]', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await PATCH(makeReq('PATCH', { grams: 200 }), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 404 si la comida no existe o no pertenece al usuario', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(null)
    const res = await PATCH(makeReq('PATCH', { grams: 200 }), { params: makeParams() })
    expect(res.status).toBe(404)
  })

  it('retorna 400 si grams no es un número positivo', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(MEAL as any)
    const res = await PATCH(makeReq('PATCH', { grams: -50 }), { params: makeParams() })
    expect(res.status).toBe(400)
  })

  it('retorna 400 si grams es cero', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(MEAL as any)
    const res = await PATCH(makeReq('PATCH', { grams: 0 }), { params: makeParams() })
    expect(res.status).toBe(400)
  })

  it('actualiza grams y retorna la comida actualizada con food', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(MEAL as any)
    const updated = { ...MEAL, grams: 200 }
    vi.mocked(prisma.plannedMeal.update).mockResolvedValue(updated as any)
    const res = await PATCH(makeReq('PATCH', { grams: 200 }), { params: makeParams() })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meal.grams).toBe(200)
    expect(prisma.plannedMeal.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pm-1' }, data: { grams: 200 } })
    )
  })

  it('filtra por userId del usuario autenticado (ownership)', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(null)
    await PATCH(makeReq('PATCH', { grams: 150 }), { params: makeParams() })
    expect(prisma.plannedMeal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'pm-1', userId: 'user-1' }),
      })
    )
  })
})
