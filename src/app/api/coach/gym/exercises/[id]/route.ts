import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'
import { prisma } from '@/lib/db/prisma'

const repo = new PrismaExerciseRepository()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  // Ownership check: solo globales (coachId null) o propios del coach
  const row = await prisma.exercise.findUnique({ where: { id }, select: { coachId: true } })
  if (!row || (row.coachId && row.coachId !== session.user.id)) {
    return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 })
  }

  const exercise = await repo.findById(id)
  if (!exercise) {
    return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 })
  }

  return NextResponse.json(exercise)
}
