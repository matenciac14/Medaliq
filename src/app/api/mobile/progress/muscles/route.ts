import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'

type MuscleStats = { volume: number; sets: number; lastTrainedAt: Date }

function fatigueLevel(lastTrained: Date, now: Date): 0 | 1 | 2 | 3 {
  const hoursAgo = (now.getTime() - lastTrained.getTime()) / 3_600_000
  if (hoursAgo > 48) return 0
  if (hoursAgo > 24) return 1
  if (hoursAgo > 12) return 2
  return 3
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'progress')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:progress-muscles`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '7') || 7, 90)
  const since = new Date()
  since.setDate(since.getDate() - days)

  const setLogs = await prisma.setLog.findMany({
    where: {
      session: { athleteId: mobile.id, completed: true, date: { gte: since } },
      workoutExerciseId: { not: null },
      completed: true,
    },
    select: {
      weightKg: true,
      repsCompleted: true,
      session: { select: { date: true } },
      workoutExercise: {
        select: {
          exercise: { select: { bodyPart: true, target: true, secondaryMuscles: true } },
        },
      },
    },
  })

  const muscleMap = new Map<string, MuscleStats>()

  function addToMuscle(key: string, volume: number, date: Date) {
    const existing = muscleMap.get(key) ?? { volume: 0, sets: 0, lastTrainedAt: date }
    muscleMap.set(key, {
      volume: existing.volume + volume,
      sets: existing.sets + 1,
      lastTrainedAt: date > existing.lastTrainedAt ? date : existing.lastTrainedAt,
    })
  }

  for (const sl of setLogs) {
    const ex = sl.workoutExercise?.exercise
    if (!ex) continue
    const volume = (sl.weightKg ?? 0) * (sl.repsCompleted ?? 1)
    const date = sl.session.date

    if (ex.bodyPart) addToMuscle(ex.bodyPart, volume, date)
    if (ex.target) addToMuscle(ex.target, volume, date)
    for (const sm of ex.secondaryMuscles ?? []) {
      if (sm) addToMuscle(sm, volume * 0.5, date)
    }
  }

  const now = new Date()
  const muscles: Record<string, { volume: number; sets: number; lastTrainedAt: string; fatigueLevel: 0 | 1 | 2 | 3 }> = {}
  for (const [key, stats] of muscleMap) {
    muscles[key] = {
      volume: Math.round(stats.volume),
      sets: stats.sets,
      lastTrainedAt: stats.lastTrainedAt.toISOString(),
      fatigueLevel: fatigueLevel(stats.lastTrainedAt, now),
    }
  }

  return NextResponse.json({ muscles })
}
