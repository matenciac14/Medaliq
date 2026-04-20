// ---------------------------------------------------------------------------
// generator.ts — Motor de generación de planes de entrenamiento
// Combina templates + fórmulas + AI (Claude Haiku) + persistencia en BD
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'
import {
  calculateHRZones,
  calculateMacros,
  calculateTDEE,
  estimateHRMax,
} from './formulas'
import { getTemplate } from './templates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeneratePlanInput = {
  userId: string
  goalType: string
  raceDate?: string
  targetTimeSecs?: number
  weightGoalKg?: number
  age: number
  heightCm: number
  weightKg: number
  gender?: 'male' | 'female'
  hrResting?: number
  hrMax?: number
  daysPerWeek: number
  hoursPerSession: number
  injuries: string[]
  conditions: string[]
  nutritionCommitment: string
}

type Recommendation = { title: string; text: string }

export type GeneratePlanResult = {
  planId: string
  recommendations: Recommendation[]
  hrZones: ReturnType<typeof calculateHRZones>
  hrMax: number
  tdee: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calcula la fecha real de una sesión dado el inicio del plan, la semana y el día.
 * dayOfWeek: 1=lun … 7=dom
 */
function sessionDate(planStart: Date, weekIndex: number, dayOfWeek: number): Date {
  const date = new Date(planStart)
  // Avanzar al lunes de la semana correspondiente
  date.setDate(date.getDate() + weekIndex * 7)
  // Ajustar al día de la semana (1=lun → dayOfWeek-1 días desde lunes)
  const currentDow = date.getDay() // 0=dom, 1=lun, …
  const targetDow = dayOfWeek % 7  // 7=dom → 0
  const diff = (targetDow - currentDow + 7) % 7
  date.setDate(date.getDate() + diff)
  return date
}

/**
 * Llama a Claude Haiku para personalizar recomendaciones.
 * Devuelve array vacío si falla — no bloquea el plan.
 */
async function getAIRecommendations(
  input: GeneratePlanInput,
  hrMax: number,
  zones: ReturnType<typeof calculateHRZones>
): Promise<Recommendation[]> {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const injuriesStr = input.injuries.length > 0 ? input.injuries.join(', ') : 'ninguna'
    const conditionsStr = input.conditions.length > 0 ? input.conditions.join(', ') : 'ninguna'

    const userMessage = `Atleta: ${input.age}a, ${input.weightKg}kg, objetivo: ${input.goalType}, lesiones: ${injuriesStr}, condiciones: ${conditionsStr}. Zonas FC: Z2=${zones.z2.min}-${zones.z2.max}bpm, Z4=${zones.z4.min}-${zones.z4.max}bpm. Genera 3 recomendaciones personalizadas. JSON: {"recommendations":[{"title":string,"text":string}]}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: 'Coach deportivo experto. Responde SOLO en JSON válido.',
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const parsed = JSON.parse(rawText)
    return (parsed.recommendations as Recommendation[]) ?? []
  } catch {
    // No bloquear el flujo si Haiku falla
    return []
  }
}

// ---------------------------------------------------------------------------
// Mock data para cuando la BD no está conectada
// ---------------------------------------------------------------------------

function buildMockResult(input: GeneratePlanInput): GeneratePlanResult {
  const hrMax = input.hrMax && input.hrMax > 100 ? input.hrMax : estimateHRMax(input.age)
  const zones = calculateHRZones(hrMax, input.hrResting ?? 0)
  const tdee = calculateTDEE(
    input.weightKg,
    input.heightCm,
    input.age,
    input.gender ?? 'male',
    input.daysPerWeek
  )
  return {
    planId: `mock-${Date.now()}`,
    recommendations: [
      {
        title: 'Plan generado (modo demo)',
        text: 'La base de datos no está conectada. Este es un resultado de prueba.',
      },
    ],
    hrZones: zones,
    hrMax,
    tdee,
  }
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generatePlan(input: GeneratePlanInput): Promise<GeneratePlanResult> {
  // 1. Seleccionar template
  const template = getTemplate(input.goalType)
  if (!template) {
    // Fallback: usar HALF_MARATHON si no hay template para el goalType
    console.warn(`[generatePlan] No template for goalType: ${input.goalType}`)
  }

  // 2. Calcular hrMax real o estimado
  const hrMax = input.hrMax && input.hrMax > 100 ? input.hrMax : estimateHRMax(input.age)

  // 3. Calcular zonas FC
  const hrZones = calculateHRZones(hrMax, input.hrResting ?? 0)

  // 4. Calcular TDEE y macros
  const tdee = calculateTDEE(
    input.weightKg,
    input.heightCm,
    input.age,
    input.gender ?? 'male',
    input.daysPerWeek
  )
  const hasWeightGoal = !!input.weightGoalKg
  const macros = calculateMacros(tdee, input.weightKg, hasWeightGoal)

  // 5. Llamar a AI para personalizar textos
  const recommendations = await getAIRecommendations(input, hrMax, hrZones)

  // 6. Calcular fecha de inicio del plan (hoy)
  const planStart = new Date()
  planStart.setHours(0, 0, 0, 0)

  // 7. Determinar fecha fin del plan
  const totalWeeks = template?.totalWeeks ?? 18
  const planEnd = new Date(planStart)
  planEnd.setDate(planEnd.getDate() + totalWeeks * 7)

  // 8. Guardar en BD
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 8a. Crear TrainingPlan
      // hrZones se guarda como JSON en el schema
      const trainingPlan = await tx.trainingPlan.create({
        data: {
          userId: input.userId,
          name: `Plan ${input.goalType} — ${planStart.toLocaleDateString('es-CO')}`,
          totalWeeks,
          status: 'ACTIVE' as any,
          generatedBy: 'AI' as any,
          startDate: planStart,
          endDate: planEnd,
          hrZones: hrZones as any,
        },
      })

      // 8b. Upsert NutritionPlan (el schema tiene @unique en userId)
      await tx.nutritionPlan.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          tdee,
          targetKcalHard: macros.hard.kcal,
          targetKcalEasy: macros.easy.kcal,
          targetKcalRest: macros.rest.kcal,
          proteinG: macros.hard.protein,
          carbsHardG: macros.hard.carbs,
          carbsEasyG: macros.easy.carbs,
          fatG: macros.hard.fat,
        },
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
      })

      // 8c. Crear PlanWeeks + PlannedSessions si hay template
      if (template) {
        for (const week of template.weeks) {
          const weekIndex = week.weekNumber - 1
          const weekStart = new Date(planStart)
          weekStart.setDate(weekStart.getDate() + weekIndex * 7)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)

          const planWeek = await tx.planWeek.create({
            data: {
              planId: trainingPlan.id,
              weekNumber: week.weekNumber,
              phase: week.phase as any,
              volumeKm: week.volumeKm,
              focusDescription: week.focusDescription,
              isRecoveryWeek: week.isRecoveryWeek,
              startDate: weekStart,
              endDate: weekEnd,
            },
          })

          // Crear sesiones de la semana
          for (const session of week.sessions) {
            const sessionDateVal = sessionDate(planStart, weekIndex, session.dayOfWeek)

            await tx.plannedSession.create({
              data: {
                weekId: planWeek.id,
                dayOfWeek: session.dayOfWeek,
                type: session.type as any,
                durationMin: session.durationMin,
                zoneTarget: session.zoneTarget,
                structure: session.structure,
                date: sessionDateVal,
              },
            })
          }
        }
      }

      return trainingPlan
    })

    // Determinar sport.type y sport.goal a partir del goalType
    const goalTypeUpper = input.goalType.toUpperCase()
    let sportType: 'RUNNING' | 'CYCLING' | 'TRIATHLON' | 'SWIMMING' | 'STRENGTH' | 'GENERAL'
    let sportGoal: 'RACE' | 'BODY_RECOMPOSITION' | 'GENERAL_FITNESS'

    if (goalTypeUpper.startsWith('RACE_CYCLING')) {
      sportType = 'CYCLING'
      sportGoal = 'RACE'
    } else if (goalTypeUpper.startsWith('RACE_TRIATHLON')) {
      sportType = 'TRIATHLON'
      sportGoal = 'RACE'
    } else if (goalTypeUpper.startsWith('RACE_')) {
      sportType = 'RUNNING'
      sportGoal = 'RACE'
    } else if (goalTypeUpper === 'BODY_RECOMPOSITION' || goalTypeUpper === 'WEIGHT_LOSS') {
      sportType = 'STRENGTH'
      sportGoal = 'BODY_RECOMPOSITION'
    } else {
      sportType = 'GENERAL'
      sportGoal = 'GENERAL_FITNESS'
    }

    // Actualizar User.config tras guardar el plan
    // NOTA: features permanecen todas en false — el admin activa manualmente
    const existingUser = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { config: true },
    })
    const currentConfig = parseUserConfig(existingUser?.config)
    const newConfig = {
      ...currentConfig,
      features: {
        ...currentConfig.features,
        // Features permanecen en false hasta activación manual por admin
      },
      onboarding: {
        completed: true,
        completedAt: new Date().toISOString(),
      },
      plan: {
        activePlanId: result.id,
        currentWeek: 1,
        totalWeeks: result.totalWeeks,
        phase: 'BASE' as const,
      },
      sport: {
        type: sportType,
        goal: sportGoal,
      },
    }
    await prisma.user.update({
      where: { id: input.userId },
      data: { config: newConfig },
    })

    return {
      planId: result.id,
      recommendations,
      hrZones,
      hrMax,
      tdee,
    }
  } catch (dbError) {
    // BD no conectada o error de escritura — devolver datos sin planId real
    console.error('[generatePlan] DB error, falling back to mock:', dbError)
    const mockResult = buildMockResult(input)
    return {
      ...mockResult,
      recommendations: recommendations.length > 0 ? recommendations : mockResult.recommendations,
    }
  }
}
