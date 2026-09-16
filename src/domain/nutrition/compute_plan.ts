import { calculateTDEE, calculateMacros } from '@/domain/plan/formulas'

type HealthProfileInput = {
  weightKg: number
  heightCm: number
  age: number
  gender?: string | null
  weightGoalKg?: number | null
}

export type NutritionPlanData = {
  tdee: number
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
  kcalAdjustment: number
}

export function computeNutritionPlanData(profile: HealthProfileInput, kcalAdjustment = 0): NutritionPlanData {
  const tdee = calculateTDEE(
    profile.weightKg,
    profile.heightCm,
    profile.age,
    (profile.gender ?? 'male') as 'male' | 'female',
    5,
  )
  const macros = calculateMacros(tdee, profile.weightKg, kcalAdjustment)
  return {
    tdee,
    targetKcalHard: macros.hard.kcal,
    targetKcalEasy: macros.easy.kcal,
    targetKcalRest: macros.rest.kcal,
    proteinG: macros.hard.protein,
    carbsHardG: macros.hard.carbs,
    carbsEasyG: macros.easy.carbs,
    fatG: macros.hard.fat,
    kcalAdjustment,
  }
}
