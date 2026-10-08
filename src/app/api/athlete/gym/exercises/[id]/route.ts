import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'
import { rateLimitAsync } from '@/lib/rate_limit'

const repo = new PrismaExerciseRepository()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = (await auth())?.user?.id
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = await rateLimitAsync(`web-${userId}:gym-exercise-detail`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params
  const exercise = await repo.findById(id)
  if (!exercise) return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 })

  return NextResponse.json(exercise)
}
