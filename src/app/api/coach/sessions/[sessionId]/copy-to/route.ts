import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getSessionIntensity } from '@/domain/plan/intensity'
import { rateLimitAsync } from '@/lib/rate_limit'

/**
 * POST /api/coach/sessions/[sessionId]/copy-to
 *
 * Copia una sesión planificada a la semana de otro atleta (o del mismo).
 * El coach debe ser dueño de ambos planes.
 *
 * Body: { targetWeekId: string, dayOfWeek: number }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth_ = await auth()
  if (!auth_?.user?.id || auth_.user.role !== 'COACH')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`coach-${auth_.user.id}:sessions-copy-to`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const coachId = auth_.user.id
  const { sessionId } = await params
  const body = await req.json()
  const { targetWeekId, dayOfWeek } = body

  if (!targetWeekId || dayOfWeek === undefined)
    return NextResponse.json({ error: 'targetWeekId y dayOfWeek son requeridos' }, { status: 400 })

  const dow = Number(dayOfWeek)
  if (!Number.isInteger(dow) || dow < 1 || dow > 7)
    return NextResponse.json({ error: 'dayOfWeek debe ser 1-7' }, { status: 400 })

  // Load source session and verify coach owns it
  const [src, targetWeek] = await Promise.all([
    prisma.plannedSession.findUnique({
      where: { id: sessionId },
      include: { week: { include: { plan: { select: { userId: true } } } } },
    }),
    prisma.planWeek.findUnique({
      where: { id: targetWeekId },
      include: { plan: { select: { userId: true } } },
    }),
  ])

  if (!src) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  if (!targetWeek) return NextResponse.json({ error: 'Semana destino no encontrada' }, { status: 404 })

  // Verify coach owns both source and target
  const [srcRelation, tgtRelation] = await Promise.all([
    prisma.coachAthlete.findUnique({
      where: { coachId_athleteId: { coachId, athleteId: src.week.plan.userId } },
    }),
    prisma.coachAthlete.findUnique({
      where: { coachId_athleteId: { coachId, athleteId: targetWeek.plan.userId } },
    }),
  ])

  if (!srcRelation || !tgtRelation)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Date of the copied session in the target week
  const sessionDate = new Date(targetWeek.startDate)
  sessionDate.setDate(sessionDate.getDate() + dow - 1)

  const newSession = await prisma.plannedSession.create({
    data: {
      weekId:      targetWeekId,
      dayOfWeek:   dow,
      type:        src.type,
      intensity:   getSessionIntensity(src.type),
      durationMin: src.durationMin,
      zoneTarget:  src.zoneTarget,
      detailText:  src.detailText,
      structure:   src.structure,
      sportLabel:  src.sportLabel,
      date:        sessionDate,
      // workoutDayId deliberately omitted — gym workout links are coach+athlete-specific
    },
  })

  return NextResponse.json({ ok: true, session: newSession })
}
