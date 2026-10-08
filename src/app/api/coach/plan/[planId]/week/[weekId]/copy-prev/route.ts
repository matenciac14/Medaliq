import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getSessionIntensity } from '@/domain/plan/intensity'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string; weekId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:plan-week-copy-prev`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { planId, weekId } = await params
  const coachId = session.user.id

  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    select: { userId: true },
  })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId: plan.userId } },
  })
  if (!relation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Find the target week and the previous week
  const targetWeek = await prisma.planWeek.findFirst({
    where: { id: weekId, planId },
    include: { sessions: true },
  })
  if (!targetWeek) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

  const prevWeek = await prisma.planWeek.findFirst({
    where: { planId, weekNumber: targetWeek.weekNumber - 1 },
    include: { sessions: { orderBy: { dayOfWeek: 'asc' } } },
  })
  if (!prevWeek) return NextResponse.json({ error: 'No hay semana anterior para copiar' }, { status: 400 })

  if (prevWeek.sessions.length === 0)
    return NextResponse.json({ error: 'La semana anterior no tiene sesiones' }, { status: 400 })

  // Delete existing sessions from target week, then copy from prev
  await prisma.$transaction(async (tx) => {
    await tx.plannedSession.deleteMany({ where: { weekId } })

    await tx.plannedSession.createMany({
      data: prevWeek.sessions.map((s) => {
        const sessionDate = new Date(targetWeek.startDate)
        sessionDate.setDate(sessionDate.getDate() + s.dayOfWeek - 1)
        return {
          weekId,
          dayOfWeek: s.dayOfWeek,
          type: s.type,
          intensity: getSessionIntensity(s.type),
          durationMin: s.durationMin,
          zoneTarget: s.zoneTarget,
          detailText: s.detailText,
          date: sessionDate,
        }
      }),
    })
  })

  const newSessions = await prisma.plannedSession.findMany({
    where: { weekId },
    orderBy: { dayOfWeek: 'asc' },
  })

  return NextResponse.json({ ok: true, sessions: newSessions })
}
