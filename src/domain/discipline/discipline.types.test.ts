import { describe, it, expect } from 'vitest'
import { DISCIPLINE_SEEDS, SLUG_TO_SESSION_DISCIPLINE } from './discipline.types'

describe('DISCIPLINE_SEEDS', () => {
  it('has exactly 5 seed disciplines', () => {
    expect(DISCIPLINE_SEEDS).toHaveLength(5)
  })

  it('all slugs are unique', () => {
    const slugs = DISCIPLINE_SEEDS.map(d => d.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('all sortOrders are unique', () => {
    const orders = DISCIPLINE_SEEDS.map(d => d.sortOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('strength is first by sortOrder', () => {
    const sorted = [...DISCIPLINE_SEEDS].sort((a, b) => a.sortOrder - b.sortOrder)
    expect(sorted[0].slug).toBe('strength')
  })

  it('other is last by sortOrder', () => {
    const sorted = [...DISCIPLINE_SEEDS].sort((a, b) => a.sortOrder - b.sortOrder)
    expect(sorted[sorted.length - 1].slug).toBe('other')
  })

  it('only strength has exercise library', () => {
    const withLibrary = DISCIPLINE_SEEDS.filter(d => d.hasExerciseLibrary)
    expect(withLibrary).toHaveLength(1)
    expect(withLibrary[0].slug).toBe('strength')
  })

  it('all disciplines have at least one sessionType', () => {
    for (const d of DISCIPLINE_SEEDS) {
      expect(d.sessionTypes.length).toBeGreaterThan(0)
    }
  })

  it('all disciplines have trackingFields with at least one field', () => {
    for (const d of DISCIPLINE_SEEDS) {
      expect(Object.keys(d.trackingFields).length).toBeGreaterThan(0)
    }
  })

  it('running has multiple session types', () => {
    const running = DISCIPLINE_SEEDS.find(d => d.slug === 'running')!
    expect(running.sessionTypes.length).toBeGreaterThan(1)
    expect(running.sessionTypes).toContain('RODAJE_Z2')
    expect(running.sessionTypes).toContain('FARTLEK')
    expect(running.sessionTypes).toContain('TEMPO')
    expect(running.sessionTypes).toContain('INTERVALOS')
  })

  it('strength tracks sets, reps, weight', () => {
    const strength = DISCIPLINE_SEEDS.find(d => d.slug === 'strength')!
    expect(strength.trackingFields.sets).toBe(true)
    expect(strength.trackingFields.reps).toBe(true)
    expect(strength.trackingFields.weight).toBe(true)
  })

  it('running tracks distance, duration, pace, zones', () => {
    const running = DISCIPLINE_SEEDS.find(d => d.slug === 'running')!
    expect(running.trackingFields.distanceKm).toBe(true)
    expect(running.trackingFields.durationMin).toBe(true)
    expect(running.trackingFields.pace).toBe(true)
    expect(running.trackingFields.zones).toBe(true)
  })

  it('cycling tracks cadence and power', () => {
    const cycling = DISCIPLINE_SEEDS.find(d => d.slug === 'cycling')!
    expect(cycling.trackingFields.cadence).toBe(true)
    expect(cycling.trackingFields.power).toBe(true)
  })

  it('swimming tracks laps and strokes', () => {
    const swimming = DISCIPLINE_SEEDS.find(d => d.slug === 'swimming')!
    expect(swimming.trackingFields.laps).toBe(true)
    expect(swimming.trackingFields.strokes).toBe(true)
  })

  it('all disciplines have required fields', () => {
    for (const d of DISCIPLINE_SEEDS) {
      expect(typeof d.slug).toBe('string')
      expect(typeof d.name).toBe('string')
      expect(typeof d.nameEs).toBe('string')
      expect(typeof d.icon).toBe('string')
      expect(typeof d.color).toBe('string')
      expect(d.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(typeof d.sortOrder).toBe('number')
      expect(typeof d.hasExerciseLibrary).toBe('boolean')
    }
  })
})

describe('SLUG_TO_SESSION_DISCIPLINE', () => {
  it('maps all 5 slugs to session discipline strings', () => {
    expect(Object.keys(SLUG_TO_SESSION_DISCIPLINE)).toHaveLength(5)
    expect(SLUG_TO_SESSION_DISCIPLINE['strength']).toBe('STRENGTH')
    expect(SLUG_TO_SESSION_DISCIPLINE['running']).toBe('RUNNING')
    expect(SLUG_TO_SESSION_DISCIPLINE['cycling']).toBe('CYCLING')
    expect(SLUG_TO_SESSION_DISCIPLINE['swimming']).toBe('SWIMMING')
    expect(SLUG_TO_SESSION_DISCIPLINE['other']).toBe('OTHER')
  })

  it('is consistent with DISCIPLINE_SEEDS slugs', () => {
    const seedSlugs = DISCIPLINE_SEEDS.map(d => d.slug).sort()
    const mapSlugs = Object.keys(SLUG_TO_SESSION_DISCIPLINE).sort()
    expect(seedSlugs).toEqual(mapSlugs)
  })
})
