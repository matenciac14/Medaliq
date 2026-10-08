import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from './route'

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

const SESSION = { user: { id: 'user-1' } }

const PLAN = {
  id: 'np-1', userId: 'user-1', source: 'SYSTEM',
  tdee: 2500, targetKcalHard: 2800, targetKcalEasy: 2200, targetKcalRest: 2000,
  proteinG: 150, carbsHardG: 350, carbsEasyG: 250, fatG: 100,
}

function makeReq(body: object) {
  return new NextRequest(new URL('http://localhost/api/athlete/nutrition/targets'), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function deriveFatG(kcal: number, proteinG: number, carbsG: number): number {
  return Math.max(Math.round((kcal - proteinG * 4 - carbsG * 4) / 9), 0)
}

beforeEach(() => vi.clearAllMocks())

// ──────────────────────────────────────────
// GET
// ──────────────────────────────────────────
describe('GET /api/athlete/nutrition/targets', () => {
  it('retorna 401 sin sesion', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('retorna 404 si no tiene NutritionPlan', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(404)
  })

  it('retorna el plan del atleta', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(PLAN as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plan.targetKcalHard).toBe(2800)
  })
})

// ──────────────────────────────────────────
// PATCH
// ──────────────────────────────────────────
describe('PATCH /api/athlete/nutrition/targets', () => {
  it('retorna 401 sin sesion', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }))
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el atleta tiene coach activo (B2B)', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'ca-1' } as any)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain('coach')
  })

  it('retorna 400 si no hay campos validos', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    const res = await PATCH(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si envian fatG (campo no editable)', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    const res = await PATCH(makeReq({ fatG: 80 }))
    expect(res.status).toBe(400)
  })

  it('retorna 404 si no tiene NutritionPlan', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(null)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }))
    expect(res.status).toBe(404)
  })

  it('actualiza targets y retorna source=ATHLETE', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    // 1st call: existence check (select: { id: true }), 2nd call: read current values
    vi.mocked(prisma.nutritionPlan.findUnique)
      .mockResolvedValueOnce(PLAN as any)   // existence
      .mockResolvedValueOnce(PLAN as any)   // current values for fatG recalc
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...PLAN, targetKcalHard: 3000, source: 'ATHLETE' } as any)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plan.source).toBe('ATHLETE')

    const expectedFatG = deriveFatG(3000, PLAN.proteinG, PLAN.carbsHardG)
    expect(prisma.nutritionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'ATHLETE',
          targetKcalHard: 3000,
          fatG: expectedFatG,
        }),
      })
    )
  })

  it('recalcula fatG al cambiar proteinG', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.nutritionPlan.findUnique)
      .mockResolvedValueOnce(PLAN as any)
      .mockResolvedValueOnce(PLAN as any)
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...PLAN, proteinG: 180, source: 'ATHLETE' } as any)

    await PATCH(makeReq({ proteinG: 180 }))

    const call = vi.mocked(prisma.nutritionPlan.update).mock.calls[0]![0]
    const expectedFatG = deriveFatG(PLAN.targetKcalHard, 180, PLAN.carbsHardG)
    expect(call.data).toHaveProperty('fatG', expectedFatG)
    expect(call.data).toHaveProperty('proteinG', 180)
    expect(call.data).not.toHaveProperty('targetKcalHard')
  })

  it('recalcula fatG al cambiar carbsHardG', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.nutritionPlan.findUnique)
      .mockResolvedValueOnce(PLAN as any)
      .mockResolvedValueOnce(PLAN as any)
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...PLAN, carbsHardG: 400, source: 'ATHLETE' } as any)

    await PATCH(makeReq({ carbsHardG: 400 }))

    const call = vi.mocked(prisma.nutritionPlan.update).mock.calls[0]![0]
    const expectedFatG = deriveFatG(PLAN.targetKcalHard, PLAN.proteinG, 400)
    expect(call.data).toHaveProperty('fatG', expectedFatG)
  })

  it('fatG almacenado coincide con deriveFatG(kcal, protein, carbs)', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.nutritionPlan.findUnique)
      .mockResolvedValueOnce(PLAN as any)
      .mockResolvedValueOnce(PLAN as any)
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...PLAN, targetKcalHard: 2500, proteinG: 160, source: 'ATHLETE' } as any)

    await PATCH(makeReq({ targetKcalHard: 2500, proteinG: 160 }))

    const call = vi.mocked(prisma.nutritionPlan.update).mock.calls[0]![0]
    const storedFatG = (call.data as any).fatG
    const expectedFatG = deriveFatG(2500, 160, PLAN.carbsHardG)
    expect(storedFatG).toBe(expectedFatG)

    // Invariante: protein*4 + carbs*4 + fat*9 ≈ kcal (±9 por redondeo)
    const sum = 160 * 4 + PLAN.carbsHardG * 4 + storedFatG * 9
    expect(Math.abs(sum - 2500)).toBeLessThanOrEqual(9)
  })

  it('fatG nunca es negativo con kcal bajas', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    // kcal muy bajo: protein*4 + carbs*4 > kcal → fatG debe ser 0, no negativo
    const lowPlan = { ...PLAN, targetKcalHard: 1200, proteinG: 200, carbsHardG: 200 }
    vi.mocked(prisma.nutritionPlan.findUnique)
      .mockResolvedValueOnce(lowPlan as any)
      .mockResolvedValueOnce(lowPlan as any)
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...lowPlan, targetKcalEasy: 1000, source: 'ATHLETE' } as any)

    await PATCH(makeReq({ targetKcalEasy: 1000 }))

    const call = vi.mocked(prisma.nutritionPlan.update).mock.calls[0]![0]
    // fatG recalculated from hard day values (kcal=1200, protein=200, carbs=200)
    // (1200 - 800 - 800) / 9 = -44 → clamped to 0
    expect((call.data as any).fatG).toBe(0)
  })
})
