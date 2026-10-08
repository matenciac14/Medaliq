import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { calculateTDEE, calculateMacros } from '@/domain/plan/formulas'
import { rateLimitAsync } from '@/lib/rate_limit'

// POST /api/athlete/nutrition/init — inicializa NutritionPlan desde HealthProfile si no existe.
// Llamado desde el cliente cuando nutrition/page.tsx detecta que falta el plan base.
// Idempotente: upsert con update:{} no sobreescribe si ya existe.
export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-init`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id

  const healthProfile = await prisma.healthProfile.findUnique({
    where: { userId },
    select: { weightKg: true, heightCm: true, age: true, gender: true, weightGoalKg: true },
  })

  if (!healthProfile?.weightKg || !healthProfile?.heightCm || !healthProfile?.age) {
    return NextResponse.json({ error: 'Perfil incompleto — completa el onboarding primero' }, { status: 422 })
  }

  const tdee = calculateTDEE(
    healthProfile.weightKg,
    healthProfile.heightCm,
    healthProfile.age,
    (healthProfile.gender === 'female' ? 'female' : 'male') as 'male' | 'female',
    5,
  )
  const kcalAdjustment = healthProfile.weightGoalKg ? -500 : 0
  const macros = calculateMacros(tdee, healthProfile.weightKg, kcalAdjustment)

  await prisma.nutritionPlan.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      tdee,
      targetKcalHard: macros.hard.kcal,
      targetKcalEasy: macros.easy.kcal,
      targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein,
      carbsHardG: macros.hard.carbs,
      carbsEasyG: macros.easy.carbs,
      fatG: macros.hard.fat,
      kcalAdjustment,
    },
  })

  return NextResponse.json({ ok: true })
}
