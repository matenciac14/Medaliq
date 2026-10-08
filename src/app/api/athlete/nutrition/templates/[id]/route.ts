// NUT-08 — GET / PATCH / DELETE /api/athlete/nutrition/templates/[id]
// CRUD de un NutritionTemplate propio del atleta B2C

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  goal: z.string().nullable().optional(),
})

// GET — template con arbol completo (days/meals/items/food)
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed: allowedGet } = await rateLimitAsync(`web-${session.user.id}:nutrition-template-detail`, { limit: 300, windowMs: 60_000 })
  if (!allowedGet) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const template = await prisma.nutritionTemplate.findFirst({
    where: { id, athleteId: session.user.id, coachId: null },
    include: {
      days: {
        include: {
          meals: {
            include: { items: { include: { food: { select: { id: true, name: true, category: true } } }, orderBy: { order: 'asc' } } },
            orderBy: { mealType: 'asc' },
          },
        },
        orderBy: { dayType: 'asc' },
      },
    },
  })
  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })

  return NextResponse.json({ template })
}

// PATCH — actualizar name/description/goal
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed: allowedPatch } = await rateLimitAsync(`web-${session.user.id}:nutrition-template-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowedPatch) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const existing = await prisma.nutritionTemplate.findFirst({
    where: { id, athleteId: session.user.id, coachId: null },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido.' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim()
  if (parsed.data.description !== undefined) data.description = parsed.data.description?.trim() || null
  if (parsed.data.goal !== undefined) data.goal = parsed.data.goal?.trim() || null

  const template = await prisma.nutritionTemplate.update({ where: { id }, data })
  return NextResponse.json({ template })
}

// DELETE — eliminar template (cascade deletes days/meals/items via schema)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed: allowedDel } = await rateLimitAsync(`web-${session.user.id}:nutrition-template-delete`, { limit: 60, windowMs: 60_000 })
  if (!allowedDel) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const existing = await prisma.nutritionTemplate.findFirst({
    where: { id, athleteId: session.user.id, coachId: null },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })

  await prisma.nutritionTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
