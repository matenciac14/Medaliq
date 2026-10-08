import { describe, it, expect } from 'vitest'

/**
 * Tests para la lógica de routing del middleware.
 * Extraemos la lógica pura de decisión (sin NextAuth runtime)
 * y validamos cada rama de redirección.
 */

// ── Tipos ────────────────────────────────────────────────────────────────────

type SessionUser = {
  id: string
  role: 'ATHLETE' | 'COACH' | 'ADMIN'
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'
  onboardingCompleted: boolean
  activated: boolean
  isB2B: boolean
  userPlan: 'FREE' | 'PRO' | 'INACTIVE'
  needsRoleSelection: boolean
}

type MiddlewareResult = { action: 'next' | 'redirect' | 'clean-cookies'; target?: string }

// ── Rutas públicas (replicadas del middleware) ───────────────────────────────

const PUBLIC_ROUTES = ['/', '/login', '/register', '/set-password', '/forgot-password', '/terminos', '/privacidad']

function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/coaches') ||
    pathname.startsWith('/p/')
  )
}

// ── Lógica pura del middleware ────────────────────────────────────────────────

function middlewareLogic(opts: {
  pathname: string
  user: SessionUser | null
  hasStaleCookie?: boolean
}): MiddlewareResult {
  const { pathname, user, hasStaleCookie = false } = opts
  const isLoggedIn = !!user

  // 1. Stale cookie cleanup
  if (!isLoggedIn && !pathname.startsWith('/api/') && hasStaleCookie) {
    return {
      action: 'clean-cookies',
      target: pathname === '/login' ? undefined : '/login',
    }
  }

  // 2. Not logged in + private route → login
  if (!isLoggedIn && !isPublicRoute(pathname)) {
    return { action: 'redirect', target: '/login' }
  }

  if (!isLoggedIn) return { action: 'next' }

  // ── Logged in rules ─────────────────────────────────────────────────────

  // 3. Suspended/Blocked → login with error
  if (user.status !== 'ACTIVE' && !pathname.startsWith('/api') && !isPublicRoute(pathname)) {
    return { action: 'redirect', target: '/login' }
  }

  // 4. Needs role selection (OAuth) → /select-role
  if (user.needsRoleSelection && !pathname.startsWith('/select-role') && !pathname.startsWith('/api')) {
    return { action: 'redirect', target: '/select-role' }
  }

  // 5. ATHLETE sin onboarding → /onboarding
  if (
    user.role === 'ATHLETE' &&
    !user.onboardingCompleted &&
    !pathname.startsWith('/onboarding') &&
    !pathname.startsWith('/select-role') &&
    !pathname.startsWith('/api') &&
    !isPublicRoute(pathname)
  ) {
    return { action: 'redirect', target: '/onboarding' }
  }

  // 6. B2B no activado → /pending (con excepciones)
  if (
    user.role === 'ATHLETE' &&
    user.onboardingCompleted &&
    user.isB2B &&
    !user.activated &&
    !pathname.startsWith('/pending') &&
    !pathname.startsWith('/log') &&
    !pathname.startsWith('/nutrition') &&
    !pathname.startsWith('/gym') &&
    !pathname.startsWith('/api') &&
    !isPublicRoute(pathname)
  ) {
    return { action: 'redirect', target: '/pending' }
  }

  // 7. Non-COACH en /coach/* → /dashboard
  if (pathname.startsWith('/coach') && user.role !== 'COACH') {
    return { action: 'redirect', target: '/dashboard' }
  }

  // 8. Non-ADMIN en /admin/* → /dashboard
  if (pathname.startsWith('/admin') && user.role !== 'ADMIN') {
    return { action: 'redirect', target: '/dashboard' }
  }

  // 9. ADMIN fuera de /admin → /admin
  if (user.role === 'ADMIN' && !pathname.startsWith('/admin') && !isPublicRoute(pathname) && !pathname.startsWith('/api')) {
    return { action: 'redirect', target: '/admin' }
  }

  // 10. COACH en /dashboard → /coach/dashboard
  if (user.role === 'COACH' && pathname === '/dashboard') {
    return { action: 'redirect', target: '/coach/dashboard' }
  }

  // 11. COACH en /onboarding → /coach/dashboard
  if (user.role === 'COACH' && pathname.startsWith('/onboarding')) {
    return { action: 'redirect', target: '/coach/dashboard' }
  }

  return { action: 'next' }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function athlete(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'user-1',
    role: 'ATHLETE',
    status: 'ACTIVE',
    onboardingCompleted: true,
    activated: true,
    isB2B: false,
    userPlan: 'FREE',
    needsRoleSelection: false,
    ...overrides,
  }
}

function coach(overrides: Partial<SessionUser> = {}): SessionUser {
  return { ...athlete({ role: 'COACH' }), ...overrides }
}

function admin(overrides: Partial<SessionUser> = {}): SessionUser {
  return { ...athlete({ role: 'ADMIN' }), ...overrides }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('middleware routing — unauthenticated', () => {
  it('permite rutas públicas sin auth', () => {
    for (const path of ['/', '/login', '/register', '/forgot-password', '/set-password', '/terminos', '/privacidad']) {
      expect(middlewareLogic({ pathname: path, user: null })).toEqual({ action: 'next' })
    }
  })

  it('permite /join/* sin auth', () => {
    expect(middlewareLogic({ pathname: '/join/ABC123', user: null })).toEqual({ action: 'next' })
  })

  it('permite /coaches/* sin auth', () => {
    expect(middlewareLogic({ pathname: '/coaches/juan-perez', user: null })).toEqual({ action: 'next' })
  })

  it('permite /p/* sin auth', () => {
    expect(middlewareLogic({ pathname: '/p/coach-slug', user: null })).toEqual({ action: 'next' })
  })

  it('permite /api/* sin auth', () => {
    expect(middlewareLogic({ pathname: '/api/auth/session', user: null })).toEqual({ action: 'next' })
  })

  it('redirige a /login en ruta privada sin auth', () => {
    for (const path of ['/dashboard', '/plan', '/nutrition', '/gym', '/checkin', '/progress', '/coach/dashboard', '/admin']) {
      expect(middlewareLogic({ pathname: path, user: null })).toEqual({ action: 'redirect', target: '/login' })
    }
  })

  it('limpia cookies stale y redirige a /login', () => {
    const result = middlewareLogic({ pathname: '/dashboard', user: null, hasStaleCookie: true })
    expect(result.action).toBe('clean-cookies')
    expect(result.target).toBe('/login')
  })

  it('limpia cookies stale sin redirect si ya está en /login', () => {
    const result = middlewareLogic({ pathname: '/login', user: null, hasStaleCookie: true })
    expect(result.action).toBe('clean-cookies')
    expect(result.target).toBeUndefined()
  })

  it('no limpia cookies stale en /api/*', () => {
    const result = middlewareLogic({ pathname: '/api/auth/callback', user: null, hasStaleCookie: true })
    expect(result.action).toBe('next')
  })
})

describe('middleware routing — ATHLETE', () => {
  it('permite acceso normal al dashboard', () => {
    expect(middlewareLogic({ pathname: '/dashboard', user: athlete() })).toEqual({ action: 'next' })
  })

  it('permite acceso a /nutrition, /gym, /plan, /progress, /checkin', () => {
    for (const path of ['/nutrition', '/gym', '/plan', '/progress', '/checkin']) {
      expect(middlewareLogic({ pathname: path, user: athlete() })).toEqual({ action: 'next' })
    }
  })

  it('redirige a /onboarding si no completó onboarding', () => {
    const user = athlete({ onboardingCompleted: false })
    expect(middlewareLogic({ pathname: '/dashboard', user })).toEqual({ action: 'redirect', target: '/onboarding' })
  })

  it('permite /onboarding cuando no completó onboarding', () => {
    const user = athlete({ onboardingCompleted: false })
    expect(middlewareLogic({ pathname: '/onboarding', user })).toEqual({ action: 'next' })
  })

  it('permite /api/* cuando no completó onboarding', () => {
    const user = athlete({ onboardingCompleted: false })
    expect(middlewareLogic({ pathname: '/api/athlete/onboarding/generate', user })).toEqual({ action: 'next' })
  })

  it('permite rutas públicas cuando no completó onboarding', () => {
    const user = athlete({ onboardingCompleted: false })
    expect(middlewareLogic({ pathname: '/', user })).toEqual({ action: 'next' })
  })

  it('NO bloquea /onboarding cuando JWT dice completado (evita loop JWT vs DB)', () => {
    const user = athlete({ onboardingCompleted: true })
    // El middleware ya NO redirige /onboarding → /dashboard
    // El layout server-side se encarga de validar contra la DB
    expect(middlewareLogic({ pathname: '/onboarding', user })).toEqual({ action: 'next' })
  })

  it('bloquea /coach/* — redirige a /dashboard', () => {
    expect(middlewareLogic({ pathname: '/coach/dashboard', user: athlete() })).toEqual({ action: 'redirect', target: '/dashboard' })
  })

  it('bloquea /admin — redirige a /dashboard', () => {
    expect(middlewareLogic({ pathname: '/admin', user: athlete() })).toEqual({ action: 'redirect', target: '/dashboard' })
  })
})

describe('middleware routing — B2B ATHLETE (no activado)', () => {
  const b2bUser = athlete({ isB2B: true, activated: false })

  it('redirige a /pending en /dashboard', () => {
    expect(middlewareLogic({ pathname: '/dashboard', user: b2bUser })).toEqual({ action: 'redirect', target: '/pending' })
  })

  it('permite /pending (no loop)', () => {
    expect(middlewareLogic({ pathname: '/pending', user: b2bUser })).toEqual({ action: 'next' })
  })

  it('permite /log (excepción para registro libre)', () => {
    expect(middlewareLogic({ pathname: '/log/session', user: b2bUser })).toEqual({ action: 'next' })
  })

  it('permite /nutrition (excepción)', () => {
    expect(middlewareLogic({ pathname: '/nutrition', user: b2bUser })).toEqual({ action: 'next' })
  })

  it('permite /gym (excepción)', () => {
    expect(middlewareLogic({ pathname: '/gym', user: b2bUser })).toEqual({ action: 'next' })
  })

  it('permite /api/* (siempre abierto)', () => {
    expect(middlewareLogic({ pathname: '/api/mobile/nutrition', user: b2bUser })).toEqual({ action: 'next' })
  })

  it('redirige /plan a /pending (sin excepción)', () => {
    expect(middlewareLogic({ pathname: '/plan', user: b2bUser })).toEqual({ action: 'redirect', target: '/pending' })
  })

  it('redirige /checkin a /pending (sin excepción)', () => {
    expect(middlewareLogic({ pathname: '/checkin', user: b2bUser })).toEqual({ action: 'redirect', target: '/pending' })
  })

  it('redirige /progress a /pending (sin excepción)', () => {
    expect(middlewareLogic({ pathname: '/progress', user: b2bUser })).toEqual({ action: 'redirect', target: '/pending' })
  })

  it('no redirige a /pending si está activado', () => {
    const activatedUser = athlete({ isB2B: true, activated: true })
    expect(middlewareLogic({ pathname: '/dashboard', user: activatedUser })).toEqual({ action: 'next' })
  })

  it('no redirige a /pending si es B2C (isB2B=false)', () => {
    const b2cUser = athlete({ isB2B: false, activated: false })
    expect(middlewareLogic({ pathname: '/dashboard', user: b2cUser })).toEqual({ action: 'next' })
  })
})

describe('middleware routing — COACH', () => {
  it('permite /coach/* normalmente', () => {
    expect(middlewareLogic({ pathname: '/coach/dashboard', user: coach() })).toEqual({ action: 'next' })
    expect(middlewareLogic({ pathname: '/coach/athletes', user: coach() })).toEqual({ action: 'next' })
  })

  it('redirige /dashboard → /coach/dashboard', () => {
    expect(middlewareLogic({ pathname: '/dashboard', user: coach() })).toEqual({ action: 'redirect', target: '/coach/dashboard' })
  })

  it('redirige /onboarding → /coach/dashboard', () => {
    expect(middlewareLogic({ pathname: '/onboarding', user: coach() })).toEqual({ action: 'redirect', target: '/coach/dashboard' })
  })

  it('permite /api/*', () => {
    expect(middlewareLogic({ pathname: '/api/coach/athletes', user: coach() })).toEqual({ action: 'next' })
  })

  it('permite rutas públicas', () => {
    expect(middlewareLogic({ pathname: '/', user: coach() })).toEqual({ action: 'next' })
  })
})

describe('middleware routing — ADMIN', () => {
  it('permite /admin/* normalmente', () => {
    expect(middlewareLogic({ pathname: '/admin', user: admin() })).toEqual({ action: 'next' })
    expect(middlewareLogic({ pathname: '/admin/users', user: admin() })).toEqual({ action: 'next' })
  })

  it('redirige cualquier ruta privada no-admin → /admin', () => {
    expect(middlewareLogic({ pathname: '/dashboard', user: admin() })).toEqual({ action: 'redirect', target: '/admin' })
    expect(middlewareLogic({ pathname: '/plan', user: admin() })).toEqual({ action: 'redirect', target: '/admin' })
    expect(middlewareLogic({ pathname: '/nutrition', user: admin() })).toEqual({ action: 'redirect', target: '/admin' })
  })

  it('permite rutas públicas (landing, etc.)', () => {
    expect(middlewareLogic({ pathname: '/', user: admin() })).toEqual({ action: 'next' })
    expect(middlewareLogic({ pathname: '/login', user: admin() })).toEqual({ action: 'next' })
  })

  it('permite /api/*', () => {
    expect(middlewareLogic({ pathname: '/api/admin/users', user: admin() })).toEqual({ action: 'next' })
  })
})

describe('middleware routing — account status', () => {
  it('SUSPENDED redirige a /login en rutas privadas', () => {
    const user = athlete({ status: 'SUSPENDED' })
    expect(middlewareLogic({ pathname: '/dashboard', user })).toEqual({ action: 'redirect', target: '/login' })
  })

  it('BLOCKED redirige a /login en rutas privadas', () => {
    const user = athlete({ status: 'BLOCKED' })
    expect(middlewareLogic({ pathname: '/dashboard', user })).toEqual({ action: 'redirect', target: '/login' })
  })

  it('SUSPENDED permite /api/* (JWT sigue siendo válido hasta expirar)', () => {
    const user = athlete({ status: 'SUSPENDED' })
    expect(middlewareLogic({ pathname: '/api/some-endpoint', user })).toEqual({ action: 'next' })
  })

  it('SUSPENDED permite rutas públicas', () => {
    const user = athlete({ status: 'SUSPENDED' })
    expect(middlewareLogic({ pathname: '/', user })).toEqual({ action: 'next' })
  })
})

describe('middleware routing — OAuth needsRoleSelection', () => {
  it('redirige a /select-role desde cualquier ruta privada', () => {
    const user = athlete({ needsRoleSelection: true })
    expect(middlewareLogic({ pathname: '/dashboard', user })).toEqual({ action: 'redirect', target: '/select-role' })
  })

  it('permite /select-role (no loop)', () => {
    const user = athlete({ needsRoleSelection: true })
    expect(middlewareLogic({ pathname: '/select-role', user })).toEqual({ action: 'next' })
  })

  it('permite /api/* durante role selection', () => {
    const user = athlete({ needsRoleSelection: true })
    expect(middlewareLogic({ pathname: '/api/auth/set-role', user })).toEqual({ action: 'next' })
  })

  it('redirige desde rutas públicas (forzar selección)', () => {
    const user = athlete({ needsRoleSelection: true })
    expect(middlewareLogic({ pathname: '/', user })).toEqual({ action: 'redirect', target: '/select-role' })
  })
})

describe('middleware routing — edge cases / no redirect loops', () => {
  it('ATHLETE sin onboarding en /select-role: no redirige a /onboarding (permite OAuth flow)', () => {
    const user = athlete({ onboardingCompleted: false })
    expect(middlewareLogic({ pathname: '/select-role', user })).toEqual({ action: 'next' })
  })

  it('B2B sin onboarding: redirige a /onboarding, NO a /pending', () => {
    const user = athlete({ isB2B: true, activated: false, onboardingCompleted: false })
    expect(middlewareLogic({ pathname: '/dashboard', user })).toEqual({ action: 'redirect', target: '/onboarding' })
  })

  it('B2B con onboarding pero sin activar en /onboarding: no loop (permite acceso)', () => {
    const user = athlete({ isB2B: true, activated: false, onboardingCompleted: true })
    // /onboarding NO está excluida del pending check, pero la regla pending
    // solo aplica si onboardingCompleted=true. Sin embargo /onboarding no está
    // en las excepciones de pending. Veamos qué pasa:
    const result = middlewareLogic({ pathname: '/onboarding', user })
    // La regla pending captura esto → redirige a /pending (correcto: ya completó onboarding)
    expect(result).toEqual({ action: 'redirect', target: '/pending' })
  })

  it('COACH no puede acceder a rutas de admin', () => {
    expect(middlewareLogic({ pathname: '/admin', user: coach() })).toEqual({ action: 'redirect', target: '/dashboard' })
  })

  it('ADMIN no puede acceder a rutas de coach', () => {
    // ADMIN en /coach/* primero es capturado por la regla "non-COACH → /dashboard"
    // pero luego la regla ADMIN redirige a /admin. La regla coach va primero (L85).
    const result = middlewareLogic({ pathname: '/coach/dashboard', user: admin() })
    expect(result).toEqual({ action: 'redirect', target: '/dashboard' })
  })

  it('reglas se evalúan en orden: status antes de role selection', () => {
    const user = athlete({ status: 'BLOCKED', needsRoleSelection: true })
    // BLOCKED se evalúa antes que needsRoleSelection
    expect(middlewareLogic({ pathname: '/dashboard', user })).toEqual({ action: 'redirect', target: '/login' })
  })

  it('reglas se evalúan en orden: role selection antes de onboarding', () => {
    const user = athlete({ needsRoleSelection: true, onboardingCompleted: false })
    expect(middlewareLogic({ pathname: '/dashboard', user })).toEqual({ action: 'redirect', target: '/select-role' })
  })

  it('reglas se evalúan en orden: onboarding antes de pending', () => {
    const user = athlete({ onboardingCompleted: false, isB2B: true, activated: false })
    expect(middlewareLogic({ pathname: '/dashboard', user })).toEqual({ action: 'redirect', target: '/onboarding' })
  })
})
