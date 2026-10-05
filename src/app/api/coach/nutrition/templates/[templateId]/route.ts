import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

async function verifyOwnership(coachId: string, templateId: string) {
  return prisma.nutritionTemplate.findFirst({
    where: { id: templateId, coachId },
  })
}

// GET /api/coach/nutrition/templates/[templateId] — template completo con días/comidas/ítems
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-nutrition-template-detail`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { templateId } = await params

  const template = await prisma.nutritionTemplate.findFirst({
    where: { id: templateId, coachId: session.user.id },
    include: {
      days: {
        orderBy: { dayType: 'asc' },
        include: {
          meals: {
            orderBy: { order: 'asc' },
            include: {
              items: {
                orderBy: { order: 'asc' },
                include: {
                  food: {
                    select: {
                      id: true, name: true, category: true,
                      kcalPer100g: true, proteinPer100g: true,
                      carbsPer100g: true, fatPer100g: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      _count: { select: { assignments: true } },
    },
  })

  if (!template) {
    return NextResponse.json({ error: 'Template no encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ template })
}

// PATCH /api/coach/nutrition/templates/[templateId] — editar nombre/descripción/objetivo
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-template-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { templateId } = await params

  if (!await verifyOwnership(session.user.id, templateId)) {
    return NextResponse.json({ error: 'Template no encontrado.' }, { status: 404 })
  }

  const body = await req.json() as { name?: string; description?: string; goal?: string }

  const updated = await prisma.nutritionTemplate.update({
    where: { id: templateId },
    data: {
      ...(body.name?.trim() && { name: body.name.trim() }),
      description: body.description !== undefined ? (body.description?.trim() || null) : undefined,
      goal: body.goal !== undefined ? (body.goal?.trim() || null) : undefined,
    },
  })

  return NextResponse.json({ template: updated })
}

// DELETE /api/coach/nutrition/templates/[templateId] — solo si no tiene atletas asignados
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-template-delete`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { templateId } = await params

  if (!await verifyOwnership(session.user.id, templateId)) {
    return NextResponse.json({ error: 'Template no encontrado.' }, { status: 404 })
  }

  const assignmentCount = await prisma.assignedNutritionPlan.count({
    where: { templateId },
  })
  if (assignmentCount > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: el template tiene atletas asignados.' },
      { status: 409 }
    )
  }

  await prisma.nutritionTemplate.delete({ where: { id: templateId } })
  return NextResponse.json({ ok: true })
}
