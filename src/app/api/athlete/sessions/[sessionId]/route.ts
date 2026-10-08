import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

const VALID_TYPES = [
  'RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA',
  'FUERZA', 'CICLA', 'NATACION', 'DESCANSO', 'TEST', 'SIMULACRO', 'OTRO',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!session.user.features?.plan) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:session-patch`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { sessionId } = await params
  const userId = session.user.id
  const body = await req.json()

  // Verify ownership — session must belong to this athlete's plan
  const planned = await prisma.plannedSession.findFirst({
    where: { id: sessionId, week: { plan: { userId } } },
    select: { id: true },
  })
  if (!planned) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.type && VALID_TYPES.includes(body.type)) data.type = body.type
  if (typeof body.durationMin === 'number' && body.durationMin > 0) data.durationMin = body.durationMin
  if (typeof body.zoneTarget === 'string') data.zoneTarget = body.zoneTarget.trim() || null
  if (typeof body.detailText === 'string') data.detailText = body.detailText.trim() || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  const updated = await prisma.plannedSession.update({
    where: { id: sessionId },
    data,
  })

  return NextResponse.json({ ok: true, session: updated })
}
