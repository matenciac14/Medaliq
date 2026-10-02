import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { getSessionIntensity } from '@/domain/plan/intensity'
import { rateLimitAsync } from '@/lib/rate_limit'

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_TYPES = [
  'RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA',
  'FUERZA', 'CICLA', 'NATACION', 'TEST', 'SIMULACRO', 'DESCANSO', 'OTRO',
] as const

const SessionSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  type:        z.enum(VALID_TYPES),
  durationMin: z.number().int().min(5).max(600),
  zoneTarget:  z.string().max(50).optional(),
  detailText:  z.string().max(1000).optional(),
  coachNote:   z.string().max(500).optional(),
})

/** Converts JS Date.getUTCDay() (0=Sun…6=Sat) to schema dayOfWeek (1=Mon…7=Sun) */
function toDayOfWeek(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * POST /api/coach/athletes/[id]/sessions
 *
 * Publica una sesión puntual en el calendario del atleta para una fecha
 * específica. Distinto del PlanBuilderClient (que opera sobre weekId+dayOfWeek
 * en el template de semanas): este endpoint permite añadir sesiones ad-hoc
 * a fechas concretas dentro de un plan activo.
 *
 * Body: { date: "YYYY-MM-DD", type, durationMin, zoneTarget?, detailText?, coachNote? }
 * Requisito: el atleta debe tener un plan activo que cubra esa fecha.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH')
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:athlete-sessions-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params
  const coachId = session.user.id

  // Verify coach owns this athlete (active relation)
  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId } },
    select: { status: true },
  })
  if (!relation || relation.status !== 'ACTIVE')
    return NextResponse.json({ error: 'Asesorado no encontrado.' }, { status: 404 })

  const body = await req.json()
  const parsed = SessionSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Datos inválidos.', issues: parsed.error.issues }, { status: 400 })

  const { date, type, durationMin, zoneTarget, detailText, coachNote } = parsed.data

  // Parse at noon UTC to avoid timezone boundary issues
  const targetDate = new Date(date + 'T12:00:00Z')
  const dayOfWeek = toDayOfWeek(targetDate.getUTCDay())

  // Find the plan week that contains the target date
  const week = await prisma.planWeek.findFirst({
    where: {
      plan: { userId: athleteId, status: 'ACTIVE' },
      startDate: { lte: targetDate },
      endDate:   { gte: targetDate },
    },
    select: { id: true },
  })

  if (!week)
    return NextResponse.json(
      { error: 'No hay semana del plan activa para esa fecha. Verifica que el plan del atleta cubra esa semana.' },
      { status: 422 }
    )

  const newSession = await prisma.plannedSession.create({
    data: {
      weekId:      week.id,
      dayOfWeek,
      type,
      intensity:   getSessionIntensity(type),
      durationMin,
      zoneTarget:  zoneTarget?.trim()  || null,
      detailText:  detailText?.trim()  || null,
      coachNote:   coachNote?.trim()   || null,
      date:        targetDate,
    },
  })

  return NextResponse.json({ ok: true, session: newSession }, { status: 201 })
}
