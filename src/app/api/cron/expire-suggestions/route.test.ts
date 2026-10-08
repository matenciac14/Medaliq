import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockExpireOld = vi.fn()
vi.mock('@/infrastructure/db/suggestion.repository', () => ({
  PrismaSuggestionRepository: class {
    expireOld = mockExpireOld
  },
}))

import { GET } from './route'

function req(auth?: string) {
  return new NextRequest(new URL('/api/cron/expire-suggestions', 'http://localhost'), {
    headers: auth ? { authorization: auth } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-cron-secret'
})

describe('GET /api/cron/expire-suggestions', () => {
  it('retorna 401 sin auth', async () => {
    const res = await GET(req())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('retorna { ok: true, expired: 5 } cuando hay sugerencias expiradas', async () => {
    mockExpireOld.mockResolvedValue(5)
    const res = await GET(req('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, expired: 5 })
  })

  it('retorna { ok: true, expired: 0 } sin sugerencias expiradas', async () => {
    mockExpireOld.mockResolvedValue(0)
    const res = await GET(req('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, expired: 0 })
  })

  it('llama expireOld() del repositorio', async () => {
    mockExpireOld.mockResolvedValue(2)
    await GET(req('Bearer test-cron-secret'))
    expect(mockExpireOld).toHaveBeenCalledTimes(1)
  })
})
