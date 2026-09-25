import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { signMobileToken, buildMobileTokenPayload, MOBILE_USER_SELECT } from '@/lib/auth/mobile_auth'
import { DEFAULT_USER_CONFIG } from '@/lib/config/user_config'
import { rateLimitAsync } from '@/lib/rate_limit'

type GoogleTokenInfo = {
  sub: string
  email: string
  name: string
  picture?: string
  aud: string
  email_verified: string
}

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenInfo> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
  )
  if (!res.ok) throw new Error('Token de Google inválido.')
  const data = await res.json()
  if (data.error) throw new Error(data.error_description ?? 'Token de Google inválido.')

  const validAudiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ].filter(Boolean)

  if (validAudiences.length > 0 && !validAudiences.includes(data.aud)) {
    throw new Error('Token no corresponde a esta aplicación.')
  }

  return data as GoogleTokenInfo
}

export async function POST(req: NextRequest) {
  const clientHeader = req.headers.get('X-Client')
  if (clientHeader !== 'medaliq-mobile') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  try {
    const { idToken } = await req.json()
    if (!idToken) {
      return NextResponse.json({ error: 'idToken requerido.' }, { status: 400 })
    }

    const googleUser = await verifyGoogleToken(idToken)

    const { allowed } = await rateLimitAsync(`mobile-google-${googleUser.email}`, { limit: 20, windowMs: 60_000 })
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Intenta en un minuto.' }, { status: 429 })

    if (googleUser.email_verified !== 'true') {
      return NextResponse.json({ error: 'Correo de Google no verificado.' }, { status: 400 })
    }

    let dbUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
      select: { ...MOBILE_USER_SELECT, image: true },
    })

    let needsRoleSelection = false

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          image: googleUser.picture ?? null,
          role: 'ATHLETE',
          needsRoleSelection: true,
          onboardingCompleted: false,
        },
        select: { ...MOBILE_USER_SELECT, image: true },
      })
      needsRoleSelection = true
    } else if (dbUser.needsRoleSelection) {
      needsRoleSelection = true
    }

    const payload = needsRoleSelection
      ? {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name ?? '',
          role: dbUser.role,
          status: dbUser.status as 'ACTIVE',
          onboardingCompleted: false,
          activated: false,
          isB2B: false,
          userPlan: 'FREE' as const,
          profileComplete: false,
          needsRoleSelection: true,
          features: DEFAULT_USER_CONFIG.features,
        }
      : buildMobileTokenPayload(dbUser, { isB2B: false })

    const token = await signMobileToken(payload)

    return NextResponse.json({
      token,
      needsRoleSelection,
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        onboardingCompleted: payload.onboardingCompleted,
        activated: payload.activated,
        isB2B: payload.isB2B,
        userPlan: payload.userPlan,
        profileComplete: payload.profileComplete,
        features: payload.features,
      },
    })
  } catch (err: unknown) {
    console.error('[mobile/auth/google]', err)
    const errMessage = err instanceof Error ? err.message : ''
    const message = errMessage.includes('inválido') || errMessage.includes('aplicación')
      ? errMessage
      : 'Error al autenticar con Google.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
