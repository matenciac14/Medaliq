import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'
import { validateExercise } from '@/domain/admin/exercise'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

const repo = new PrismaExerciseRepository()

async function requireCoach(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') return null
  return session
}

async function findOwnedExercise(id: string, coachId: string) {
  const row = await prisma.exercise.findUnique({ where: { id }, select: { coachId: true } })
  if (!row || (row.coachId && row.coachId !== coachId)) return null
  return row
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireCoach(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-exercise-detail`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await params
  if (!await findOwnedExercise(id, session.user.id)) {
    return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 })
  }

  const exercise = await repo.findById(id)
  if (!exercise) return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 })

  return NextResponse.json(exercise)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireCoach(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-exercise-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await params

  const existing = await prisma.exercise.findUnique({ where: { id }, select: { coachId: true } })
  if (!existing || existing.coachId !== session.user.id) {
    return NextResponse.json({ error: 'Solo puedes editar tus ejercicios custom' }, { status: 404 })
  }

  const body = await req.json()
  const { name, bodyPart, target, equipment, description, gifUrl } = body

  const errors = validateExercise({ name, bodyPart, target, equipment, description })
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const updated = await prisma.exercise.update({
    where: { id },
    data: {
      name: name.trim(),
      bodyPart: bodyPart.trim(),
      target: target.trim(),
      equipment: equipment.trim(),
      description: description?.trim() || null,
      gifUrl: gifUrl?.trim() || null,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireCoach(req)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-exercise-delete`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await params

  const existing = await prisma.exercise.findUnique({ where: { id }, select: { coachId: true } })
  if (!existing || existing.coachId !== session.user.id) {
    return NextResponse.json({ error: 'Solo puedes eliminar tus ejercicios custom' }, { status: 404 })
  }

  const usageCount = await prisma.workoutExercise.count({ where: { exerciseId: id } })
  if (usageCount > 0) {
    return NextResponse.json(
      { error: 'Este ejercicio está en uso en rutinas. Retíralo de las rutinas primero.' },
      { status: 409 },
    )
  }

  await prisma.exercise.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
