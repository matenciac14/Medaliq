import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { signMobileToken, buildMobileTokenPayload, MOBILE_USER_SELECT } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { emailSchema, passwordSchema, parseBody } from '@/lib/validation'

const LoginSchema = z.object({ email: emailSchema, password: passwordSchema })

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null)
    const parsed = parseBody(LoginSchema, raw)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { email: normalizedEmail, password } = parsed.data

    const { allowed } = await rateLimitAsync(`mobile-login-${normalizedEmail}`, { limit: 10, windowMs: 60_000 })
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Intenta en un minuto.' }, { status: 429 })

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { ...MOBILE_USER_SELECT, password: true },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 })
    }

    if (process.env.EMAIL_GATE_ENABLED === 'true' && !('emailVerified' in user)) {
      return NextResponse.json({ error: 'Debes verificar tu correo antes de iniciar sesión.' }, { status: 403 })
    }

    if (user.status !== 'ACTIVE') {
      const message = user.status === 'BLOCKED' ? 'Tu cuenta ha sido bloqueada.' : 'Tu cuenta está suspendida.'
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const coachRelation = await prisma.coachAthlete.findFirst({
      where: { athleteId: user.id, status: 'ACTIVE' },
      select: { id: true },
    })

    // Derivar deporte del perfil para adaptar tabs en mobile
    const healthProfile = await prisma.healthProfile.findUnique({
      where: { userId: user.id },
      select: { sportGoal: true },
    })
    const sport = healthProfile?.sportGoal === 'STRENGTH_TRAINING' ? 'STRENGTH'
      : healthProfile?.sportGoal === 'BODY_RECOMPOSITION' ? 'BOTH'
      : 'RUNNING'

    const payload = buildMobileTokenPayload(user, { isB2B: !!coachRelation, sport })
    const token = await signMobileToken(payload)

    return NextResponse.json({
      token,
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
        sport: payload.sport,
      },
    })
  } catch (err) {
    console.error('[mobile/login]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
