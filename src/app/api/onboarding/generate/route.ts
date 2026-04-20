import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generatePlan } from '@/lib/plan/generator'
import { rateLimit } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardData = {
  goalType: 'RACE' | 'BODY' | 'FITNESS' | null
  raceDistance: string | null   // 'RACE_5K' | 'RACE_10K' | 'RACE_HALF_MARATHON' | etc.
  bodyGoal: string | null       // 'BODY_RECOMPOSITION' | 'WEIGHT_LOSS'
  raceDate: string | null
  targetTime: string | null
  weightGoalKg: number | null
  age: number | null
  heightCm: number | null
  weightKg: number | null
  gender: 'male' | 'female' | null
  hrResting: number | null
  hrMax: number | null
  recentBest5k: string | null   // formato "mm:ss" o null
  recentBest10k: string | null
  recentBestHalf: string | null
  lastRaceMonthsAgo: number | null
  arrivedTrained: boolean | null
  injuries: string[]
  conditions: string[]
  sleepHoursAvg: number | null
  daysPerWeek: number
  hoursPerSession: number
  city: string
  equipment: string[]
  nutritionCommitment: 'strict' | 'moderate' | 'flexible' | null
  hrTestAvailable: boolean | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convierte tiempo en formato "mm:ss" o "hh:mm:ss" a segundos.
 * Devuelve null si el formato es inválido.
 */
function timeStringToSecs(timeStr: string | null): number | null {
  if (!timeStr) return null
  const parts = timeStr.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

/**
 * Mapea los campos del wizard al goalType que entiende el generator.
 */
function resolveGoalType(data: WizardData): string {
  if (data.goalType === 'RACE') {
    return data.raceDistance ?? 'RACE_HALF_MARATHON'
  }
  if (data.goalType === 'BODY') {
    const goal = data.bodyGoal ?? 'BODY_RECOMPOSITION'
    // Normalizar valores del wizard al key del template
    if (goal === 'RECOMPOSITION' || goal === 'MUSCLE_GAIN') return 'BODY_RECOMPOSITION'
    if (goal === 'FAT_LOSS' || goal === 'WEIGHT_LOSS') return 'BODY_RECOMPOSITION'
    return goal
  }
  return 'GENERAL_FITNESS'
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { allowed } = rateLimit(`onboarding:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
  }

  try {
    const data: WizardData = await req.json()

    // Validación mínima
    if (!data.age || !data.weightKg || !data.heightCm) {
      return NextResponse.json(
        { error: 'Faltan datos del perfil (edad, peso o talla).' },
        { status: 400 }
      )
    }

    const goalType = resolveGoalType(data)
    const best5kSecs = timeStringToSecs(data.recentBest5k)
    const best10kSecs = timeStringToSecs(data.recentBest10k)

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }
    const userId = session.user.id

    const result = await generatePlan({
      userId,
      goalType,
      raceDate: data.raceDate ?? undefined,
      targetTimeSecs: timeStringToSecs(data.targetTime) ?? undefined,
      weightGoalKg: data.weightGoalKg ?? undefined,
      age: data.age,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      gender: data.gender ?? 'male',
      hrResting: data.hrResting ?? undefined,
      hrMax: data.hrMax ?? undefined,
      daysPerWeek: data.daysPerWeek,
      hoursPerSession: data.hoursPerSession,
      injuries: data.injuries,
      conditions: data.conditions,
      nutritionCommitment: data.nutritionCommitment ?? 'moderate',
    })

    return NextResponse.json({
      success: true,
      planId: result.planId,
      recommendations: result.recommendations,
      hrZones: result.hrZones,
      hrMax: result.hrMax,
      tdee: result.tdee,
    })
  } catch (error) {
    console.error('[onboarding/generate] Error:', error)
    return NextResponse.json(
      { error: 'Error generando el plan. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
