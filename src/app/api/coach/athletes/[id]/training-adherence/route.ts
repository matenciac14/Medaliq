import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { calculateTrainingAdherence } from '@/domain/training/get_training_adherence'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-athlete-training-adherence`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const now = new Date()

  const [plan, assignedWorkout, gymSessionCount] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { startDate: 'desc' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'desc' },
          take: 4,
          include: {
            sessions: {
              where: { date: { lte: now } },
              select: { id: true, type: true, date: true, log: { select: { id: true } } },
            },
          },
        },
      },
    }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId, isActive: true },
      select: { startDate: true, template: { select: { daysPerWeek: true } } },
    }),
    prisma.gymSession.count({
      where: { athleteId, completed: true },
    }),
  ])

  const currentWeek = plan
    ? getPlanWeekNumber(new Date(plan.startDate), plan.totalWeeks)
    : 0

  const planSessions = plan?.weeks
    .filter(w => w.weekNumber <= currentWeek)
    .flatMap(w => w.sessions) ?? []

  const gymRoutine = assignedWorkout
    ? {
        daysPerWeek: assignedWorkout.template.daysPerWeek,
        weeksActive: Math.max(1, Math.ceil(
          (now.getTime() - new Date(assignedWorkout.startDate).getTime()) / (7 * 86_400_000)
        )),
      }
    : null

  const result = calculateTrainingAdherence({
    planSessions,
    gymRoutine,
    gymSessionsDone: { count: gymSessionCount },
  })

  // Weekly breakdown for chart (last 4 weeks from plan)
  const weeks = (plan?.weeks ?? [])
    .slice()
    .reverse()
    .map(w => {
      const sessions = w.sessions
      const planned = sessions.length
      const completed = sessions.filter(s => s.log !== null).length
      const pct = planned > 0 ? Math.round((completed / planned) * 100) : null

      const startDate = sessions.length > 0
        ? sessions.reduce((min, s) => s.date < min ? s.date : min, sessions[0].date)
        : now

      return {
        weekStart: startDate.toISOString().split('T')[0],
        planned,
        completed,
        pct,
      }
    })

  return NextResponse.json({ ...result, weeks })
}
