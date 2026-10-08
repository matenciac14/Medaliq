import { describe, it, expect } from 'vitest'
import { estimateCalories, sanitizeWeId, type WeNameMap, type WeToExIdMap } from './complete_gym_session.use_case'

// ── estimateCalories ─────────────────────────────────────────────────────────

describe('estimateCalories', () => {
  it('returns null when duration is 0', () => {
    expect(estimateCalories(0, [5, 6])).toBeNull()
  })

  it('returns null when duration is undefined', () => {
    expect(estimateCalories(undefined, [5, 6])).toBeNull()
  })

  it('uses average CPM when values provided', () => {
    // 60 min * avg(4, 6) = 60 * 5 = 300
    expect(estimateCalories(60, [4, 6])).toBe(300)
  })

  it('falls back to 5 kcal/min when no CPM values', () => {
    // 30 min * 5 = 150
    expect(estimateCalories(30, [])).toBe(150)
  })

  it('filters null/undefined CPM values', () => {
    // 60 min * avg(10) = 600 (null and undefined filtered)
    expect(estimateCalories(60, [10, null, undefined])).toBe(600)
  })

  it('rounds to nearest integer', () => {
    // 45 min * avg(3.3) = 148.5 → 149
    expect(estimateCalories(45, [3.3])).toBe(149)
  })

  it('falls back to 5 when all CPM are null', () => {
    // 20 min * 5 = 100
    expect(estimateCalories(20, [null, null])).toBe(100)
  })
})

// ── sanitizeWeId ─────────────────────────────────────────────────────────────

describe('sanitizeWeId', () => {
  const weNameMap: WeNameMap = new Map([['we-1', 'Sentadilla']])
  const weExIdMap: WeToExIdMap = new Map([['we-2', 'ex-2']])

  it('returns weId when found in weNameMap', () => {
    expect(sanitizeWeId('we-1', weNameMap, weExIdMap)).toBe('we-1')
  })

  it('returns weId when found in weExIdMap', () => {
    expect(sanitizeWeId('we-2', weNameMap, weExIdMap)).toBe('we-2')
  })

  it('returns null when weId not in either map', () => {
    expect(sanitizeWeId('we-unknown', weNameMap, weExIdMap)).toBeNull()
  })

  it('returns null when weId is undefined', () => {
    expect(sanitizeWeId(undefined, weNameMap, weExIdMap)).toBeNull()
  })

  it('returns null for empty string key not in maps', () => {
    expect(sanitizeWeId('', weNameMap, weExIdMap)).toBeNull()
  })
})
