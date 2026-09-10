import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { autoCompleteStrengthSession } from '@/infrastructure/db/auto_complete_strength'
import { todayInTz } from '@/lib/core/date_utils'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/lib/push/expo_push'
import { z } from 'zod'
import {
  isPRSet,
  isPRByName,
  computeProgressionUpdates,
  collectPRsByWeId,
  collectPRsByName,
  estimateCalories,
  sanitizeWeId as sanitizeWeIdPure,
  type WeNameToWeIdMap,
} from '@/domain/gym/complete_gym_session.use_case'
import { createNotification } from '@/infrastructure/db/notification'

const SetPayloadSchema = z.object({
  workoutExerciseId: z.string().min(1).optional(),
  exerciseName: z.string().max(200).optional(),
  setNumber: z.number().int().min(1).max(20),
  weightKg: z.number().min(0).max(1000).nullable(),
  repsCompleted: z.number().int().min(0).max(200).nullable(),
  completed: z.boolean(),
  setLogType: z.enum(['WORK', 'WARMUP', 'DROPSET']).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
})

const ExerciseOverrideSchema = z.object({
  originalWorkoutExerciseId: z.string().min(1),
  replacedWithExerciseId: z.string().min(1),
  replacedExerciseName: z.string().max(200),
  reason: z.string().max(500).optional(),
})

const GymCompleteSchema = z.object({
  assignedWorkoutId: z.string().min(1).optional(),
  plannedSessionId: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  rpe: z.number().int().min(1).max(10).optional(),
  durationMin: z.number().int().min(0).max(600).optional(),
  energyState: z.enum(['EXHAUSTED', 'NORMAL', 'ENERGIZED']).optional(),
  discomfort: z.enum(['NONE', 'MILD', 'MODERATE']).optional(),
  notes: z.string().max(2000).optional(),
  sets: z.array(SetPayloadSchema).max(300).optional(),
  exerciseOverrides: z.array(ExerciseOverrideSchema).max(50).optional(),
})

type SetPayload = z.infer<typeof SetPayloadSchema>
type ExerciseOverride = z.infer<typeof ExerciseOverrideSchema>

async function notifyCoach(athleteId: string, athleteName: string | null, sessionLabel: string) {
  const relation = await prisma.coachAthlete.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    select: { coach: { select: { pushToken: true } } },
  })
  if (!relation?.coach.pushToken) return
  const name = athleteName ?? 'Tu atleta'
  sendPushNotification(relation.coach.pushToken, `${name} completó una sesión`, sessionLabel, { screen: 'coach' }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  const athleteId = mobile?.id ?? (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Feature gate
  const userRecord = await prisma.user.findUnique({ where: { id: athleteId }, select: { featureGym: true, name: true, timezone: true } })
  if (!userRecord?.featureGym) {
    return NextResponse.json({ error: 'La función de Ejercicios está disponible en el plan Pro.' }, { status: 403 })
  }

  const parsed = GymCompleteSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })
  const body = parsed.data

  const { dayOfWeek, rpe, durationMin, energyState, discomfort, notes } = body
  const sets = body.sets ?? []
  const exerciseOverrides = body.exerciseOverrides ?? null

  // Pre-fetch exercise names + exerciseId for denormalization and PR detection
  const weIds = [...new Set(sets.map(s => s.workoutExerciseId).filter((id): id is string => Boolean(id)))]
  const workoutExercises = weIds.length > 0
    ? await prisma.workoutExercise.findMany({
        where: { id: { in: weIds } },
        select: { id: true, exerciseId: true, sets: true, exercise: { select: { name: true, caloriesPerMinute: true } } },
      })
    : []
  const weNameMap = new Map(workoutExercises.map(we => [we.id, we.exercise.name]))
  const weExIdMap = new Map(workoutExercises.map(we => [we.id, we.exerciseId]))
  const weSetsCountMap = new Map(workoutExercises.map(we => [we.id, we.sets]))
  // GYM-GAP-05: map exercise name → current workoutExerciseId for orphan set recovery
  const weNameToWeIdMap: WeNameToWeIdMap = new Map(workoutExercises.map(we => [we.exercise.name, we.id]))

  // EX-18: estimate calories from session duration × avg caloriesPerMinute across exercises
  const exerciseCpmValues = workoutExercises.map(we => we.exercise.caloriesPerMinute)

  // ── PR detection: max weightKg per exercise across all sessions ──────────────
  const exerciseIds = [...new Set(workoutExercises.map(we => we.exerciseId))]
  const maxPerExercise = new Map<string, number>()

  if (exerciseIds.length > 0) {
    const allWE = await prisma.workoutExercise.findMany({
      where: { exerciseId: { in: exerciseIds } },
      select: { id: true, exerciseId: true },
    })
    const weToExerciseId = new Map(allWE.map(we => [we.id, we.exerciseId]))

    // Mapeo nombre → exerciseId para recuperar sets históricos con workoutExerciseId=null
    // (ocurre cuando el coach edita la rutina y los WorkoutExercise se recrean)
    const nameToExerciseId = new Map<string, string>()
    for (const we of workoutExercises) {
      nameToExerciseId.set(we.exercise.name, we.exerciseId)
    }
    const exerciseNames = [...nameToExerciseId.keys()]

    const [historicalSets, orphanSets] = await Promise.all([
      // Sets con workoutExerciseId (rutina actual o versiones anteriores del mismo exercise)
      prisma.setLog.findMany({
        where: {
          workoutExerciseId: { in: allWE.map(we => we.id) },
          session: { athleteId },
          completed: true,
          weightKg: { not: null },
        },
        select: { workoutExerciseId: true, weightKg: true },
      }),
      // Sets huérfanos (workoutExerciseId=null) pero con exerciseName conocido
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

  // PERF-04: PR detection and progression logic extracted to domain use case
  function applyPRSet(weId: string | undefined, weightKg: number | null, completed: boolean): boolean {
    return isPRSet(weId, weightKg, completed, weExIdMap, maxPerExercise)
  }

  // GYM-GAP-05: sanitize a set's workoutExerciseId before persisting — nulls stale IDs
  function sanitizeWeId(weId: string | undefined): string | null {
    return sanitizeWeIdPure(weId, weNameMap, weExIdMap)
  }

  function persistProgression(completedSets: SetPayload[]) {
    const updates = computeProgressionUpdates(completedSets, weSetsCountMap, weNameToWeIdMap)
    if (updates.length > 0) {
      // GYM-GAP-02: log failures so stale suggestions are detectable in production logs
      Promise.all(
        updates.map(u => prisma.workoutExercise.update({ where: { id: u.workoutExerciseId }, data: { suggestedNextWeightKg: u.suggestedNextWeightKg } }))
      ).catch((err) => console.error('[gym/complete] progression update failed:', err))
    }
  }

  // ── Name-based PR detection for free sessions ─────────────────────────────
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

  const today = todayInTz(userRecord?.timezone ?? null)

  // ─── Plan-based path ────────────────────────────────────────────────────────
  if (body.plannedSessionId) {
    const fuerzaSession = await prisma.plannedSession.findFirst({
      where: {
        id: body.plannedSessionId,
        week: { plan: { userId: athleteId, status: 'ACTIVE' } },
        type: 'FUERZA',
      },
      select: { id: true },
    })
    if (!fuerzaSession) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

    // PERSIST-07: idempotencia — si ya existe una sesión para este plannedSessionId, devolver éxito
    const existingPlan = await prisma.gymSession.findFirst({
      where: { athleteId, plannedSessionId: fuerzaSession.id },
      select: { id: true },
    })
    if (existingPlan) return NextResponse.json({ sessionId: existingPlan.id, newPRs: [], alreadyCompleted: true }, { status: 200 })

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
          caloriesBurned: estimateCalories(durationMin, exerciseCpmValues),
          notes: notes ?? null,
          completed: true,
          exerciseOverrides: exerciseOverrides ? exerciseOverrides : undefined,
          setLogs: {
            create: sets.map(s => {
              const safeWeId = sanitizeWeId(s.workoutExerciseId)
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
            }),
          },
        },
        select: { id: true },
      })
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'P2002') {
        const dup = await prisma.gymSession.findFirst({ where: { athleteId, plannedSessionId: fuerzaSession.id }, select: { id: true } })
        return NextResponse.json({ sessionId: dup?.id ?? null, newPRs: [], alreadyCompleted: true }, { status: 200 })
      }
      throw err
    }

    const newPRs = collectPRsByWeId(sets, weNameMap, weExIdMap, maxPerExercise)

    autoCompleteStrengthSession({ athleteId, rpe, durationMin, notes }).catch(() => {})
    persistProgression(sets)
    notifyCoach(athleteId, userRecord.name, 'Sesión de fuerza completada 💪').catch(() => {})

    // PLT-11: notificar al atleta si logró PRs
    if (newPRs.length > 0) {
      createNotification(
        athleteId,
        'LOGRO',
        '¡Nuevo récord personal!',
        `Lograste ${newPRs.length} PR${newPRs.length > 1 ? 's' : ''} en tu sesión de hoy. ¡Sigue así!`,
      ).catch(() => {})
    }

    revalidatePath('/dashboard')
    return NextResponse.json({ sessionId: gymSession.id, newPRs }, { status: 201 })
  }

  // ─── Free session path (no template, no plan) ───────────────────────────────
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
        caloriesBurned: estimateCalories(durationMin, exerciseCpmValues),
        notes: notes ?? null,
        completed: true,
        setLogs: {
          create: sets.map(s => ({
            workoutExerciseId: null,
            exerciseName: s.exerciseName ?? null,
            setNumber: s.setNumber,
            weightKg: s.weightKg ?? null,
            repsCompleted: s.repsCompleted ?? null,
            completed: s.completed,
            isPR: applyPRByName(s.exerciseName, s.weightKg, s.completed),
            setLogType: s.setLogType ?? 'WORK',
            rpe: s.rpe ?? null,
          })),
        },
      },
      select: { id: true },
    })
    const newPRsFree = collectPRsByName(sets, maxPerFreeExerciseName)
    notifyCoach(athleteId, userRecord.name, 'Sesión libre de gym completada 💪').catch(() => {})

    // PLT-11: notificar al atleta si logró PRs en sesión libre
    if (newPRsFree.length > 0) {
      createNotification(
        athleteId,
        'LOGRO',
        '¡Nuevo récord personal!',
        `Lograste ${newPRsFree.length} PR${newPRsFree.length > 1 ? 's' : ''} en tu sesión de hoy. ¡Sigue así!`,
      ).catch(() => {})
    }

    revalidatePath('/dashboard')
    return NextResponse.json({ sessionId: gymSession.id, newPRs: newPRsFree }, { status: 201 })
  }

  // ─── AssignedWorkout path ────────────────────────────────────────────────────

  const assigned = await prisma.assignedWorkout.findFirst({
    where: { id: body.assignedWorkoutId, athleteId, isActive: true },
  })
  if (!assigned) return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })

  // PERSIST-07: idempotencia — si ya existe sesión para este assignedWorkout en el mismo día
  const existingAssigned = await prisma.gymSession.findFirst({
    where: { athleteId, assignedWorkoutId: body.assignedWorkoutId, date: today },
    select: { id: true },
  })
  if (existingAssigned) return NextResponse.json({ sessionId: existingAssigned.id, newPRs: [], alreadyCompleted: true }, { status: 200 })

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
        caloriesBurned: estimateCalories(durationMin, exerciseCpmValues),
        notes: notes ?? null,
        completed: true,
        exerciseOverrides: exerciseOverrides ? exerciseOverrides : undefined,
        setLogs: {
          create: sets.map(s => {
            const safeWeId = sanitizeWeId(s.workoutExerciseId)
            return {
              workoutExerciseId: safeWeId,
              exerciseName: safeWeId ? (weNameMap.get(safeWeId) ?? null) : (s.exerciseName ?? null),
              setNumber: s.setNumber,
              weightKg: s.weightKg ?? null,
              repsCompleted: s.repsCompleted ?? null,
              completed: s.completed,
              isPR: safeWeId ? applyPRSet(safeWeId, s.weightKg, s.completed) : applyPRByName(s.exerciseName, s.weightKg, s.completed),
              setLogType: s.setLogType ?? 'WORK',
            }
          }),
        },
      },
      select: { id: true },
    })
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'P2002') {
      const dup = await prisma.gymSession.findFirst({ where: { athleteId, assignedWorkoutId: body.assignedWorkoutId, date: today }, select: { id: true } })
      return NextResponse.json({ sessionId: dup?.id ?? null, newPRs: [], alreadyCompleted: true }, { status: 200 })
    }
    throw err
  }

  const newPRs = collectPRsByWeId(sets, weNameMap, weExIdMap, maxPerExercise)

  // DAT-5: no llamar autoCompleteStrengthSession aquí — el atleta completó una sesión
  // de assignedWorkout, no de plan. autoComplete solo aplica en el plan-based path.
  persistProgression(sets)
  notifyCoach(athleteId, userRecord.name, 'Sesión de gym completada 💪').catch(() => {})

  // PLT-11: notificar al atleta si logró PRs en sesión de rutina asignada
  if (newPRs.length > 0) {
    createNotification(
      athleteId,
      'LOGRO',
      '¡Nuevo récord personal!',
      `Lograste ${newPRs.length} PR${newPRs.length > 1 ? 's' : ''} en tu sesión de hoy. ¡Sigue así!`,
    ).catch(() => {})
  }

  revalidatePath('/dashboard')

  return NextResponse.json({ sessionId: gymSession.id, newPRs }, { status: 201 })
}
