import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import type { SetType } from '@/generated/prisma/enums'

async function getAthleteId(): Promise<string | null> {
  return (await auth())?.user?.id ?? null
}

// ── GET /api/athlete/gym/routines/[id] ──────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const athleteId = await getAthleteId()
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const template = await prisma.workoutTemplate.findFirst({
    where: { id, athleteId },
    include: {
      days: {
        orderBy: { order: 'asc' },
        include: {
          exercises: { orderBy: { order: 'asc' }, include: { exercise: true } },
        },
      },
    },
  })

  if (!template) return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
  return NextResponse.json(template)
}

// ── PATCH /api/athlete/gym/routines/[id] — editar (reemplaza días) ──────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const athleteId = await getAthleteId()
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.workoutTemplate.findFirst({
    where: { id, athleteId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })

  const body = await req.json()
  const { name, description, goal, level, daysPerWeek, days } = body

  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

  const updated = await prisma.$transaction(async tx => {
    const tmpl = await tx.workoutTemplate.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        goal: goal || null,
        level: level || null,
        daysPerWeek,
      },
    })

    await tx.workoutDay.deleteMany({ where: { templateId: id } })

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
        for (let j = 0; j < day.exercises.length; j++) {
          const ex = day.exercises[j]
          if (!ex.exerciseId) continue
          await tx.workoutExercise.create({
            data: {
              dayId: wDay.id,
              exerciseId: ex.exerciseId,
              order: ex.order ?? j,
              sets: ex.sets ?? 4,
              repsScheme: ex.repsScheme?.trim() || '12',
              restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : null,
              setType: (ex.setType as SetType) ?? 'NORMAL',
              notes: ex.notes?.trim() || null,
            },
          })
        }
      }
    }

    return tmpl
  })

  return NextResponse.json(updated)
}

// ── DELETE /api/athlete/gym/routines/[id] ───────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const athleteId = await getAthleteId()
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.workoutTemplate.findFirst({
    where: { id, athleteId },
    select: { id: true, assignments: { where: { isActive: true }, select: { id: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })

  if (existing.assignments.length > 0) {
    return NextResponse.json(
      { error: 'No puedes eliminar una rutina activa. Desactívala primero.' },
      { status: 409 }
    )
  }

  await prisma.workoutTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
