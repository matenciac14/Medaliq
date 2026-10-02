import { describe, it, expect } from 'vitest'
import { buildAssignedMealPlan, buildMealChecklist } from './get_nutrition_today.use_case'

// ── buildAssignedMealPlan ──

describe('buildAssignedMealPlan', () => {
  it('returns null when no assigned plan', () => {
    expect(buildAssignedMealPlan(null)).toBeNull()
  })

  it('returns meal plans for each day type', () => {
    const assignedPlan = {
      template: {
        days: [
          {
            dayType: 'HARD',
            meals: [
              {
                mealType: 'BREAKFAST',
                items: [
                  { food: { name: 'Avena', kcalPer100g: 350, proteinPer100g: 12 }, grams: 100 },
                ],
              },
            ],
          },
          {
            dayType: 'EASY',
            meals: [
              {
                mealType: 'LUNCH',
                items: [
                  { food: { name: 'Arroz', kcalPer100g: 130, proteinPer100g: 3 }, grams: 200 },
                ],
              },
            ],
          },
          {
            dayType: 'REST',
            meals: [],
          },
        ],
      },
    }

    const result = buildAssignedMealPlan(assignedPlan)
    expect(result).not.toBeNull()
    expect(result!.hard.meals).toHaveLength(1)
    expect(result!.hard.meals[0].label).toBe('Desayuno')
    expect(result!.hard.meals[0].kcal).toBe(350)
    expect(result!.hard.meals[0].protein).toBe(12)
    expect(result!.easy.meals).toHaveLength(1)
    expect(result!.easy.meals[0].label).toBe('Almuerzo')
    expect(result!.rest.meals).toHaveLength(0)
  })

  it('handles missing day type gracefully', () => {
    const result = buildAssignedMealPlan({
      template: { days: [{ dayType: 'HARD', meals: [] }] },
    })
    expect(result!.easy.meals).toHaveLength(0)
    expect(result!.rest.meals).toHaveLength(0)
  })
})

// ── buildMealChecklist ──

describe('buildMealChecklist', () => {
  it('returns empty when no meal plan', () => {
    expect(buildMealChecklist(null, 'easy', new Set())).toEqual([])
  })

  it('returns empty when day has no meals', () => {
    const plan = { hard: { meals: [] }, easy: { meals: [] }, rest: { meals: [] } }
    expect(buildMealChecklist(plan, 'easy', new Set())).toEqual([])
  })

  it('builds checklist with isLogged status', () => {
    const plan = {
      hard: { meals: [] },
      easy: {
        meals: [
          { label: 'Desayuno', foods: 'Avena 100g', kcal: 350, protein: 12 },
          { label: 'Almuerzo', foods: 'Arroz 200g', kcal: 260, protein: 6 },
        ],
      },
      rest: { meals: [] },
    }
    const logged = new Set(['BREAKFAST'])
    const result = buildMealChecklist(plan, 'easy', logged)

    expect(result).toHaveLength(2)
    expect(result[0].mealType).toBe('BREAKFAST')
    expect(result[0].isLogged).toBe(true)
    expect(result[0].kcal).toBe(350)
    expect(result[0].proteinG).toBe(12)
    expect(result[1].mealType).toBe('LUNCH')
    expect(result[1].isLogged).toBe(false)
  })

  it('selects correct day by intensity', () => {
    const plan = {
      hard: { meals: [{ label: 'Desayuno', foods: 'Huevos', kcal: 200, protein: 14 }] },
      easy: { meals: [] },
      rest: { meals: [{ label: 'Cena', foods: 'Sopa', kcal: 150, protein: 8 }] },
    }

    const hardResult = buildMealChecklist(plan, 'hard', new Set())
    expect(hardResult).toHaveLength(1)
    expect(hardResult[0].label).toBe('Desayuno')

    const restResult = buildMealChecklist(plan, 'rest', new Set())
    expect(restResult).toHaveLength(1)
    expect(restResult[0].label).toBe('Cena')
  })

  it('defaults proteinG to 0 when protein is undefined', () => {
    const plan = {
      hard: { meals: [] },
      easy: { meals: [{ label: 'Merienda', foods: 'Fruta', kcal: 80 }] },
      rest: { meals: [] },
    }
    const result = buildMealChecklist(plan, 'easy', new Set())
    expect(result[0].proteinG).toBe(0)
  })
})
