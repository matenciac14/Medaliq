import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing module
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    discipline: {
      findMany: vi.fn(),
    },
  },
}))

import { resolveDisciplineId, resolveBySlug, __clearCache, LEGACY_TO_SLUG } from './discipline_resolver'
import { prisma } from '@/lib/db/prisma'

const mockDisciplines = [
  { id: 'disc-strength', slug: 'strength' },
  { id: 'disc-running', slug: 'running' },
  { id: 'disc-cycling', slug: 'cycling' },
  { id: 'disc-swimming', slug: 'swimming' },
  { id: 'disc-other', slug: 'other' },
]

describe('discipline_resolver', () => {
  beforeEach(() => {
    __clearCache()
    vi.clearAllMocks()
    vi.mocked(prisma.discipline.findMany).mockResolvedValue(mockDisciplines as any)
  })

  describe('LEGACY_TO_SLUG mapping', () => {
    it('maps SessionDiscipline enum values correctly', () => {
      expect(LEGACY_TO_SLUG['STRENGTH']).toBe('strength')
      expect(LEGACY_TO_SLUG['RUNNING']).toBe('running')
      expect(LEGACY_TO_SLUG['CYCLING']).toBe('cycling')
      expect(LEGACY_TO_SLUG['SWIMMING']).toBe('swimming')
      expect(LEGACY_TO_SLUG['OTHER']).toBe('other')
    })

    it('maps Exercise.discipline legacy values', () => {
      expect(LEGACY_TO_SLUG['GYM']).toBe('strength')
      expect(LEGACY_TO_SLUG['CALISTHENICS']).toBe('strength')
      expect(LEGACY_TO_SLUG['MOBILITY']).toBe('other')
      expect(LEGACY_TO_SLUG['YOGA']).toBe('other')
    })
  })

  describe('resolveDisciplineId', () => {
    it('returns null for null/undefined input', async () => {
      expect(await resolveDisciplineId(null)).toBeNull()
      expect(await resolveDisciplineId(undefined)).toBeNull()
    })

    it('resolves STRENGTH to strength discipline id', async () => {
      const id = await resolveDisciplineId('STRENGTH')
      expect(id).toBe('disc-strength')
    })

    it('resolves GYM to strength discipline id', async () => {
      const id = await resolveDisciplineId('GYM')
      expect(id).toBe('disc-strength')
    })

    it('resolves RUNNING to running discipline id', async () => {
      const id = await resolveDisciplineId('RUNNING')
      expect(id).toBe('disc-running')
    })

    it('resolves CYCLING to cycling discipline id', async () => {
      const id = await resolveDisciplineId('CYCLING')
      expect(id).toBe('disc-cycling')
    })

    it('resolves SWIMMING to swimming discipline id', async () => {
      const id = await resolveDisciplineId('SWIMMING')
      expect(id).toBe('disc-swimming')
    })

    it('resolves OTHER to other discipline id', async () => {
      const id = await resolveDisciplineId('OTHER')
      expect(id).toBe('disc-other')
    })

    it('resolves CALISTHENICS to strength (via legacy map)', async () => {
      const id = await resolveDisciplineId('CALISTHENICS')
      expect(id).toBe('disc-strength')
    })

    it('resolves YOGA to other (via legacy map)', async () => {
      const id = await resolveDisciplineId('YOGA')
      expect(id).toBe('disc-other')
    })

    it('falls back to lowercase slug for unknown values', async () => {
      // 'running' lowercase → slug 'running' → disc-running
      const id = await resolveDisciplineId('running')
      expect(id).toBe('disc-running')
    })

    it('returns null for completely unknown discipline', async () => {
      const id = await resolveDisciplineId('BASKETBALL')
      expect(id).toBeNull()
    })

    it('caches DB call — only calls findMany once for multiple resolutions', async () => {
      await resolveDisciplineId('STRENGTH')
      await resolveDisciplineId('RUNNING')
      await resolveDisciplineId('CYCLING')
      expect(prisma.discipline.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('resolveBySlug', () => {
    it('resolves slug directly to id', async () => {
      expect(await resolveBySlug('strength')).toBe('disc-strength')
      expect(await resolveBySlug('running')).toBe('disc-running')
    })

    it('returns null for unknown slug', async () => {
      expect(await resolveBySlug('crossfit')).toBeNull()
    })
  })

  describe('__clearCache', () => {
    it('forces re-fetch from DB on next call', async () => {
      await resolveDisciplineId('STRENGTH')
      expect(prisma.discipline.findMany).toHaveBeenCalledTimes(1)

      __clearCache()
      await resolveDisciplineId('RUNNING')
      expect(prisma.discipline.findMany).toHaveBeenCalledTimes(2)
    })
  })
})
