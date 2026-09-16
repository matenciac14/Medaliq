import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:log-session`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const { logId } = await params
  const userId = mobile.id
  const body = await req.json()

  const log = await prisma.sessionLog.findFirst({
    where: { id: logId, userId },
    select: { id: true },
  })
  if (!log) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (typeof body.durationMin === 'number' && body.durationMin > 0) data.durationMin = body.durationMin
  if (typeof body.rpe === 'number' && body.rpe >= 1 && body.rpe <= 10) data.rpe = body.rpe
  if (body.rpe === null) data.rpe = null
  if (typeof body.hrAvg === 'number' && body.hrAvg > 0) data.hrAvg = body.hrAvg
  if (body.hrAvg === null) data.hrAvg = null
  if (typeof body.distanceKm === 'number' && body.distanceKm > 0) data.distanceKm = body.distanceKm
  if (typeof body.notes === 'string') data.notes = body.notes.trim() || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  try {
    const updated = await prisma.sessionLog.update({
      where: { id: logId, userId },
      data,
    })
    return NextResponse.json({ ok: true, log: updated })
  } catch {
    return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed: rlOk } = await rateLimitAsync(`mobile-${mobile.id}:log-session`, { limit: 100, windowMs: 60_000 })
  if (!rlOk) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const { logId } = await params
  const userId = mobile.id

  // Solo permitir borrar logs libres (plannedSessionId = null) — los de plan los gestiona el coach
  const log = await prisma.sessionLog.findFirst({
    where: { id: logId, userId, plannedSessionId: null },
    select: { id: true },
  })
  if (!log) return NextResponse.json({ error: 'Registro no encontrado o no se puede eliminar' }, { status: 404 })

  try {
    await prisma.sessionLog.delete({ where: { id: logId, userId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  }
}
