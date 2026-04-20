import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { DEFAULT_USER_CONFIG, COACH_CONFIG } from '@/lib/config/user-config'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { allowed } = rateLimit(`register:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
  }

  try {
    const { name, email, password, role } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Nombre, correo y contraseña son obligatorios.' },
        { status: 400 }
      )
    }

    const validRoles = ['ATHLETE', 'COACH']
    const userRole = validRoles.includes(role) ? role : 'ATHLETE'

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese correo.' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Config inicial según rol:
    // - COACH: features.coach = true, onboarding completado
    // - ATHLETE: todo en false, espera onboarding
    const initialConfig = userRole === 'COACH'
      ? { ...COACH_CONFIG, onboarding: { completed: true, completedAt: new Date().toISOString() } }
      : DEFAULT_USER_CONFIG

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        config: initialConfig,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
