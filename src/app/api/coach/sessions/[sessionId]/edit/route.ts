import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const VALID_TYPES = [
  'RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA',
  'FUERZA', 'CICLA', 'NATACION', 'DESCANSO', 'TEST', 'SIMULACRO', 'OTRO',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const body = await req.json()

  // Verify session belongs to athlete of this coach
  const plannedSession = await prisma.plannedSession.findUnique({
    where: { id: sessionId },
    include: { week: { include: { plan: { select: { userId: true } } } } },
  })

  if (!plannedSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const athleteId = plannedSession.week.plan.userId
  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
  })
  if (!relation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Build update data — only allow specific fields
  const data: Record<string, unknown> = {}
  if (body.type && VALID_TYPES.includes(body.type)) data.type = body.type
  if (typeof body.durationMin === 'number' && body.durationMin > 0) data.durationMin = body.durationMin
  if (typeof body.detailText === 'string') data.detailText = body.detailText.trim() || null
  if (typeof body.zoneTarget === 'string') data.zoneTarget = body.zoneTarget.trim() || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await prisma.plannedSession.update({
    where: { id: sessionId },
    data,
  })

  return NextResponse.json({ ok: true, session: updated })
}
