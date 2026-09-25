import { describe, it, expect } from 'vitest'

/**
 * Tests para la lógica de limpieza de cookies en el middleware.
 * No importamos el middleware real (depende de NextAuth runtime),
 * pero verificamos la lógica de decisión que debe cumplir.
 */

// Cookie names por entorno
const DEV_SESSION = 'authjs.session-token'
const DEV_CSRF = 'authjs.csrf-token'
const PROD_SESSION = '__Secure-authjs.session-token'
const PROD_CSRF = '__Secure-authjs.csrf-token'

// Simula la lógica de decisión del middleware
function shouldCleanCookies(opts: {
  isLoggedIn: boolean
  pathname: string
  cookies: string[]
}): { clean: boolean; redirect: string | null } {
  const { isLoggedIn, pathname, cookies } = opts

  if (isLoggedIn) return { clean: false, redirect: null }
  if (pathname.startsWith('/api/')) return { clean: false, redirect: null }

  const hasStaleCookie = cookies.includes(DEV_SESSION) || cookies.includes(PROD_SESSION)
  if (!hasStaleCookie) return { clean: false, redirect: null }

  return {
    clean: true,
    redirect: pathname === '/login' ? null : '/login',
  }
}

describe('middleware cookie cleanup logic', () => {
  it('no limpia si el usuario está logueado', () => {
    const result = shouldCleanCookies({
      isLoggedIn: true,
      pathname: '/dashboard',
      cookies: [DEV_SESSION],
    })
    expect(result.clean).toBe(false)
  })

  it('no limpia en rutas /api/ (evita romper signIn client)', () => {
    const result = shouldCleanCookies({
      isLoggedIn: false,
      pathname: '/api/auth/callback/credentials',
      cookies: [DEV_SESSION],
    })
    expect(result.clean).toBe(false)
  })

  it('no limpia si no hay cookie stale', () => {
    const result = shouldCleanCookies({
      isLoggedIn: false,
      pathname: '/dashboard',
      cookies: [],
    })
    expect(result.clean).toBe(false)
  })

  it('limpia y redirige a /login en ruta privada con cookie stale (dev)', () => {
    const result = shouldCleanCookies({
      isLoggedIn: false,
      pathname: '/dashboard',
      cookies: [DEV_SESSION],
    })
    expect(result.clean).toBe(true)
    expect(result.redirect).toBe('/login')
  })

  it('limpia y redirige a /login en ruta privada con cookie stale (prod)', () => {
    const result = shouldCleanCookies({
      isLoggedIn: false,
      pathname: '/dashboard',
      cookies: [PROD_SESSION],
    })
    expect(result.clean).toBe(true)
    expect(result.redirect).toBe('/login')
  })

  it('limpia sin redirect si ya está en /login (rompe el loop)', () => {
    const result = shouldCleanCookies({
      isLoggedIn: false,
      pathname: '/login',
      cookies: [DEV_SESSION],
    })
    expect(result.clean).toBe(true)
    expect(result.redirect).toBeNull()
  })

  it('no intercepta /api/auth/session', () => {
    const result = shouldCleanCookies({
      isLoggedIn: false,
      pathname: '/api/auth/session',
      cookies: [DEV_SESSION],
    })
    expect(result.clean).toBe(false)
  })

  it('no intercepta /api/auth/csrf', () => {
    const result = shouldCleanCookies({
      isLoggedIn: false,
      pathname: '/api/auth/csrf',
      cookies: [PROD_SESSION],
    })
    expect(result.clean).toBe(false)
  })

  it('limpia en rutas de atleta (/plan, /nutrition, /progress)', () => {
    for (const path of ['/plan', '/nutrition', '/progress', '/gym', '/checkin']) {
      const result = shouldCleanCookies({
        isLoggedIn: false,
        pathname: path,
        cookies: [DEV_SESSION],
      })
      expect(result.clean).toBe(true)
      expect(result.redirect).toBe('/login')
    }
  })

  it('limpia en rutas de coach (/coach/dashboard)', () => {
    const result = shouldCleanCookies({
      isLoggedIn: false,
      pathname: '/coach/dashboard',
      cookies: [PROD_SESSION],
    })
    expect(result.clean).toBe(true)
    expect(result.redirect).toBe('/login')
  })

  it('limpia en rutas de admin (/admin)', () => {
    const result = shouldCleanCookies({
      isLoggedIn: false,
      pathname: '/admin',
      cookies: [DEV_SESSION],
    })
    expect(result.clean).toBe(true)
    expect(result.redirect).toBe('/login')
  })
})

describe('cookie name correctness', () => {
  it('dev cookies no tienen prefix __Secure-', () => {
    expect(DEV_SESSION).not.toContain('__Secure-')
    expect(DEV_CSRF).not.toContain('__Secure-')
  })

  it('prod cookies tienen prefix __Secure-', () => {
    expect(PROD_SESSION).toMatch(/^__Secure-/)
    expect(PROD_CSRF).toMatch(/^__Secure-/)
  })

  it('nombres usan authjs (v5), no next-auth (v4)', () => {
    expect(DEV_SESSION).toContain('authjs')
    expect(PROD_SESSION).toContain('authjs')
    expect(DEV_SESSION).not.toContain('next-auth')
    expect(PROD_SESSION).not.toContain('next-auth')
  })
})
