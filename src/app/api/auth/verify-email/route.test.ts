import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    verificationToken: {
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { prisma } from '@/lib/db/prisma'
import { GET } from './route'

function req(token?: string) {
  const url = token
    ? `http://localhost/api/auth/verify-email?token=${token}`
    : 'http://localhost/api/auth/verify-email'
  return new NextRequest(new URL(url))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/auth/verify-email', () => {
  it('redirige a /login?error=token-invalido si no hay token', async () => {
    const res = await GET(req())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=token-invalido')
  })

  it('redirige a error si el token no existe en DB (delete returns null)', async () => {
    vi.mocked(prisma.verificationToken.delete).mockRejectedValue(new Error('not found'))
    const res = await GET(req('bad-token'))
    expect(res.headers.get('location')).toContain('error=token-invalido')
  })

  it('redirige a error si el token expiró', async () => {
    vi.mocked(prisma.verificationToken.delete).mockResolvedValue({
      token: 'expired-token',
      identifier: 'ana@test.com',
      expires: new Date(Date.now() - 3600_000),
    } as any)

    const res = await GET(req('expired-token'))
    expect(res.headers.get('location')).toContain('error=token-expirado')
  })

  it('redirige a error si el usuario no existe', async () => {
    vi.mocked(prisma.verificationToken.delete).mockResolvedValue({
      token: 'valid-token',
      identifier: 'ghost@test.com',
      expires: new Date(Date.now() + 3600_000),
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await GET(req('valid-token'))
    expect(res.headers.get('location')).toContain('error=usuario-no-encontrado')
  })

  it('verifica email y redirige a /login?verified=1', async () => {
    vi.mocked(prisma.verificationToken.delete).mockResolvedValue({
      token: 'valid-token',
      identifier: 'ana@test.com',
      expires: new Date(Date.now() + 3600_000),
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      emailVerified: null,
    } as any)

    const res = await GET(req('valid-token'))
    expect(res.headers.get('location')).toContain('verified=1')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerified: expect.any(Date) },
    })
  })
})
