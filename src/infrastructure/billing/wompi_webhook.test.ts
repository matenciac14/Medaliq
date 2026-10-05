import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHash } from 'crypto'
import { WompiPaymentGateway } from './wompi_payment_gateway'

// Helper: genera un payload Wompi completo con checksum válido
function buildWompiPayload(overrides: {
  status?: string
  userId?: string
  userRole?: string
  targetTier?: string
  reference?: string
  amountInCents?: number
  currency?: string
} = {}) {
  const secret = 'test_integrity_secret'
  const reference = overrides.reference ?? 'athlete-u1-pro-1234'
  const amountInCents = overrides.amountInCents ?? 4200000
  const currency = overrides.currency ?? 'COP'

  const checksumPayload = `${reference}${amountInCents}${currency}${secret}`
  const checksum = createHash('sha256').update(checksumPayload).digest('hex')

  return {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: `tx_${Date.now()}`,
        status: overrides.status ?? 'APPROVED',
        reference,
        amount_in_cents: amountInCents,
        currency,
        metadata: {
          userId: overrides.userId ?? 'u1',
          userRole: overrides.userRole ?? 'ATHLETE',
          ...(overrides.targetTier ? { targetTier: overrides.targetTier } : {}),
        },
        signature: {
          checksum,
          properties: ['reference', 'amount_in_cents', 'currency'],
        },
      },
    },
  }
}

afterEach(() => { vi.unstubAllEnvs() })

describe('WompiPaymentGateway.parseWebhookEvent', () => {
  const gateway = new WompiPaymentGateway()

  it('APPROVED atleta → charge.success con newPeriodEnd +30 días', async () => {
    vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'test_integrity_secret')
    const payload = buildWompiPayload({ status: 'APPROVED', userId: 'u1', userRole: 'ATHLETE' })

    const event = await gateway.parseWebhookEvent(JSON.stringify(payload), '')

    expect(event.eventType).toBe('charge.success')
    expect(event.userId).toBe('u1')
    expect(event.userRole).toBe('ATHLETE')
    expect(event.newPeriodEnd).toBeInstanceOf(Date)

    // newPeriodEnd debe ser ~30 días en el futuro
    const diffDays = Math.round((event.newPeriodEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBeGreaterThanOrEqual(29)
    expect(diffDays).toBeLessThanOrEqual(31)
  })

  it('APPROVED coach → charge.success con coachTargetTier', async () => {
    vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'test_integrity_secret')
    const payload = buildWompiPayload({
      status: 'APPROVED',
      userId: 'c1',
      userRole: 'COACH',
      targetTier: 'GROWTH',
      reference: 'coach-c1-GROWTH-1234',
    })

    const event = await gateway.parseWebhookEvent(JSON.stringify(payload), '')

    expect(event.eventType).toBe('charge.success')
    expect(event.userRole).toBe('COACH')
    expect(event.coachTargetTier).toBe('GROWTH')
  })

  it('DECLINED → charge.failed sin newPeriodEnd', async () => {
    vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'test_integrity_secret')
    const payload = buildWompiPayload({ status: 'DECLINED' })

    const event = await gateway.parseWebhookEvent(JSON.stringify(payload), '')

    expect(event.eventType).toBe('charge.failed')
    expect(event.newPeriodEnd).toBeUndefined()
  })

  it('ERROR → charge.failed', async () => {
    vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'test_integrity_secret')
    const payload = buildWompiPayload({ status: 'ERROR' })

    const event = await gateway.parseWebhookEvent(JSON.stringify(payload), '')
    expect(event.eventType).toBe('charge.failed')
  })

  it('VOIDED → charge.failed', async () => {
    vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'test_integrity_secret')
    const payload = buildWompiPayload({ status: 'VOIDED' })

    const event = await gateway.parseWebhookEvent(JSON.stringify(payload), '')
    expect(event.eventType).toBe('charge.failed')
  })

  it('checksum inválido → lanza error', async () => {
    vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'wrong_secret')
    const payload = buildWompiPayload()

    await expect(gateway.parseWebhookEvent(JSON.stringify(payload), '')).rejects.toThrow('Firma Wompi inválida')
  })

  it('payload sin transaction → lanza error', async () => {
    vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'test_integrity_secret')
    const payload = { event: 'transaction.updated', data: {} }

    await expect(gateway.parseWebhookEvent(JSON.stringify(payload), '')).rejects.toThrow('sin transaction')
  })

  it('metadata sin userId → lanza error', async () => {
    vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'test_integrity_secret')
    const payload = buildWompiPayload()
    payload.data.transaction.metadata.userId = ''

    await expect(gateway.parseWebhookEvent(JSON.stringify(payload), '')).rejects.toThrow('incompleta')
  })

  it('WOMPI_INTEGRITY_SECRET no configurado → lanza error', async () => {
    delete process.env.WOMPI_INTEGRITY_SECRET
    const payload = buildWompiPayload()

    await expect(gateway.parseWebhookEvent(JSON.stringify(payload), '')).rejects.toThrow('WOMPI_INTEGRITY_SECRET')
  })
})
