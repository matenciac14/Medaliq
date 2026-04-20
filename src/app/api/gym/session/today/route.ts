import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

function jsToOurDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const athleteId = session.user.id
  const todayDow = jsToOurDow(new Date().getDay())

  // Check today's planned session type
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const plannedToday = await prisma.plannedSession.findFirst({
    where: {
      date: { gte: today, lt: tomorrow },
      week: {
        plan: {
          userId: athleteId,
          status: 'ACTIVE',
        },
      },
    },
    select: { type: true, durationMin: true, detailText: true },
  })

  // Active assignment
  const assigned = await prisma.assignedWorkout.findFirst({
    where: { athleteId, isActive: true },
    include: {
      template: {
        include: {
          days: {
            where: { dayOfWeek: todayDow },
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: {
                  exercise: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!assigned) {
    return NextResponse.json({ error: 'Sin rutina asignada' }, { status: 404 })
  }

  const plannedSession = plannedToday ?? null

  const todayDay = assigned.template.days[0] ?? null

  if (!todayDay || todayDay.isRestDay) {
    return NextResponse.json({
      assignedWorkoutId: assigned.id,
      templateName: assigned.template.name,
      dayOfWeek: todayDow,
      isRestDay: true,
      workoutDay: todayDay ?? null,
      exercises: [],
      previousLogs: [],
      plannedSession,
    })
  }

  // Find previous session for this dayOfWeek to show reference weights
  const previousSession = await prisma.gymSession.findFirst({
    where: {
      athleteId,
      assignedWorkoutId: assigned.id,
      dayOfWeek: todayDow,
      completed: true,
    },
    orderBy: { date: 'desc' },
    include: {
      setLogs: true,
    },
  })

  return NextResponse.json({
    assignedWorkoutId: assigned.id,
    templateName: assigned.template.name,
    dayOfWeek: todayDow,
    isRestDay: false,
    workoutDay: {
      id: todayDay.id,
      label: todayDay.label,
      muscleGroups: todayDay.muscleGroups,
      warmupNotes: todayDay.warmupNotes,
      cardioNotes: todayDay.cardioNotes,
    },
    exercises: todayDay.exercises.map((we) => ({
      id: we.id,
      order: we.order,
      sets: we.sets,
      repsScheme: we.repsScheme,
      restSeconds: we.restSeconds,
      notes: we.notes,
      setType: we.setType,
      supersetWith: we.supersetWith,
      exercise: {
        id: we.exercise.id,
        name: we.exercise.name,
        muscleGroups: we.exercise.muscleGroups,
        equipment: we.exercise.equipment,
        category: we.exercise.category,
        description: we.exercise.description,
        tips: we.exercise.tips,
      },
    })),
    previousLogs: previousSession?.setLogs ?? [],
    plannedSession,
  })
}
