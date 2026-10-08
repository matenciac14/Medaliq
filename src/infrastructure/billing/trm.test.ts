import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { ITrmProvider, TrmResult } from '@/domain/ports/trm.provider'
import { TrmService, DEFAULT_TRM, getTrmSync } from './trm'

function makeStub(result: TrmResult | Error): ITrmProvider {
  return {
    getCurrentTrm: async () => {
      if (result instanceof Error) throw result
      return result
    },
  }
}

const OK_TRM: TrmResult = { value: 3128.65, date: '2026-08-19' }

beforeEach(() => { delete process.env.TRM_USD_COP })
afterEach(()  => { delete process.env.TRM_USD_COP })

describe('TrmService.getWithMeta', () => {
  it('devuelve valor de la API con source=api', async () => {
    const service = new TrmService(makeStub(OK_TRM))
    const result = await service.getWithMeta()

    expect(result.value).toBe(3128.65)
    expect(result.date).toBe('2026-08-19')
    expect(result.source).toBe('api')
  })

  it('cae a env var si la API falla', async () => {
    process.env.TRM_USD_COP = '3200'
    const service = new TrmService(makeStub(new Error('Network error')))
    const result = await service.getWithMeta()

    expect(result.value).toBe(3200)
    expect(result.source).toBe('env')
  })

  it('cae a DEFAULT_TRM si API y env var fallan', async () => {
    const service = new TrmService(makeStub(new Error('Network error')))
    const result = await service.getWithMeta()

    expect(result.value).toBe(DEFAULT_TRM)
    expect(result.source).toBe('default')
    expect(result.date).toBeNull()
  })

  it('ignora env var con valor inválido y cae a default', async () => {
    process.env.TRM_USD_COP = 'no-es-numero'
    const service = new TrmService(makeStub(new Error('Network error')))
    const result = await service.getWithMeta()

    expect(result.value).toBe(DEFAULT_TRM)
    expect(result.source).toBe('default')
  })

  it('ignora env var con valor negativo', async () => {
    process.env.TRM_USD_COP = '-100'
    const service = new TrmService(makeStub(new Error('Network error')))
    const result = await service.getWithMeta()

    expect(result.value).toBe(DEFAULT_TRM)
    expect(result.source).toBe('default')
  })

  it('usa cache interno en llamadas consecutivas — no llama la API dos veces', async () => {
    let callCount = 0
    const countingStub: ITrmProvider = {
      getCurrentTrm: async () => { callCount++; return OK_TRM },
    }
    const service = new TrmService(countingStub)

    await service.getWithMeta()
    await service.getWithMeta()
    await service.getWithMeta()

    expect(callCount).toBe(1) // solo el primer call llega a la API
  })
})

describe('TrmService.get', () => {
  it('devuelve solo el número sin metadatos', async () => {
    const service = new TrmService(makeStub(OK_TRM))
    const value = await service.get()

    expect(value).toBe(3128.65)
    expect(typeof value).toBe('number')
  })

  it('devuelve DEFAULT_TRM si todo falla', async () => {
    const service = new TrmService(makeStub(new Error('down')))
    const value = await service.get()

    expect(value).toBe(DEFAULT_TRM)
  })
})

// ── getTrmSync ──────────────────────────────────────────────────────────────

describe('getTrmSync', () => {
  it('devuelve TRM_USD_COP cuando está definido', () => {
    process.env.TRM_USD_COP = '4150'
    expect(getTrmSync()).toBe(4150)
  })

  it('devuelve DEFAULT_TRM cuando TRM_USD_COP no está definido', () => {
    delete process.env.TRM_USD_COP
    expect(getTrmSync()).toBe(DEFAULT_TRM)
  })

  it('devuelve DEFAULT_TRM para valor inválido', () => {
    process.env.TRM_USD_COP = 'abc'
    expect(getTrmSync()).toBe(DEFAULT_TRM)
  })

  it('devuelve DEFAULT_TRM para valor negativo', () => {
    process.env.TRM_USD_COP = '-500'
    expect(getTrmSync()).toBe(DEFAULT_TRM)
  })
})
