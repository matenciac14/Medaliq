import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rate_limit', () => ({
  rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))
vi.mock('@/infrastructure/email/resend', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/db/prisma'
import { sendPasswordResetEmail } from '@/infrastructure/email/resend'
import { POST } from './route'

function req(body: object) {
  return new NextRequest(new URL('/api/auth/forgot-password', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AUTH_SECRET = 'test-secret-at-least-32-characters-long!!'
})

describe('POST /api/auth/forgot-password', () => {
  it('retorna 400 si falta el email', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si el email es inválido', async () => {
    const res = await POST(req({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('retorna 200 aunque el email no exista (anti-enumeration)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await POST(req({ email: 'noexiste@test.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('envía email de reset si el usuario existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'ana@test.com',
    } as any)

    const res = await POST(req({ email: 'ana@test.com' }))
    expect(res.status).toBe(200)
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1)
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'ana@test.com',
      expect.stringContaining('token=')
    )
  })

  it('retorna 200 aunque el envío de email falle', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'ana@test.com',
    } as any)
    vi.mocked(sendPasswordResetEmail).mockRejectedValue(new Error('SMTP error'))

    const res = await POST(req({ email: 'ana@test.com' }))
    expect(res.status).toBe(200)
  })
})
