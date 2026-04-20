import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { generatePlan } from '@/lib/plan/generator'
import { rateLimit } from '@/lib/rate-limit'
import type { WizardData } from '@/app/onboarding/_types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeStringToSecs(timeStr: string | null): number | null {
  if (!timeStr) return null
  const parts = timeStr.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

/**
 * Mapea WizardData al goalType que usa el generator/templates.
 */
function resolveGoalType(data: WizardData): string {
  if (data.mainGoal === 'SPORT') {
    switch (data.sport) {
      case 'RUNNING':
        return data.raceDistance ?? 'RACE_HALF_MARATHON'
      case 'CYCLING':
        return 'RACE_CYCLING'
      case 'TRIATHLON':
        return 'RACE_TRIATHLON'
      case 'SWIMMING':
      case 'FOOTBALL':
      case 'STRENGTH':
        return 'BODY_RECOMPOSITION' // fallback hasta tener templates específicos
      default:
        return 'GENERAL_FITNESS'
    }
  }

  if (data.mainGoal === 'BODY') {
    if (data.bodyGoal === 'FAT_LOSS') return 'BODY_RECOMPOSITION'
    if (data.bodyGoal === 'MUSCLE_GAIN') return 'BODY_RECOMPOSITION'
    if (data.bodyGoal === 'RECOMPOSITION') return 'BODY_RECOMPOSITION'
    return 'BODY_RECOMPOSITION'
  }

  return 'GENERAL_FITNESS'
}

/**
 * Construye el objeto sportDetails para guardar en HealthProfile.sportDetails
 */
function buildSportDetails(data: WizardData): Record<string, unknown> {
  if (data.mainGoal === 'SPORT') {
    switch (data.sport) {
      case 'RUNNING':
        return {
          raceDistance: data.raceDistance,
          raceDate: data.raceDate,
          targetTime: data.targetTime,
          recentBestTime: data.recentBestTime,
        }
      case 'CYCLING':
        return {
          cyclingModality: data.cyclingModality,
          hasPowerMeter: data.hasPowerMeter,
          ftp: data.ftp,
          raceDate: data.raceDate,
        }
      case 'SWIMMING':
        return {
          swimStroke: data.swimStroke,
          recentSwimTime: data.recentSwimTime,
          raceDate: data.raceDate,
        }
      case 'TRIATHLON':
        return {
          triathlonDistance: data.triathlonDistance,
          weakestSegment: data.weakestSegment,
          raceDate: data.raceDate,
        }
      case 'FOOTBALL':
        return {
          footballPosition: data.footballPosition,
          competitionLevel: data.competitionLevel,
          seasonPhase: data.seasonPhase,
        }
      case 'STRENGTH':
        return {
          strengthStyle: data.strengthStyle,
        }
    }
  }

  if (data.mainGoal === 'BODY') {
    return {
      bodyGoal: data.bodyGoal,
      targetDate: data.raceDate,
    }
  }

  return {}
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

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }
    const userId = session.user.id

    const goalType = resolveGoalType(data)
    const sportDetails = buildSportDetails(data)

    // Detectar si el atleta pertenece a un coach (B2B) para no activar trial automáticamente
    const coachRelation = await prisma.coachAthlete.findFirst({
      where: { athleteId: userId },
    })
    const isB2B = !!coachRelation

    // Upsert HealthProfile con todos los datos del onboarding
    await prisma.healthProfile.upsert({
      where: { userId },
      create: {
        userId,
        age: data.age,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        weightGoalKg: data.weightGoalKg ?? undefined,
        hrResting: data.hrResting ?? undefined,
        hrMax: data.hrMax ?? undefined,
        ftp: data.ftp ?? undefined,
        injuries: data.injuries,
        conditions: data.conditions,
        sport: data.mainGoal === 'SPORT' ? (data.sport ?? undefined) : 'STRENGTH',
        experienceLevel: data.experienceLevel ?? undefined,
        sportDetails: sportDetails as object,
        dataSources: {
          hrMax: { source: data.hrSource === 'known' ? 'manual' : 'estimated', updatedAt: new Date().toISOString() },
          ...(data.ftp ? { ftp: { source: 'manual', updatedAt: new Date().toISOString() } } : {}),
        } as object,
      },
      update: {
        age: data.age,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        weightGoalKg: data.weightGoalKg ?? undefined,
        hrResting: data.hrResting ?? undefined,
        hrMax: data.hrMax ?? undefined,
        ftp: data.ftp ?? undefined,
        injuries: data.injuries,
        conditions: data.conditions,
        sport: data.mainGoal === 'SPORT' ? (data.sport ?? undefined) : 'STRENGTH',
        experienceLevel: data.experienceLevel ?? undefined,
        sportDetails: sportDetails as object,
        dataSources: {
          hrMax: { source: data.hrSource === 'known' ? 'manual' : 'estimated', updatedAt: new Date().toISOString() },
          ...(data.ftp ? { ftp: { source: 'manual', updatedAt: new Date().toISOString() } } : {}),
        } as object,
      },
    })

    const result = await generatePlan({
      userId,
      goalType,
      generatedBy: isB2B ? 'COACH' : 'AI',
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
