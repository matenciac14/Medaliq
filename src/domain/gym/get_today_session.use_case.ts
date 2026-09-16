/**
 * Domain use case — get today's gym session data.
 *
 * Pure orchestration: receives athleteId + prisma, returns session data.
 * Shared by web (/api/athlete/gym/session/today) and mobile (/api/mobile/gym/today).
 * No auth, no rate limiting, no Next.js — those belong in the route layer.
 */
import type { PrismaClient } from '../../generated/prisma/client'
import { jsToOurDow, todayInTz } from '@/lib/core/date_utils'
import { resolveExerciseGifUrl } from '@/lib/gym/gif_url'

export type TodaySessionResult = {
  assignedWorkoutId: string | null
  plannedSessionId: string | null
  templateName: string
  dayOfWeek: number
  isRestDay: boolean
  freeSession?: boolean
  selfCoachDay?: unknown
  hasCoach: boolean
  plannedRunToday: { type: string; durationMin: number | null; zoneTarget: string | null } | null
  workoutDay: {
    id: string
    label: string
    muscleGroups: string[]
    warmupNotes: string | null
    cardioNotes: string | null
  } | null
  exercises: {
    id: string
    order: number
    sets: number
    repsScheme: string
    restSeconds: number | null
    notes: string | null
    setType: string
    supersetWith: string | null
    suggestedNextWeightKg: number | null
    exercise: {
      id: string
      name: string
      bodyPart: string
      target: string
      equipment: string
      mechanic: string | null
      description: string | null
      gif: string | null
    }
    previousLogs: {
      setNumber: number
      weightKg: number | null
      repsCompleted: number | null
      completed: boolean
    }[]
  }[]
  previousLogs?: unknown[]
  plannedSession: null
}

type PreviousSetLog = {
  workoutExerciseId: string | null
  setNumber: number
  weightKg: number | null
  repsCompleted: number | null
  completed: boolean
}

function mapExercises(
  exercises: {
    id: string
    order: number
    sets: number
    repsScheme: string
    restSeconds: number | null
    notes: string | null
    setType: string
    supersetWith: string | null
    suggestedNextWeightKg: number | null
    exercise: {
      id: string
      name: string
      nameEs: string | null
      bodyPart: string
      target: string
      equipment: string
      mechanic: string | null
      description: string | null
      gifUrl: string | null
      gifStoredUrl: string | null
    }
  }[],
  previousSetLogs: PreviousSetLog[],
) {
  return exercises.map((we) => ({
    id: we.id,
    order: we.order,
    sets: we.sets,
    repsScheme: we.repsScheme,
    restSeconds: we.restSeconds,
    notes: we.notes,
    setType: we.setType,
    supersetWith: we.supersetWith,
    suggestedNextWeightKg: we.suggestedNextWeightKg ?? null,
    exercise: {
      id: we.exercise.id,
      name: we.exercise.nameEs ?? we.exercise.name,
      bodyPart: we.exercise.bodyPart,
      target: we.exercise.target,
      equipment: we.exercise.equipment,
      mechanic: we.exercise.mechanic,
      description: we.exercise.description,
      gif: resolveExerciseGifUrl(we.exercise.id, we.exercise.gifStoredUrl, we.exercise.gifUrl),
    },
    previousLogs: previousSetLogs
      .filter(sl => sl.workoutExerciseId === we.id)
      .map(sl => ({
        setNumber: sl.setNumber,
        weightKg: sl.weightKg,
        repsCompleted: sl.repsCompleted,
        completed: sl.completed,
      })),
  }))
}

function buildRunToday(raw: { type: string; durationMin: number | null; zoneTarget: string | null; intensity: string } | null) {
  if (!raw) return null
  return { type: raw.type, durationMin: raw.durationMin, zoneTarget: raw.zoneTarget ?? null }
}

export async function getTodaySession(
  athleteId: string,
  timezone: string | null,
  prisma: PrismaClient,
): Promise<TodaySessionResult> {
  const tz = timezone ?? 'America/Bogota'
  const todayDow = jsToOurDow(new Date(new Date().toLocaleString('en-US', { timeZone: tz })).getDay())

  const [activePlan, assigned, coachRelation, plannedRunTodayRaw, weeklyRoutine] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: 'ACTIVE' },
      select: { id: true, startDate: true },
    }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId, isActive: true },
      include: {
        template: {
          include: {
            days: {
              where: { dayOfWeek: todayDow },
              include: {
                exercises: {
                  orderBy: { order: 'asc' },
                  include: { exercise: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId, status: 'ACTIVE' },
      select: { coachId: true },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        weeks: {
          select: {
            sessions: {
              where: { dayOfWeek: todayDow, type: { notIn: ['FUERZA', 'DESCANSO'] } },
              select: { type: true, durationMin: true, zoneTarget: true, intensity: true },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.weeklyRoutine.findUnique({ where: { userId: athleteId }, select: { days: true, daysPerWeek: true } }),
  ])

  const plannedRunToday = plannedRunTodayRaw?.weeks
    .flatMap(w => w.sessions)
    .find(Boolean) ?? null

  const hasCoach = !!coachRelation
  const todayDay = assigned?.template?.days[0] ?? null

  // -- AssignedWorkout path --
  if (assigned && todayDay) {
    if (todayDay.isRestDay) {
      return {
        assignedWorkoutId: assigned.id,
        plannedSessionId: null,
        templateName: assigned.template.name,
        dayOfWeek: todayDow,
        isRestDay: true,
        hasCoach,
        workoutDay: todayDay,
        exercises: [],
        previousLogs: [],
        plannedSession: null,
        plannedRunToday: buildRunToday(plannedRunToday),
      }
    }

    const previousSession = await prisma.gymSession.findFirst({
      where: { athleteId, assignedWorkoutId: assigned.id, dayOfWeek: todayDow, completed: true },
      orderBy: { date: 'desc' },
      include: { setLogs: true },
    })

    const prevLogs = previousSession?.setLogs ?? []

    return {
      assignedWorkoutId: assigned.id,
      plannedSessionId: null,
      templateName: assigned.template.name,
      dayOfWeek: todayDow,
      isRestDay: false,
      hasCoach,
      workoutDay: {
        id: todayDay.id,
        label: todayDay.label,
        muscleGroups: todayDay.muscleGroups,
        warmupNotes: todayDay.warmupNotes,
        cardioNotes: todayDay.cardioNotes,
      },
      exercises: mapExercises(todayDay.exercises, prevLogs),
      previousLogs: prevLogs,
      plannedSession: null,
      plannedRunToday: buildRunToday(plannedRunToday),
    }
  }

  // -- Plan-based fallback (FUERZA session with workoutDayId) --
  if (activePlan) {
    const planStartStr = activePlan.startDate.toISOString().slice(0, 10)
    const planStart = new Date(`${planStartStr}T00:00:00.000Z`)
    const todayDate = todayInTz(tz)
    const targetWeekNumber = Math.floor((todayDate.getTime() - planStart.getTime()) / 86_400_000 / 7) + 1

    if (targetWeekNumber >= 1) {
      const fuerzaSession = await prisma.plannedSession.findFirst({
        where: {
          week: { planId: activePlan.id, weekNumber: targetWeekNumber },
          dayOfWeek: todayDow,
          type: 'FUERZA',
          workoutDayId: { not: null },
        },
        include: {
          workoutDay: {
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: { exercise: true },
              },
            },
          },
        },
      })

      if (fuerzaSession?.workoutDay) {
        const { workoutDay } = fuerzaSession

        const previousSession = await prisma.gymSession.findFirst({
          where: {
            athleteId,
            plannedSession: { workoutDayId: fuerzaSession.workoutDayId },
            completed: true,
            NOT: { plannedSessionId: fuerzaSession.id },
          },
          orderBy: { date: 'desc' },
          include: { setLogs: true },
        })

        const prevLogs = previousSession?.setLogs ?? []

        return {
          assignedWorkoutId: null,
          plannedSessionId: fuerzaSession.id,
          templateName: workoutDay.label,
          dayOfWeek: todayDow,
          isRestDay: false,
          hasCoach,
          workoutDay: {
            id: workoutDay.id,
            label: workoutDay.label,
            muscleGroups: workoutDay.muscleGroups,
            warmupNotes: workoutDay.warmupNotes ?? null,
            cardioNotes: workoutDay.cardioNotes ?? null,
          },
          exercises: mapExercises(workoutDay.exercises, prevLogs),
          previousLogs: prevLogs,
          plannedSession: null,
          plannedRunToday: buildRunToday(plannedRunToday),
        }
      }
    }
  }

  // -- Free session fallback --
  type RoutineDay = { dow: number; activity: string; split?: string | null; runType?: string | null }
  const days = (weeklyRoutine?.days ?? []) as RoutineDay[]
  const selfCoachDay = days.find(d => d.dow === todayDow) ?? null

  return {
    assignedWorkoutId: null,
    plannedSessionId: null,
    templateName: selfCoachDay?.activity === 'GYM'
      ? (selfCoachDay.split ?? 'Sesion libre')
      : 'Sesion libre',
    dayOfWeek: todayDow,
    isRestDay: selfCoachDay?.activity === 'REST',
    freeSession: true,
    selfCoachDay,
    hasCoach,
    workoutDay: null,
    exercises: [],
    previousLogs: [],
    plannedSession: null,
    plannedRunToday: buildRunToday(plannedRunToday),
  }
}
