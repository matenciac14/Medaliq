import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'ATHLETE') {
    return NextResponse.json({ error: 'Only athletes can join programs' }, { status: 403 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:coach-join`, { limit: 30, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await req.json()
  const { profileId, programId } = body

  if (!profileId || !programId) {
    return NextResponse.json({ error: 'Missing profileId or programId' }, { status: 400 })
  }

  const profile = await prisma.coachProfile.findUnique({
    where: { id: profileId },
    select: { coachId: true, isPublic: true },
  })

  if (!profile || !profile.isPublic) {
    return NextResponse.json({ error: 'Coach profile not found' }, { status: 404 })
  }

  const program = await prisma.coachProgram.findFirst({
    where: { id: programId, profileId, isActive: true },
    select: { id: true },
  })

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  }

  await prisma.coachAthlete.upsert({
    where: {
      coachId_athleteId: {
        coachId: profile.coachId,
        athleteId: session.user.id,
      },
    },
    update: {},
    create: {
      coachId: profile.coachId,
      athleteId: session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}
