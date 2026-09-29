import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getSessionIntensity } from '@/domain/plan/intensity'
import { createNotification } from '@/infrastructure/db/notification'

const VALID_TYPES = [
  'RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA',
  'FUERZA', 'CICLA', 'NATACION', 'DESCANSO', 'TEST', 'SIMULACRO', 'OTRO',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  if (body.type && VALID_TYPES.includes(body.type)) {
    data.type = body.type
    data.intensity = getSessionIntensity(body.type)
  }
  if (typeof body.durationMin === 'number' && body.durationMin > 0) data.durationMin = body.durationMin
  if ('distanceKm' in body) data.distanceKm = typeof body.distanceKm === 'number' && body.distanceKm > 0 ? body.distanceKm : null
  if (typeof body.detailText === 'string') data.detailText = body.detailText.trim() || null
  if (typeof body.zoneTarget === 'string') data.zoneTarget = body.zoneTarget.trim() || null
  if (typeof body.structure === 'string') data.structure = body.structure.trim() || null
  if (typeof body.sportLabel === 'string') data.sportLabel = body.sportLabel.trim() || null
  // workoutDayId: null clears it, string sets it (only allowed when type=FUERZA)
  if ('workoutDayId' in body) {
    const newType = (data.type as string | undefined) ?? plannedSession.type
    if (newType === 'FUERZA') {
      if (body.workoutDayId === null) {
        data.workoutDayId = null
      } else if (typeof body.workoutDayId === 'string') {
        const day = await prisma.workoutDay.findUnique({
          where: { id: body.workoutDayId },
          select: { template: { select: { coachId: true } } },
        })
        if (day && day.template.coachId === session.user.id) data.workoutDayId = body.workoutDayId
      }
    } else {
      data.workoutDayId = null // clear if type changed away from FUERZA
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await prisma.plannedSession.update({
    where: { id: sessionId },
    data,
  })

  // PLT-11: notificar al atleta que su plan fue modificado
  createNotification(
    athleteId,
    'PLAN_ACTUALIZADO',
    'Tu plan fue actualizado',
    'Tu coach modificó una sesión de tu plan de entrenamiento.',
    { metadata: { sessionId } },
  ).catch(() => {})

  return NextResponse.json({ ok: true, session: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params

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

  await prisma.plannedSession.delete({ where: { id: sessionId } })

  return NextResponse.json({ ok: true })
}
