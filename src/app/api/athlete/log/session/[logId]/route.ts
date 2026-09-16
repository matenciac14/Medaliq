import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { logId } = await params
  const userId = session.user.id
  const body = await req.json()

  // Verify ownership
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
  if (typeof body.notes === 'string') data.notes = body.notes.trim() || null
  if (typeof body.distanceKm === 'number' && body.distanceKm > 0) data.distanceKm = body.distanceKm
  if (body.distanceKm === null) data.distanceKm = null
  if (['EXHAUSTED', 'NORMAL', 'ENERGIZED'].includes(body.energyState)) data.energyState = body.energyState

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  const updated = await prisma.sessionLog.update({
    where: { id: logId, userId },
    data,
  })

  return NextResponse.json({ ok: true, log: updated })
}
