import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

// DELETE /api/coach/athletes/[id]/nutrition/plan/[mealId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-plan-meal-delete`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId, mealId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  // Verificar que el PlannedMeal pertenece al atleta
  const meal = await prisma.plannedMeal.findFirst({
    where: { id: mealId, userId: athleteId },
    select: { id: true },
  })
  if (!meal) return NextResponse.json({ error: 'Comida no encontrada.' }, { status: 404 })

  await prisma.plannedMeal.delete({ where: { id: mealId } })

  return NextResponse.json({ ok: true })
}
