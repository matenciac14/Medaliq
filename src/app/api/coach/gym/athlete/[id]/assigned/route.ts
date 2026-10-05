import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getWeekMonday } from '@/lib/core/date_utils'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-athlete-assigned`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
    select: { id: true, athlete: { select: { timezone: true } } },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Current week Monday — timezone-aware for the athlete
  const monday = getWeekMonday(0, relation.athlete.timezone)

  const [activePlan, assignment] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: 'ACTIVE' },
      select: { id: true, startDate: true },
    }),
    prisma.assignedWorkout.findFirst({
    where: { athleteId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      template: {
        include: {
          days: {
            orderBy: { order: 'asc' },
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: { exercise: { select: { id: true, name: true, bodyPart: true, target: true } } },
              },
            },
          },
        },
      },
    },
    }),
  ])

  const targetWeekNumber = activePlan
    ? Math.floor((monday.getTime() - new Date(activePlan.startDate).getTime()) / 86_400_000 / 7) + 1
    : null

  const weekRunningSessions = activePlan && targetWeekNumber !== null && targetWeekNumber >= 1
    ? await prisma.plannedSession.findMany({
        where: {
          week: { planId: activePlan.id, weekNumber: targetWeekNumber },
          NOT: { type: 'DESCANSO' },
        },
        select: { dayOfWeek: true, type: true, durationMin: true, intensity: true },
      })
    : []

  // Build map: dayOfWeek → running session
  const runningSessions: Record<number, { type: string; durationMin: number | null; intensity: string }> = {}
  for (const s of weekRunningSessions) {
    runningSessions[s.dayOfWeek] = { type: s.type, durationMin: s.durationMin, intensity: s.intensity }
  }

  // Fetch recent sessions — all completed gym sessions regardless of path (assignment or plan-based)
  const recentSessionsRaw = await prisma.gymSession.findMany({
    where: { athleteId, completed: true },
    orderBy: { date: 'desc' },
    take: 5,
    select: {
      id: true,
      date: true,
      dayOfWeek: true,
      durationMin: true,
      rpe: true,
      exerciseOverrides: true,
      assignedWorkoutId: true,
      plannedSessionId: true,
      plannedSession: {
        select: { workoutDay: { select: { label: true } } },
      },
    },
  })

  const recentSessions = recentSessionsRaw.map(s => ({
    id: s.id,
    date: s.date.toISOString().split('T')[0],
    dayOfWeek: s.dayOfWeek,
    durationMin: s.durationMin,
    rpe: s.rpe,
    overridesCount: Array.isArray(s.exerciseOverrides) ? (s.exerciseOverrides as unknown[]).length : 0,
    source: s.assignedWorkoutId ? 'assignment' : 'plan',
    label: s.plannedSession?.workoutDay?.label ?? null,
  }))

  if (!assignment) {
    return NextResponse.json({ assignment: null, recentSessions, runningSessions })
  }

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      notes: assignment.notes,
      template: {
        id: assignment.template.id,
        name: assignment.template.name,
        goal: assignment.template.goal,
        level: assignment.template.level,
        daysPerWeek: assignment.template.daysPerWeek,
        days: assignment.template.days.map(d => ({
          id: d.id,
          dayOfWeek: d.dayOfWeek,
          label: d.label,
          muscleGroups: d.muscleGroups,
          isRestDay: d.isRestDay,
          exercises: d.exercises.map(we => ({
            id: we.id,
            sets: we.sets,
            repsScheme: we.repsScheme,
            exercise: we.exercise,
          })),
        })),
      },
    },
    recentSessions,
    runningSessions,
  })
}
