import { describe, it, expect } from 'vitest'
import type { JWT } from 'next-auth/jwt'
import type { Session, User } from 'next-auth'
import { mapUserToToken, mapTokenToSession, SESSION_USER_FIELDS } from './session_mappers'
import { DEFAULT_USER_CONFIG } from '@/lib/config/user_config'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@medaliq.com',
    name: 'Test User',
    role: 'ATHLETE',
    status: 'ACTIVE',
    onboardingCompleted: true,
    activated: true,
    isB2B: true,
    userPlan: 'PRO',
    features: DEFAULT_USER_CONFIG.features,
    needsRoleSelection: false,
    profileComplete: true,
    ...overrides,
  }
}

function makeToken(overrides: Partial<JWT> = {}): JWT {
  return {
    id: 'user-123',
    role: 'ATHLETE',
    status: 'ACTIVE',
    onboardingCompleted: true,
    activated: true,
    isB2B: true,
    userPlan: 'PRO',
    features: DEFAULT_USER_CONFIG.features,
    needsRoleSelection: false,
    profileComplete: true,
    iat: 1000000,
    exp: 2000000,
    sub: 'user-123',
    ...overrides,
  }
}

function makeEmptySession(): Session {
  return {
    expires: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: '',
      role: 'ATHLETE',
      status: 'ACTIVE',
      onboardingCompleted: false,
      activated: false,
      isB2B: false,
      userPlan: 'FREE',
      needsRoleSelection: false,
      features: DEFAULT_USER_CONFIG.features,
      profileComplete: false,
    },
  }
}

// ── mapUserToToken ────────────────────────────────────────────────────────────

describe('mapUserToToken', () => {
  it('mapea todos los campos del user al token', () => {
    const token: JWT = { iat: 1000, exp: 2000, sub: '' }
    const user = makeUser()

    const result = mapUserToToken(token, user)

    expect(result.id).toBe('user-123')
    expect(result.role).toBe('ATHLETE')
    expect(result.status).toBe('ACTIVE')
    expect(result.onboardingCompleted).toBe(true)
    expect(result.activated).toBe(true)
    expect(result.isB2B).toBe(true)
    expect(result.userPlan).toBe('PRO')
    expect(result.needsRoleSelection).toBe(false)
    expect(result.profileComplete).toBe(true)
    expect(result.features).toEqual(DEFAULT_USER_CONFIG.features)
  })

  it('aplica defaults cuando user tiene campos undefined', () => {
    const token: JWT = { iat: 1000, exp: 2000, sub: '' }
    const user = makeUser({
      status: undefined,
      onboardingCompleted: undefined,
      activated: undefined,
      isB2B: undefined,
      userPlan: undefined,
      features: undefined,
      needsRoleSelection: undefined,
      profileComplete: undefined,
    })

    const result = mapUserToToken(token, user)

    expect(result.status).toBe('ACTIVE')
    expect(result.onboardingCompleted).toBe(false)
    expect(result.activated).toBe(false)
    expect(result.isB2B).toBe(false)
    expect(result.userPlan).toBe('FREE')
    expect(result.features).toEqual(DEFAULT_USER_CONFIG.features)
    expect(result.needsRoleSelection).toBe(false)
    expect(result.profileComplete).toBe(false)
  })

  it('preserva campos JWT existentes (iat, exp, sub)', () => {
    const token: JWT = { iat: 1000, exp: 2000, sub: 'sub-val' }
    mapUserToToken(token, makeUser())

    expect(token.iat).toBe(1000)
    expect(token.exp).toBe(2000)
    expect(token.sub).toBe('sub-val')
  })

  it('mapea coach correctamente', () => {
    const token: JWT = { iat: 1000, exp: 2000, sub: '' }
    const coach = makeUser({
      id: 'coach-1',
      role: 'COACH',
      isB2B: false,
      profileComplete: false,
      features: { ...DEFAULT_USER_CONFIG.features, coach: true, plan: false },
    })

    mapUserToToken(token, coach)

    expect(token.role).toBe('COACH')
    expect(token.isB2B).toBe(false)
    expect(token.features!.coach).toBe(true)
  })
})

// ── mapTokenToSession ─────────────────────────────────────────────────────────

describe('mapTokenToSession', () => {
  it('mapea todos los campos del token a la session', () => {
    const session = makeEmptySession()
    const token = makeToken()

    const result = mapTokenToSession(session, token)

    expect(result.user.id).toBe('user-123')
    expect(result.user.role).toBe('ATHLETE')
    expect(result.user.status).toBe('ACTIVE')
    expect(result.user.onboardingCompleted).toBe(true)
    expect(result.user.activated).toBe(true)
    expect(result.user.isB2B).toBe(true)
    expect(result.user.userPlan).toBe('PRO')
    expect(result.user.needsRoleSelection).toBe(false)
    expect(result.user.profileComplete).toBe(true)
    expect(result.user.features).toEqual(DEFAULT_USER_CONFIG.features)
  })

  it('aplica defaults cuando token tiene campos undefined', () => {
    const session = makeEmptySession()
    const token = makeToken({
      id: undefined,
      role: undefined,
      status: undefined,
      onboardingCompleted: undefined,
      activated: undefined,
      isB2B: undefined,
      userPlan: undefined,
      needsRoleSelection: undefined,
      features: undefined,
      profileComplete: undefined,
    })

    const result = mapTokenToSession(session, token)

    expect(result.user.id).toBe('')
    expect(result.user.role).toBe('ATHLETE')
    expect(result.user.status).toBe('ACTIVE')
    expect(result.user.onboardingCompleted).toBe(false)
    expect(result.user.activated).toBe(false)
    expect(result.user.isB2B).toBe(false)
    expect(result.user.userPlan).toBe('FREE')
    expect(result.user.needsRoleSelection).toBe(false)
    expect(result.user.profileComplete).toBe(false)
    expect(result.user.features).toEqual(DEFAULT_USER_CONFIG.features)
  })

  it('token con user borrado (id undefined) produce session.user.id vacío', () => {
    const session = makeEmptySession()
    const token = makeToken({ id: undefined })

    const result = mapTokenToSession(session, token)

    expect(result.user.id).toBe('')
  })
})

// ── Roundtrip: User → Token → Session ─────────────────────────────────────────

describe('roundtrip User → Token → Session', () => {
  it('no pierde campos en el roundtrip completo', () => {
    const user = makeUser()
    const token: JWT = { iat: 1000, exp: 2000, sub: '' }
    mapUserToToken(token, user)

    const session = makeEmptySession()
    mapTokenToSession(session, token)

    expect(session.user.id).toBe(user.id)
    expect(session.user.role).toBe(user.role)
    expect(session.user.status).toBe(user.status)
    expect(session.user.onboardingCompleted).toBe(user.onboardingCompleted)
    expect(session.user.activated).toBe(user.activated)
    expect(session.user.isB2B).toBe(user.isB2B)
    expect(session.user.userPlan).toBe(user.userPlan)
    expect(session.user.needsRoleSelection).toBe(user.needsRoleSelection)
    expect(session.user.profileComplete).toBe(user.profileComplete)
    expect(session.user.features).toEqual(user.features)
  })

  it('B2C Free user roundtrip', () => {
    const user = makeUser({
      isB2B: false,
      userPlan: 'FREE',
      activated: false,
      profileComplete: false,
    })

    const token: JWT = { iat: 1000, exp: 2000, sub: '' }
    mapUserToToken(token, user)

    const session = makeEmptySession()
    mapTokenToSession(session, token)

    expect(session.user.isB2B).toBe(false)
    expect(session.user.userPlan).toBe('FREE')
    expect(session.user.activated).toBe(false)
  })
})

// ── Validación de estructura: SESSION_USER_FIELDS ─────────────────────────────

describe('SESSION_USER_FIELDS completeness', () => {
  it('cubre todos los campos custom de Session.user (excluyendo name, email, image)', () => {
    const session = makeEmptySession()
    const token = makeToken()
    mapTokenToSession(session, token)

    for (const field of SESSION_USER_FIELDS) {
      expect(session.user).toHaveProperty(field)
    }
  })

  it('mapUserToToken escribe todos los SESSION_USER_FIELDS al token', () => {
    const token: JWT = { iat: 1000, exp: 2000, sub: '' }
    mapUserToToken(token, makeUser())

    for (const field of SESSION_USER_FIELDS) {
      expect(token).toHaveProperty(field)
    }
  })
})
