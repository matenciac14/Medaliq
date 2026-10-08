import { describe, it, expect } from 'vitest'
import {
  usdToCopCents,
  usdToCopDisplay,
  ATHLETE_PRO_PRICE_USD,
  ATHLETE_PRO_ANNUAL_PRICE_USD,
  BILLING_CYCLE_DAYS,
} from './billing.types'

describe('usdToCopDisplay', () => {
  it('redondea al múltiplo de 100 más cercano', () => {
    // 9.99 * 3128.65 = 31.255,... → redondea a 31.300
    expect(usdToCopDisplay(9.99, 3128.65)).toBe(31_300)
  })

  it('plan gratuito devuelve 0', () => {
    expect(usdToCopDisplay(0, 3128.65)).toBe(0)
  })

  it('funciona con TRM alto', () => {
    // 39 * 4200 = 163.800 — exacto, no necesita redondeo
    expect(usdToCopDisplay(39, 4200)).toBe(163_800)
  })

  it('funciona con TRM bajo (valor actual ~3128)', () => {
    // 9.99 * 3128.65 ≈ 31.255 → 31.300
    const result = usdToCopDisplay(9.99, 3128.65)
    expect(result % 100).toBe(0) // siempre múltiplo de 100
    expect(result).toBeGreaterThan(0)
  })
})

describe('usdToCopCents', () => {
  it('devuelve centavos para Wompi (valor * 100)', () => {
    const display = usdToCopDisplay(9.99, 3128.65)
    const cents   = usdToCopCents(9.99, 3128.65)
    expect(cents).toBe(display * 100)
  })

  it('siempre múltiplo de 10000 (100 COP * 100 centavos)', () => {
    const cents = usdToCopCents(39, 4200)
    expect(cents % 10_000).toBe(0)
  })

  it('precio 0 devuelve 0 centavos', () => {
    expect(usdToCopCents(0, 3128.65)).toBe(0)
  })
})

describe('constantes de pricing atleta', () => {
  it('precio mensual es $9.99', () => {
    expect(ATHLETE_PRO_PRICE_USD).toBe(9.99)
  })

  it('precio anual es $59.99', () => {
    expect(ATHLETE_PRO_ANNUAL_PRICE_USD).toBe(59.99)
  })

  it('descuento anual es ~50% vs mensual x12', () => {
    const monthlyAnnual = ATHLETE_PRO_PRICE_USD * 12
    const discount = 1 - ATHLETE_PRO_ANNUAL_PRICE_USD / monthlyAnnual
    expect(discount).toBeGreaterThanOrEqual(0.49)
    expect(discount).toBeLessThanOrEqual(0.51)
  })
})

describe('BILLING_CYCLE_DAYS', () => {
  it('monthly = 30 dias', () => {
    expect(BILLING_CYCLE_DAYS.monthly).toBe(30)
  })

  it('annual = 365 dias', () => {
    expect(BILLING_CYCLE_DAYS.annual).toBe(365)
  })
})
