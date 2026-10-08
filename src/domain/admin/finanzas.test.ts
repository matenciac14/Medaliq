import { describe, it, expect } from 'vitest'
import { coachTierFee, coachTierFeeLabel, mrrAthletes, mrrCoaches, ATHLETE_PRO_PRICE_USD } from './finanzas'

// ---------------------------------------------------------------------------
// coachTierFee — tier plano
// ---------------------------------------------------------------------------
describe('coachTierFee', () => {
  it('STARTER → $0', () => {
    expect(coachTierFee('STARTER')).toBe(0)
    expect(coachTierFee('STARTER', 2)).toBe(0)
  })

  it('GROWTH → $59', () => {
    expect(coachTierFee('GROWTH')).toBe(59)
    expect(coachTierFee('GROWTH', 10)).toBe(59)
  })

  it('PRO → $139', () => {
    expect(coachTierFee('PRO')).toBe(139)
    expect(coachTierFee('PRO', 30)).toBe(139)
  })

  it('SCALE ≤30 atletas → $139', () => {
    expect(coachTierFee('SCALE')).toBe(139)
    expect(coachTierFee('SCALE', 30)).toBe(139)
  })

  it('SCALE 50 atletas → $139 + 20×$4 = $219', () => {
    expect(coachTierFee('SCALE', 50)).toBe(219)
  })

  it('SCALE 100 atletas → $139 + 70×$4 = $419', () => {
    expect(coachTierFee('SCALE', 100)).toBe(419)
  })
})

// ---------------------------------------------------------------------------
// coachTierFeeLabel — etiqueta de tier
// ---------------------------------------------------------------------------
describe('coachTierFeeLabel', () => {
  it('STARTER → "Starter — $0/mes"', () => {
    expect(coachTierFeeLabel('STARTER')).toBe('Starter — $0/mes')
  })

  it('GROWTH → "Growth — $59/mes"', () => {
    expect(coachTierFeeLabel('GROWTH')).toBe('Growth — $59/mes')
  })

  it('PRO → "Pro — $139/mes"', () => {
    expect(coachTierFeeLabel('PRO')).toBe('Pro — $139/mes')
  })

  it('SCALE ≤30 → "Scale — $139/mes"', () => {
    expect(coachTierFeeLabel('SCALE', 30)).toBe('Scale — $139/mes')
  })

  it('SCALE 50 → incluye extra', () => {
    expect(coachTierFeeLabel('SCALE', 50)).toContain('Scale+')
  })
})

// ---------------------------------------------------------------------------
// mrrAthletes — MRR de atletas Pro
// ---------------------------------------------------------------------------
describe('mrrAthletes', () => {
  it('0 atletas Pro → 0', () => {
    expect(mrrAthletes(0)).toBe(0)
  })

  it('10 atletas Pro → 10 × precio unitario', () => {
    expect(mrrAthletes(10)).toBeCloseTo(10 * ATHLETE_PRO_PRICE_USD)
  })
})

// ---------------------------------------------------------------------------
// mrrCoaches — suma de fees de coaches
// ---------------------------------------------------------------------------
describe('mrrCoaches', () => {
  it('lista vacía → 0', () => {
    expect(mrrCoaches([])).toBe(0)
  })

  it('suma correctamente los fees de distintos coaches', () => {
    expect(mrrCoaches([300, 550, 0, 150])).toBe(1000)
  })
})
