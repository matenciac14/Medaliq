import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getWeekBounds, buildWeekDates, buildDaySummaries } from './build_gym_week'

// ── getWeekBounds ────────────────────────────────────────────────────────────

describe('getWeekBounds', () => {
  beforeEach(() => {
    // Wednesday 2026-10-07 12:00 UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-07T12:00:00.000Z'))
  })

  afterEach(() => { vi.useRealTimers() })

  it('offset=0 returns current week monday to sunday', () => {
    const { monday, sunday } = getWeekBounds(0)
    expect(monday.getUTCDay()).toBe(1) // Monday
    expect(sunday.getUTCDay()).toBe(0) // Sunday
    expect(monday.toISOString().slice(0, 10)).toBe('2026-10-05')
    expect(sunday.toISOString().slice(0, 10)).toBe('2026-10-11')
  })

  it('offset=1 returns next week', () => {
    const { monday } = getWeekBounds(1)
    expect(monday.toISOString().slice(0, 10)).toBe('2026-10-12')
  })

  it('offset=-1 returns previous week', () => {
    const { monday } = getWeekBounds(-1)
    expect(monday.toISOString().slice(0, 10)).toBe('2026-09-28')
  })

  it('sunday has time set to 23:59:59.999', () => {
    const { sunday } = getWeekBounds(0)
    expect(sunday.getUTCHours()).toBe(23)
    expect(sunday.getUTCMinutes()).toBe(59)
    expect(sunday.getUTCSeconds()).toBe(59)
    expect(sunday.getUTCMilliseconds()).toBe(999)
  })
})

// ── buildWeekDates ───────────────────────────────────────────────────────────

describe('buildWeekDates', () => {
  it('returns 7 consecutive day numbers starting from monday', () => {
    const monday = new Date('2026-10-05T00:00:00.000Z')
    const dates = buildWeekDates(monday)

    // buildWeekDates uses getDate() (local time) — values are consecutive
    expect(Object.keys(dates)).toHaveLength(7)
    for (let dow = 2; dow <= 7; dow++) {
      const diff = dates[dow] - dates[dow - 1]
      // Handles month rollover: diff is 1 or negative (e.g. 31 → 1)
      expect(diff === 1 || diff < 0).toBe(true)
    }
  })

  it('maps dow 1 to monday date', () => {
    const monday = new Date('2026-10-05T00:00:00.000Z')
    const dates = buildWeekDates(monday)
    expect(dates[1]).toBe(monday.getDate())
  })
})

// ── buildDaySummaries ────────────────────────────────────────────────────────

describe('buildDaySummaries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-07T12:00:00.000Z')) // Wednesday
  })

  afterEach(() => { vi.useRealTimers() })

  const monday = new Date('2026-10-05T00:00:00.000Z')

  const templateDays = [
    { dayOfWeek: 1, isRestDay: false, label: 'Upper', muscleGroups: ['chest', 'shoulders'] },
    { dayOfWeek: 3, isRestDay: false, label: 'Lower', muscleGroups: ['quads', 'hamstrings'] },
    { dayOfWeek: 5, isRestDay: false, label: 'Full body', muscleGroups: ['full body'] },
    { dayOfWeek: 7, isRestDay: true, label: 'Rest', muscleGroups: [] },
  ]

  it('returns 7 day summaries', () => {
    const days = buildDaySummaries(monday, templateDays, new Set(), true)
    expect(days).toHaveLength(7)
  })

  it('marks today correctly for current week', () => {
    const days = buildDaySummaries(monday, templateDays, new Set(), true)
    const today = days.find(d => d.isToday)
    expect(today).toBeDefined()
    expect(today!.dow).toBe(3) // Wednesday
  })

  it('no isToday when not current week', () => {
    const days = buildDaySummaries(monday, templateDays, new Set(), false)
    expect(days.every(d => !d.isToday)).toBe(true)
  })

  it('marks completed days', () => {
    const completed = new Set([1, 3])
    const days = buildDaySummaries(monday, templateDays, completed, true)
    expect(days.find(d => d.dow === 1)!.isCompleted).toBe(true)
    expect(days.find(d => d.dow === 3)!.isCompleted).toBe(true)
    expect(days.find(d => d.dow === 5)!.isCompleted).toBe(false)
  })

  it('marks rest days from template', () => {
    const days = buildDaySummaries(monday, templateDays, new Set(), true)
    expect(days.find(d => d.dow === 7)!.isRest).toBe(true)
    expect(days.find(d => d.dow === 7)!.hasSession).toBe(false)
  })

  it('marks days without template entry as rest', () => {
    const days = buildDaySummaries(monday, templateDays, new Set(), true)
    expect(days.find(d => d.dow === 2)!.isRest).toBe(true) // Tuesday not in template
    expect(days.find(d => d.dow === 2)!.hasSession).toBe(false)
  })

  it('extracts label and first muscleGroup from template', () => {
    const days = buildDaySummaries(monday, templateDays, new Set(), true)
    const mon = days.find(d => d.dow === 1)!
    expect(mon.label).toBe('Upper')
    expect(mon.muscleGroup).toBe('chest')
  })

  it('returns null label and muscleGroup for non-template days', () => {
    const days = buildDaySummaries(monday, templateDays, new Set(), true)
    const tue = days.find(d => d.dow === 2)!
    expect(tue.label).toBeNull()
    expect(tue.muscleGroup).toBeNull()
  })

  it('includes dateNum for each day', () => {
    const days = buildDaySummaries(monday, templateDays, new Set(), true)
    expect(days.find(d => d.dow === 1)!.dateNum).toBe(monday.getDate())
    // Sunday is 6 days after monday
    const sundayDate = new Date(monday)
    sundayDate.setDate(monday.getDate() + 6)
    expect(days.find(d => d.dow === 7)!.dateNum).toBe(sundayDate.getDate())
  })
})
