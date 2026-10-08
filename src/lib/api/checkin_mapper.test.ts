import { describe, it, expect } from 'vitest'
import { mapWebCheckinBody, mapMobileCheckinBody } from './checkin_mapper'

describe('mapWebCheckinBody', () => {
  it('mapea hardestRpe → rpe', () => {
    const result = mapWebCheckinBody({ hardestRpe: 8 })
    expect(result.rpe).toBe(8)
  })

  it('mapea nutritionAdherencePct (0-100) → nutritionAdherence (1-10)', () => {
    const result = mapWebCheckinBody({ nutritionAdherencePct: 75 })
    expect(result.nutritionAdherence).toBe(8) // round(75/10) = 8
  })

  it('mapea painDescription', () => {
    const result = mapWebCheckinBody({ painDescription: 'dolor rodilla' })
    expect(result.painDescription).toBe('dolor rodilla')
  })

  it('mapea body measurements', () => {
    const result = mapWebCheckinBody({ waistCm: 80, armsCm: 35, hipsCm: 95, thighsCm: 55 })
    expect(result.waistCm).toBe(80)
    expect(result.armsCm).toBe(35)
    expect(result.hipsCm).toBe(95)
    expect(result.thighsCm).toBe(55)
  })

  it('campos undefined no aparecen', () => {
    const result = mapWebCheckinBody({})
    expect(result.rpe).toBeUndefined()
    expect(result.nutritionAdherence).toBeUndefined()
    expect(result.painDescription).toBeUndefined()
  })
})

describe('mapMobileCheckinBody', () => {
  it('mapea muscleSoreness → rpe', () => {
    const result = mapMobileCheckinBody({ muscleSoreness: 7 })
    expect(result.rpe).toBe(7)
  })

  it('mapea energyLevel directamente', () => {
    const result = mapMobileCheckinBody({ energyLevel: 5 })
    expect(result.energyLevel).toBe(5)
  })

  it('mapea stressLevel con min 0 (acepta 0)', () => {
    const result = mapMobileCheckinBody({ stressLevel: 0 })
    expect(result.stressLevel).toBe(0)
  })

  it('mapea painDescription (paridad con web)', () => {
    const result = mapMobileCheckinBody({ painDescription: 'dolor hombro' })
    expect(result.painDescription).toBe('dolor hombro')
  })

  it('mapea nutritionAdherencePct → nutritionAdherence (escala 1-10)', () => {
    const result = mapMobileCheckinBody({ nutritionAdherencePct: 50 })
    expect(result.nutritionAdherence).toBe(5) // round(50/10) = 5
  })

  it('todos los campos opcionales (paridad con web)', () => {
    const result = mapMobileCheckinBody({})
    expect(result.rpe).toBeUndefined()
    expect(result.energyLevel).toBeUndefined()
    expect(result.painDescription).toBeUndefined()
  })

  it('body measurements', () => {
    const result = mapMobileCheckinBody({ waistCm: 80, armsCm: 35, hipsCm: 95, thighsCm: 55 })
    expect(result.waistCm).toBe(80)
    expect(result.armsCm).toBe(35)
  })
})

describe('paridad web ↔ mobile', () => {
  it('mismos inputs producen mismo CheckInInput', () => {
    const webResult = mapWebCheckinBody({
      hardestRpe: 7,
      sleepHours: 8,
      energyLevel: 6,
      stressLevel: 3,
      weightKg: 75,
      hrResting: 60,
      painLevel: 2,
      nutritionAdherencePct: 80,
      motivationLevel: 7,
      notes: 'buen dia',
      painDescription: 'leve dolor espalda',
      waistCm: 80,
    })

    const mobileResult = mapMobileCheckinBody({
      muscleSoreness: 7,
      sleepHours: 8,
      energyLevel: 6,
      stressLevel: 3,
      weightKg: 75,
      hrResting: 60,
      painLevel: 2,
      nutritionAdherencePct: 80,
      motivationLevel: 7,
      notes: 'buen dia',
      painDescription: 'leve dolor espalda',
      waistCm: 80,
    })

    expect(webResult.rpe).toBe(mobileResult.rpe)
    expect(webResult.sleepHours).toBe(mobileResult.sleepHours)
    expect(webResult.energyLevel).toBe(mobileResult.energyLevel)
    expect(webResult.stressLevel).toBe(mobileResult.stressLevel)
    expect(webResult.weight).toBe(mobileResult.weight)
    expect(webResult.heartRate).toBe(mobileResult.heartRate)
    expect(webResult.painLevel).toBe(mobileResult.painLevel)
    expect(webResult.nutritionAdherence).toBe(mobileResult.nutritionAdherence)
    expect(webResult.motivation).toBe(mobileResult.motivation)
    expect(webResult.notes).toBe(mobileResult.notes)
    expect(webResult.painDescription).toBe(mobileResult.painDescription)
    expect(webResult.waistCm).toBe(mobileResult.waistCm)
  })
})
