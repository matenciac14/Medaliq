import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'
import { rateLimitAsync } from '@/lib/rate_limit'

const repo = new PrismaExerciseRepository()

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = await rateLimitAsync(`web-${session.user.id}:exercises-list`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const filters = {
    bodyPart:  searchParams.get('bodyPart')  ?? undefined,
    target:    searchParams.get('target')    ?? undefined,
    equipment: searchParams.get('equipment') ?? undefined,
    q:         searchParams.get('q')         ?? undefined,
    page:      parseInt(searchParams.get('page')  ?? '1',  10) || 1,
    limit:     parseInt(searchParams.get('limit') ?? '20', 10) || 20,
  }

  const { exercises, total } = await repo.findAll(filters)
  return NextResponse.json({ exercises, total })
}
