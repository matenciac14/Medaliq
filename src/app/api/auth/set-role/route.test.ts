import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: any) => fn({
      user: { update: vi.fn().mockResolvedValue({}) },
      userSubscription: { upsert: vi.fn().mockResolvedValue({}) },
      coachProfile: { upsert: vi.fn().mockResolvedValue({}) },
    })),
  },
}))
vi.mock('@/lib/auth/refresh_jwt_cookie', () => ({
  setFreshJwtCookie: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn().mockResolvedValue(null),
  encode: vi.fn().mockResolvedValue('mock-jwt'),
}))

import { auth } from '@/auth'
import { POST } from './route'

function req(body: object) {
  return new NextRequest(new URL('/api/auth/set-role', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockSession = (overrides = {}) => ({
  user: { id: 'u1', needsRoleSelection: true, name: 'Test', ...overrides },
} as any)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/set-role', () => {
  it('retorna 401 si no hay sesion', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(req({ role: 'ATHLETE' }))
    expect(res.status).toBe(401)
  })

  it('retorna 403 si needsRoleSelection es false', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession({ needsRoleSelection: false }))
    const res = await POST(req({ role: 'ATHLETE' }))
    expect(res.status).toBe(403)
  })

  it('retorna 400 si el rol es invalido', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession())
    const res = await POST(req({ role: 'ADMIN' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si falta el campo role', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession())
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('asigna rol ATHLETE y retorna 200', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession())
    const res = await POST(req({ role: 'ATHLETE' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.role).toBe('ATHLETE')
  })

  it('asigna rol COACH y retorna 200', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 'u2' }))
    const res = await POST(req({ role: 'COACH' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBe('COACH')
  })
})
