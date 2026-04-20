import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { DEFAULT_USER_CONFIG } from '@/lib/config/user-config'

function generateTempPassword(length = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const coachId = session.user.id

  try {
    const body = await req.json()
    const {
      name,
      email,
      sport,
      goal,
      planTier,
    } = body as {
      name: string
      email: string
      sport: string | null
      goal: string | null
      planTier?: 'free' | 'pro'
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nombre y correo son obligatorios.' },
        { status: 400 }
      )
    }

    // Check email not already registered
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese correo.' },
        { status: 409 }
      )
    }

    const tempPassword = generateTempPassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    // Build features based on selected tier
    const isPro = planTier === 'pro'
    const athleteConfig = {
      ...DEFAULT_USER_CONFIG,
      features: {
        ...DEFAULT_USER_CONFIG.features,
        plan: isPro,
        checkin: isPro,
        nutrition: isPro,
        progress: isPro,
        log: isPro,
        coach: false,
        gym: false,
      },
      sport: {
        type: sport ?? null,
        goal: goal ?? null,
      },
      onboarding: {
        completed: false,
        completedAt: null,
      },
    }

    // Create athlete user
    const athlete = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ATHLETE',
        config: athleteConfig,
      },
    })

    // Link coach <> athlete
    await prisma.coachAthlete.create({
      data: {
        coachId,
        athleteId: athlete.id,
      },
    })

    return NextResponse.json({
      ok: true,
      email: athlete.email,
      tempPassword,
      athleteId: athlete.id,
      athleteName: athlete.name,
    }, { status: 201 })
  } catch (err) {
    console.error('[coach/clients/create]', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
