import type { PrismaClient } from '../../generated/prisma/client'
import type { SetType } from '../../generated/prisma/enums'

// ── Input types ──────────────────────────────────────────────────────────────

interface DayExerciseInput {
  exerciseId: string
  sets: number
  repsScheme: string
  restSeconds?: number | null
  setType?: string
  notes?: string
  order: number
  supersetWithOrder?: number | null
}

interface DayInput {
  dayOfWeek: number
  label: string
  muscleGroups: string[]
  isRestDay: boolean
  warmupNotes?: string
  cardioNotes?: string
  exercises: DayExerciseInput[]
}

export interface UpdateRoutineInput {
  routineId: string
  coachId: string
  name: string
  description?: string
  goal?: string
  level?: string
  daysPerWeek: number
  days: DayInput[]
}

// ── Use case ─────────────────────────────────────────────────────────────────

export async function updateRoutineUseCase(
  input: UpdateRoutineInput,
  db: PrismaClient,
) {
  const { routineId, coachId, name, description, goal, level, daysPerWeek, days } = input

  if (!name?.trim()) {
    throw { status: 400, message: 'El nombre es obligatorio' }
  }

  const existing = await db.workoutTemplate.findFirst({
    where: { id: routineId, coachId },
    select: { id: true },
  })
  if (!existing) {
    throw { status: 404, message: 'Rutina no encontrada' }
  }

  // Validate exercise ownership
  const exerciseIds = days
    .flatMap((d) => d.exercises.map((e) => e.exerciseId))
    .filter(Boolean)

  if (exerciseIds.length > 0) {
    const valid = await db.exercise.findMany({
      where: { id: { in: exerciseIds }, OR: [{ coachId }, { coachId: null }] },
      select: { id: true },
    })
    const validIds = new Set(valid.map((e) => e.id))
    const invalidId = exerciseIds.find((eid) => !validIds.has(eid))
    if (invalidId) {
      throw { status: 400, message: `Ejercicio ${invalidId} no autorizado` }
    }
  }

  // Transaction: update template + delete old days + recreate
  const updated = await db.$transaction(async (tx) => {
    const tmpl = await tx.workoutTemplate.update({
      where: { id: routineId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        goal: goal || null,
        level: level || null,
        daysPerWeek,
      },
    })

    await tx.workoutDay.deleteMany({ where: { templateId: routineId } })

    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      const wDay = await tx.workoutDay.create({
        data: {
          templateId: tmpl.id,
          dayOfWeek: day.dayOfWeek,
          label: day.label || `Día ${day.dayOfWeek}`,
          muscleGroups: day.muscleGroups ?? [],
          isRestDay: day.isRestDay ?? false,
          warmupNotes: day.warmupNotes?.trim() || null,
          cardioNotes: day.cardioNotes?.trim() || null,
          order: i,
        },
      })

      if (!day.isRestDay && day.exercises?.length > 0) {
        const validExs = day.exercises.filter((e) => e.exerciseId)

        // Phase 1: create exercises, collect order -> id
        const orderToId = new Map<number, string>()
        for (let j = 0; j < validExs.length; j++) {
          const ex = validExs[j]
          const exOrder = ex.order ?? j
          const created = await tx.workoutExercise.create({
            data: {
              dayId: wDay.id,
              exerciseId: ex.exerciseId,
              order: exOrder,
              sets: ex.sets ?? 4,
              repsScheme: ex.repsScheme?.trim() || '12',
              restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : null,
              setType: (ex.setType as SetType) ?? 'NORMAL',
              notes: ex.notes?.trim() || null,
            },
            select: { id: true },
          })
          orderToId.set(exOrder, created.id)
        }

        // Phase 2: resolve supersetWith by order -> fresh ID
        for (let j = 0; j < validExs.length; j++) {
          const ex = validExs[j]
          if (ex.supersetWithOrder == null) continue
          const thisId = orderToId.get(ex.order ?? j)
          const pairedId = orderToId.get(ex.supersetWithOrder)
          if (thisId && pairedId) {
            await tx.workoutExercise.update({ where: { id: thisId }, data: { supersetWith: pairedId } })
          }
        }
      }
    }

    return tmpl
  })

  return updated
}
