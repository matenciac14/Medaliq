import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => {
  const findMany = vi.fn()
  const findUnique = vi.fn()
  const create = vi.fn()
  return {
    prisma: {
      user: { findUnique },
      discipline: { findMany, findUnique: vi.fn(), create },
    },
  }
})

vi.mock('@/domain/discipline/discipline_resolver', () => ({
  __clearCache: vi.fn(),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { GET, POST } from './route'

describe('Admin Disciplines API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/disciplines', () => {
    it('returns 403 for non-admin users', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'ATHLETE' } } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ATHLETE' } as any)

      const res = await GET()
      expect(res.status).toBe(403)
    })

    it('returns all disciplines with usage counts for admin', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'admin1' } } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
      vi.mocked(prisma.discipline.findMany).mockResolvedValue([
        { id: 'd1', slug: 'strength', _count: { exercises: 40, sessionLogs: 22 } },
      ] as any)

      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body[0]._count.exercises).toBe(40)
    })
  })

  describe('POST /api/admin/disciplines', () => {
    it('returns 403 for non-admin', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const req = new Request('http://localhost/api/admin/disciplines', {
        method: 'POST',
        body: JSON.stringify({ slug: 'crossfit', name: 'CrossFit', nameEs: 'CrossFit' }),
      })
      const res = await POST(req as any)
      expect(res.status).toBe(403)
    })

    it('returns 400 for invalid slug', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'admin1' } } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)

      const req = new Request('http://localhost/api/admin/disciplines', {
        method: 'POST',
        body: JSON.stringify({ slug: 'Cross Fit!', name: 'CrossFit', nameEs: 'CrossFit' }),
      })
      const res = await POST(req as any)
      expect(res.status).toBe(400)
    })

    it('returns 409 for duplicate slug', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'admin1' } } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
      vi.mocked(prisma.discipline.findUnique).mockResolvedValue({ id: 'exists' } as any)

      const req = new Request('http://localhost/api/admin/disciplines', {
        method: 'POST',
        body: JSON.stringify({ slug: 'strength', name: 'Strength', nameEs: 'Fuerza' }),
      })
      const res = await POST(req as any)
      expect(res.status).toBe(409)
    })

    it('creates discipline for admin with valid data', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'admin1' } } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
      vi.mocked(prisma.discipline.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.discipline.create).mockResolvedValue({
        id: 'new-id', slug: 'crossfit', name: 'CrossFit', nameEs: 'CrossFit',
      } as any)

      const req = new Request('http://localhost/api/admin/disciplines', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'crossfit',
          name: 'CrossFit',
          nameEs: 'CrossFit',
          icon: '🏋️‍♂️',
          color: '#ef4444',
          trackingFields: { rounds: true, timePerRound: true },
          sessionTypes: ['AMRAP', 'EMOM', 'FOR_TIME'],
        }),
      })
      const res = await POST(req as any)
      expect(res.status).toBe(201)
    })
  })
})
