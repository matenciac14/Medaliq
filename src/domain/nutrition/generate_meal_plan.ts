/**
 * Shared meal plan generation logic — used by web and mobile generate-meals routes.
 *
 * Separates:
 *  - buildStaticMealPlan()  — deterministic meal plan generation
 *  - parseMealPlanData()    — validates raw DB Json before passing to components
 */

import { calculateTDEE, calculateMacros } from '@/domain/plan/formulas'
import { REST_CARBS_MULTIPLIER } from '@/domain/nutrition/nutrition_constants'

export type GenerateMealsInput = {
  availableFoods: string[]
  availableFoodIds?: string[]
  restrictions: string[]
  mealsPerDay: number
  weighsFood: boolean
  notes?: string
}

type ProfileInput = {
  weightKg: number | null
  heightCm: number | null
  age: number | null
  gender: string | null
  weightGoalKg: number | null
  sport: string | null
}

export type MacroTargets = ReturnType<typeof calculateMacros>

export type DbFood = {
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  servingG: number
  servingLabel: string | null
}

type Meal = { time: string; label: string; foods: string; kcal: number; protein: number; carbs: number; fat: number }
type Supplement = { name: string; dose: string; when: string; purpose: string }
type DayPlan = { meals: Meal[]; supplements: Supplement[]; hydrationL: number; rules: string[] }

export type StaticMealPlan = { hard: DayPlan; easy: DayPlan; rest: DayPlan }

/**
 * Validates raw mealPlan.data from DB before passing to UI components.
 * Returns null if the data is structurally invalid (missing hard/easy/rest keys).
 * Components handle empty meals[] gracefully — this only catches completely corrupt data.
 */
export function parseMealPlanData(raw: unknown): StaticMealPlan | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!r.hard || !r.easy || !r.rest) return null
  return raw as StaticMealPlan
}

const PROTEIN_CATS = new Set(['PROTEIN', 'DAIRY'])
const CARB_CATS    = new Set(['CARB', 'LEGUME'])
const VEG_CATS     = new Set(['VEGETABLE', 'FRUIT'])
const FAT_CATS     = new Set(['FAT', 'NUT_SEED'])

function describeFood(food: DbFood, targetMacroG: number, macroKey: 'proteinPer100g' | 'carbsPer100g', weighsFood: boolean): string {
  if (weighsFood) {
    const per100 = food[macroKey]
    const g = per100 > 0
      ? Math.min(500, Math.max(50, Math.round((targetMacroG * 0.85 / per100) * 100)))
      : food.servingG
    const kcal = Math.round(g * food.kcalPer100g / 100)
    const protein = Math.round(g * food.proteinPer100g / 100)
    return `${food.name} — ${g}g (${kcal} kcal, ${protein}g prot)`
  }
  return food.servingLabel ? `${food.servingLabel} ${food.name}` : food.name
}

function buildFoodLine(
  i: number,
  proteinG: number,
  carbsG: number,
  proteins: DbFood[],
  carbs: DbFood[],
  vegs: DbFood[],
  fallback: string,
  weighsFood: boolean,
): string {
  const parts: string[] = []

  if (proteins.length > 0) {
    const p = proteins[i % proteins.length]
    parts.push(describeFood(p, proteinG, 'proteinPer100g', weighsFood))
  }

  if (carbs.length > 0) {
    const c = carbs[i % carbs.length]
    parts.push(describeFood(c, carbsG, 'carbsPer100g', weighsFood))
  }

  if (vegs.length > 0) {
    const v = vegs[i % vegs.length]
    if (weighsFood) {
      const kcal = Math.round(80 * v.kcalPer100g / 100)
      parts.push(`${v.name} — 80g (${kcal} kcal)`)
    } else {
      parts.push(v.servingLabel ? `${v.servingLabel} ${v.name}` : v.name)
    }
  }

  return parts.length > 0 ? parts.join(weighsFood ? '\n' : ' · ') : fallback
}

export function computeNutritionTargets(profile: ProfileInput) {
  const tdee = calculateTDEE(
    profile.weightKg ?? 70,
    profile.heightCm ?? 170,
    profile.age ?? 30,
    (profile.gender ?? 'male') as 'male' | 'female',
    5
  )
  const kcalAdjustment = profile.weightGoalKg ? -500 : 0
  const macros = calculateMacros(tdee, profile.weightKg ?? 70, kcalAdjustment)
  return { tdee, macros }
}

/**
 * Generador determinista de plan de comidas.
 * Distribuye los macros calculados entre las comidas disponibles.
 * Si se pasan dbFoods, calcula porciones en gramos exactos (weighsFood=true)
 * o medidas caseras (weighsFood=false).
 */
export function buildStaticMealPlan(macros: MacroTargets, input: GenerateMealsInput, dbFoods?: DbFood[]): StaticMealPlan {
  const foods = input.availableFoods
  const n = Math.max(2, Math.min(6, input.mealsPerDay))

  const TIME_SLOTS = ['07:00', '10:30', '13:00', '16:30', '19:30', '21:00']
  const LABELS     = ['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena', 'Post-cena']

  // Categorizar alimentos de la DB que el usuario tiene disponibles
  const proteins = dbFoods?.filter(f => PROTEIN_CATS.has(f.category)) ?? []
  const carbFoods = dbFoods?.filter(f => CARB_CATS.has(f.category)) ?? []
  const vegFoods  = dbFoods?.filter(f => VEG_CATS.has(f.category)) ?? []
  const fatFoods  = dbFoods?.filter(f => FAT_CATS.has(f.category)) ?? []

  // Para comidas ligeras (media mañana, merienda): usar frutas/grasas si hay
  const snackFoods = [...vegFoods, ...fatFoods]

  function buildMeals(kcal: number, protein: number, carbs: number, fat: number) {
    return Array.from({ length: n }, (_, i) => {
      const isSnack  = n >= 4 && (i === 1 || i === n - 1)
      const fallback = foods[i % foods.length] ?? 'Según disponibilidad'

      let foodsLine: string
      if (dbFoods && dbFoods.length > 0) {
        if (isSnack && snackFoods.length > 0) {
          const s = snackFoods[i % snackFoods.length]
          if (input.weighsFood) {
            const kcal = Math.round(s.servingG * s.kcalPer100g / 100)
            const protein = Math.round(s.servingG * s.proteinPer100g / 100)
            foodsLine = `${s.name} — ${s.servingG}g (${kcal} kcal, ${protein}g prot)`
          } else {
            foodsLine = s.servingLabel ? `${s.servingLabel} ${s.name}` : s.name
          }
        } else {
          foodsLine = buildFoodLine(i, protein / n, carbs / n, proteins, carbFoods, vegFoods, fallback, input.weighsFood)
        }
      } else {
        foodsLine = fallback
      }

      return {
        time:    TIME_SLOTS[i] ?? `${7 + i * 3}:00`,
        label:   LABELS[i]    ?? `Comida ${i + 1}`,
        foods:   foodsLine,
        kcal:    Math.round(kcal    / n),
        protein: Math.round(protein / n),
        carbs:   Math.round(carbs   / n),
        fat:     Math.round(fat     / n),
      }
    })
  }

  const baseRules = [
    'Plan base generado automáticamente — ajusta cantidades según tu apetito real.',
    'Distribuye la proteína uniformemente entre todas las comidas.',
    'Consume más carbohidratos antes y después del entrenamiento.',
    'Hidratación mínima: 35 ml por kg de peso corporal.',
  ]

  const hydration = { hard: 2.5, easy: 2.0, rest: 1.8 }
  const restCarbs = Math.round(macros.easy.carbs * REST_CARBS_MULTIPLIER)

  return {
    hard: {
      meals: buildMeals(macros.hard.kcal, macros.hard.protein, macros.hard.carbs, macros.hard.fat),
      supplements: [{ name: 'Agua', dose: '2.5L', when: 'Durante el día', purpose: 'Hidratación base' }],
      hydrationL: hydration.hard,
      rules: baseRules,
    },
    easy: {
      meals: buildMeals(macros.easy.kcal, macros.easy.protein, macros.easy.carbs, macros.easy.fat),
      supplements: [{ name: 'Agua', dose: '2L', when: 'Durante el día', purpose: 'Hidratación base' }],
      hydrationL: hydration.easy,
      rules: baseRules,
    },
    rest: {
      meals: buildMeals(macros.rest.kcal, macros.rest.protein, restCarbs, macros.rest.fat),
      supplements: [{ name: 'Agua', dose: '1.8L', when: 'Durante el día', purpose: 'Hidratación base' }],
      hydrationL: hydration.rest,
      rules: baseRules,
    },
  }
}
