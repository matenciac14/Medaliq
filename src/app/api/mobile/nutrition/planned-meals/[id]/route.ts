// Mobile — DELETE /api/mobile/nutrition/planned-meals/[id]
// Eliminar una comida planificada propia del atleta

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:planned-meals-del`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const { id } = await params
  const existing = await prisma.plannedMeal.findFirst({
    where: { id, userId: mobile.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })

  await prisma.plannedMeal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
