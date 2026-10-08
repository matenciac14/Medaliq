import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { WorkoutXClient } from '@/infrastructure/exercise_sync/workoutx.client'
import { AscendApiClient } from '@/infrastructure/exercise_sync/ascendapi.client'
import { ExerciseSyncUseCase } from '@/domain/exercise/exercise_sync.use_case'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'
import type { IExerciseSourceClient } from '@/domain/exercise/ports/exercise_source.client'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

function resolveClient(): IExerciseSourceClient {
  const source = process.env.EXERCISE_SOURCE ?? 'ascendapi'
  if (source === 'workoutx') {
    const apiKey = process.env.WORKOUTX_API_KEY
    if (!apiKey) throw new Error('WORKOUTX_API_KEY no configurada')
    return new WorkoutXClient(apiKey)
  }
  return new AscendApiClient()
}

// POST /api/admin/exercises/sync — re-seed ejercicios (fuente controlada por EXERCISE_SOURCE)
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rl = await rateLimitAsync(`web-${session.user.id}:admin-exercises-sync`, { limit: 3, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let client: IExerciseSourceClient
  try {
    client = resolveClient()
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  const repo = new PrismaExerciseRepository()
  const useCase = new ExerciseSyncUseCase(client, repo)
  const { synced } = await useCase.execute()
  return NextResponse.json({ synced, source: process.env.EXERCISE_SOURCE ?? 'ascendapi' })
}
