import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-history`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const athleteId = mobile.id

  // Fetch en paralelo: sesiones de rutina asignada + logs libres de FUERZA
  const [gymSessions, freeLogs] = await Promise.all([
    prisma.gymSession.findMany({
      where: { athleteId },
      orderBy: { date: 'desc' },
      take: 50,
      include: {
        setLogs: {
          include: {
            workoutExercise: {
              include: { exercise: { select: { name: true, bodyPart: true, target: true, secondaryMuscles: true } } },
            },
          },
          orderBy: [{ workoutExercise: { order: 'asc' } }, { setNumber: 'asc' }],
        },
        assignedWorkout: {
          include: {
            template: {
              include: {
                days: { select: { dayOfWeek: true, label: true, muscleGroups: true } },
              },
            },
          },
        },
      },
    }),
    prisma.sessionLog.findMany({
      where: { userId: athleteId, plannedSessionId: null, freeSessionType: 'FUERZA' },
      orderBy: { completedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        completedAt: true,
        durationMin: true,
        rpe: true,
        notes: true,
      },
    }),
  ])

  const formattedGym = gymSessions.map(gs => {
    const workoutDay = gs.assignedWorkout?.template.days.find(d => d.dayOfWeek === gs.dayOfWeek)

    type ExerciseEntry = {
      name: string
      bodyPart: string | null
      target: string | null
      secondaryMuscles: string[]
      sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean; isPR: boolean; setLogType: string; rpe: number | null }[]
    }
    const exerciseMap: Record<string, ExerciseEntry> = {}
    for (const sl of gs.setLogs) {
      const key = sl.workoutExerciseId ?? sl.exerciseName ?? 'unknown'
      if (!exerciseMap[key]) {
        exerciseMap[key] = {
          name: sl.workoutExercise?.exercise.name ?? sl.exerciseName ?? 'Ejercicio',
          bodyPart: sl.workoutExercise?.exercise.bodyPart ?? null,
          target: sl.workoutExercise?.exercise.target ?? null,
          secondaryMuscles: sl.workoutExercise?.exercise.secondaryMuscles ?? [],
          sets: [],
        }
      }
      exerciseMap[key].sets.push({
        setNumber: sl.setNumber,
        weightKg: sl.weightKg,
        repsCompleted: sl.repsCompleted,
        completed: sl.completed,
        isPR: sl.isPR,
        setLogType: sl.setLogType,
        rpe: sl.rpe,
      })
    }

    const completedSets = gs.setLogs.filter(sl => sl.completed).length
    const volume = gs.setLogs
      .filter(sl => sl.completed)
      .reduce((acc, sl) => acc + (sl.weightKg ?? 0) * (sl.repsCompleted ?? 0), 0)

    return {
      id: gs.id,
      date: gs.date.toISOString(),
      dayOfWeek: gs.dayOfWeek,
      label: workoutDay?.label ?? 'Sesión',
      muscleGroups: workoutDay?.muscleGroups ?? [],
      durationMin: gs.durationMin,
      rpe: gs.rpe,
      completed: gs.completed,
      notes: gs.notes,
      completedSets,
      volumeKg: Math.round(volume),
      exercises: Object.values(exerciseMap),
      isFree: false,
    }
  })

  const formattedFree = freeLogs.map(fl => ({
    id: fl.id,
    date: fl.completedAt.toISOString(),
    dayOfWeek: fl.completedAt.getUTCDay() === 0 ? 7 : fl.completedAt.getUTCDay(), // 1=lun…7=dom (UTC — completedAt stored as UTC)
    label: 'Fuerza libre',
    muscleGroups: [] as string[],
    durationMin: fl.durationMin,
    rpe: fl.rpe,
    completed: true,
    notes: fl.notes,
    completedSets: 0,
    volumeKg: 0,
    exercises: [] as { name: string; sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean; isPR: boolean }[] }[],
    isFree: true,
  }))

  // Unificar y ordenar por fecha desc — filtrar libres sin sets (solo tienen metadata)
  const all = [...formattedGym, ...formattedFree.filter(s => s.durationMin !== null || s.rpe !== null || s.notes !== null)].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 60)

  const totalVolume = all.reduce((acc, s) => acc + s.volumeKg, 0)
  const totalSets = gymSessions.reduce((acc, s) => acc + s.setLogs.filter(sl => sl.completed).length, 0)

  return NextResponse.json({
    sessions: all,
    stats: {
      total: all.length,
      completed: all.filter(s => s.completed).length,
      totalSets,
      totalVolumeKg: totalVolume,
    },
  })
}
