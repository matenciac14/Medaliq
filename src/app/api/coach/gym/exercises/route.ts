import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'
import { validateExercise } from '@/domain/admin/exercise'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

const repo = new PrismaExerciseRepository()

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id
  const { searchParams } = req.nextUrl

  const page = parseInt(searchParams.get('page') ?? '1', 10) || 1
  const limit = parseInt(searchParams.get('limit') ?? '20', 10) || 20
  const q = searchParams.get('q') ?? undefined
  const bodyPart = searchParams.get('bodyPart') ?? undefined
  const target = searchParams.get('target') ?? undefined
  const equipment = searchParams.get('equipment') ?? undefined

  const { exercises, total } = await repo.findAll({ coachId, q, bodyPart, target, equipment, page, limit })

  return NextResponse.json({ exercises, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:exercises-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const coachId = session.user.id

  const body = await req.json()
  const { name, bodyPart, target, equipment, description, gifUrl } = body

  // EX-24: usar validateExercise() del dominio (incluye límite de 120 chars en nombre)
  const errors = validateExercise({ name, bodyPart, target, equipment, description })
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 })
  }

  const exercise = await prisma.exercise.create({
    data: {
      coachId,
      name:        name.trim(),
      bodyPart:    bodyPart.trim(),
      target:      target.trim(),
      equipment:   equipment.trim(),
      description: description?.trim() || null,
      gifUrl:      gifUrl?.trim() || null,
      source:      'custom',
    },
  })

  return NextResponse.json(exercise, { status: 201 })
}
