// DEPRECATED: PendingNutritionAdjustment ya no se genera (NUT-15).
// Endpoint conservado para procesar ajustes históricos pendientes.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'nutrition')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:adj-reject`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const adjustment = await prisma.pendingNutritionAdjustment.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  })
  if (!adjustment || adjustment.userId !== mobile.id) {
    return NextResponse.json({ error: 'Ajuste no encontrado' }, { status: 404 })
  }
  if (adjustment.status !== 'PENDING') {
    return NextResponse.json({ error: 'El ajuste ya fue procesado' }, { status: 409 })
  }

  await prisma.pendingNutritionAdjustment.update({
    where: { id },
    data: { status: 'REJECTED', rejectedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
