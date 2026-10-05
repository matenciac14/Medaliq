import { describe, it, expect } from 'vitest'
import { computeAthleteFeatures, getCoachLimits, configToAthleteFeatures } from './tier_features'
import type { TierFeatureConfigShape } from './tier_features'

// ─── computeAthleteFeatures ───────────────────────────────────────────────────

describe('computeAthleteFeatures — PRO', () => {
  it('tiene acceso completo excepto coach', () => {
    const f = computeAthleteFeatures('PRO')
    expect(f.plan).toBe(true)
    expect(f.checkin).toBe(true)
    expect(f.nutrition).toBe(true)
    expect(f.progress).toBe(true)
    expect(f.log).toBe(true)
    expect(f.gym).toBe(true)
    expect(f.coach).toBe(false)
  })
})

describe('computeAthleteFeatures — FREE', () => {
  // FREE = capa de tracking: log, nutrición, gym — SIN plan adaptativo ni inteligencia
  it('tiene acceso a log, nutrition y gym', () => {
    const f = computeAthleteFeatures('FREE')
    expect(f.log).toBe(true)
    expect(f.nutrition).toBe(true)
    expect(f.gym).toBe(true)
  })

  it('no tiene acceso a plan, checkin ni progress (gate de pago)', () => {
    const f = computeAthleteFeatures('FREE')
    expect(f.plan).toBe(false)
    expect(f.checkin).toBe(false)
    expect(f.progress).toBe(false)
    expect(f.coach).toBe(false)
  })
})

// ─── getCoachLimits ───────────────────────────────────────────────────────────

describe('getCoachLimits — límites correctos por tier', () => {
  it('STARTER: máximo 2 asesorados', () => {
    expect(getCoachLimits('STARTER').maxAthletes).toBe(2)
  })

  it('GROWTH: máximo 10 asesorados', () => {
    expect(getCoachLimits('GROWTH').maxAthletes).toBe(10)
  })

  it('PRO: máximo 30 asesorados', () => {
    expect(getCoachLimits('PRO').maxAthletes).toBe(30)
  })

  it('SCALE: sin límite (Infinity)', () => {
    expect(getCoachLimits('SCALE').maxAthletes).toBe(Infinity)
  })
})

describe('getCoachLimits — enforcement pattern', () => {
  it('STARTER con 2 activos bloquea (activeCount >= maxAthletes)', () => {
    const { maxAthletes } = getCoachLimits('STARTER')
    expect(2 >= maxAthletes).toBe(true)
  })

  it('STARTER con 1 activo permite agregar', () => {
    const { maxAthletes } = getCoachLimits('STARTER')
    expect(1 >= maxAthletes).toBe(false)
  })

  it('SCALE nunca bloquea independientemente de la cantidad', () => {
    const { maxAthletes } = getCoachLimits('SCALE')
    expect(10_000 >= maxAthletes).toBe(false)
  })

  it('GROWTH con 25 activos bloquea', () => {
    const { maxAthletes } = getCoachLimits('GROWTH')
    expect(25 >= maxAthletes).toBe(true)
  })
})

// ─── configToAthleteFeatures ──────────────────────────────────────────────────

describe('configToAthleteFeatures', () => {
  it('mapea correctamente todos los campos de TierFeatureConfig', () => {
    const config: TierFeatureConfigShape = {
      featurePlan: true,
      featureCheckin: true,
      featureNutrition: true,
      featureProgress: true,
      featureLog: true,
      featureGym: true,
    }
    const f = configToAthleteFeatures(config)
    expect(f.plan).toBe(true)
    expect(f.checkin).toBe(true)
    expect(f.nutrition).toBe(true)
    expect(f.progress).toBe(true)
    expect(f.log).toBe(true)
    expect(f.gym).toBe(true)
  })

  it('coach siempre es false independientemente del config', () => {
    const config: TierFeatureConfigShape = {
      featurePlan: true,
      featureCheckin: true,
      featureNutrition: true,
      featureProgress: true,
      featureLog: true,
      featureGym: true,
    }
    expect(configToAthleteFeatures(config).coach).toBe(false)
  })

  it('respeta campos en false', () => {
    const config: TierFeatureConfigShape = {
      featurePlan: false,
      featureCheckin: false,
      featureNutrition: false,
      featureProgress: false,
      featureLog: false,
      featureGym: false,
    }
    const f = configToAthleteFeatures(config)
    expect(f.plan).toBe(false)
    expect(f.checkin).toBe(false)
    expect(f.nutrition).toBe(false)
    expect(f.progress).toBe(false)
    expect(f.log).toBe(false)
    expect(f.gym).toBe(false)
    expect(f.coach).toBe(false)
  })
})
