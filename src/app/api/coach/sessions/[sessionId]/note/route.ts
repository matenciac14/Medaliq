import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const { note } = await req.json()

  if (typeof note !== 'string') {
    return NextResponse.json({ error: 'Invalid note' }, { status: 400 })
  }

  // Verify the planned session belongs to an athlete of this coach
  const plannedSession = await prisma.plannedSession.findUnique({
    where: { id: sessionId },
    include: {
      week: {
        include: {
          plan: {
            select: { userId: true },
          },
        },
      },
    },
  })

  if (!plannedSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const athleteId = plannedSession.week.plan.userId
  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
  })

  if (!relation) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.plannedSession.update({
    where: { id: sessionId },
    data: { coachNote: note.trim() || null },
  })

  return NextResponse.json({ ok: true })
}
