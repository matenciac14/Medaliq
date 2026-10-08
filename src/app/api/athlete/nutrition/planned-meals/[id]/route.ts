import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

// DELETE /api/athlete/nutrition/planned-meals/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed: rlDel } = await rateLimitAsync(`web-${session.user.id}:nutrition-planned-meals-del`, { limit: 60, windowMs: 60_000 })
  if (!rlDel) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const meal = await prisma.plannedMeal.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!meal) return NextResponse.json({ error: 'Comida no encontrada.' }, { status: 404 })

  await prisma.plannedMeal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// PATCH /api/athlete/nutrition/planned-meals/[id]
// Body: { grams: number }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed: rlPatch } = await rateLimitAsync(`web-${session.user.id}:nutrition-planned-meals-patch`, { limit: 100, windowMs: 60_000 })
  if (!rlPatch) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const meal = await prisma.plannedMeal.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!meal) return NextResponse.json({ error: 'Comida no encontrada.' }, { status: 404 })

  const body = (await req.json()) as { grams?: number }
  const grams = Number(body.grams)
  if (isNaN(grams) || grams <= 0) {
    return NextResponse.json({ error: 'grams debe ser un número positivo.' }, { status: 400 })
  }

  const updated = await prisma.plannedMeal.update({
    where: { id },
    data: { grams },
    include: {
      food: {
        select: {
          id: true, name: true, category: true,
          kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
          servingG: true, servingLabel: true,
        },
      },
    },
  })

  return NextResponse.json({ meal: updated })
}
