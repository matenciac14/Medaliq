import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { getWeekBounds, buildDaySummaries, buildWeekDates } from '@/domain/gym/build_gym_week'
import { requireFeature } from '@/lib/guards/feature_gate'
import { rateLimitAsync } from '@/lib/rate_limit'
import { todayDowInTz } from '@/lib/core/date_utils'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-week`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'gym')
  if (featureGuard) return featureGuard

  const athleteId = mobile.id
  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0') || 0
  const selectedDow = parseInt(req.nextUrl.searchParams.get('selectedDow') ?? '0') || 0
  const tz = req.nextUrl.searchParams.get('tz') || undefined

  if (Math.abs(weekOffset) > 52) {
    return NextResponse.json({ error: 'weekOffset fuera de rango' }, { status: 400 })
  }

  const { monday, sunday } = getWeekBounds(weekOffset, tz)
  const isCurrentWeek = weekOffset === 0

  const targetWeekNumber = (() => {
    // Computed later once activePlan is known
    return null as number | null
  })()

  // Parallel: fetch assigned workout + active plan
  const [assigned, activePlan] = await Promise.all([
    prisma.assignedWorkout.findFirst({
      where: { athleteId, isActive: true },
      include: {
        template: {
          include: {
            days: {
              include: {
                exercises: { include: { exercise: { select: { name: true, bodyPart: true, target: true } } }, orderBy: { order: 'asc' } },
              },
            },
          },
        },
        coach: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: 'ACTIVE' },
      select: { id: true, startDate: true },
    }),
  ])

  const weekNumber = activePlan
    ? Math.floor((monday.getTime() - new Date(activePlan.startDate).getTime()) / 86_400_000 / 7) + 1
    : null

  // ─── AssignedWorkout path ───────────────────────────────────────────────────
  if (assigned) {
    const [weekSessions, weekRunningSessions] = await Promise.all([
      prisma.gymSession.findMany({
        where: { athleteId, assignedWorkoutId: assigned.id, date: { gte: monday, lte: sunday } },
        select: {
          dayOfWeek: true, completed: true, id: true, durationMin: true, rpe: true, notes: true,
          setLogs: {
            include: { workoutExercise: { include: { exercise: { select: { name: true, bodyPart: true, target: true } } } } },
            orderBy: [{ workoutExerciseId: 'asc' }, { setNumber: 'asc' }],
          },
        },
      }),
      activePlan && weekNumber !== null && weekNumber >= 1
        ? prisma.plannedSession.findMany({
            where: {
              week: { planId: activePlan.id, weekNumber },
              NOT: { type: 'DESCANSO' },
            },
            select: { dayOfWeek: true, type: true, durationMin: true, zoneTarget: true, intensity: true },
          })
        : Promise.resolve([]),
    ])

    const runningByDow: Record<number, { type: string; durationMin: number | null; zoneTarget: string | null; intensity: string }> = {}
    for (const s of weekRunningSessions) {
      runningByDow[s.dayOfWeek] = { type: s.type, durationMin: s.durationMin, zoneTarget: s.zoneTarget, intensity: s.intensity }
    }

    const completedDows = new Set(weekSessions.filter(s => s.completed).map(s => s.dayOfWeek))
    const days = buildDaySummaries(monday, assigned.template.days, completedDows, isCurrentWeek, tz).map(day => ({
      ...day,
      runningSession: runningByDow[day.dow] ?? null,
    }))

    // Detail for selectedDow
    type CompletedExercise = { name: string; bodyPart: string | null; target: string | null; sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean }[] }
    let selectedDetail: {
      type: 'completed' | 'planned' | 'rest' | 'none'
      session?: { durationMin: number | null; rpe: number | null; notes: string | null; exercises: CompletedExercise[] }
      planned?: { label: string; exercises: { name: string; sets: number; repsScheme: string }[] }
    } | null = null

    if (selectedDow >= 1 && selectedDow <= 7) {
      const workoutDay = assigned.template.days.find(d => d.dayOfWeek === selectedDow)
      if (workoutDay?.isRestDay ?? !workoutDay) {
        selectedDetail = { type: 'rest' }
      } else {
        // MOB-2: use pre-fetched session data instead of extra query
        const session = weekSessions.find(s => s.dayOfWeek === selectedDow)

        if (session?.completed && session.setLogs.length > 0) {
          const exerciseMap = new Map<string, CompletedExercise>()
          for (const sl of session.setLogs) {
            const key = sl.workoutExercise?.id ?? sl.exerciseName ?? 'unknown'
            if (!exerciseMap.has(key)) exerciseMap.set(key, {
              name: sl.workoutExercise?.exercise.name ?? sl.exerciseName ?? 'Ejercicio',
              bodyPart: sl.workoutExercise?.exercise.bodyPart ?? null,
              target: sl.workoutExercise?.exercise.target ?? null,
              sets: [],
            })
            exerciseMap.get(key)!.sets.push({ setNumber: sl.setNumber, weightKg: sl.weightKg, repsCompleted: sl.repsCompleted, completed: sl.completed })
          }
          selectedDetail = { type: 'completed', session: { durationMin: session.durationMin, rpe: session.rpe, notes: session.notes, exercises: [...exerciseMap.values()] } }
        } else if (workoutDay && !workoutDay.isRestDay) {
          selectedDetail = { type: 'planned', planned: { label: workoutDay.label, exercises: workoutDay.exercises.map(ex => ({ name: ex.exercise.name, sets: ex.sets, repsScheme: ex.repsScheme })) } }
        } else {
          selectedDetail = { type: 'none' }
        }
      }
    }

    return NextResponse.json({
      templateName: assigned.template.name,
      coachName: assigned.coach?.name ?? null,
      weekOffset,
      isCurrentWeek,
      mondayDate: monday.toISOString(),
      completedCount: completedDows.size,
      trainingDays: assigned.template.days.filter(d => !d.isRestDay).length,
      days,
      selectedDetail,
    })
  }

  // ─── Plan-based path (no AssignedWorkout, but FUERZA sessions in plan) ──────
  if (!activePlan || weekNumber === null || weekNumber < 1) {
    // Fallback: atleta sin plan activo pero con sesiones FUERZA libres registradas esta semana
    const freeStrengthSessions = await prisma.sessionLog.findMany({
      where: {
        userId: athleteId,
        freeSessionType: 'FUERZA',
        plannedSessionId: null,
        completedAt: { gte: monday, lte: sunday },
      },
      select: { id: true, completedAt: true, durationMin: true, rpe: true, notes: true },
      orderBy: { completedAt: 'asc' },
    })
    if (freeStrengthSessions.length > 0) {
      return NextResponse.json({ sessions: freeStrengthSessions, type: 'free', weekOffset, isCurrentWeek })
    }
    return NextResponse.json({ error: 'Sin rutina asignada' }, { status: 404 })
  }

  const [plannedWeekSessions, gymSessions] = await Promise.all([
    prisma.plannedSession.findMany({
      where: {
        week: { planId: activePlan.id, weekNumber },
        NOT: { type: 'DESCANSO' },
      },
      select: {
        id: true,
        dayOfWeek: true,
        type: true,
        durationMin: true,
        zoneTarget: true,
        intensity: true,
        workoutDayId: true,
        workoutDay: { select: { label: true, muscleGroups: true, exercises: { select: { sets: true, repsScheme: true, exercise: { select: { name: true } } }, orderBy: { order: 'asc' } } } },
      },
    }),
    prisma.gymSession.findMany({
      where: { athleteId, date: { gte: monday, lte: sunday }, plannedSessionId: { not: null } },
      select: {
        dayOfWeek: true, completed: true, id: true, plannedSessionId: true,
        durationMin: true, rpe: true, notes: true,
        setLogs: {
          include: { workoutExercise: { include: { exercise: { select: { name: true, bodyPart: true, target: true } } } } },
          orderBy: [{ workoutExerciseId: 'asc' }, { setNumber: 'asc' }],
        },
      },
    }),
  ])

  // Separate FUERZA sessions (gym) from running sessions
  const fuerzaSessions = plannedWeekSessions.filter(s => s.type === 'FUERZA' && s.workoutDayId !== null)
  const runningSessions = plannedWeekSessions.filter(s => s.type !== 'FUERZA')

  if (fuerzaSessions.length === 0) {
    return NextResponse.json({ error: 'Sin rutina asignada' }, { status: 404 })
  }

  const completedPlannedIds = new Set(gymSessions.filter(s => s.completed).map(s => s.plannedSessionId!))
  const completedDows = new Set(
    fuerzaSessions.filter(s => completedPlannedIds.has(s.id)).map(s => s.dayOfWeek)
  )

  const runningByDow: Record<number, { type: string; durationMin: number | null; zoneTarget: string | null; intensity: string }> = {}
  for (const s of runningSessions) {
    runningByDow[s.dayOfWeek] = { type: s.type, durationMin: s.durationMin, zoneTarget: s.zoneTarget, intensity: s.intensity }
  }

  // Build fake TemplateDay objects for buildDaySummaries
  const fakeDays = fuerzaSessions.map(s => ({
    dayOfWeek: s.dayOfWeek,
    isRestDay: false,
    label: s.workoutDay?.label ?? 'Ejercicios',
    muscleGroups: s.workoutDay?.muscleGroups ?? [],
  }))

  const todayDow = todayDowInTz(tz)
  const weekDates = buildWeekDates(monday)
  const days = [1, 2, 3, 4, 5, 6, 7].map(dow => {
    const fuerzaDay = fakeDays.find(d => d.dayOfWeek === dow)
    return {
      dow,
      dateNum: weekDates[dow],
      isToday: isCurrentWeek && dow === todayDow,
      isCompleted: completedDows.has(dow),
      isRest: !fuerzaDay,
      hasSession: !!fuerzaDay,
      label: fuerzaDay?.label ?? null,
      muscleGroup: fuerzaDay?.muscleGroups?.[0] ?? null,
      runningSession: runningByDow[dow] ?? null,
    }
  })

  // Detail for selectedDow
  type CompletedExercise2 = { name: string; bodyPart: string | null; target: string | null; sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean }[] }
  let selectedDetail: {
    type: 'completed' | 'planned' | 'rest' | 'none'
    session?: { durationMin: number | null; rpe: number | null; notes: string | null; exercises: CompletedExercise2[] }
    planned?: { label: string; exercises: { name: string; sets: number; repsScheme: string }[] }
  } | null = null

  if (selectedDow >= 1 && selectedDow <= 7) {
    const fuerzaForDay = fuerzaSessions.find(s => s.dayOfWeek === selectedDow)
    if (!fuerzaForDay) {
      selectedDetail = { type: 'rest' }
    } else {
      // MOB-2: use pre-fetched session data instead of extra query
      const session = gymSessions.find(s => s.plannedSessionId === fuerzaForDay.id && s.completed)

      if (session && session.setLogs.length > 0) {
        {
          const exerciseMap = new Map<string, CompletedExercise2>()
          for (const sl of session.setLogs) {
            const key = sl.workoutExercise?.id ?? sl.exerciseName ?? 'unknown'
            if (!exerciseMap.has(key)) exerciseMap.set(key, {
              name: sl.workoutExercise?.exercise.name ?? sl.exerciseName ?? 'Ejercicio',
              bodyPart: sl.workoutExercise?.exercise.bodyPart ?? null,
              target: sl.workoutExercise?.exercise.target ?? null,
              sets: [],
            })
            exerciseMap.get(key)!.sets.push({ setNumber: sl.setNumber, weightKg: sl.weightKg, repsCompleted: sl.repsCompleted, completed: sl.completed })
          }
          selectedDetail = { type: 'completed', session: { durationMin: session.durationMin, rpe: session.rpe, notes: session.notes, exercises: [...exerciseMap.values()] } }
        }
      }

      if (!selectedDetail && fuerzaForDay.workoutDay) {
        selectedDetail = {
          type: 'planned',
          planned: {
            label: fuerzaForDay.workoutDay.label,
            exercises: fuerzaForDay.workoutDay.exercises.map(ex => ({ name: ex.exercise.name, sets: ex.sets, repsScheme: ex.repsScheme })),
          },
        }
      }

      selectedDetail ??= { type: 'none' }
    }
  }

  return NextResponse.json({
    templateName: 'Plan de entrenamiento',
    coachName: null,
    weekOffset,
    isCurrentWeek,
    mondayDate: monday.toISOString(),
    completedCount: completedDows.size,
    trainingDays: fuerzaSessions.length,
    days,
    selectedDetail,
  })
}
