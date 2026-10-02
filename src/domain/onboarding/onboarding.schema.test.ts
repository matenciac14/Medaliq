import { describe, it, expect } from 'vitest'
import { wizardDataSchema } from './onboarding.schema'

const VALID_DATA = {
  dateOfBirth: '1996-01-15',
  heightCm: 175,
  weightKg: 80,
  gender: 'male' as const,
  goal: 'LOSE_FAT' as const,
  weightGoalKg: 72,
  daysPerWeek: 4,
}

describe('wizardDataSchema', () => {
  it('acepta datos válidos', () => {
    const result = wizardDataSchema.safeParse(VALID_DATA)
    expect(result.success).toBe(true)
  })

  it('acepta goal null con activityType legacy', () => {
    const result = wizardDataSchema.safeParse({
      ...VALID_DATA,
      goal: null,
      activityType: 'GYM',
      gymGoal: 'MUSCLE_GAIN',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza weightKg fuera de rango', () => {
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, weightKg: -5 }).success).toBe(false)
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, weightKg: 500 }).success).toBe(false)
  })

  it('rechaza heightCm fuera de rango', () => {
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, heightCm: 50 }).success).toBe(false)
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, heightCm: 300 }).success).toBe(false)
  })

  it('rechaza daysPerWeek fuera de rango', () => {
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, daysPerWeek: 0 }).success).toBe(false)
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, daysPerWeek: 1 }).success).toBe(false)
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, daysPerWeek: 8 }).success).toBe(false)
  })

  it('rechaza goal inválido', () => {
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, goal: 'HACK_STRING' }).success).toBe(false)
  })

  it('rechaza gender inválido', () => {
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, gender: 'xyz' }).success).toBe(false)
  })

  it('requiere dateOfBirth o age', () => {
    const result = wizardDataSchema.safeParse({
      ...VALID_DATA,
      dateOfBirth: null,
      age: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('acepta age sin dateOfBirth (legacy mobile)', () => {
    const result = wizardDataSchema.safeParse({
      ...VALID_DATA,
      dateOfBirth: null,
      age: 30,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza dateOfBirth inválido', () => {
    const result = wizardDataSchema.safeParse({
      ...VALID_DATA,
      dateOfBirth: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza dateOfBirth que produce edad fuera de rango', () => {
    // Edad 5 años
    const fiveYearsAgo = new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, dateOfBirth: fiveYearsAgo }).success).toBe(false)
  })

  it('rechaza weightGoalKg >= weightKg para LOSE_FAT', () => {
    const result = wizardDataSchema.safeParse({
      ...VALID_DATA,
      goal: 'LOSE_FAT',
      weightKg: 80,
      weightGoalKg: 85,
    })
    expect(result.success).toBe(false)
  })

  it('acepta weightGoalKg < weightKg para LOSE_FAT', () => {
    const result = wizardDataSchema.safeParse({
      ...VALID_DATA,
      goal: 'LOSE_FAT',
      weightKg: 80,
      weightGoalKg: 72,
    })
    expect(result.success).toBe(true)
  })

  it('acepta weightGoalKg null', () => {
    const result = wizardDataSchema.safeParse({
      ...VALID_DATA,
      weightGoalKg: null,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza activityType inválido', () => {
    expect(wizardDataSchema.safeParse({ ...VALID_DATA, activityType: 'SWIMMING' }).success).toBe(false)
  })

  it('acepta gender other', () => {
    const result = wizardDataSchema.safeParse({ ...VALID_DATA, gender: 'other' })
    expect(result.success).toBe(true)
  })
})
