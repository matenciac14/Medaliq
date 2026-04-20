import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

const PUBLIC_ROUTES = ['/', '/login', '/register']

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const pathname = nextUrl.pathname

  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/coaches') ||
    pathname.startsWith('/p/')

  // Redirige a login si no autenticado en ruta privada
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isLoggedIn) {
    const onboardingCompleted = (session.user as any).onboardingCompleted ?? true
    const role = (session.user as any).role
    const activated = (session.user as any).activated ?? false

    // Redirige a onboarding si no lo completó (excepto si ya está ahí)
    if (!onboardingCompleted && !pathname.startsWith('/onboarding') && !isPublicRoute) {
      return NextResponse.redirect(new URL('/onboarding', nextUrl))
    }

    // Atleta que completó onboarding pero no fue activado → /pending
    // Solo aplica a ATHLETE, no a ADMIN/COACH
    if (
      role === 'ATHLETE' &&
      onboardingCompleted &&
      !activated &&
      !pathname.startsWith('/pending') &&
      !pathname.startsWith('/api') &&
      !isPublicRoute
    ) {
      return NextResponse.redirect(new URL('/pending', nextUrl))
    }

    // Rutas de coach solo para role COACH
    if (
      pathname.startsWith('/coach') &&
      role !== 'COACH'
    ) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }

    // Rutas de admin solo para role ADMIN
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }

    // Admin siempre va a /admin, nunca al dashboard de atleta
    if (role === 'ADMIN' && !pathname.startsWith('/admin') && !isPublicRoute && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/admin', nextUrl))
    }

    // Coach que intenta ir al dashboard de atleta → su propio dashboard
    if (role === 'COACH' && pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/coach/dashboard', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
