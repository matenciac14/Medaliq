import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { calculateTDEE, calculateMacros, KCAL_ADJUSTMENT_MIN, KCAL_ADJUSTMENT_MAX } from '@/domain/plan/formulas'

const EDITABLE_FIELDS = [
  'targetKcalHard', 'targetKcalEasy', 'targetKcalRest',
  'proteinG', 'carbsHardG', 'carbsEasyG', 'fatG',
] as const

const patchSchema = z.object({
  targetKcalHard: z.number().int().positive().optional(),
  targetKcalEasy: z.number().int().positive().optional(),
  targetKcalRest: z.number().int().positive().optional(),
  proteinG: z.number().int().positive().optional(),
  carbsHardG: z.number().int().positive().optional(),
  carbsEasyG: z.number().int().positive().optional(),
  fatG: z.number().int().positive().optional(),
  kcalAdjustment: z.number().int().min(KCAL_ADJUSTMENT_MIN).max(KCAL_ADJUSTMENT_MAX).optional(),
}).refine(
  (obj) => EDITABLE_FIELDS.some((f) => obj[f] !== undefined) || obj.kcalAdjustment !== undefined,
  'Al menos un campo es requerido.',
)

/**
 * GET /api/athlete/nutrition/targets
 * Retorna el NutritionPlan del atleta autenticado.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const plan = await prisma.nutritionPlan.findUnique({ where: { userId: session.user.id } })
  if (!plan) return NextResponse.json({ error: 'Completa tu perfil primero.' }, { status: 404 })

  return NextResponse.json({ plan })
}

/**
 * PATCH /api/athlete/nutrition/targets
 * Actualiza targets del NutritionPlan. Solo B2C — B2B con coach activo recibe 403.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const userId = session.user.id

  // B2B check: si tiene coach activo, no puede editar targets
  const activeCoach = await prisma.coachAthlete.findFirst({
    where: { athleteId: userId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (activeCoach) {
    return NextResponse.json({ error: 'Tu coach gestiona tus targets.' }, { status: 403 })
  }

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body invalido.' }, { status: 400 })
  }

  const existing = await prisma.nutritionPlan.findUnique({ where: { userId }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: 'Completa tu perfil primero.' }, { status: 404 })
  }

  // Si cambia kcalAdjustment → recalcular todos los macros desde el perfil
  if (parsed.data.kcalAdjustment !== undefined) {
    const profile = await prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, heightCm: true, age: true, gender: true },
    })
    if (!profile?.weightKg || !profile?.heightCm || !profile?.age) {
      return NextResponse.json({ error: 'Perfil incompleto.' }, { status: 422 })
    }
    const tdee = calculateTDEE(profile.weightKg, profile.heightCm, profile.age, (profile.gender === 'female' ? 'female' : 'male') as 'male' | 'female', 5)
    const macros = calculateMacros(tdee, profile.weightKg, parsed.data.kcalAdjustment)
    const updated = await prisma.nutritionPlan.update({
      where: { userId },
      data: {
        source: 'ATHLETE',
        tdee,
        kcalAdjustment: parsed.data.kcalAdjustment,
        targetKcalHard: macros.hard.kcal,
        targetKcalEasy: macros.easy.kcal,
        targetKcalRest: macros.rest.kcal,
        proteinG: macros.hard.protein,
        carbsHardG: macros.hard.carbs,
        carbsEasyG: macros.easy.carbs,
        fatG: macros.hard.fat,
      },
    })
    return NextResponse.json({ ok: true, plan: updated })
  }

  const data: Record<string, number | string> = { source: 'ATHLETE' }
  for (const field of EDITABLE_FIELDS) {
    const value = parsed.data[field]
    if (value !== undefined) data[field] = value
  }

  const updated = await prisma.nutritionPlan.update({
    where: { userId },
    data,
  })

  return NextResponse.json({ ok: true, plan: updated })
}
