import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { todayInTz } from '@/lib/core/date_utils'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-athlete-dailylogs`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params

  const coachRelation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
    select: { id: true },
  })
  if (!coachRelation) return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })

  const athlete = await prisma.user.findUnique({ where: { id: athleteId }, select: { timezone: true } })
  const since = todayInTz(athlete?.timezone ?? null)
  since.setUTCDate(since.getUTCDate() - 7)

  const logs = await prisma.dailyLog.findMany({
    where: { userId: athleteId, date: { gte: since } },
    orderBy: { date: 'desc' },
    select: { date: true, weightKg: true, energyLevel: true, hrResting: true, sleepHours: true },
  })

  return NextResponse.json({ logs })
}
