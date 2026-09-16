// Mobile — POST + DELETE /api/mobile/nutrition/templates/[id]/meals
// Agrega/elimina alimentos de una plantilla nutricional propia del atleta

import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import type { NutritionDayType, MealType } from '@/generated/prisma/client'

const VALID_DAY_TYPES: NutritionDayType[] = ['HARD', 'EASY', 'REST']
const VALID_MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT']

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:template-meals`, { limit: 120, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params

  const template = await prisma.nutritionTemplate.findFirst({
    where: { id, athleteId: mobile.id },
    include: { days: true },
  })
  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })

  const body = await req.json() as { dayType?: string; mealType?: string; foodId?: string; grams?: number }

  const dayType = body.dayType?.toUpperCase() as NutritionDayType
  const mealType = body.mealType?.toUpperCase() as MealType

  if (!dayType || !VALID_DAY_TYPES.includes(dayType)) {
    return NextResponse.json({ error: `dayType invalido. Validos: ${VALID_DAY_TYPES.join(', ')}` }, { status: 400 })
  }
  if (!mealType || !VALID_MEAL_TYPES.includes(mealType)) {
    return NextResponse.json({ error: `mealType invalido. Validos: ${VALID_MEAL_TYPES.join(', ')}` }, { status: 400 })
  }
  if (!body.foodId || !body.grams || body.grams <= 0) {
    return NextResponse.json({ error: 'foodId y grams (> 0) son requeridos.' }, { status: 400 })
  }

  const food = await prisma.food.findUnique({ where: { id: body.foodId } })
  if (!food) return NextResponse.json({ error: 'Alimento no encontrado.' }, { status: 404 })

  const day = template.days.find((d) => d.dayType === dayType)
  if (!day) return NextResponse.json({ error: 'Dia no encontrado en la plantilla.' }, { status: 404 })

  const factor = body.grams / 100
  const kcal     = Math.round(food.kcalPer100g    * factor * 10) / 10
  const proteinG = Math.round(food.proteinPer100g * factor * 10) / 10
  const carbsG   = Math.round(food.carbsPer100g   * factor * 10) / 10
  const fatG     = Math.round(food.fatPer100g     * factor * 10) / 10

  const item = await prisma.$transaction(async (tx) => {
    const meal = await tx.nutritionTemplateMeal.upsert({
      where: { dayId_mealType: { dayId: day.id, mealType } },
      create: { dayId: day.id, mealType },
      update: {},
    })
    const existingCount = await tx.nutritionTemplateFoodItem.count({ where: { mealId: meal.id } })
    return tx.nutritionTemplateFoodItem.create({
      data: { mealId: meal.id, foodId: body.foodId!, grams: body.grams!, kcal, proteinG, carbsG, fatG, order: existingCount },
      include: { food: { select: { id: true, name: true, category: true } } },
    })
  })

  return NextResponse.json({ item }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:template-meals-del`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const { itemId } = await req.json() as { itemId?: string }
  if (!itemId) return NextResponse.json({ error: 'itemId es requerido.' }, { status: 400 })

  const item = await prisma.nutritionTemplateFoodItem.findFirst({
    where: { id: itemId },
    include: { meal: { include: { day: { include: { template: { select: { athleteId: true } } } } } } },
  })
  if (!item || item.meal.day.template.athleteId !== mobile.id || item.meal.day.templateId !== id) {
    return NextResponse.json({ error: 'Item no encontrado.' }, { status: 404 })
  }

  await prisma.nutritionTemplateFoodItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
