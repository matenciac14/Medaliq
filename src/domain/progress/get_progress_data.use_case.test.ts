import { describe, it, expect } from 'vitest'
import { build1RMHistory, buildNutritionAdherence, buildActivityGrid } from './get_progress_data.use_case'

// ── build1RMHistory ──

describe('build1RMHistory', () => {
  it('returns empty when no set history', () => {
    expect(build1RMHistory([])).toEqual([])
  })

  it('skips entries with null exerciseName', () => {
    const result = build1RMHistory([
      { exerciseName: null, weightKg: 100, repsCompleted: 5, session: { date: new Date('2026-01-01') } },
    ])
    expect(result).toEqual([])
  })

  it('computes Epley 1RM and groups by exercise', () => {
    const result = build1RMHistory([
      { exerciseName: 'Sentadilla', weightKg: 100, repsCompleted: 5, session: { date: new Date('2026-01-01') } },
      { exerciseName: 'Sentadilla', weightKg: 110, repsCompleted: 3, session: { date: new Date('2026-01-08') } },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].exerciseName).toBe('Sentadilla')
    expect(result[0].points).toHaveLength(2)
    expect(result[0].points[0].date).toBe('2026-01-01')
    // Epley: 100 * (1 + 5/30) = 116.7
    expect(result[0].points[0].oneRmKg).toBeCloseTo(116.7, 0)
  })

  it('keeps best 1RM per day per exercise', () => {
    const result = build1RMHistory([
      { exerciseName: 'Press', weightKg: 60, repsCompleted: 10, session: { date: new Date('2026-01-01') } },
      { exerciseName: 'Press', weightKg: 80, repsCompleted: 3, session: { date: new Date('2026-01-01') } },
      { exerciseName: 'Press', weightKg: 70, repsCompleted: 5, session: { date: new Date('2026-01-08') } },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].points).toHaveLength(2)
    // Day 1: max(60*(1+10/30), 80*(1+3/30)) = max(80, 88) = 88
    expect(result[0].points[0].oneRmKg).toBeCloseTo(88, 0)
  })

  it('filters exercises with less than 2 data points', () => {
    const result = build1RMHistory([
      { exerciseName: 'OneOff', weightKg: 100, repsCompleted: 5, session: { date: new Date('2026-01-01') } },
    ])
    expect(result).toEqual([])
  })

  it('limits to top 5 exercises', () => {
    const entries = []
    for (let i = 0; i < 7; i++) {
      entries.push(
        { exerciseName: `Ex${i}`, weightKg: 100, repsCompleted: 5, session: { date: new Date('2026-01-01') } },
        { exerciseName: `Ex${i}`, weightKg: 110, repsCompleted: 3, session: { date: new Date('2026-01-08') } },
      )
    }
    const result = build1RMHistory(entries)
    expect(result).toHaveLength(5)
  })
})

// ── buildNutritionAdherence ──

describe('buildNutritionAdherence', () => {
  it('returns empty when no target', () => {
    expect(buildNutritionAdherence([], null)).toEqual([])
  })

  it('returns empty when no logs', () => {
    expect(buildNutritionAdherence([], 2000)).toEqual([])
  })

  it('computes adherence per day', () => {
    const logs = [
      { date: new Date('2026-01-01'), kcalLogged: 1800, grams: 0, food: { kcalPer100g: 0 } },
      { date: new Date('2026-01-01'), kcalLogged: 200, grams: 0, food: { kcalPer100g: 0 } },
      { date: new Date('2026-01-02'), kcalLogged: 1500, grams: 0, food: { kcalPer100g: 0 } },
    ]
    const result = buildNutritionAdherence(logs, 2000)
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-01-01')
    expect(result[0].kcalLogged).toBe(2000)
    expect(result[0].pct).toBe(100)
    expect(result[1].date).toBe('2026-01-02')
    expect(result[1].kcalLogged).toBe(1500)
    expect(result[1].pct).toBe(75)
  })

  it('uses food macros when kcalLogged is null', () => {
    const logs = [
      { date: new Date('2026-01-01'), kcalLogged: null, grams: 200, food: { kcalPer100g: 150 } },
    ]
    const result = buildNutritionAdherence(logs, 2000)
    expect(result[0].kcalLogged).toBe(300) // 200/100 * 150
    expect(result[0].pct).toBe(15)
  })

  it('caps pct at 100', () => {
    const logs = [
      { date: new Date('2026-01-01'), kcalLogged: 3000, grams: 0, food: { kcalPer100g: 0 } },
    ]
    const result = buildNutritionAdherence(logs, 2000)
    expect(result[0].pct).toBe(100)
  })
})

// ── buildActivityGrid ──

describe('buildActivityGrid', () => {
  it('returns empty grid for no sessions', () => {
    expect(buildActivityGrid([], [])).toEqual({})
  })

  it('tracks gym sessions', () => {
    const grid = buildActivityGrid(
      [{ date: new Date('2026-01-01') }, { date: new Date('2026-01-01') }],
      [],
    )
    expect(grid['2026-01-01']).toEqual({ sessionCount: 2, types: ['gym'] })
  })

  it('tracks running sessions', () => {
    const grid = buildActivityGrid(
      [],
      [{ completedAt: new Date('2026-01-02') }],
    )
    expect(grid['2026-01-02']).toEqual({ sessionCount: 1, types: ['running'] })
  })

  it('combines gym + running on same day', () => {
    const grid = buildActivityGrid(
      [{ date: new Date('2026-01-01') }],
      [{ completedAt: new Date('2026-01-01') }],
    )
    expect(grid['2026-01-01']).toEqual({ sessionCount: 2, types: ['gym', 'running'] })
  })

  it('skips running sessions with null completedAt', () => {
    const grid = buildActivityGrid([], [{ completedAt: null }])
    expect(grid).toEqual({})
  })
})
