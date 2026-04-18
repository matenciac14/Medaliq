import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'
import { parseUserConfig } from '@/lib/config/user-config'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(_req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      goals: { where: { status: 'ACTIVE' }, take: 1 },
      trainingPlans: { where: { status: 'ACTIVE' }, take: 1 },
    },
  })

  if (!user?.profile) return Response.json({ error: 'Perfil de salud requerido' }, { status: 400 })

  const profile = user.profile
  const goal = user.goals[0]

  // Calcular TDEE con fórmulas
  const tdee = calculateTDEE(profile.weightKg, profile.heightCm, profile.age, 'male', 5)
  const macros = calculateMacros(tdee, profile.weightKg, !!profile.weightGoalKg)

  // Usar AI para generar notas personalizadas
  let aiNotes = ''
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Atleta corredor: ${profile.age} años, ${profile.weightKg}kg, objetivo ${goal?.type ?? 'GENERAL_FITNESS'}.
TDEE calculado: ${tdee} kcal. Proteína: ${macros.hard.protein}g, Carbos día duro: ${macros.hard.carbs}g.
Lesiones: ${profile.injuries.join(', ') || 'ninguna'}. Medicamentos: ${profile.medications.join(', ') || 'ninguno'}.
Genera 2-3 recomendaciones nutricionales específicas en español (sin diagnosticar, solo coaching). Máximo 3 oraciones.`,
        },
      ],
    })
    aiNotes = (response.content[0] as { type: string; text: string }).text ?? ''
  } catch {
    aiNotes = ''
  }

  // Guardar en DB
  const nutritionPlan = await prisma.nutritionPlan.upsert({
    where: { userId },
    update: {
      tdee,
      targetKcalHard: macros.hard.kcal,
      targetKcalEasy: macros.easy.kcal,
      targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein,
      carbsHardG: macros.hard.carbs,
      carbsEasyG: macros.easy.carbs,
      fatG: macros.hard.fat,
    },
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
    },
  })

  // Activar feature nutrition en config
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { config: true } })
  const config = parseUserConfig(existing?.config)
  await prisma.user.update({
    where: { id: userId },
    data: {
      config: {
        ...config,
        features: { ...config.features, nutrition: true, progress: true },
      },
    },
  })

  return Response.json({ ok: true, plan: nutritionPlan, aiNotes })
}
