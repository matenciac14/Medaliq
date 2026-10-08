import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:coach-programs-get`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const profile = await prisma.coachProfile.findUnique({
    where: { coachId: session.user.id },
  })

  if (!profile) {
    return NextResponse.json({ programs: [] })
  }

  const programs = await prisma.coachProgram.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ programs })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:programs-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const profile = await prisma.coachProfile.findUnique({
    where: { coachId: session.user.id },
  })

  if (!profile) {
    return NextResponse.json(
      { error: 'Debes crear tu perfil público primero.' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { name, description, sport, level, durationWeeks, priceMonth, includes } = body

  if (!name || !sport || !level) {
    return NextResponse.json(
      { error: 'Nombre, deporte y nivel son obligatorios.' },
      { status: 400 }
    )
  }

  const program = await prisma.coachProgram.create({
    data: {
      profileId: profile.id,
      name,
      description: description ?? null,
      sport,
      level,
      durationWeeks: durationWeeks ? parseInt(durationWeeks) : null,
      priceMonth: priceMonth ? parseFloat(priceMonth) : null,
      currency: 'USD',
      includes: includes ?? [],
      isActive: true,
    },
  })

  return NextResponse.json({ program }, { status: 201 })
}
