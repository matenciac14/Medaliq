/**
 * Shared nutrition log logic — used by web and mobile log routes.
 */

import { intensityToDayType, type DayType } from '@/domain/nutrition/day_type'
import { LOW_KCAL_MULTIPLIER, LOW_CARBS_MULTIPLIER, REST_CARBS_MULTIPLIER } from '@/domain/nutrition/nutrition_constants'

export const VALID_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT'] as const
export type MealType = typeof VALID_MEAL_TYPES[number]

type FoodMacros = {
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

type NutritionPlan = {
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
}

export type MacroTotals = { kcal: number; proteinG: number; carbsG: number; fatG: number }

export function calcMacros(grams: number, food: FoodMacros): MacroTotals {
  const r = grams / 100
  return {
    kcal:     Math.round(food.kcalPer100g    * r),
    proteinG: Math.round(food.proteinPer100g * r * 10) / 10,
    carbsG:   Math.round(food.carbsPer100g   * r * 10) / 10,
    fatG:     Math.round(food.fatPer100g     * r * 10) / 10,
  }
}

export function calcNutritionTarget(
  nutritionPlan: NutritionPlan,
  dayType: DayType
): MacroTotals {
  const kcal =
    dayType === 'hard' ? nutritionPlan.targetKcalHard
    : dayType === 'rest' ? nutritionPlan.targetKcalRest
    : dayType === 'low'  ? Math.round(nutritionPlan.targetKcalEasy * LOW_KCAL_MULTIPLIER)
    : nutritionPlan.targetKcalEasy
  const carbsG =
    dayType === 'hard' ? nutritionPlan.carbsHardG
    : dayType === 'rest' ? Math.round(nutritionPlan.carbsEasyG * REST_CARBS_MULTIPLIER)
    : dayType === 'low'  ? Math.round(nutritionPlan.carbsEasyG * LOW_CARBS_MULTIPLIER)
    : nutritionPlan.carbsEasyG
  return { kcal, proteinG: nutritionPlan.proteinG, carbsG, fatG: nutritionPlan.fatG }
}

export function calcProgressPct(totals: MacroTotals, target: MacroTotals): MacroTotals {
  return {
    kcal:     target.kcal     > 0 ? Math.round((totals.kcal     / target.kcal)     * 100) : 0,
    proteinG: target.proteinG > 0 ? Math.round((totals.proteinG / target.proteinG) * 100) : 0,
    carbsG:   target.carbsG   > 0 ? Math.round((totals.carbsG   / target.carbsG)   * 100) : 0,
    fatG:     target.fatG     > 0 ? Math.round((totals.fatG     / target.fatG)     * 100) : 0,
  }
}

type FoodLogEntry = {
  id: string
  foodId: string
  food: FoodMacros & { name: string; category: string; servingG: number; servingLabel: string | null }
  grams: number
  mealType: string
  date: Date
  // Snapshot opcional — presente en logs nuevos, null en logs previos a la migración
  kcalLogged?: number | null
  proteinLogged?: number | null
  carbsLogged?: number | null
  fatLogged?: number | null
}

export function buildFoodLogResponse(
  logs: FoodLogEntry[],
  nutritionPlan: NutritionPlan | null,
  sessionIntensity: string | null | undefined,
  dateParam: string
) {
  const dayType: DayType = intensityToDayType(sessionIntensity)

  const logsWithMacros = logs.map(log => {
    // Usar snapshot si está disponible (registros nuevos), sino calcular en runtime (backward compat)
    const macros: MacroTotals = log.kcalLogged != null
      ? { kcal: Math.round(log.kcalLogged), proteinG: log.proteinLogged!, carbsG: log.carbsLogged!, fatG: log.fatLogged! }
      : calcMacros(log.grams, log.food)
    return {
      id:       log.id,
      foodId:   log.foodId,
      food:     log.food,
      grams:    log.grams,
      mealType: log.mealType,
      date:     log.date,
      ...macros,
    }
  })

  const totals = logsWithMacros.reduce<MacroTotals>(
    (acc, l) => ({ kcal: acc.kcal + l.kcal, proteinG: acc.proteinG + l.proteinG, carbsG: acc.carbsG + l.carbsG, fatG: acc.fatG + l.fatG }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  const target = nutritionPlan ? calcNutritionTarget(nutritionPlan, dayType) : null
  const pct    = target ? calcProgressPct(totals, target) : null

  return { date: dateParam, dayType, logs: logsWithMacros, totals, target, pct }
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function parseFoodLogPost(body: unknown): { foodId: string; gramsNum: number; mealType: MealType; logDate: Date } | { error: string } {
  const { foodId, grams, mealType, date } = body as { foodId?: string; grams?: unknown; mealType?: string; date?: string }
  if (!foodId || !grams || !mealType) return { error: 'foodId, grams y mealType son requeridos' }
  if (!(VALID_MEAL_TYPES as readonly string[]).includes(mealType)) return { error: `mealType inválido. Valores válidos: ${VALID_MEAL_TYPES.join(', ')}` }
  const gramsNum = Number(grams)
  if (isNaN(gramsNum) || gramsNum <= 0) return { error: 'grams debe ser un número positivo' }
  if (gramsNum > 5000) return { error: 'grams no puede superar 5000g por registro' }
  if (date && !DATE_REGEX.test(date)) return { error: 'date debe tener formato YYYY-MM-DD' }
  // When no date is provided, callers should pass the timezone-aware date.
  // Fallback uses UTC — callers should always provide `date` from todayInTz(tz).
  const logDate = date
    ? new Date(`${date}T00:00:00.000Z`)
    : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
  return { foodId, gramsNum, mealType: mealType as MealType, logDate }
}
