import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'

vi.mock('@/lib/rate_limit', () => ({
  rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { update: vi.fn().mockResolvedValue({}) },
  },
}))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed-new-pw') } }))

import { prisma } from '@/lib/db/prisma'
import { POST } from './route'

const SECRET = 'test-secret-at-least-32-characters-long!!'
const secretBytes = new TextEncoder().encode(SECRET)

async function makeToken(opts: { sub?: string; purpose?: string; expired?: boolean } = {}) {
  const builder = new SignJWT({ purpose: opts.purpose ?? 'set-password' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(opts.sub ?? 'user-123')

  if (opts.expired) {
    builder.setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
  } else {
    builder.setExpirationTime('1h')
  }

  return builder.sign(secretBytes)
}

function req(body: object) {
  return new NextRequest(new URL('/api/auth/set-password', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AUTH_SECRET = SECRET
})

describe('POST /api/auth/set-password', () => {
  it('retorna 400 si falta el token', async () => {
    const res = await POST(req({ newPassword: 'NewPass123!' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si la contraseña es muy corta', async () => {
    const token = await makeToken()
    const res = await POST(req({ token, newPassword: '123' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si el token expiró', async () => {
    const token = await makeToken({ expired: true })
    const res = await POST(req({ token, newPassword: 'NewPass123!' }))
    expect(res.status).toBe(400)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('retorna 400 si el token tiene purpose incorrecto', async () => {
    const token = await new SignJWT({ purpose: 'other' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-123')
      .setExpirationTime('1h')
      .sign(secretBytes)

    const res = await POST(req({ token, newPassword: 'NewPass123!' }))
    expect(res.status).toBe(400)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('actualiza la contraseña con token válido', async () => {
    const token = await makeToken({ sub: 'user-456' })
    const res = await POST(req({ token, newPassword: 'NewPass123!' }))
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-456' },
      data: { password: 'hashed-new-pw' },
    })
  })

  it('retorna 400 con token firmado con secret distinto', async () => {
    const wrongSecret = new TextEncoder().encode('wrong-secret-at-least-32-characters-long!!')
    const token = await new SignJWT({ purpose: 'set-password' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-123')
      .setExpirationTime('1h')
      .sign(wrongSecret)

    const res = await POST(req({ token, newPassword: 'NewPass123!' }))
    expect(res.status).toBe(400)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})
