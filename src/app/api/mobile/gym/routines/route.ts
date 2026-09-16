import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import type { SetType } from '@/generated/prisma/enums'

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

interface TemplateBody {
  name: string
  description?: string
  goal?: string
  level?: string
  daysPerWeek: number
  days: DayInput[]
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-routines`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const athleteId = mobile.id

  const activeCoach = await prisma.coachAthlete.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (activeCoach) {
    return NextResponse.json(
      { error: 'Con un coach activo, solo tu coach puede crear rutinas.' },
      { status: 403 }
    )
  }

  const body: TemplateBody = await req.json()
  const { name, description, goal, level, daysPerWeek, days } = body

  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  if (!days || days.length === 0) return NextResponse.json({ error: 'Incluye al menos un dia' }, { status: 400 })

  const exerciseIds = days.flatMap(d => d.exercises.map(e => e.exerciseId)).filter(Boolean)
  if (exerciseIds.length > 0) {
    const valid = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds }, coachId: null },
      select: { id: true },
    })
    const validIds = new Set(valid.map(e => e.id))
    const invalid = exerciseIds.find(id => !validIds.has(id))
    if (invalid) return NextResponse.json({ error: `Ejercicio ${invalid} no encontrado` }, { status: 400 })
  }

  const template = await prisma.$transaction(async tx => {
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
          label: day.label || `Dia ${day.dayOfWeek}`,
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

  return NextResponse.json(template, { status: 201 })
}
