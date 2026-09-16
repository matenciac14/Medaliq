// NUT-SWAP-01 (mobile)
// POST   /api/mobile/nutrition/plan/[id]/swap  — sustituye un alimento del plan por uno equivalente
// DELETE /api/mobile/nutrition/plan/[id]/swap  — restaura el alimento original

import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'
import { prisma } from '@/lib/db/prisma'

const SWAP_TOLERANCE = 0.10 // ±10% kcal

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:swap`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const { id: plannedMealId } = await params
  const body = await req.json()
  const { foodId: overrideFoodId, grams: overrideGrams } = body as { foodId: string; grams: number }

  if (!overrideFoodId || !overrideGrams || overrideGrams <= 0) {
    return NextResponse.json({ error: 'foodId y grams requeridos.' }, { status: 400 })
  }

  // Verify ownership — the plannedMeal must belong to this athlete
  const plannedMeal = await prisma.plannedMeal.findFirst({
    where: { id: plannedMealId, userId: mobile.id },
    include: { food: { select: { kcalPer100g: true } } },
  })
  if (!plannedMeal) return NextResponse.json({ error: 'Comida no encontrada.' }, { status: 404 })

  const overrideFood = await prisma.food.findUnique({
    where: { id: overrideFoodId },
    select: { kcalPer100g: true },
  })
  if (!overrideFood) return NextResponse.json({ error: 'Alimento no encontrado.' }, { status: 404 })

  const originalKcal = (plannedMeal.food.kcalPer100g * plannedMeal.grams) / 100
  const newKcal      = (overrideFood.kcalPer100g    * overrideGrams)      / 100
  const diff         = originalKcal > 0 ? Math.abs(newKcal - originalKcal) / originalKcal : 0

  if (diff > SWAP_TOLERANCE) {
    return NextResponse.json(
      { error: `El alimento sustituto debe tener kcal dentro del ±${SWAP_TOLERANCE * 100}% del original (${Math.round(originalKcal)} kcal). Tiene ${Math.round(newKcal)} kcal.` },
      { status: 422 },
    )
  }

  const override = await prisma.athleteNutritionOverride.upsert({
    where: { athleteId_plannedMealId: { athleteId: mobile.id, plannedMealId } },
    create: { athleteId: mobile.id, plannedMealId, overrideFoodId, overrideGrams },
    update: { overrideFoodId, overrideGrams },
    include: { overrideFood: { select: { id: true, name: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, servingG: true, servingLabel: true } } },
  })

  return NextResponse.json({ ok: true, override })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:swap`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const { id: plannedMealId } = await params

  await prisma.athleteNutritionOverride.deleteMany({
    where: { athleteId: mobile.id, plannedMealId },
  })

  return NextResponse.json({ ok: true })
}
