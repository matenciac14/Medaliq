import { describe, it, expect } from 'vitest'
import { computeNutritionPlanData } from './compute_plan'

describe('computeNutritionPlanData', () => {
  const maleProfile = {
    weightKg: 80,
    heightCm: 180,
    age: 30,
    gender: 'male',
  }

  const femaleProfile = {
    weightKg: 60,
    heightCm: 165,
    age: 28,
    gender: 'female',
  }

  it('returns all required fields', () => {
    const result = computeNutritionPlanData(maleProfile)
    expect(result).toHaveProperty('tdee')
    expect(result).toHaveProperty('targetKcalHard')
    expect(result).toHaveProperty('targetKcalEasy')
    expect(result).toHaveProperty('targetKcalRest')
    expect(result).toHaveProperty('proteinG')
    expect(result).toHaveProperty('carbsHardG')
    expect(result).toHaveProperty('carbsEasyG')
    expect(result).toHaveProperty('fatG')
    expect(result).toHaveProperty('kcalAdjustment')
  })

  it('with kcalAdjustment=0 returns baseline', () => {
    const result = computeNutritionPlanData(maleProfile, 0)
    expect(result.kcalAdjustment).toBe(0)
    expect(result.tdee).toBeGreaterThan(0)
    expect(result.targetKcalHard).toBeGreaterThan(result.targetKcalEasy)
    expect(result.targetKcalEasy).toBeGreaterThan(result.targetKcalRest)
  })

  it('with kcalAdjustment=-500 returns lower kcal values', () => {
    const baseline = computeNutritionPlanData(maleProfile, 0)
    const deficit = computeNutritionPlanData(maleProfile, -500)
    expect(deficit.targetKcalHard).toBeLessThan(baseline.targetKcalHard)
    expect(deficit.targetKcalEasy).toBeLessThan(baseline.targetKcalEasy)
    expect(deficit.targetKcalRest).toBeLessThan(baseline.targetKcalRest)
    expect(deficit.kcalAdjustment).toBe(-500)
  })

  it('male vs female returns different tdee', () => {
    const male = computeNutritionPlanData(maleProfile)
    const female = computeNutritionPlanData(femaleProfile)
    expect(male.tdee).not.toBe(female.tdee)
    // Male with heavier weight/taller should have higher TDEE
    expect(male.tdee).toBeGreaterThan(female.tdee)
  })

  it('all numeric values are positive integers', () => {
    const result = computeNutritionPlanData(maleProfile)
    const fields = [
      result.tdee, result.targetKcalHard, result.targetKcalEasy,
      result.targetKcalRest, result.proteinG, result.carbsHardG,
      result.carbsEasyG, result.fatG,
    ]
    for (const val of fields) {
      expect(val).toBeGreaterThan(0)
      expect(Number.isInteger(val)).toBe(true)
    }
  })

  it('uses default gender male when null', () => {
    const withNull = computeNutritionPlanData({ ...maleProfile, gender: null })
    const withMale = computeNutritionPlanData({ ...maleProfile, gender: 'male' })
    expect(withNull.tdee).toBe(withMale.tdee)
  })
})
