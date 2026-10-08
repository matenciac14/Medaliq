import { describe, it, expect } from 'vitest'
import {
  calcMacros,
  calcProgressPct,
  parseFoodLogPost,
  buildFoodLogResponse,
  type MacroTotals,
} from './calculate_food_log'

// ── calcMacros ──────────────────────────────────────────────────────────────

describe('calcMacros', () => {
  const food = {
    kcalPer100g: 250,
    proteinPer100g: 20,
    carbsPer100g: 30,
    fatPer100g: 10,
  }

  it('100g returns exactly the per-100g values', () => {
    const result = calcMacros(100, food)
    expect(result).toEqual({ kcal: 250, proteinG: 20, carbsG: 30, fatG: 10 })
  })

  it('200g doubles the values', () => {
    const result = calcMacros(200, food)
    expect(result).toEqual({ kcal: 500, proteinG: 40, carbsG: 60, fatG: 20 })
  })

  it('0g returns all zeros', () => {
    const result = calcMacros(0, food)
    expect(result).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  })

  it('rounds kcal to integer, others to 1 decimal', () => {
    const oddFood = {
      kcalPer100g: 113,
      proteinPer100g: 7.3,
      carbsPer100g: 11.7,
      fatPer100g: 4.9,
    }
    const result = calcMacros(33, oddFood)
    // kcal: 113*0.33 = 37.29 → 37
    expect(Number.isInteger(result.kcal)).toBe(true)
    // proteinG: 7.3*0.33 = 2.409 → round(2.409*10)/10 = 2.4
    expect(result.proteinG).toBe(2.4)
    // carbsG: 11.7*0.33 = 3.861 → round(3.861*10)/10 = 3.9
    expect(result.carbsG).toBe(3.9)
    // fatG: 4.9*0.33 = 1.617 → round(1.617*10)/10 = 1.6
    expect(result.fatG).toBe(1.6)
  })
})

// ── calcProgressPct ─────────────────────────────────────────────────────────

describe('calcProgressPct', () => {
  it('50% of target returns 50 for each macro', () => {
    const totals: MacroTotals = { kcal: 1000, proteinG: 50, carbsG: 100, fatG: 25 }
    const target: MacroTotals = { kcal: 2000, proteinG: 100, carbsG: 200, fatG: 50 }
    const result = calcProgressPct(totals, target)
    expect(result).toEqual({ kcal: 50, proteinG: 50, carbsG: 50, fatG: 50 })
  })

  it('target of 0 returns 0 (no division by zero)', () => {
    const totals: MacroTotals = { kcal: 500, proteinG: 50, carbsG: 100, fatG: 25 }
    const target: MacroTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    const result = calcProgressPct(totals, target)
    expect(result).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  })

  it('over 100% works correctly', () => {
    const totals: MacroTotals = { kcal: 3000, proteinG: 150, carbsG: 300, fatG: 75 }
    const target: MacroTotals = { kcal: 2000, proteinG: 100, carbsG: 200, fatG: 50 }
    const result = calcProgressPct(totals, target)
    expect(result).toEqual({ kcal: 150, proteinG: 150, carbsG: 150, fatG: 150 })
  })
})

// ── parseFoodLogPost ────────────────────────────────────────────────────────

describe('parseFoodLogPost', () => {
  it('missing required fields returns error', () => {
    const result = parseFoodLogPost({ foodId: 'abc' })
    expect(result).toHaveProperty('error')
  })

  it('invalid mealType returns error', () => {
    const result = parseFoodLogPost({ foodId: 'abc', grams: 100, mealType: 'INVALID' })
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('mealType inválido')
  })

  it('grams <= 0 returns error', () => {
    // grams=0 is falsy so triggers required-fields check
    const result0 = parseFoodLogPost({ foodId: 'abc', grams: 0, mealType: 'LUNCH' })
    expect(result0).toHaveProperty('error')

    // negative grams passes the truthy check but fails the positivity check
    const resultNeg = parseFoodLogPost({ foodId: 'abc', grams: -5, mealType: 'LUNCH' })
    expect(resultNeg).toHaveProperty('error')
    expect((resultNeg as { error: string }).error).toContain('número positivo')
  })

  it('grams > 5000 returns error', () => {
    const result = parseFoodLogPost({ foodId: 'abc', grams: 5001, mealType: 'LUNCH' })
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('5000')
  })

  it('invalid date format returns error', () => {
    const result = parseFoodLogPost({ foodId: 'abc', grams: 100, mealType: 'LUNCH', date: '01-01-2026' })
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('YYYY-MM-DD')
  })

  it('valid input returns parsed data with correct types', () => {
    const result = parseFoodLogPost({ foodId: 'abc', grams: 150, mealType: 'BREAKFAST', date: '2026-05-15' })
    expect(result).not.toHaveProperty('error')
    const parsed = result as { foodId: string; gramsNum: number; mealType: string; logDate: Date }
    expect(parsed.foodId).toBe('abc')
    expect(parsed.gramsNum).toBe(150)
    expect(parsed.mealType).toBe('BREAKFAST')
    expect(parsed.logDate).toBeInstanceOf(Date)
    expect(parsed.logDate.toISOString()).toBe('2026-05-15T00:00:00.000Z')
  })

  it('no date provided uses today', () => {
    const result = parseFoodLogPost({ foodId: 'abc', grams: 100, mealType: 'LUNCH' })
    expect(result).not.toHaveProperty('error')
    const parsed = result as { logDate: Date }
    const todayStr = new Date().toISOString().split('T')[0]
    expect(parsed.logDate.toISOString()).toBe(`${todayStr}T00:00:00.000Z`)
  })
})

// ── buildFoodLogResponse ────────────────────────────────────────────────────

describe('buildFoodLogResponse', () => {
  const baseFoodData = {
    name: 'Arroz',
    category: 'GRAIN',
    servingG: 100,
    servingLabel: null,
    kcalPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
  }

  it('empty logs returns zero totals', () => {
    const result = buildFoodLogResponse([], null, null, '2026-05-15')
    expect(result.totals).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 })
    expect(result.logs).toHaveLength(0)
    expect(result.target).toBeNull()
    expect(result.pct).toBeNull()
  })

  it('single log calculates correct totals', () => {
    const logs = [{
      id: '1',
      foodId: 'f1',
      food: baseFoodData,
      grams: 200,
      mealType: 'LUNCH',
      date: new Date('2026-05-15'),
    }]
    const result = buildFoodLogResponse(logs, null, null, '2026-05-15')
    // 200g of arroz: kcal=260, proteinG=5.4, carbsG=56, fatG=0.6
    expect(result.totals.kcal).toBe(260)
    expect(result.totals.proteinG).toBe(5)
    expect(result.totals.carbsG).toBe(56)
  })

  it('uses snapshot values when present', () => {
    const logs = [{
      id: '1',
      foodId: 'f1',
      food: baseFoodData,
      grams: 200,
      mealType: 'LUNCH',
      date: new Date('2026-05-15'),
      kcalLogged: 300,
      proteinLogged: 10,
      carbsLogged: 50,
      fatLogged: 5,
    }]
    const result = buildFoodLogResponse(logs, null, null, '2026-05-15')
    expect(result.totals.kcal).toBe(300)
    expect(result.totals.proteinG).toBe(10)
    expect(result.totals.carbsG).toBe(50)
    expect(result.totals.fatG).toBe(5)
  })

  it('falls back to calcMacros when snapshot is null', () => {
    const logs = [{
      id: '1',
      foodId: 'f1',
      food: baseFoodData,
      grams: 100,
      mealType: 'LUNCH',
      date: new Date('2026-05-15'),
      kcalLogged: null,
      proteinLogged: null,
      carbsLogged: null,
      fatLogged: null,
    }]
    const result = buildFoodLogResponse(logs, null, null, '2026-05-15')
    expect(result.totals.kcal).toBe(130)
    expect(result.totals.proteinG).toBe(3)
  })

  it('dayType maps correctly from intensity', () => {
    const r1 = buildFoodLogResponse([], null, 'HIGH', '2026-05-15')
    expect(r1.dayType).toBe('hard')

    const r2 = buildFoodLogResponse([], null, 'MODERATE', '2026-05-15')
    expect(r2.dayType).toBe('easy')

    const r3 = buildFoodLogResponse([], null, null, '2026-05-15')
    expect(r3.dayType).toBe('easy')

    const r4 = buildFoodLogResponse([], null, 'REST', '2026-05-15')
    expect(r4.dayType).toBe('rest')

    const r5 = buildFoodLogResponse([], null, 'LOW', '2026-05-15')
    expect(r5.dayType).toBe('low')
  })
})
