import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

// POST /api/coach/nutrition/templates/[templateId]/assign
// Body: { athleteId }
// Asigna el template a un atleta — reemplaza cualquier asignación previa (upsert)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-template-assign`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { templateId } = await params

  const template = await prisma.nutritionTemplate.findFirst({
    where: { id: templateId, coachId: session.user.id },
  })
  if (!template) {
    return NextResponse.json({ error: 'Template no encontrado.' }, { status: 404 })
  }

  const { athleteId } = await req.json() as { athleteId?: string }
  if (!athleteId) {
    return NextResponse.json({ error: 'athleteId es requerido.' }, { status: 400 })
  }

  // Verificar relación activa coach-atleta
  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Atleta no encontrado o no activo.' }, { status: 404 })
  }

  const assignment = await prisma.assignedNutritionPlan.upsert({
    where: { athleteId },
    create: { templateId, athleteId, coachId: session.user.id },
    update: { templateId, coachId: session.user.id, assignedAt: new Date() },
    include: { athlete: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ assignment }, { status: 201 })
}

// DELETE /api/coach/nutrition/templates/[templateId]/assign
// Body: { athleteId }
// Desasigna el plan nutricional de un atleta
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-template-assign-delete`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { templateId } = await params

  const { athleteId } = await req.json() as { athleteId?: string }
  if (!athleteId) {
    return NextResponse.json({ error: 'athleteId es requerido.' }, { status: 400 })
  }

  const existing = await prisma.assignedNutritionPlan.findFirst({
    where: { athleteId, templateId, coachId: session.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Asignación no encontrada.' }, { status: 404 })
  }

  await prisma.assignedNutritionPlan.delete({ where: { athleteId } })
  return NextResponse.json({ ok: true })
}
