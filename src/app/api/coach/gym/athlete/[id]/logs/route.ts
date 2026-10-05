import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-athlete-logs`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params
  const url = new URL(req.url)
  const limitParam = parseInt(url.searchParams.get('limit') ?? '60')
  const limit = Math.min(Math.max(limitParam, 1), 200) // entre 1 y 200

  // Verificar que el coach tiene relación con este atleta
  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
    select: { id: true },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const sessions = await prisma.gymSession.findMany({
    where: { athleteId, completed: true },
    orderBy: { date: 'asc' },
    take: limit,
    include: {
      setLogs: {
        include: {
          workoutExercise: {
            include: { exercise: true },
          },
        },
      },
    },
  })

  // Group by exercise → logs per session
  const exerciseMap: Record<
    string,
    {
      exerciseId: string
      name: string
      bodyPart: string
      muscleGroups: string[]
      logs: {
        date: string
        sets: {
          setNumber: number
          weightKg: number | null
          repsCompleted: number | null
          isPR: boolean
          setLogType: string
        }[]
      }[]
    }
  > = {}

  for (const gymSession of sessions) {
    const dateStr = gymSession.date.toISOString().split('T')[0]

    // Group set logs by exercise within this session
    const byExercise: Record<string, typeof gymSession.setLogs> = {}
    for (const setLog of gymSession.setLogs) {
      const exId = setLog.workoutExercise?.exercise.id ?? setLog.exerciseName ?? 'unknown'
      if (!byExercise[exId]) byExercise[exId] = []
      byExercise[exId].push(setLog)
    }

    for (const [exId, logs] of Object.entries(byExercise)) {
      const ex = logs[0].workoutExercise?.exercise
      const exName = ex?.name ?? logs[0].exerciseName ?? 'Ejercicio'
      const exBodyPart = ex?.bodyPart ?? ''
      const exMuscleGroups = ex
        ? [ex.target, ...(ex.secondaryMuscles ?? [])].filter(Boolean) as string[]
        : []
      if (!exerciseMap[exId]) {
        exerciseMap[exId] = {
          exerciseId: exId,
          name: exName,
          bodyPart: exBodyPart,
          muscleGroups: exMuscleGroups,
          logs: [],
        }
      }
      exerciseMap[exId].logs.push({
        date: dateStr,
        sets: logs
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((l) => ({
            setNumber: l.setNumber,
            weightKg: l.weightKg != null ? Number(l.weightKg) : null,
            repsCompleted: l.repsCompleted,
            isPR: l.isPR,
            setLogType: l.setLogType,
          })),
      })
    }
  }

  return NextResponse.json(Object.values(exerciseMap))
}
