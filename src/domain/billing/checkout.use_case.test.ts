import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateCoachUpgrade,
  nextCoachTier,
  createCoachCheckout,
  createAthleteCheckout,
} from './checkout.use_case'
import type { IPaymentGateway } from '../ports/payment_gateway'
import type { CoachCheckoutInput, AthleteCheckoutInput } from './billing.types'

// ── Mock gateway ──────────────────────────────────────────────────────────────

const mockCoachCheckout = vi.fn().mockResolvedValue({
  checkoutUrl: 'https://pay.dev/coach',
  sessionId: 'sess_coach_123',
})
const mockAthleteCheckout = vi.fn().mockResolvedValue({
  checkoutUrl: 'https://pay.dev/athlete',
  sessionId: 'sess_athlete_456',
})

const mockGateway: IPaymentGateway = {
  createCoachCheckout: mockCoachCheckout,
  createAthleteCheckout: mockAthleteCheckout,
  parseWebhookEvent: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

// ── validateCoachUpgrade ──────────────────────────────────────────────────────

describe('validateCoachUpgrade', () => {
  it('permite upgrades válidos', () => {
    expect(() => validateCoachUpgrade('STARTER', 'GROWTH')).not.toThrow()
    expect(() => validateCoachUpgrade('STARTER', 'PRO')).not.toThrow()
    expect(() => validateCoachUpgrade('STARTER', 'SCALE')).not.toThrow()
    expect(() => validateCoachUpgrade('GROWTH', 'PRO')).not.toThrow()
    expect(() => validateCoachUpgrade('GROWTH', 'SCALE')).not.toThrow()
    expect(() => validateCoachUpgrade('PRO', 'SCALE')).not.toThrow()
  })

  it('rechaza downgrade a tier inferior', () => {
    expect(() => validateCoachUpgrade('GROWTH', 'STARTER')).toThrow()
    expect(() => validateCoachUpgrade('PRO', 'GROWTH')).toThrow()
    expect(() => validateCoachUpgrade('SCALE', 'PRO')).toThrow()
    expect(() => validateCoachUpgrade('SCALE', 'STARTER')).toThrow()
  })

  it('rechaza "upgrade" al mismo tier', () => {
    expect(() => validateCoachUpgrade('STARTER', 'STARTER')).toThrow()
    expect(() => validateCoachUpgrade('GROWTH', 'GROWTH')).toThrow()
    expect(() => validateCoachUpgrade('SCALE', 'SCALE')).toThrow()
  })
})

// ── nextCoachTier ─────────────────────────────────────────────────────────────

describe('nextCoachTier', () => {
  it('devuelve el tier inmediatamente superior', () => {
    expect(nextCoachTier('STARTER')).toBe('GROWTH')
    expect(nextCoachTier('GROWTH')).toBe('PRO')
    expect(nextCoachTier('PRO')).toBe('SCALE')
  })

  it('devuelve null en el tier máximo (SCALE)', () => {
    expect(nextCoachTier('SCALE')).toBeNull()
  })
})

// ── createCoachCheckout ───────────────────────────────────────────────────────

describe('createCoachCheckout', () => {
  it('llama al gateway con los parámetros correctos', async () => {
    const input: CoachCheckoutInput = {
      userId: 'u1',
      currentTier: 'STARTER',
      targetTier: 'GROWTH',
      successUrl: 'https://app/billing/success',
      cancelUrl: 'https://app/billing/cancel',
    }
    const result = await createCoachCheckout(input, mockGateway)

    expect(mockCoachCheckout).toHaveBeenCalledOnce()
    expect(mockCoachCheckout).toHaveBeenCalledWith(input)
    expect(result.checkoutUrl).toBe('https://pay.dev/coach')
    expect(result.sessionId).toBe('sess_coach_123')
  })

  it('propaga el error de validateCoachUpgrade sin llamar al gateway', async () => {
    const input: CoachCheckoutInput = {
      userId: 'u1',
      currentTier: 'PRO',
      targetTier: 'STARTER',
      successUrl: 'https://app/billing/success',
      cancelUrl: 'https://app/billing/cancel',
    }
    await expect(createCoachCheckout(input, mockGateway)).rejects.toThrow()
    expect(mockCoachCheckout).not.toHaveBeenCalled()
  })
})

// ── createAthleteCheckout ─────────────────────────────────────────────────────

describe('createAthleteCheckout', () => {
  it('llama al gateway con ciclo mensual y retorna el checkout output', async () => {
    const input: AthleteCheckoutInput = {
      userId: 'u2',
      billingCycle: 'monthly',
      successUrl: 'https://app/dashboard?billing=success',
      cancelUrl: 'https://app/dashboard?billing=cancelled',
    }
    const result = await createAthleteCheckout(input, mockGateway)

    expect(mockAthleteCheckout).toHaveBeenCalledOnce()
    expect(mockAthleteCheckout).toHaveBeenCalledWith(input)
    expect(result.checkoutUrl).toBe('https://pay.dev/athlete')
    expect(result.sessionId).toBe('sess_athlete_456')
  })

  it('llama al gateway con ciclo anual', async () => {
    const input: AthleteCheckoutInput = {
      userId: 'u3',
      billingCycle: 'annual',
      successUrl: 'https://app/dashboard?billing=success',
      cancelUrl: 'https://app/dashboard?billing=cancelled',
    }
    await createAthleteCheckout(input, mockGateway)

    expect(mockAthleteCheckout).toHaveBeenCalledWith(input)
  })
})
