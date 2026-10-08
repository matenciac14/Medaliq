import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', () => {
  const findMany = vi.fn()
  return {
    prisma: { discipline: { findMany } },
    default: { discipline: { findMany } },
  }
})

import { prisma } from '@/lib/db/prisma'
import { GET } from './route'

const mockDisciplines = [
  {
    id: 'disc-1',
    slug: 'strength',
    name: 'Strength',
    nameEs: 'Fuerza',
    icon: '🏋️',
    color: '#f97316',
    hasExerciseLibrary: true,
    trackingFields: { sets: true, reps: true, weight: true, durationMin: true },
    sessionTypes: ['FUERZA'],
  },
  {
    id: 'disc-2',
    slug: 'running',
    name: 'Running',
    nameEs: 'Running',
    icon: '🏃',
    color: '#3b82f6',
    hasExerciseLibrary: false,
    trackingFields: { distanceKm: true, durationMin: true, pace: true, zones: true },
    sessionTypes: ['RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS'],
  },
]

describe('GET /api/disciplines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.discipline.findMany).mockResolvedValue(mockDisciplines as any)
  })

  it('returns active disciplines sorted by sortOrder', async () => {
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(2)
    expect(body[0].slug).toBe('strength')
    expect(body[1].slug).toBe('running')
  })

  it('includes all required fields in response', async () => {
    const res = await GET()
    const body = await res.json()
    const discipline = body[0]

    expect(discipline).toHaveProperty('id')
    expect(discipline).toHaveProperty('slug')
    expect(discipline).toHaveProperty('name')
    expect(discipline).toHaveProperty('nameEs')
    expect(discipline).toHaveProperty('icon')
    expect(discipline).toHaveProperty('color')
    expect(discipline).toHaveProperty('hasExerciseLibrary')
    expect(discipline).toHaveProperty('trackingFields')
    expect(discipline).toHaveProperty('sessionTypes')
  })

  it('sets cache-control headers for public caching', async () => {
    const res = await GET()
    const cacheControl = res.headers.get('Cache-Control')

    expect(cacheControl).toContain('public')
    expect(cacheControl).toContain('s-maxage=3600')
    expect(cacheControl).toContain('stale-while-revalidate=86400')
  })

  it('queries only active disciplines ordered by sortOrder', async () => {
    await GET()

    expect(prisma.discipline.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        nameEs: true,
        icon: true,
        color: true,
        hasExerciseLibrary: true,
        trackingFields: true,
        sessionTypes: true,
      },
    })
  })

  it('strength has exercise library, running does not', async () => {
    const res = await GET()
    const body = await res.json()
    const strength = body.find((d: any) => d.slug === 'strength')
    const running = body.find((d: any) => d.slug === 'running')

    expect(strength.hasExerciseLibrary).toBe(true)
    expect(running.hasExerciseLibrary).toBe(false)
  })

  it('trackingFields differ per discipline', async () => {
    const res = await GET()
    const body = await res.json()
    const strength = body.find((d: any) => d.slug === 'strength')
    const running = body.find((d: any) => d.slug === 'running')

    expect(strength.trackingFields).toHaveProperty('sets')
    expect(strength.trackingFields).toHaveProperty('reps')
    expect(strength.trackingFields).toHaveProperty('weight')

    expect(running.trackingFields).toHaveProperty('distanceKm')
    expect(running.trackingFields).toHaveProperty('pace')
    expect(running.trackingFields).toHaveProperty('zones')
  })
})
