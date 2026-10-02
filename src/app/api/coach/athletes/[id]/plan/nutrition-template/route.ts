import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { rateLimitAsync } from '@/lib/rate_limit'

const Schema = z.object({
  nutritionTemplateId: z.string().min(1).nullable(),
})

/** PATCH — vincula o desvincula un NutritionTemplate al plan activo del atleta. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:plan-nutrition-template-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const coachId = session.user.id
  const { id: athleteId } = await params

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId, status: 'ACTIVE' },
  })
  if (!relation) return NextResponse.json({ error: 'Asesorado no encontrado' }, { status: 404 })

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const { nutritionTemplateId } = parsed.data

  // Verificar que el template pertenezca al coach (si no es null)
  if (nutritionTemplateId) {
    const template = await prisma.nutritionTemplate.findFirst({
      where: { id: nutritionTemplateId, coachId },
      select: { id: true },
    })
    if (!template) return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 })
  }

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!plan) return NextResponse.json({ error: 'Sin plan activo' }, { status: 404 })

  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { nutritionTemplateId },
  })

  return NextResponse.json({ ok: true })
}
