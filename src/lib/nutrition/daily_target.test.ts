import { describe, it, expect } from 'vitest'
import { getDailyNutritionTarget, type NutritionPlanTargets } from './daily_target'
import { calculateMacros } from '@/domain/plan/formulas'

const PLAN: NutritionPlanTargets = {
  targetKcalHard: 2800,
  targetKcalEasy: 2400,
  targetKcalRest: 2000,
  proteinG: 150,
  carbsHardG: 350,
  carbsEasyG: 280,
  fatG: 80,
}

// ---------------------------------------------------------------------------
// Intensidades conocidas
// ---------------------------------------------------------------------------
describe('getDailyNutritionTarget — HIGH', () => {
  it('devuelve valores del día duro', () => {
    const r = getDailyNutritionTarget('HIGH', PLAN)
    expect(r.kcal).toBe(2800)
    expect(r.proteinG).toBe(150)
    expect(r.carbsG).toBe(350)
    // fat = (2800 - 150*4 - 350*4) / 9 = 800/9 ≈ 89
    expect(r.fatG).toBe(Math.round((2800 - 150 * 4 - 350 * 4) / 9))
    expect(r.label).toBe('Día duro')
    expect(r.intensity).toBe('HIGH')
  })
})

describe('getDailyNutritionTarget — MODERATE', () => {
  it('devuelve valores del día fácil', () => {
    const r = getDailyNutritionTarget('MODERATE', PLAN)
    expect(r.kcal).toBe(2400)
    expect(r.carbsG).toBe(280)
    expect(r.label).toBe('Día moderado')
    expect(r.intensity).toBe('MODERATE')
  })
})

describe('getDailyNutritionTarget — LOW', () => {
  it('kcal = 88% del día fácil', () => {
    const r = getDailyNutritionTarget('LOW', PLAN)
    expect(r.kcal).toBe(Math.round(2400 * 0.88)) // 2112
  })

  it('carbos = 75% de carbsEasyG', () => {
    const r = getDailyNutritionTarget('LOW', PLAN)
    expect(r.carbsG).toBe(Math.round(280 * 0.75)) // 210
  })

  it('label y intensity correctos', () => {
    const r = getDailyNutritionTarget('LOW', PLAN)
    expect(r.label).toBe('Día suave')
    expect(r.intensity).toBe('LOW')
  })

  it('proteína consistente', () => {
    const r = getDailyNutritionTarget('LOW', PLAN)
    expect(r.proteinG).toBe(150)
  })
})

describe('getDailyNutritionTarget — REST', () => {
  it('devuelve valores del día descanso', () => {
    const r = getDailyNutritionTarget('REST', PLAN)
    expect(r.kcal).toBe(2000)
    expect(r.carbsG).toBe(Math.round(280 * 0.7)) // 196
    expect(r.label).toBe('Día descanso')
  })
})

// ---------------------------------------------------------------------------
// Fallbacks — null / undefined / valor desconocido
// ---------------------------------------------------------------------------
describe('getDailyNutritionTarget — fallbacks a descanso', () => {
  it('null → día descanso', () => {
    const r = getDailyNutritionTarget(null, PLAN)
    expect(r.kcal).toBe(2000)
    expect(r.label).toBe('Día descanso')
  })

  it('undefined → día descanso', () => {
    const r = getDailyNutritionTarget(undefined, PLAN)
    expect(r.kcal).toBe(2000)
  })

  it('valor desconocido → día descanso', () => {
    const r = getDailyNutritionTarget('UNKNOWN_VALUE', PLAN)
    expect(r.kcal).toBe(2000)
  })
})

// ---------------------------------------------------------------------------
// Invariantes
// ---------------------------------------------------------------------------
describe('getDailyNutritionTarget — invariantes', () => {
  it('proteína igual en todos los tipos de día', () => {
    const intensities = ['HIGH', 'MODERATE', 'LOW', 'REST', null, undefined]
    intensities.forEach(i => {
      expect(getDailyNutritionTarget(i, PLAN).proteinG).toBe(150)
    })
  })

  it('macros suman las kcal del día (±9 kcal por redondeo)', () => {
    const intensities = ['HIGH', 'MODERATE', 'LOW', 'REST', null, undefined] as const
    intensities.forEach(i => {
      const r = getDailyNutritionTarget(i, PLAN)
      const sum = r.proteinG * 4 + r.carbsG * 4 + r.fatG * 9
      expect(Math.abs(sum - r.kcal)).toBeLessThanOrEqual(9)
    })
  })

  it('grasa varía por tipo de día (mayor en HIGH, menor en REST)', () => {
    const high = getDailyNutritionTarget('HIGH', PLAN).fatG
    const rest = getDailyNutritionTarget('REST', PLAN).fatG
    expect(high).toBeGreaterThan(rest)
  })

  it('kcal: HIGH > MODERATE > LOW > REST', () => {
    const high = getDailyNutritionTarget('HIGH', PLAN).kcal
    const mod  = getDailyNutritionTarget('MODERATE', PLAN).kcal
    const low  = getDailyNutritionTarget('LOW', PLAN).kcal
    const rest = getDailyNutritionTarget('REST', PLAN).kcal
    expect(high).toBeGreaterThan(mod)
    expect(mod).toBeGreaterThan(low)
    expect(low).toBeGreaterThan(rest)
  })
})

// ---------------------------------------------------------------------------
describe('calculateMacros → store → getDailyNutritionTarget — round-trip', () => {
  it('fatG derivado coincide con fatG almacenado para varios perfiles', () => {
    const profiles = [
      { weight: 60,  tdee: 2000, adj: 0 },
      { weight: 75,  tdee: 2400, adj: -250 },
      { weight: 100, tdee: 2800, adj: -500 },
      { weight: 50,  tdee: 1800, adj: 200 },
      { weight: 120, tdee: 3200, adj: 0 },
    ]
    profiles.forEach(({ weight, tdee, adj }) => {
      const macros = calculateMacros(tdee, weight, adj)
      const storedPlan = {
        targetKcalHard: macros.hard.kcal,
        targetKcalEasy: macros.easy.kcal,
        targetKcalRest: macros.rest.kcal,
        proteinG: macros.hard.protein,
        carbsHardG: macros.hard.carbs,
        carbsEasyG: macros.easy.carbs,
        fatG: macros.hard.fat,
      }

      const derived = getDailyNutritionTarget('HIGH', storedPlan)
      expect(derived.fatG).toBe(macros.hard.fat)
      expect(derived.proteinG).toBe(macros.hard.protein)
      expect(derived.carbsG).toBe(macros.hard.carbs)
      expect(derived.kcal).toBe(macros.hard.kcal)
    })
  })
})
