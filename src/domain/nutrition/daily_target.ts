// ---------------------------------------------------------------------------
// daily-target.ts — Target nutricional del día según la sesión planificada
// ---------------------------------------------------------------------------

import { LOW_KCAL_MULTIPLIER, LOW_CARBS_MULTIPLIER, REST_CARBS_MULTIPLIER } from './nutrition_constants'

export type DailyNutritionTarget = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  label: string        // "Día duro", "Día fácil", "Día descanso"
  intensity: string    // HIGH | MODERATE | LOW | REST
}

export type NutritionPlanTargets = {
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
}

/**
 * Calcula la grasa como calorías restantes tras proteína y carbos.
 * Garantiza que macros × calorías siempre sumen al target de kcal.
 */
function deriveFatG(kcal: number, proteinG: number, carbsG: number): number {
  const remaining = kcal - proteinG * 4 - carbsG * 4
  return Math.max(Math.round(remaining / 9), 0)
}

/**
 * Dado el intensity de la sesión del día y el plan nutricional del atleta,
 * devuelve el target de kcal y macros para ese día.
 */
export function getDailyNutritionTarget(
  intensity: string | null | undefined,
  plan: NutritionPlanTargets
): DailyNutritionTarget {
  switch (intensity) {
    case 'HIGH': {
      const kcal = plan.targetKcalHard
      const carbsG = plan.carbsHardG
      return {
        kcal,
        proteinG: plan.proteinG,
        carbsG,
        fatG: deriveFatG(kcal, plan.proteinG, carbsG),
        label: 'Día duro',
        intensity: 'HIGH',
      }
    }
    case 'MODERATE': {
      const kcal = plan.targetKcalEasy
      const carbsG = plan.carbsEasyG
      return {
        kcal,
        proteinG: plan.proteinG,
        carbsG,
        fatG: deriveFatG(kcal, plan.proteinG, carbsG),
        label: 'Día moderado',
        intensity: 'MODERATE',
      }
    }
    case 'LOW': {
      const kcal = Math.round(plan.targetKcalEasy * LOW_KCAL_MULTIPLIER)
      const carbsG = Math.round(plan.carbsEasyG * LOW_CARBS_MULTIPLIER)
      return {
        kcal,
        proteinG: plan.proteinG,
        carbsG,
        fatG: deriveFatG(kcal, plan.proteinG, carbsG),
        label: 'Día suave',
        intensity: 'LOW',
      }
    }
    case 'REST':
    default: {
      const kcal = plan.targetKcalRest
      const carbsG = Math.round(plan.carbsEasyG * REST_CARBS_MULTIPLIER)
      return {
        kcal,
        proteinG: plan.proteinG,
        carbsG,
        fatG: deriveFatG(kcal, plan.proteinG, carbsG),
        label: 'Día descanso',
        intensity: intensity ?? 'REST',
      }
    }
  }
}
