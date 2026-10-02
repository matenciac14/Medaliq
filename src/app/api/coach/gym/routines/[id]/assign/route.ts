import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { createNotification } from '@/infrastructure/db/notification'
import { rateLimitAsync } from '@/lib/rate_limit'

interface AssignBody {
  athleteId: string
  startDate: string
  weeksDuration?: number | null
  notes?: string | null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:routines-assign`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const coachId = session.user.id
  const { id: templateId } = await params

  const body: AssignBody = await req.json()
  const { athleteId, startDate, weeksDuration, notes } = body

  if (!athleteId || !startDate) {
    return NextResponse.json({ error: 'athleteId y startDate son obligatorios' }, { status: 400 })
  }

  // Verify the coach owns this template
  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, coachId },
    select: { id: true, name: true },
  })

  if (!template) {
    return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
  }

  // Verify the coach has this athlete (active relationship only)
  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId, status: 'ACTIVE' },
    select: { id: true },
  })

  if (!relation) {
    return NextResponse.json(
      { error: 'Este atleta no está vinculado a tu cuenta' },
      { status: 403 }
    )
  }

  const start = new Date(startDate)
  let endDate: Date | null = null
  if (weeksDuration && weeksDuration > 0) {
    endDate = new Date(start)
    endDate.setDate(endDate.getDate() + weeksDuration * 7)
  }

  // PERSIST-05: desactivar anterior y crear nueva en una sola tx — evita race condition
  const assignment = await prisma.$transaction(async (tx) => {
    await tx.assignedWorkout.updateMany({
      where: { athleteId, isActive: true },
      data: { isActive: false },
    })
    return tx.assignedWorkout.create({
      data: {
        templateId,
        athleteId,
        coachId,
        startDate: start,
        endDate: endDate,
        weeksDuration: weeksDuration ?? null,
        isActive: true,
        notes: notes ?? null,
      },
    })
  })

  // GYM-GAP-01: notify athlete that a new routine was assigned
  createNotification(
    athleteId,
    'PLAN_ACTUALIZADO',
    'Nueva rutina asignada',
    `Tu coach te asignó la rutina "${template.name}". Ábrela en la sección Ejercicios.`,
  ).catch((err) => console.error('[coach/gym/assign] createNotification failed:', err))

  return NextResponse.json(assignment, { status: 201 })
}

// DELETE /api/coach/gym/routines/[id]/assign — desactivar asignación sin reemplazar
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:routines-assign-delete`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const coachId = session.user.id
  const { id: templateId } = await params
  const { athleteId } = await req.json()

  if (!athleteId) return NextResponse.json({ error: 'athleteId requerido' }, { status: 400 })

  const [template, relation] = await Promise.all([
    prisma.workoutTemplate.findFirst({ where: { id: templateId, coachId }, select: { id: true } }),
    prisma.coachAthlete.findFirst({ where: { coachId, athleteId, status: 'ACTIVE' }, select: { id: true } }),
  ])

  if (!template) return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
  if (!relation) return NextResponse.json({ error: 'Este atleta no está vinculado a tu cuenta' }, { status: 403 })

  await prisma.assignedWorkout.updateMany({
    where: { athleteId, templateId, isActive: true },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
