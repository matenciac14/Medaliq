import { describe, it, expect } from 'vitest'
import { getSteps, isStepValid, INITIAL_DATA, type WizardData } from './_types'

const VALID_DATA: WizardData = {
  dateOfBirth: '1996-05-15',
  heightCm: 175,
  weightKg: 80,
  gender: 'male',
  goal: 'LOSE_FAT',
  weightGoalKg: 72,
  daysPerWeek: 4,
}

describe('getSteps', () => {
  it('returns only profile when data is empty', () => {
    expect(getSteps(INITIAL_DATA)).toEqual(['profile'])
  })

  it('returns profile + generating when all required fields present', () => {
    expect(getSteps(VALID_DATA)).toEqual(['profile', 'generating'])
  })

  it('does not unlock generating without goal', () => {
    expect(getSteps({ ...VALID_DATA, goal: null })).toEqual(['profile'])
  })

  it('does not unlock generating without dateOfBirth', () => {
    expect(getSteps({ ...VALID_DATA, dateOfBirth: null })).toEqual(['profile'])
  })
})

describe('isStepValid', () => {
  it('valid with all required fields', () => {
    expect(isStepValid('profile', VALID_DATA)).toBe(true)
  })

  it('invalid without dateOfBirth', () => {
    expect(isStepValid('profile', { ...VALID_DATA, dateOfBirth: null })).toBe(false)
  })

  it('invalid without gender', () => {
    expect(isStepValid('profile', { ...VALID_DATA, gender: null })).toBe(false)
  })

  it('invalid with height out of range', () => {
    expect(isStepValid('profile', { ...VALID_DATA, heightCm: 50 })).toBe(false)
    expect(isStepValid('profile', { ...VALID_DATA, heightCm: 260 })).toBe(false)
  })

  it('invalid with weight out of range', () => {
    expect(isStepValid('profile', { ...VALID_DATA, weightKg: 20 })).toBe(false)
  })

  it('invalid without goal', () => {
    expect(isStepValid('profile', { ...VALID_DATA, goal: null })).toBe(false)
  })

  it('invalid with age < 10 from DOB', () => {
    const recentDob = new Date()
    recentDob.setFullYear(recentDob.getFullYear() - 5)
    expect(isStepValid('profile', { ...VALID_DATA, dateOfBirth: recentDob.toISOString() })).toBe(false)
  })

  it('invalid with age > 80 from DOB', () => {
    expect(isStepValid('profile', { ...VALID_DATA, dateOfBirth: '1930-01-01' })).toBe(false)
  })
})
