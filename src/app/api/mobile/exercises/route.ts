import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'

const repo = new PrismaExerciseRepository()

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:exercises`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

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
