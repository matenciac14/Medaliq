import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import type { SetType } from '@/generated/prisma/enums'

// ── Shared types ────────────────────────────────────────────────────────────

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

// ── Guards ──────────────────────────────────────────────────────────────────

async function getAthleteId(): Promise<string | null> {
  return (await auth())?.user?.id ?? null
}

/** Atleta no puede crear rutinas propias si tiene un coach activo */
async function hasActiveCoach(athleteId: string): Promise<boolean> {
  const relation = await prisma.coachAthlete.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  return !!relation
}

// ── GET /api/athlete/gym/routines — lista rutinas propias del atleta ─────────

export async function GET(req: NextRequest) {
  const athleteId = await getAthleteId()
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const templates = await prisma.workoutTemplate.findMany({
    where: { athleteId },
    include: {
      days: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
      assignments: { where: { isActive: true }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates)
}

// ── POST /api/athlete/gym/routines — crear rutina propia ─────────────────────

export async function POST(req: NextRequest) {
  const athleteId = await getAthleteId()
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (await hasActiveCoach(athleteId)) {
    return NextResponse.json(
      { error: 'Con un coach activo, solo tu coach puede crear rutinas.' },
      { status: 403 }
    )
  }

  const body: TemplateBody = await req.json()
  const { name, description, goal, level, daysPerWeek, days } = body

  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  if (!days || days.length === 0) return NextResponse.json({ error: 'Incluye al menos un día' }, { status: 400 })

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

  return NextResponse.json(template, { status: 201 })
}
