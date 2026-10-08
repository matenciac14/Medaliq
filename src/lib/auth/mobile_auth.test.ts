import { describe, it, expect } from 'vitest'
import { buildMobileTokenPayload } from './mobile_auth'
import { SESSION_USER_FIELDS } from './session_mappers'

const DB_USER = {
  id: 'user-1',
  email: 'miguel@medaliq.com',
  name: 'Miguel',
  role: 'ATHLETE' as const,
  status: 'ACTIVE' as const,
  featurePlan: true,
  featureCheckin: true,
  featureNutrition: true,
  featureProgress: true,
  featureLog: true,
  featureCoach: false,
  featureGym: true,
  onboardingCompleted: true,
  needsRoleSelection: false,
  identification: 'CC12345',
  phoneWa: '+573001234567',
}

describe('buildMobileTokenPayload', () => {
  it('construye payload completo desde DB user', () => {
    const payload = buildMobileTokenPayload(DB_USER, { isB2B: true, sport: 'RUNNING' })

    expect(payload.id).toBe('user-1')
    expect(payload.email).toBe('miguel@medaliq.com')
    expect(payload.name).toBe('Miguel')
    expect(payload.role).toBe('ATHLETE')
    expect(payload.status).toBe('ACTIVE')
    expect(payload.onboardingCompleted).toBe(true)
    expect(payload.activated).toBe(true)
    expect(payload.isB2B).toBe(true)
    expect(payload.userPlan).toBe('PRO')
    expect(payload.profileComplete).toBe(true)
    expect(payload.sport).toBe('RUNNING')
    expect(payload.features).toEqual({
      plan: true, checkin: true, nutrition: true,
      progress: true, log: true, coach: false, gym: true,
    })
  })

  it('profileComplete = false cuando falta identification', () => {
    const user = { ...DB_USER, identification: null }
    const payload = buildMobileTokenPayload(user, { isB2B: false })
    expect(payload.profileComplete).toBe(false)
  })

  it('profileComplete = false cuando falta phoneWa', () => {
    const user = { ...DB_USER, phoneWa: null }
    const payload = buildMobileTokenPayload(user, { isB2B: false })
    expect(payload.profileComplete).toBe(false)
  })

  it('activated refleja featurePlan', () => {
    const user = { ...DB_USER, featurePlan: false }
    const payload = buildMobileTokenPayload(user, { isB2B: false })
    expect(payload.activated).toBe(false)
    expect(payload.features.plan).toBe(false)
  })

  it('name fallback a string vacío cuando es null', () => {
    const user = { ...DB_USER, name: null }
    const payload = buildMobileTokenPayload(user, { isB2B: false })
    expect(payload.name).toBe('')
  })

  it('sport es opcional — no incluido cuando no se pasa', () => {
    const payload = buildMobileTokenPayload(DB_USER, { isB2B: false })
    expect(payload.sport).toBeUndefined()
  })
})

describe('mobile payload alignment con web SESSION_USER_FIELDS', () => {
  it('mobile payload tiene todos los campos custom que web session tiene', () => {
    const payload = buildMobileTokenPayload(DB_USER, { isB2B: true })

    for (const field of SESSION_USER_FIELDS) {
      expect(payload).toHaveProperty(field)
    }
  })
})
