import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:routines-copy`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const coachId = session.user.id
  const { id } = await params

  // Fase 1: leer el template original con todos sus días y ejercicios
  const source = await prisma.workoutTemplate.findUnique({
    where: { id },
    include: {
      days: {
        include: { exercises: true },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!source || source.coachId !== coachId) {
    return NextResponse.json({ error: 'Rutina no encontrada.' }, { status: 404 })
  }

  // Fase 2: deep copy en una sola transacción
  const copy = await prisma.$transaction(async (tx) => {
    const newTemplate = await tx.workoutTemplate.create({
      data: {
        coachId,
        name: `${source.name} (copia)`,
        description: source.description,
        goal: source.goal,
        level: source.level,
        daysPerWeek: source.daysPerWeek,
        category: source.category,
        isPublic: false,
      },
    })

    for (const day of source.days) {
      const newDay = await tx.workoutDay.create({
        data: {
          templateId: newTemplate.id,
          dayOfWeek: day.dayOfWeek,
          label: day.label,
          muscleGroups: day.muscleGroups,
          isRestDay: day.isRestDay,
          warmupNotes: day.warmupNotes,
          cardioNotes: day.cardioNotes,
          order: day.order,
        },
      })

      // Mapa orden → nuevo id para resolver supersetWith
      const orderToId = new Map<number, string>()

      for (const ex of day.exercises) {
        const newEx = await tx.workoutExercise.create({
          data: {
            dayId: newDay.id,
            exerciseId: ex.exerciseId,
            order: ex.order,
            sets: ex.sets,
            repsScheme: ex.repsScheme,
            restSeconds: ex.restSeconds,
            setType: ex.setType,
            notes: ex.notes,
          },
          select: { id: true },
        })
        orderToId.set(ex.order, newEx.id)
      }

      // Resolver supersets usando order como pivot
      for (const ex of day.exercises) {
        if (!ex.supersetWith) continue
        // Buscar el ejercicio emparejado en el source por su id
        const pairedEx = day.exercises.find((e) => e.id === ex.supersetWith)
        if (!pairedEx) continue
        const thisNewId = orderToId.get(ex.order)
        const pairedNewId = orderToId.get(pairedEx.order)
        if (thisNewId && pairedNewId) {
          await tx.workoutExercise.update({
            where: { id: thisNewId },
            data: { supersetWith: pairedNewId },
          })
        }
      }
    }

    return newTemplate
  })

  return NextResponse.json({ id: copy.id, name: copy.name }, { status: 201 })
}
