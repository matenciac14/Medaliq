import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { resolveExerciseGifUrl } from '@/lib/gym/gif_url'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const athleteId = session?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = await rateLimitAsync(`web-${athleteId}:gym-session-detail`, { limit: 100, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params
  const body = await req.json()

  const gs = await prisma.gymSession.findFirst({
    where: { id, athleteId },
    select: { id: true },
  })
  if (!gs) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (['EXHAUSTED', 'NORMAL', 'ENERGIZED'].includes(body.energyState)) data.energyState = body.energyState

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  await prisma.gymSession.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const athleteId = session?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = await rateLimitAsync(`web-${athleteId}:gym-session-detail`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params

  const gymSession = await prisma.gymSession.findFirst({
    where: { id, athleteId },
    include: {
      setLogs: {
        include: {
          workoutExercise: {
            include: {
              exercise: { select: { id: true, name: true, bodyPart: true, target: true, equipment: true, gifUrl: true, gifStoredUrl: true } },
            },
          },
        },
        orderBy: [{ workoutExercise: { order: 'asc' } }, { setNumber: 'asc' }],
      },
      assignedWorkout: {
        include: {
          template: {
            include: {
              days: {
                select: { dayOfWeek: true, label: true, muscleGroups: true },
              },
            },
          },
        },
      },
    },
  })

  if (!gymSession) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  const workoutDay = gymSession.assignedWorkout?.template.days.find(
    (d) => d.dayOfWeek === gymSession.dayOfWeek
  )

  return NextResponse.json({
    id: gymSession.id,
    date: gymSession.date,
    dayOfWeek: gymSession.dayOfWeek,
    dayLabel: workoutDay?.label ?? '',
    muscleGroups: workoutDay?.muscleGroups ?? [],
    durationMin: gymSession.durationMin,
    rpe: gymSession.rpe,
    notes: gymSession.notes,
    completed: gymSession.completed,
    templateName: gymSession.assignedWorkout?.template.name ?? '',
    setLogs: gymSession.setLogs.map((sl) => ({
      id: sl.id,
      setNumber: sl.setNumber,
      weightKg: sl.weightKg,
      repsCompleted: sl.repsCompleted,
      completed: sl.completed,
      notes: sl.notes,
      exercise: sl.workoutExercise?.exercise
        ? {
            ...sl.workoutExercise.exercise,
            gif: resolveExerciseGifUrl(sl.workoutExercise.exercise.id, sl.workoutExercise.exercise.gifStoredUrl, sl.workoutExercise.exercise.gifUrl),
          }
        : { name: sl.exerciseName ?? 'Ejercicio', id: sl.workoutExerciseId ?? '' },
      workoutExerciseId: sl.workoutExerciseId,
    })),
  })
}
