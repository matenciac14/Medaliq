import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'
import { rateLimitAsync } from '@/lib/rate_limit'

const repo = new PrismaExerciseRepository()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = await rateLimitAsync(`web-${session.user.id}:exercise-similar`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 6

  const exercises = await repo.findSimilar(id, limit)
  return NextResponse.json({ exercises })
}
