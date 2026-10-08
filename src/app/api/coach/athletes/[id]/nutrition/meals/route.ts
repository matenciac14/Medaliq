// DEPRECATED (NUT-12): MealPlan JSON blob replaced by NutritionTemplate + PlannedMeal.
// This endpoint is kept for backward compatibility but should not be used for new features.
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-meals-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = (await request.json()) as { hard?: unknown; easy?: unknown; low?: unknown; rest?: unknown }
  if (!body.hard || !body.easy || !body.rest) {
    return NextResponse.json({ error: 'Se requieren los tipos de día: hard, easy, rest' }, { status: 400 })
  }

  const mealPlan = await prisma.mealPlan.upsert({
    where: { userId: athleteId },
    create: { userId: athleteId, data: body as object },
    update: { data: body as object, updatedAt: new Date() },
  })

  return NextResponse.json({ ok: true, mealPlanId: mealPlan.id })
}
