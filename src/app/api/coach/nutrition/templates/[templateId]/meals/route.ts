import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import type { NutritionDayType, MealType } from '@/generated/prisma/client'
import { rateLimitAsync } from '@/lib/rate_limit'

const VALID_DAY_TYPES: NutritionDayType[] = ['HARD', 'EASY', 'REST']
const VALID_MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT']

// POST /api/coach/nutrition/templates/[templateId]/meals
// Body: { dayType, mealType, foodId, grams }
// Agrega un alimento a una comida del template, creando la comida si no existe
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-template-meals-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { templateId } = await params

  const template = await prisma.nutritionTemplate.findFirst({
    where: { id: templateId, coachId: session.user.id },
    include: { days: true },
  })
  if (!template) {
    return NextResponse.json({ error: 'Template no encontrado.' }, { status: 404 })
  }

  const body = await req.json() as {
    dayType?: string
    mealType?: string
    foodId?: string
    grams?: number
  }

  const dayType = body.dayType?.toUpperCase() as NutritionDayType
  const mealType = body.mealType?.toUpperCase() as MealType

  if (!dayType || !VALID_DAY_TYPES.includes(dayType)) {
    return NextResponse.json({ error: `dayType inválido. Válidos: ${VALID_DAY_TYPES.join(', ')}` }, { status: 400 })
  }
  if (!mealType || !VALID_MEAL_TYPES.includes(mealType)) {
    return NextResponse.json({ error: `mealType inválido. Válidos: ${VALID_MEAL_TYPES.join(', ')}` }, { status: 400 })
  }
  if (!body.foodId || !body.grams || body.grams <= 0) {
    return NextResponse.json({ error: 'foodId y grams (> 0) son requeridos.' }, { status: 400 })
  }

  const food = await prisma.food.findUnique({ where: { id: body.foodId } })
  if (!food) {
    return NextResponse.json({ error: 'Alimento no encontrado.' }, { status: 404 })
  }

  const day = template.days.find((d) => d.dayType === dayType)
  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado en el template.' }, { status: 404 })
  }

  // Calcular snapshot de macros
  const factor = body.grams / 100
  const kcal     = Math.round(food.kcalPer100g    * factor * 10) / 10
  const proteinG = Math.round(food.proteinPer100g * factor * 10) / 10
  const carbsG   = Math.round(food.carbsPer100g   * factor * 10) / 10
  const fatG     = Math.round(food.fatPer100g     * factor * 10) / 10

  const item = await prisma.$transaction(async (tx) => {
    // Upsert de la comida (create si no existe)
    const meal = await tx.nutritionTemplateMeal.upsert({
      where: { dayId_mealType: { dayId: day.id, mealType } },
      create: { dayId: day.id, mealType },
      update: {},
    })

    const existingCount = await tx.nutritionTemplateFoodItem.count({ where: { mealId: meal.id } })

    return tx.nutritionTemplateFoodItem.create({
      data: {
        mealId: meal.id,
        foodId: body.foodId!,
        grams: body.grams!,
        kcal, proteinG, carbsG, fatG,
        order: existingCount,
      },
      include: { food: { select: { id: true, name: true, category: true } } },
    })
  })

  return NextResponse.json({ item }, { status: 201 })
}

// DELETE /api/coach/nutrition/templates/[templateId]/meals
// Body: { itemId }
// Elimina un alimento de una comida
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-template-meals-delete`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { templateId } = await params

  const { itemId } = await req.json() as { itemId?: string }
  if (!itemId) {
    return NextResponse.json({ error: 'itemId es requerido.' }, { status: 400 })
  }

  // Verificar ownership via cadena: item → meal → day → template
  const item = await prisma.nutritionTemplateFoodItem.findFirst({
    where: { id: itemId },
    include: { meal: { include: { day: { select: { templateId: true } } } } },
  })

  if (!item || item.meal.day.templateId !== templateId) {
    return NextResponse.json({ error: 'Ítem no encontrado.' }, { status: 404 })
  }

  // Verificar que el template pertenece al coach
  const template = await prisma.nutritionTemplate.findFirst({
    where: { id: templateId, coachId: session.user.id },
  })
  if (!template) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  await prisma.nutritionTemplateFoodItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
