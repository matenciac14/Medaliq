/**
 * Domain orchestrator — complete gym session.
 *
 * Pure orchestration: receives athleteId + validated input + prisma, returns result.
 * Shared by web (/api/athlete/gym/session/complete) and mobile (/api/mobile/gym/complete).
 * No auth, no rate limiting, no Next.js — those belong in the route layer.
 */
import type { PrismaClient } from '../../generated/prisma/client'
import { todayInTz } from '@/lib/core/date_utils'
import { sendPushNotification } from '@/lib/push/expo_push'
import { autoCompleteStrengthSession } from '@/infrastructure/db/auto_complete_strength'
import { createNotification } from '@/infrastructure/db/notification'
import {
  isPRSet,
  isPRByName,
  computeProgressionUpdates,
  collectPRsByWeId,
  collectPRsByName,
  estimateCalories,
  sanitizeWeId as sanitizeWeIdPure,
  type WeNameToWeIdMap,
  type PRRecord,
} from '@/domain/gym/complete_gym_session.use_case'
import type { GymCompleteInput, SetPayload } from '@/domain/gym/gym_session.schemas'

export type CompleteSessionResult = {
  sessionId: string
  newPRs: PRRecord[]
  alreadyCompleted?: boolean
}

export async function completeGymSession(
  athleteId: string,
  athleteName: string | null,
  timezone: string | null,
  body: GymCompleteInput,
  prisma: PrismaClient,
): Promise<CompleteSessionResult> {
  const { dayOfWeek, rpe, durationMin, energyState, discomfort, notes } = body
  const sets = body.sets ?? []
  const exerciseOverrides = body.exerciseOverrides ?? null

  // Pre-fetch exercise names + exerciseId for denormalization and PR detection
  const weIds = [...new Set(sets.map(s => s.workoutExerciseId).filter((id): id is string => Boolean(id)))]
  type WERow = { id: string; exerciseId: string; sets: number; exercise: { name: string; caloriesPerMinute: number | null } }
  const workoutExercises: WERow[] = weIds.length > 0
    ? await prisma.workoutExercise.findMany({
        where: { id: { in: weIds } },
        select: { id: true, exerciseId: true, sets: true, exercise: { select: { name: true, caloriesPerMinute: true } } },
      })
    : []
  const weNameMap = new Map<string, string>(workoutExercises.map(we => [we.id, we.exercise.name]))
  const weExIdMap = new Map<string, string>(workoutExercises.map(we => [we.id, we.exerciseId]))
  const weSetsCountMap = new Map<string, number>(workoutExercises.map(we => [we.id, we.sets]))
  const weNameToWeIdMap: WeNameToWeIdMap = new Map(workoutExercises.map(we => [we.exercise.name, we.id]))

  const exerciseCpmValues = workoutExercises.map(we => we.exercise.caloriesPerMinute)

  // PR detection: max weightKg per exercise across all sessions
  const exerciseIds = [...new Set(workoutExercises.map(we => we.exerciseId))]
  const maxPerExercise = new Map<string, number>()

  if (exerciseIds.length > 0) {
    type WEIdRow = { id: string; exerciseId: string }
    const allWE: WEIdRow[] = await prisma.workoutExercise.findMany({
      where: { exerciseId: { in: exerciseIds } },
      select: { id: true, exerciseId: true },
    })
    const weToExerciseId = new Map<string, string>(allWE.map(we => [we.id, we.exerciseId]))

    const nameToExerciseId = new Map<string, string>()
    for (const we of workoutExercises) {
      nameToExerciseId.set(we.exercise.name, we.exerciseId)
    }
    const exerciseNames = [...nameToExerciseId.keys()]

    const [historicalSets, orphanSets] = await Promise.all([
      prisma.setLog.findMany({
        where: {
          workoutExerciseId: { in: allWE.map(we => we.id) },
          session: { athleteId },
          completed: true,
          weightKg: { not: null },
        },
        select: { workoutExerciseId: true, weightKg: true },
      }),
      exerciseNames.length > 0
        ? prisma.setLog.findMany({
            where: {
              workoutExerciseId: null,
              exerciseName: { in: exerciseNames },
              session: { athleteId },
              completed: true,
              weightKg: { not: null },
            },
            select: { exerciseName: true, weightKg: true },
          })
        : Promise.resolve([]),
    ])

    for (const sl of historicalSets) {
      if (!sl.workoutExerciseId || sl.weightKg === null) continue
      const exId = weToExerciseId.get(sl.workoutExerciseId)
      if (!exId) continue
      const cur = maxPerExercise.get(exId) ?? 0
      if (sl.weightKg > cur) maxPerExercise.set(exId, sl.weightKg)
    }

    for (const sl of orphanSets) {
      if (!sl.exerciseName || sl.weightKg === null) continue
      const exId = nameToExerciseId.get(sl.exerciseName)
      if (!exId) continue
      const cur = maxPerExercise.get(exId) ?? 0
      if (sl.weightKg > cur) maxPerExercise.set(exId, sl.weightKg)
    }
  }

  function applyPRSet(weId: string | undefined, weightKg: number | null, completed: boolean): boolean {
    return isPRSet(weId, weightKg, completed, weExIdMap, maxPerExercise)
  }

  function sanitizeWeId(weId: string | undefined): string | null {
    return sanitizeWeIdPure(weId, weNameMap, weExIdMap)
  }

  function persistProgression(completedSets: SetPayload[]) {
    const updates = computeProgressionUpdates(completedSets, weSetsCountMap, weNameToWeIdMap)
    if (updates.length > 0) {
      Promise.all(
        updates.map(u => prisma.workoutExercise.update({ where: { id: u.workoutExerciseId }, data: { suggestedNextWeightKg: u.suggestedNextWeightKg } }))
      ).catch((err) => console.error('[gym/complete] progression update failed:', err))
    }
  }

  // Name-based PR detection for free sessions
  const freeExerciseNames = [...new Set(
    sets.filter(s => !s.workoutExerciseId && s.exerciseName).map(s => s.exerciseName as string)
  )]
  const maxPerFreeExerciseName = new Map<string, number>()
  if (freeExerciseNames.length > 0) {
    const historicalFree = await prisma.setLog.findMany({
      where: { exerciseName: { in: freeExerciseNames }, session: { athleteId }, completed: true, weightKg: { not: null } },
      select: { exerciseName: true, weightKg: true },
    })
    for (const sl of historicalFree) {
      if (!sl.exerciseName || sl.weightKg === null) continue
      const cur = maxPerFreeExerciseName.get(sl.exerciseName) ?? 0
      if (sl.weightKg > cur) maxPerFreeExerciseName.set(sl.exerciseName, sl.weightKg)
    }
  }

  function applyPRByName(exerciseName: string | null | undefined, weightKg: number | null, completed: boolean): boolean {
    return isPRByName(exerciseName, weightKg, completed, maxPerFreeExerciseName)
  }

  const today = todayInTz(timezone)
  const caloriesBurned = estimateCalories(durationMin, exerciseCpmValues)

  // Helper: build set log data for prisma create
  function buildSetLogData(s: SetPayload, useWeId: boolean) {
    const safeWeId = useWeId ? sanitizeWeId(s.workoutExerciseId) : null
    return {
      workoutExerciseId: safeWeId,
      exerciseName: safeWeId ? (weNameMap.get(safeWeId) ?? null) : (s.exerciseName ?? null),
      setNumber: s.setNumber,
      weightKg: s.weightKg ?? null,
      repsCompleted: s.repsCompleted ?? null,
      completed: s.completed,
      isPR: safeWeId ? applyPRSet(safeWeId, s.weightKg, s.completed) : applyPRByName(s.exerciseName, s.weightKg, s.completed),
      setLogType: s.setLogType ?? 'WORK',
      rpe: s.rpe ?? null,
    }
  }

  // Helper: fire-and-forget side effects
  function fireNotifications(newPRs: PRRecord[], sessionLabel: string) {
    notifyCoach(athleteId, athleteName, sessionLabel, prisma).catch(() => {})
    if (newPRs.length > 0) {
      createNotification(
        athleteId,
        'LOGRO',
        '¡Nuevo récord personal!',
        `Lograste ${newPRs.length} PR${newPRs.length > 1 ? 's' : ''} en tu sesión de hoy. ¡Sigue así!`,
      ).catch(() => {})
    }
  }

  // Helper: handle P2002 duplicate key (idempotency)
  function isDuplicateKeyError(err: unknown): boolean {
    return (err as { code?: string })?.code === 'P2002'
  }

  // ── Plan-based path ────────────────────────────────────────────────────────
  if (body.plannedSessionId) {
    const fuerzaSession = await prisma.plannedSession.findFirst({
      where: {
        id: body.plannedSessionId,
        week: { plan: { userId: athleteId, status: 'ACTIVE' } },
        type: 'FUERZA',
      },
      select: { id: true },
    })
    if (!fuerzaSession) throw new SessionNotFoundError('Sesión no encontrada')

    const existingPlan = await prisma.gymSession.findFirst({
      where: { athleteId, plannedSessionId: fuerzaSession.id },
      select: { id: true },
    })
    if (existingPlan) return { sessionId: existingPlan.id, newPRs: [], alreadyCompleted: true }

    let gymSession: { id: string }
    try {
      gymSession = await prisma.gymSession.create({
        data: {
          athleteId,
          plannedSessionId: fuerzaSession.id,
          assignedWorkoutId: null,
          dayOfWeek,
          date: today,
          durationMin: durationMin ?? null,
          rpe: rpe ?? null,
          energyState: energyState ?? null,
          discomfort: discomfort ?? null,
          caloriesBurned,
          notes: notes ?? null,
          completed: true,
          exerciseOverrides: exerciseOverrides ? exerciseOverrides : undefined,
          setLogs: { create: sets.map(s => buildSetLogData(s, true)) },
        },
        select: { id: true },
      })
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        const dup = await prisma.gymSession.findFirst({ where: { athleteId, plannedSessionId: fuerzaSession.id }, select: { id: true } })
        return { sessionId: dup?.id ?? '', newPRs: [], alreadyCompleted: true }
      }
      throw err
    }

    const newPRs = collectPRsByWeId(sets, weNameMap, weExIdMap, maxPerExercise)

    // DAT-5: autoComplete only on plan-based path
    autoCompleteStrengthSession({ athleteId, rpe, durationMin, notes }).catch(() => {})
    persistProgression(sets)
    fireNotifications(newPRs, 'Sesión de fuerza completada 💪')

    return { sessionId: gymSession.id, newPRs }
  }

  // ── Free session path (no template, no plan) ──────────────────────────────
  if (!body.assignedWorkoutId) {
    const gymSession = await prisma.gymSession.create({
      data: {
        athleteId,
        assignedWorkoutId: null,
        plannedSessionId: null,
        dayOfWeek,
        date: today,
        durationMin: durationMin ?? null,
        rpe: rpe ?? null,
        energyState: energyState ?? null,
        discomfort: discomfort ?? null,
        caloriesBurned,
        notes: notes ?? null,
        completed: true,
        setLogs: { create: sets.map(s => buildSetLogData(s, false)) },
      },
      select: { id: true },
    })
    const newPRsFree = collectPRsByName(sets, maxPerFreeExerciseName)
    fireNotifications(newPRsFree, 'Sesión libre de gym completada 💪')

    return { sessionId: gymSession.id, newPRs: newPRsFree }
  }

  // ── AssignedWorkout path ───────────────────────────────────────────────────
  const assigned = await prisma.assignedWorkout.findFirst({
    where: { id: body.assignedWorkoutId, athleteId, isActive: true },
  })
  if (!assigned) throw new SessionNotFoundError('Asignación no encontrada')

  const existingAssigned = await prisma.gymSession.findFirst({
    where: { athleteId, assignedWorkoutId: body.assignedWorkoutId, date: today },
    select: { id: true },
  })
  if (existingAssigned) return { sessionId: existingAssigned.id, newPRs: [], alreadyCompleted: true }

  let gymSession: { id: string }
  try {
    gymSession = await prisma.gymSession.create({
      data: {
        athleteId,
        assignedWorkoutId: body.assignedWorkoutId,
        plannedSessionId: null,
        dayOfWeek,
        date: today,
        durationMin: durationMin ?? null,
        rpe: rpe ?? null,
        energyState: energyState ?? null,
        discomfort: discomfort ?? null,
        caloriesBurned,
        notes: notes ?? null,
        completed: true,
        exerciseOverrides: exerciseOverrides ? exerciseOverrides : undefined,
        setLogs: { create: sets.map(s => buildSetLogData(s, true)) },
      },
      select: { id: true },
    })
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      const dup = await prisma.gymSession.findFirst({ where: { athleteId, assignedWorkoutId: body.assignedWorkoutId, date: today }, select: { id: true } })
      return { sessionId: dup?.id ?? '', newPRs: [], alreadyCompleted: true }
    }
    throw err
  }

  const newPRs = collectPRsByWeId(sets, weNameMap, weExIdMap, maxPerExercise)

  persistProgression(sets)
  fireNotifications(newPRs, 'Sesión de gym completada 💪')

  return { sessionId: gymSession.id, newPRs }
}

// Domain error for route layer to catch and map to HTTP status
export class SessionNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionNotFoundError'
  }
}

async function notifyCoach(athleteId: string, athleteName: string | null, sessionLabel: string, prisma: PrismaClient) {
  const relation = await prisma.coachAthlete.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    select: { coach: { select: { pushToken: true } } },
  })
  if (!relation?.coach.pushToken) return
  const name = athleteName ?? 'Tu atleta'
  sendPushNotification(relation.coach.pushToken, `${name} completó una sesión`, sessionLabel, { screen: 'coach' }).catch(() => {})
}
