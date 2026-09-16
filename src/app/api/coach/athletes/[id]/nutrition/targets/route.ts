import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { calculateTDEE, calculateMacros, KCAL_ADJUSTMENT_MIN, KCAL_ADJUSTMENT_MAX } from '@/domain/plan/formulas'

const Schema = z.object({
  targetKcalHard: z.number().int().min(500).max(10000).optional(),
  targetKcalEasy: z.number().int().min(500).max(10000).optional(),
  targetKcalRest: z.number().int().min(500).max(10000).optional(),
  proteinG: z.number().int().min(30).max(500).optional(),
  kcalAdjustment: z.number().int().min(KCAL_ADJUSTMENT_MIN).max(KCAL_ADJUSTMENT_MAX).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  // Verify coach owns this athlete
  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!relation) return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const data = parsed.data
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })

  // Si cambia kcalAdjustment → recalcular todos los macros
  if (data.kcalAdjustment !== undefined) {
    const profile = await prisma.healthProfile.findUnique({
      where: { userId: athleteId },
      select: { weightKg: true, heightCm: true, age: true, gender: true },
    })
    if (!profile?.weightKg || !profile?.heightCm || !profile?.age) {
      return NextResponse.json({ error: 'Atleta sin perfil completo' }, { status: 422 })
    }
    const tdee = calculateTDEE(profile.weightKg, profile.heightCm, profile.age, (profile.gender === 'female' ? 'female' : 'male') as 'male' | 'female', 5)
    const macros = calculateMacros(tdee, profile.weightKg, data.kcalAdjustment)
    const updated = await prisma.nutritionPlan.update({
      where: { userId: athleteId },
      data: {
        source: 'COACH',
        tdee,
        kcalAdjustment: data.kcalAdjustment,
        targetKcalHard: macros.hard.kcal,
        targetKcalEasy: macros.easy.kcal,
        targetKcalRest: macros.rest.kcal,
        proteinG: macros.hard.protein,
        carbsHardG: macros.hard.carbs,
        carbsEasyG: macros.easy.carbs,
        fatG: macros.hard.fat,
      },
      select: { targetKcalHard: true, targetKcalEasy: true, targetKcalRest: true, proteinG: true, kcalAdjustment: true, source: true },
    })
    return NextResponse.json(updated)
  }

  const updated = await prisma.nutritionPlan.update({
    where: { userId: athleteId },
    data: {
      ...data,
      source: 'COACH',
    },
    select: { targetKcalHard: true, targetKcalEasy: true, targetKcalRest: true, proteinG: true, kcalAdjustment: true, source: true },
  })

  return NextResponse.json(updated)
}
