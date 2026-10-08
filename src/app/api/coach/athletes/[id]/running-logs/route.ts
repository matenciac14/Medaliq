import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-athlete-running-logs`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const logs = await prisma.sessionLog.findMany({
    where: { userId: athleteId },
    orderBy: { completedAt: 'desc' },
    take: 60,
    select: {
      id: true,
      completedAt: true,
      sessionDate: true,
      discipline: true,
      freeSessionType: true,
      durationMin: true,
      distanceKm: true,
      avgPaceSecPerKm: true,
      hrAvg: true,
      hrMax: true,
      rpe: true,
      notes: true,
      disciplineRef: { select: { slug: true, name: true, nameEs: true, icon: true, color: true } },
      plannedSession: {
        select: { type: true, intensity: true, detailText: true },
      },
    },
  })

  const result = logs.map((l) => ({
    id: l.id,
    date: (l.sessionDate ?? l.completedAt).toISOString().split('T')[0],
    discipline: l.disciplineRef?.slug ?? l.discipline ?? l.freeSessionType ?? 'RUNNING',
    disciplineInfo: l.disciplineRef ?? null,
    durationMin: l.durationMin,
    distanceKm: l.distanceKm,
    avgPaceSecPerKm: l.avgPaceSecPerKm,
    hrAvg: l.hrAvg,
    hrMax: l.hrMax,
    rpe: l.rpe,
    notes: l.notes,
    sessionLabel: l.plannedSession?.detailText ?? null,
    intensity: l.plannedSession?.intensity ?? null,
  }))

  return NextResponse.json(result)
}
