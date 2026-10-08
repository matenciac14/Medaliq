import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '../../generated/prisma/client'
import { getAthleteNutrition } from './get_athlete_nutrition.use_case'

function createMockDb() {
  return {
    coachAthlete: { findFirst: vi.fn() },
    mealPlan: { findUnique: vi.fn() },
    foodProfile: { findUnique: vi.fn() },
    foodLog: { findMany: vi.fn() },
    assignedNutritionPlan: { findUnique: vi.fn() },
    food: { findMany: vi.fn() },
  } as unknown as PrismaClient
}

describe('getAthleteNutrition', () => {
  it('throws 403 when no active CoachAthlete link exists', async () => {
    const db = createMockDb();
    (db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    try {
      await getAthleteNutrition('coach-1', 'athlete-1', db)
      expect.fail('should have thrown')
    } catch (err: unknown) {
      const error = err as { status: number; message: string }
      expect(error.status).toBe(403)
      expect(error.message).toBe('Acceso denegado')
    }
  })

  it('returns all expected fields', async () => {
    const db = createMockDb();
    (db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'link-1' });
    (db.mealPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'mp-1' });
    (db.foodProfile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'fp-1', availableFoodIds: [] });
    (db.foodLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.assignedNutritionPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await getAthleteNutrition('coach-1', 'athlete-1', db)
    expect(result).toHaveProperty('mealPlan')
    expect(result).toHaveProperty('foodProfile')
    expect(result).toHaveProperty('foodLogs')
    expect(result).toHaveProperty('assignedTemplate')
    expect(result).toHaveProperty('templateTotals')
    expect(result).toHaveProperty('athleteFoods')
  })

  it('when no assigned plan, assignedTemplate and templateTotals are null', async () => {
    const db = createMockDb();
    (db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'link-1' });
    (db.mealPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.foodProfile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'fp-1', availableFoodIds: [] });
    (db.foodLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.assignedNutritionPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await getAthleteNutrition('coach-1', 'athlete-1', db)
    expect(result.assignedTemplate).toBeNull()
    expect(result.templateTotals).toBeNull()
  })

  it('when assigned plan exists, templateTotals calculates correct macro sums per dayType', async () => {
    const db = createMockDb();
    (db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'link-1' });
    (db.mealPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.foodProfile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'fp-1', availableFoodIds: [] });
    (db.foodLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.assignedNutritionPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'anp-1',
      templateId: 'tmpl-1',
      assignedAt: new Date('2026-01-01'),
      template: {
        id: 'tmpl-1',
        name: 'Plan Volumen',
        goal: 'Ganar masa',
        days: [
          {
            dayType: 'hard',
            meals: [
              {
                order: 1,
                items: [
                  { kcal: 400, proteinG: 30, carbsG: 50, fatG: 10, food: { name: 'Arroz' } },
                  { kcal: 300, proteinG: 25, carbsG: 20, fatG: 15, food: { name: 'Pollo' } },
                ],
              },
            ],
          },
          {
            dayType: 'rest',
            meals: [
              {
                order: 1,
                items: [
                  { kcal: 200, proteinG: 15, carbsG: 25, fatG: 5, food: { name: 'Avena' } },
                ],
              },
            ],
          },
        ],
      },
    })

    const result = await getAthleteNutrition('coach-1', 'athlete-1', db)
    expect(result.assignedTemplate).not.toBeNull()
    expect(result.assignedTemplate!.template.name).toBe('Plan Volumen')

    expect(result.templateTotals).not.toBeNull()
    expect(result.templateTotals!['hard']).toEqual({ kcal: 700, proteinG: 55, carbsG: 70, fatG: 25 })
    expect(result.templateTotals!['rest']).toEqual({ kcal: 200, proteinG: 15, carbsG: 25, fatG: 5 })
  })

  it('when foodProfile has no availableFoodIds, athleteFoods is empty array', async () => {
    const db = createMockDb();
    (db.coachAthlete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'link-1' });
    (db.mealPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.foodProfile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'fp-1', availableFoodIds: [] });
    (db.foodLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.assignedNutritionPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await getAthleteNutrition('coach-1', 'athlete-1', db)
    expect(result.athleteFoods).toEqual([])
    // food.findMany should NOT have been called
    expect(db.food.findMany).not.toHaveBeenCalled()
  })
})
