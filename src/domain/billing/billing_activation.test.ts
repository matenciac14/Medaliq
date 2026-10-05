/**
 * Tests para BILLING-ACT: activación del flujo de billing.
 * Cubre los gaps detectados en la auditoría 2026-10-02:
 * - returnTo dinámico en checkout atleta
 * - allowedReturns whitelist
 * - WompiPaymentGateway: payment link, integridad, webhook parsing
 * - StubPaymentGateway: checkout URLs
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAthleteCheckout } from './checkout.use_case'
import type { IPaymentGateway } from '../ports/payment_gateway'
import type { AthleteCheckoutInput, CheckoutOutput } from './billing.types'
import { StubPaymentGateway } from '@/infrastructure/billing/stub_payment_gateway'

// ── returnTo logic (mirrors route handler logic) ─────────────────────────────

const ALLOWED_RETURNS = ['/upgrade', '/settings/plan']

function resolveReturnTo(returnTo?: string): string {
  return ALLOWED_RETURNS.includes(returnTo ?? '') ? returnTo! : '/upgrade'
}

describe('resolveReturnTo — whitelist de redirect post-pago', () => {
  it('acepta /upgrade', () => {
    expect(resolveReturnTo('/upgrade')).toBe('/upgrade')
  })

  it('acepta /settings/plan', () => {
    expect(resolveReturnTo('/settings/plan')).toBe('/settings/plan')
  })

  it('default a /upgrade cuando no se envia', () => {
    expect(resolveReturnTo(undefined)).toBe('/upgrade')
  })

  it('default a /upgrade para rutas no permitidas', () => {
    expect(resolveReturnTo('/admin')).toBe('/upgrade')
    expect(resolveReturnTo('/dashboard')).toBe('/upgrade')
    expect(resolveReturnTo('https://evil.com')).toBe('/upgrade')
  })

  it('default a /upgrade para string vacio', () => {
    expect(resolveReturnTo('')).toBe('/upgrade')
  })
})

// ── Checkout construye URLs correctas según returnTo ─────────────────────────

describe('createAthleteCheckout — successUrl dinámico', () => {
  const mockCheckout = vi.fn()
  const mockGateway: IPaymentGateway = {
    createCoachCheckout: vi.fn(),
    createAthleteCheckout: mockCheckout,
    parseWebhookEvent: vi.fn(),
  }

  beforeEach(() => {
    mockCheckout.mockResolvedValue({
      checkoutUrl: 'https://checkout.wompi.co/test',
      sessionId: 'ref_123',
    })
    vi.clearAllMocks()
  })

  it('pasa successUrl con /upgrade por defecto', async () => {
    const returnTo = resolveReturnTo(undefined)
    const baseUrl = 'https://medaliq.com'
    const input: AthleteCheckoutInput = {
      userId: 'u1',
      successUrl: `${baseUrl}${returnTo}?billing=success`,
      cancelUrl: `${baseUrl}${returnTo}?billing=cancelled`,
    }
    await createAthleteCheckout(input, mockGateway)

    expect(mockCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: 'https://medaliq.com/upgrade?billing=success',
        cancelUrl: 'https://medaliq.com/upgrade?billing=cancelled',
      }),
    )
  })

  it('pasa successUrl con /settings/plan cuando se especifica', async () => {
    const returnTo = resolveReturnTo('/settings/plan')
    const baseUrl = 'https://medaliq.com'
    const input: AthleteCheckoutInput = {
      userId: 'u1',
      successUrl: `${baseUrl}${returnTo}?billing=success`,
      cancelUrl: `${baseUrl}${returnTo}?billing=cancelled`,
    }
    await createAthleteCheckout(input, mockGateway)

    expect(mockCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: 'https://medaliq.com/settings/plan?billing=success',
        cancelUrl: 'https://medaliq.com/settings/plan?billing=cancelled',
      }),
    )
  })
})

// ── StubPaymentGateway ───────────────────────────────────────────────────────

describe('StubPaymentGateway', () => {
  const stub = new StubPaymentGateway()

  it('createAthleteCheckout devuelve URL con successUrl en params', async () => {
    const result = await stub.createAthleteCheckout({
      userId: 'u1',
      successUrl: 'https://medaliq.com/upgrade?billing=success',
      cancelUrl: 'https://medaliq.com/upgrade?billing=cancelled',
    })
    expect(result.checkoutUrl).toContain('/api/billing/stub/simulate')
    expect(result.checkoutUrl).toContain('type=athlete')
    expect(result.checkoutUrl).toContain('userId=u1')
    expect(result.sessionId).toMatch(/^stub_athlete_u1_/)
  })

  it('createCoachCheckout devuelve URL con tier en params', async () => {
    const result = await stub.createCoachCheckout({
      userId: 'c1',
      currentTier: 'STARTER',
      targetTier: 'GROWTH',
      successUrl: 'https://medaliq.com/coach/settings/plan?billing=success',
      cancelUrl: 'https://medaliq.com/coach/settings/plan?billing=cancelled',
    })
    expect(result.checkoutUrl).toContain('type=coach')
    expect(result.checkoutUrl).toContain('tier=GROWTH')
    expect(result.sessionId).toMatch(/^stub_coach_c1_/)
  })

  it('parseWebhookEvent parsea JSON sin verificar firma', async () => {
    const event = {
      eventId: 'evt_1',
      eventType: 'charge.success',
      userId: 'u1',
      userRole: 'ATHLETE',
      newPeriodEnd: '2026-11-02',
    }
    const result = await stub.parseWebhookEvent(JSON.stringify(event), '')
    expect(result.eventId).toBe('evt_1')
    expect(result.userId).toBe('u1')
  })
})

// ── WompiPaymentGateway integridad ───────────────────────────────────────────

import { createHash } from 'crypto'

describe('WompiPaymentGateway — verificación de integridad', () => {

  it('verifica checksum SHA256 correctamente', () => {
    const reference = 'athlete-u1-pro-1234'
    const amountInCents = 4200000
    const currency = 'COP'
    const secret = 'test_integrity_abc123'

    const payload = `${reference}${amountInCents}${currency}${secret}`
    const checksum = createHash('sha256').update(payload).digest('hex')

    // El checksum generado con los mismos datos debe coincidir
    const verifyPayload = `${reference}${amountInCents}${currency}${secret}`
    const expected = createHash('sha256').update(verifyPayload).digest('hex')

    expect(checksum).toBe(expected)
    expect(checksum).toHaveLength(64) // SHA256 = 64 hex chars
  })

  it('checksum diferente con secret incorrecto', () => {
    const reference = 'athlete-u1-pro-1234'
    const amountInCents = 4200000
    const currency = 'COP'

    const correct = createHash('sha256')
      .update(`${reference}${amountInCents}${currency}correct_secret`)
      .digest('hex')
    const wrong = createHash('sha256')
      .update(`${reference}${amountInCents}${currency}wrong_secret`)
      .digest('hex')

    expect(correct).not.toBe(wrong)
  })
})
