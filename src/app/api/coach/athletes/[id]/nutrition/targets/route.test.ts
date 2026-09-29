import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    nutritionPlan: { findUnique: vi.fn(), update: vi.fn() },
    coachAthlete: { findFirst: vi.fn() },
    healthProfile: { findUnique: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const COACH_SESSION = { user: { id: 'coach-1', role: 'COACH' } }
const ATHLETE_ID = 'athlete-1'

const PLAN = {
  targetKcalHard: 2800, targetKcalEasy: 2200, targetKcalRest: 2000,
  proteinG: 150, carbsHardG: 350, carbsEasyG: 250,
  kcalAdjustment: 0, source: 'COACH',
}

function makeReq(body: object) {
  return new NextRequest(new URL(`http://localhost/api/coach/athletes/${ATHLETE_ID}/nutrition/targets`), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function deriveFatG(kcal: number, proteinG: number, carbsG: number): number {
  return Math.max(Math.round((kcal - proteinG * 4 - carbsG * 4) / 9), 0)
}

const params = Promise.resolve({ id: ATHLETE_ID })

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/coach/athletes/[id]/nutrition/targets', () => {
  it('retorna 401 sin sesion', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }), { params })
    expect(res.status).toBe(401)
  })

  it('retorna 401 si rol no es COACH', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u-1', role: 'ATHLETE' } } as any)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }), { params })
    expect(res.status).toBe(401)
  })

  it('retorna 404 si el coach no tiene relacion con el atleta', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }), { params })
    expect(res.status).toBe(404)
  })

  it('retorna 400 con body vacio', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'ca-1' } as any)
    const res = await PATCH(makeReq({}), { params })
    expect(res.status).toBe(400)
  })

  it('actualiza targetKcalHard y recalcula fatG', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'ca-1' } as any)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(PLAN as any)
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...PLAN, targetKcalHard: 3000, source: 'COACH' } as any)

    const res = await PATCH(makeReq({ targetKcalHard: 3000 }), { params })
    expect(res.status).toBe(200)

    const call = vi.mocked(prisma.nutritionPlan.update).mock.calls[0]![0]
    const expectedFatG = deriveFatG(3000, PLAN.proteinG, PLAN.carbsHardG)
    expect(call.data).toHaveProperty('fatG', expectedFatG)
    expect(call.data).toHaveProperty('source', 'COACH')
  })

  it('recalcula fatG al cambiar proteinG', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'ca-1' } as any)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(PLAN as any)
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...PLAN, proteinG: 180, source: 'COACH' } as any)

    await PATCH(makeReq({ proteinG: 180 }), { params })

    const call = vi.mocked(prisma.nutritionPlan.update).mock.calls[0]![0]
    const expectedFatG = deriveFatG(PLAN.targetKcalHard, 180, PLAN.carbsHardG)
    expect(call.data).toHaveProperty('fatG', expectedFatG)
  })

  it('fatG almacenado satisface invariante protein*4 + carbs*4 + fat*9 ≈ kcal', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'ca-1' } as any)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(PLAN as any)
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...PLAN, targetKcalHard: 2500, proteinG: 160, source: 'COACH' } as any)

    await PATCH(makeReq({ targetKcalHard: 2500, proteinG: 160 }), { params })

    const call = vi.mocked(prisma.nutritionPlan.update).mock.calls[0]![0]
    const fatG = (call.data as any).fatG as number
    const sum = 160 * 4 + PLAN.carbsHardG * 4 + fatG * 9
    expect(Math.abs(sum - 2500)).toBeLessThanOrEqual(9)
  })

  it('retorna 404 si el atleta no tiene NutritionPlan (PATCH parcial)', async () => {
    vi.mocked(auth).mockResolvedValue(COACH_SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'ca-1' } as any)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(null)

    const res = await PATCH(makeReq({ targetKcalHard: 3000 }), { params })
    expect(res.status).toBe(404)
  })
})
