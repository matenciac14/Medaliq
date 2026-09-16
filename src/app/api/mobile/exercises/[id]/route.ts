import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'

const repo = new PrismaExerciseRepository()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:exercises`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const exercise = await repo.findById(id)
  if (!exercise) return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 })

  return NextResponse.json({ exercise })
}
