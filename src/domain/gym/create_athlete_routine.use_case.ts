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

export interface CreateAthleteRoutineInput {
  athleteId: string
  name: string
  description?: string
  goal?: string
  level?: string
  daysPerWeek: number
  days: DayInput[]
}

// ── Use case ─────────────────────────────────────────────────────────────────

export async function createAthleteRoutineUseCase(
  input: CreateAthleteRoutineInput,
  db: PrismaClient,
) {
  const { athleteId, name, description, goal, level, daysPerWeek, days } = input

  if (!name?.trim()) throw { status: 400, message: 'El nombre es obligatorio' }
  if (!days || days.length === 0) throw { status: 400, message: 'Incluye al menos un día' }

  // B2B athletes can't create their own routines
  const hasCoach = await db.coachAthlete.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (hasCoach) {
    throw { status: 403, message: 'Con un coach activo, solo tu coach puede crear rutinas.' }
  }

  // Validate exercises (athletes can only use global exercises)
  const exerciseIds = days.flatMap(d => d.exercises.map(e => e.exerciseId)).filter(Boolean)
  if (exerciseIds.length > 0) {
    const valid = await db.exercise.findMany({
      where: { id: { in: exerciseIds }, coachId: null },
      select: { id: true },
    })
    const validIds = new Set(valid.map(e => e.id))
    const invalid = exerciseIds.find(id => !validIds.has(id))
    if (invalid) throw { status: 400, message: `Ejercicio ${invalid} no encontrado` }
  }

  const template = await db.$transaction(async tx => {
    const tmpl = await tx.workoutTemplate.create({
      data: {
        athleteId,
        name: name.trim(),
        description: description?.trim() || null,
        goal: goal || null,
        level: level || null,
        daysPerWeek,
        isPublic: false,
      },
    })

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
        const validExercises = day.exercises.filter(ex => ex.exerciseId)
        if (validExercises.length > 0) {
          await tx.workoutExercise.createMany({
            data: validExercises.map((ex, j) => ({
              dayId: wDay.id,
              exerciseId: ex.exerciseId,
              order: ex.order ?? j,
              sets: ex.sets ?? 4,
              repsScheme: ex.repsScheme?.trim() || '12',
              restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : null,
              setType: (ex.setType as SetType) ?? 'NORMAL',
              notes: ex.notes?.trim() || null,
            })),
          })
        }
      }
    }

    return tmpl
  })

  return template
}
