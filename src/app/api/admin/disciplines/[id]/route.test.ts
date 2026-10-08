import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => {
  const userFindUnique = vi.fn()
  const discFindUnique = vi.fn()
  const discUpdate = vi.fn()
  const discDelete = vi.fn()
  return {
    prisma: {
      user: { findUnique: userFindUnique },
      discipline: { findUnique: discFindUnique, update: discUpdate, delete: discDelete },
    },
  }
})

vi.mock('@/domain/discipline/discipline_resolver', () => ({
  __clearCache: vi.fn(),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { GET, PATCH, DELETE } from './route'

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('Admin Disciplines [id] API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupAdmin() {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin1' } } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
  }

  describe('GET /api/admin/disciplines/[id]', () => {
    it('returns 403 for non-admin', async () => {
      vi.mocked(auth).mockResolvedValue(null)
      const res = await GET(new Request('http://localhost') as any, makeParams('d1'))
      expect(res.status).toBe(403)
    })

    it('returns 404 for unknown id', async () => {
      setupAdmin()
      vi.mocked(prisma.discipline.findUnique).mockResolvedValue(null)
      const res = await GET(new Request('http://localhost') as any, makeParams('nonexistent'))
      expect(res.status).toBe(404)
    })

    it('returns discipline with usage counts', async () => {
      setupAdmin()
      vi.mocked(prisma.discipline.findUnique).mockResolvedValue({
        id: 'd1', slug: 'strength', _count: { exercises: 40, sessionLogs: 22 },
      } as any)

      const res = await GET(new Request('http://localhost') as any, makeParams('d1'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.slug).toBe('strength')
      expect(body._count.exercises).toBe(40)
    })
  })

  describe('PATCH /api/admin/disciplines/[id]', () => {
    it('returns 404 for unknown discipline', async () => {
      setupAdmin()
      vi.mocked(prisma.discipline.findUnique).mockResolvedValue(null)

      const req = new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ nameEs: 'Nuevo nombre' }),
      })
      const res = await PATCH(req as any, makeParams('nonexistent'))
      expect(res.status).toBe(404)
    })

    it('updates discipline fields', async () => {
      setupAdmin()
      vi.mocked(prisma.discipline.findUnique).mockResolvedValue({ id: 'd1' } as any)
      vi.mocked(prisma.discipline.update).mockResolvedValue({
        id: 'd1', nameEs: 'Fuerza Actualizada', color: '#ff0000',
      } as any)

      const req = new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ nameEs: 'Fuerza Actualizada', color: '#ff0000' }),
      })
      const res = await PATCH(req as any, makeParams('d1'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.nameEs).toBe('Fuerza Actualizada')
    })

    it('rejects invalid color format', async () => {
      setupAdmin()

      const req = new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ color: 'red' }),
      })
      const res = await PATCH(req as any, makeParams('d1'))
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/admin/disciplines/[id]', () => {
    it('soft deletes discipline with references', async () => {
      setupAdmin()
      vi.mocked(prisma.discipline.findUnique).mockResolvedValue({
        id: 'd1', _count: { exercises: 40, sessionLogs: 22 },
      } as any)
      vi.mocked(prisma.discipline.update).mockResolvedValue({ id: 'd1', isActive: false } as any)

      const res = await DELETE(new Request('http://localhost') as any, makeParams('d1'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.action).toBe('deactivated')
      expect(prisma.discipline.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { isActive: false },
      })
    })

    it('hard deletes discipline without references', async () => {
      setupAdmin()
      vi.mocked(prisma.discipline.findUnique).mockResolvedValue({
        id: 'd2', _count: { exercises: 0, sessionLogs: 0 },
      } as any)
      vi.mocked(prisma.discipline.delete).mockResolvedValue({ id: 'd2' } as any)

      const res = await DELETE(new Request('http://localhost') as any, makeParams('d2'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.action).toBe('deleted')
      expect(prisma.discipline.delete).toHaveBeenCalledWith({ where: { id: 'd2' } })
    })

    it('returns 404 for unknown discipline', async () => {
      setupAdmin()
      vi.mocked(prisma.discipline.findUnique).mockResolvedValue(null)

      const res = await DELETE(new Request('http://localhost') as any, makeParams('nonexistent'))
      expect(res.status).toBe(404)
    })
  })
})
