/**
 * Domain use case — get gym week data for mobile.
 *
 * Pure orchestration: receives athleteId + params + prisma, returns gym week view.
 * No auth, no rate limiting, no Next.js — those belong in the route layer.
 */
import type { PrismaClient } from '../../generated/prisma/client'
import { getWeekBounds, buildDaySummaries, buildWeekDates } from '@/domain/gym/build_gym_week'
import { todayDowInTz } from '@/lib/core/date_utils'

type CompletedExercise = {
  name: string
  bodyPart: string | null
  target: string | null
  sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean }[]
}

type SelectedDetail = {
  type: 'completed' | 'planned' | 'rest' | 'none'
  session?: { durationMin: number | null; rpe: number | null; notes: string | null; exercises: CompletedExercise[] }
  planned?: { label: string; exercises: { name: string; sets: number; repsScheme: string }[] }
}

type GymWeekParams = {
  athleteId: string
  weekOffset: number
  selectedDow: number
  tz?: string
}

export async function getGymWeek(params: GymWeekParams, prisma: PrismaClient) {
  const { athleteId, weekOffset, selectedDow, tz } = params
  const { monday, sunday } = getWeekBounds(weekOffset, tz)
  const isCurrentWeek = weekOffset === 0

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

  // ─── AssignedWorkout path ───
  if (assigned) {
    return buildAssignedWorkoutResponse(assigned, activePlan, weekNumber, athleteId, monday, sunday, isCurrentWeek, selectedDow, weekOffset, tz, prisma)
  }

  // ─── Plan-based path ───
  if (!activePlan || weekNumber === null || weekNumber < 1) {
    return buildFreeSessionResponse(athleteId, monday, sunday, weekOffset, isCurrentWeek, prisma)
  }

  return buildPlanBasedResponse(activePlan, weekNumber, athleteId, monday, sunday, isCurrentWeek, selectedDow, weekOffset, tz, prisma)
}

// ── Helpers ──

function buildSelectedDetail(
  setLogs: { workoutExercise: { id: string; exercise: { name: string; bodyPart: string | null; target: string | null } } | null; exerciseName: string | null; setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean }[],
  session: { durationMin: number | null; rpe: number | null; notes: string | null } | null,
): SelectedDetail {
  if (!session || setLogs.length === 0) return { type: 'none' }

  const exerciseMap = new Map<string, CompletedExercise>()
  for (const sl of setLogs) {
    const key = sl.workoutExercise?.id ?? sl.exerciseName ?? 'unknown'
    if (!exerciseMap.has(key)) exerciseMap.set(key, {
      name: sl.workoutExercise?.exercise.name ?? sl.exerciseName ?? 'Ejercicio',
      bodyPart: sl.workoutExercise?.exercise.bodyPart ?? null,
      target: sl.workoutExercise?.exercise.target ?? null,
      sets: [],
    })
    exerciseMap.get(key)!.sets.push({ setNumber: sl.setNumber, weightKg: sl.weightKg, repsCompleted: sl.repsCompleted, completed: sl.completed })
  }

  return {
    type: 'completed',
    session: { durationMin: session.durationMin, rpe: session.rpe, notes: session.notes, exercises: [...exerciseMap.values()] },
  }
}

async function buildAssignedWorkoutResponse(
  assigned: any,
  activePlan: { id: string; startDate: Date } | null,
  weekNumber: number | null,
  athleteId: string,
  monday: Date,
  sunday: Date,
  isCurrentWeek: boolean,
  selectedDow: number,
  weekOffset: number,
  tz: string | undefined,
  prisma: PrismaClient,
) {
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
          where: { week: { planId: activePlan.id, weekNumber }, NOT: { type: 'DESCANSO' } },
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

  let selectedDetail: SelectedDetail | null = null
  if (selectedDow >= 1 && selectedDow <= 7) {
    const workoutDay = assigned.template.days.find((d: any) => d.dayOfWeek === selectedDow)
    if (workoutDay?.isRestDay ?? !workoutDay) {
      selectedDetail = { type: 'rest' }
    } else {
      const session = weekSessions.find(s => s.dayOfWeek === selectedDow)
      if (session?.completed && session.setLogs.length > 0) {
        selectedDetail = buildSelectedDetail(session.setLogs, session)
      } else if (workoutDay && !workoutDay.isRestDay) {
        selectedDetail = {
          type: 'planned',
          planned: { label: workoutDay.label, exercises: workoutDay.exercises.map((ex: any) => ({ name: ex.exercise.name, sets: ex.sets, repsScheme: ex.repsScheme })) },
        }
      } else {
        selectedDetail = { type: 'none' }
      }
    }
  }

  return {
    templateName: assigned.template.name,
    coachName: assigned.coach?.name ?? null,
    weekOffset,
    isCurrentWeek,
    mondayDate: monday.toISOString(),
    completedCount: completedDows.size,
    trainingDays: assigned.template.days.filter((d: any) => !d.isRestDay).length,
    days,
    selectedDetail,
  }
}

async function buildFreeSessionResponse(
  athleteId: string,
  monday: Date,
  sunday: Date,
  weekOffset: number,
  isCurrentWeek: boolean,
  prisma: PrismaClient,
) {
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
    return { sessions: freeStrengthSessions, type: 'free' as const, weekOffset, isCurrentWeek }
  }
  return null // signals 404 to the route
}

async function buildPlanBasedResponse(
  activePlan: { id: string; startDate: Date },
  weekNumber: number,
  athleteId: string,
  monday: Date,
  sunday: Date,
  isCurrentWeek: boolean,
  selectedDow: number,
  weekOffset: number,
  tz: string | undefined,
  prisma: PrismaClient,
) {
  const [plannedWeekSessions, gymSessions] = await Promise.all([
    prisma.plannedSession.findMany({
      where: { week: { planId: activePlan.id, weekNumber }, NOT: { type: 'DESCANSO' } },
      select: {
        id: true, dayOfWeek: true, type: true, durationMin: true, zoneTarget: true, intensity: true, workoutDayId: true,
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

  const fuerzaSessions = plannedWeekSessions.filter(s => s.type === 'FUERZA' && s.workoutDayId !== null)
  const runningSessions = plannedWeekSessions.filter(s => s.type !== 'FUERZA')

  if (fuerzaSessions.length === 0) return null // signals 404

  const completedPlannedIds = new Set(gymSessions.filter(s => s.completed).map(s => s.plannedSessionId!))
  const completedDows = new Set(fuerzaSessions.filter(s => completedPlannedIds.has(s.id)).map(s => s.dayOfWeek))

  const runningByDow: Record<number, { type: string; durationMin: number | null; zoneTarget: string | null; intensity: string }> = {}
  for (const s of runningSessions) {
    runningByDow[s.dayOfWeek] = { type: s.type, durationMin: s.durationMin, zoneTarget: s.zoneTarget, intensity: s.intensity }
  }

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

  let selectedDetail: SelectedDetail | null = null
  if (selectedDow >= 1 && selectedDow <= 7) {
    const fuerzaForDay = fuerzaSessions.find(s => s.dayOfWeek === selectedDow)
    if (!fuerzaForDay) {
      selectedDetail = { type: 'rest' }
    } else {
      const session = gymSessions.find(s => s.plannedSessionId === fuerzaForDay.id && s.completed)
      if (session && session.setLogs.length > 0) {
        selectedDetail = buildSelectedDetail(session.setLogs, session)
      } else if (fuerzaForDay.workoutDay) {
        selectedDetail = {
          type: 'planned',
          planned: {
            label: fuerzaForDay.workoutDay.label,
            exercises: fuerzaForDay.workoutDay.exercises.map(ex => ({ name: ex.exercise.name, sets: ex.sets, repsScheme: ex.repsScheme })),
          },
        }
      } else {
        selectedDetail = { type: 'none' }
      }
    }
  }

  return {
    templateName: 'Plan de entrenamiento',
    coachName: null,
    weekOffset,
    isCurrentWeek,
    mondayDate: monday.toISOString(),
    completedCount: completedDows.size,
    trainingDays: fuerzaSessions.length,
    days,
    selectedDetail,
  }
}
