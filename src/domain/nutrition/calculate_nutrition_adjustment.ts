/**
 * Pure domain function — calcula el delta nutricional cuando la intensidad
 * real de una sesión difiere de la planificada.
 *
 * No importa Prisma, Next.js ni ningún framework.
 */

import { LOW_KCAL_MULTIPLIER, LOW_CARBS_MULTIPLIER, REST_CARBS_MULTIPLIER } from './nutrition_constants'

export type AdjustmentPlan = {
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  carbsHardG: number
  carbsEasyG: number
}

export type AdjustmentResult = {
  plannedKcal: number
  plannedCarbsG: number
  adjustedKcal: number
  adjustedCarbsG: number
  deltaKcal: number        // adjustedKcal - plannedKcal (puede ser negativo)
  deltaCarbsG: number      // adjustedCarbsG - plannedCarbsG (puede ser negativo)
}

type Intensity = 'HIGH' | 'MODERATE' | 'LOW' | 'REST'

function kcalFor(intensity: Intensity, plan: AdjustmentPlan): number {
  if (intensity === 'HIGH') return plan.targetKcalHard
  if (intensity === 'REST') return plan.targetKcalRest
  if (intensity === 'LOW') return Math.round(plan.targetKcalEasy * LOW_KCAL_MULTIPLIER)
  return plan.targetKcalEasy
}

function carbsFor(intensity: Intensity, plan: AdjustmentPlan): number {
  if (intensity === 'HIGH') return plan.carbsHardG
  if (intensity === 'REST') return Math.round(plan.carbsEasyG * REST_CARBS_MULTIPLIER)
  if (intensity === 'LOW') return Math.round(plan.carbsEasyG * LOW_CARBS_MULTIPLIER)
  return plan.carbsEasyG
}

/**
 * Calcula el ajuste nutricional entre intensidad planificada y real.
 * Retorna null si las intensidades son iguales (sin ajuste necesario).
 */
export function calcNutritionAdjustment(
  plannedIntensity: Intensity,
  actualIntensity: Intensity,
  plan: AdjustmentPlan,
): AdjustmentResult | null {
  if (plannedIntensity === actualIntensity) return null

  const plannedKcal = kcalFor(plannedIntensity, plan)
  const plannedCarbsG = carbsFor(plannedIntensity, plan)
  const adjustedKcal = kcalFor(actualIntensity, plan)
  const adjustedCarbsG = carbsFor(actualIntensity, plan)

  return {
    plannedKcal,
    plannedCarbsG,
    adjustedKcal,
    adjustedCarbsG,
    deltaKcal: adjustedKcal - plannedKcal,
    deltaCarbsG: adjustedCarbsG - plannedCarbsG,
  }
}
