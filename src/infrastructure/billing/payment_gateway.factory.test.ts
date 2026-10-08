import { describe, it, expect, vi, afterEach } from 'vitest'
import { getPaymentGateway } from './payment_gateway.factory'
import { WompiPaymentGateway } from './wompi_payment_gateway'
import { StubPaymentGateway } from './stub_payment_gateway'

afterEach(() => { vi.unstubAllEnvs() })

describe('getPaymentGateway', () => {
  it('PAYMENT_GATEWAY=wompi → WompiPaymentGateway', () => {
    vi.stubEnv('PAYMENT_GATEWAY', 'wompi')
    expect(getPaymentGateway()).toBeInstanceOf(WompiPaymentGateway)
  })

  it('PAYMENT_GATEWAY=stub → StubPaymentGateway', () => {
    vi.stubEnv('PAYMENT_GATEWAY', 'stub')
    expect(getPaymentGateway()).toBeInstanceOf(StubPaymentGateway)
  })

  it('PAYMENT_GATEWAY no definido → StubPaymentGateway', () => {
    vi.stubEnv('PAYMENT_GATEWAY', '')
    delete process.env.PAYMENT_GATEWAY
    expect(getPaymentGateway()).toBeInstanceOf(StubPaymentGateway)
  })

  it('PAYMENT_GATEWAY con valor desconocido → StubPaymentGateway', () => {
    vi.stubEnv('PAYMENT_GATEWAY', 'stripe')
    expect(getPaymentGateway()).toBeInstanceOf(StubPaymentGateway)
  })

  it('cada llamada devuelve una instancia nueva', () => {
    vi.stubEnv('PAYMENT_GATEWAY', 'wompi')
    const a = getPaymentGateway()
    const b = getPaymentGateway()
    expect(a).not.toBe(b)
  })
})
