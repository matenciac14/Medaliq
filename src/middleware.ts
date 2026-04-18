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
    pathname.startsWith('/join')

  // Redirige a login si no autenticado en ruta privada
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isLoggedIn) {
    const onboardingCompleted = (session.user as any).onboardingCompleted ?? true

    // Redirige a onboarding si no lo completó (excepto si ya está ahí)
    if (!onboardingCompleted && !pathname.startsWith('/onboarding') && !isPublicRoute) {
      return NextResponse.redirect(new URL('/onboarding', nextUrl))
    }

    // Rutas de coach solo para role COACH
    if (
      pathname.startsWith('/coach') &&
      (session.user as any).role !== 'COACH'
    ) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
