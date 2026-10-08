import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

/** Brzycki 1RM estimado: weight × 36 / (37 - reps). Solo válido para reps < 37. */
function estimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || reps >= 37 || weightKg <= 0) return weightKg
  return Math.round((weightKg * 36) / (37 - reps) * 10) / 10
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-athlete-prs`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
    select: { id: true },
  })
  if (!relation) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  // Solo sets WORK con isPR = true — los de calentamiento/dropset no cuentan como PRs reales
  const prLogs = await prisma.setLog.findMany({
    where: {
      isPR: true,
      setLogType: 'WORK',
      session: { athleteId, completed: true },
      weightKg: { not: null },
      repsCompleted: { not: null },
    },
    include: {
      session: { select: { date: true } },
      workoutExercise: { include: { exercise: { select: { name: true, bodyPart: true } } } },
    },
    orderBy: { session: { date: 'desc' } },
  })

  // Mejor PR por ejercicio: el más reciente por nombre
  const byExercise = new Map<string, typeof prLogs[0]>()
  for (const log of prLogs) {
    const key = log.workoutExercise?.exercise.name ?? log.exerciseName ?? 'unknown'
    if (!byExercise.has(key)) byExercise.set(key, log)
  }

  const prs = [...byExercise.values()].map((log) => {
    const w = log.weightKg ? Number(log.weightKg) : 0
    const r = log.repsCompleted ?? 1
    return {
      exerciseName: log.workoutExercise?.exercise.name ?? log.exerciseName ?? 'Ejercicio',
      bodyPart: log.workoutExercise?.exercise.bodyPart ?? '',
      weightKg: w,
      repsCompleted: r,
      estimated1RM: estimated1RM(w, r),
      achievedAt: log.session.date.toISOString().split('T')[0],
    }
  })

  return NextResponse.json({ prs })
}
