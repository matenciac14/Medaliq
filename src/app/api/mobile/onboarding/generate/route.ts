import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, signMobileToken, buildMobileTokenPayload, MOBILE_USER_SELECT } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { completeOnboardingUseCase } from '@/domain/onboarding/complete_onboarding.use_case'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health_profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { sendAthleteReadyEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push/expo_push'
import type { WizardData, ActivityType, GymGoal, RunningGoal } from '@/app/onboarding/_types'

// ── Mobile payload → WizardData mapper ────────────────────────────────────────
// Mobile sends: mainGoal, sport, raceDistance, hoursPerSession
// Backend expects: activityType, gymGoal, runningGoal, sessionMinutes

type MobilePayload = {
  mainGoal?: string | null
  sport?: string | null
  raceDistance?: string | null
  hrMax?: number
  hrSource?: string
  gender?: string
  age?: number
  weightKg?: number
  heightCm?: number
  daysPerWeek?: number
  hoursPerSession?: number
  injuries?: string[]
  conditions?: string[]
  experienceLevel?: string | null
  // Fields from web format (forward-compatible)
  activityType?: string | null
  gymGoal?: string | null
  runningGoal?: string | null
  sessionMinutes?: number
}

function mapMobilePayload(p: MobilePayload): WizardData {
  // If already in web format, pass through
  if (p.activityType) {
    return {
      activityType: p.activityType as ActivityType,
      gymGoal: (p.gymGoal as GymGoal) ?? null,
      runningGoal: (p.runningGoal as RunningGoal) ?? null,
      age: p.age ?? null,
      heightCm: p.heightCm ?? null,
      weightKg: p.weightKg ?? null,
      gender: (p.gender as 'male' | 'female') ?? null,
      weightGoalKg: null,
      daysPerWeek: p.daysPerWeek ?? 4,
      sessionMinutes: p.sessionMinutes ?? 60,
      experienceLevel: (p.experienceLevel as WizardData['experienceLevel']) ?? null,
      injuries: Array.isArray(p.injuries) ? p.injuries.join(', ') : '',
      conditions: Array.isArray(p.conditions) ? p.conditions.join(', ') : '',
    }
  }

  // Map mobile format → WizardData
  const activityType = deriveActivityType(p.mainGoal, p.sport)
  const gymGoal = deriveGymGoal(p.mainGoal)
  const runningGoal = deriveRunningGoal(p.raceDistance)
  const sessionMinutes = Math.round((p.hoursPerSession ?? 1) * 60)

  return {
    activityType,
    gymGoal,
    runningGoal,
    age: p.age ?? null,
    heightCm: p.heightCm ?? null,
    weightKg: p.weightKg ?? null,
    gender: (p.gender as 'male' | 'female') ?? null,
    weightGoalKg: null,
    daysPerWeek: p.daysPerWeek ?? 4,
    sessionMinutes,
    experienceLevel: (p.experienceLevel as WizardData['experienceLevel']) ?? null,
    injuries: Array.isArray(p.injuries) ? p.injuries.filter(i => i !== 'Ninguna').join(', ') : '',
    conditions: Array.isArray(p.conditions) ? p.conditions.filter(c => c !== 'Ninguna').join(', ') : '',
  }
}

function deriveActivityType(mainGoal?: string | null, sport?: string | null): ActivityType {
  if (mainGoal === 'SPORT' && sport === 'RUNNING') return 'RUNNING'
  if (mainGoal === 'SPORT' && sport === 'STRENGTH') return 'GYM'
  if (mainGoal === 'GYM') return 'GYM'
  if (mainGoal === 'BODY') return 'GYM'
  return 'FREE'
}

function deriveGymGoal(mainGoal?: string | null): GymGoal | null {
  if (mainGoal === 'GYM') return 'MUSCLE_GAIN'
  if (mainGoal === 'BODY') return 'RECOMPOSITION'
  return null
}

function deriveRunningGoal(raceDistance?: string | null): RunningGoal | null {
  if (raceDistance === 'RACE_5K') return 'RACE_5K'
  if (raceDistance === 'RACE_10K') return 'RACE_10K'
  if (raceDistance === 'RACE_HALF_MARATHON') return 'GENERAL_FITNESS'
  if (raceDistance === 'RACE_MARATHON') return 'GENERAL_FITNESS'
  return 'GENERAL_FITNESS'
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { allowed } = await rateLimitAsync(`onboarding-mobile:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  try {
    const raw: MobilePayload = await req.json()
    const data = mapMobilePayload(raw)

    if (!data.age || !data.weightKg || !data.heightCm) {
      return NextResponse.json({ error: 'Faltan datos del perfil (edad, peso o talla).' }, { status: 400 })
    }

    const result = await completeOnboardingUseCase(data, mobile.id, {
      db: prisma,
      planRepo: new PrismaPlanRepository(),
      healthProfileRepo: new PrismaHealthProfileRepository(),
      userRepo: new PrismaUserRepository(),
      txRepoFactory: (tx) => ({
        healthProfileRepo: new PrismaHealthProfileRepository(tx),
        userRepo: new PrismaUserRepository(tx),
        planRepo: new PrismaPlanRepository(tx),
      }),
    })

    if (result.isB2B) {
      const coachRel = await prisma.coachAthlete.findFirst({
        where: { athleteId: mobile.id },
        select: { coach: { select: { email: true, name: true, pushToken: true } } },
      })
      if (coachRel?.coach) {
        const { coach } = coachRel
        const athleteName = mobile.name ?? 'Tu atleta'
        sendPushNotification(coach.pushToken ?? null, `${athleteName} completó su perfil`, 'Entra al panel para asignarle un plan de entrenamiento.').catch(() => {})
        sendAthleteReadyEmail(coach.email ?? '', coach.name ?? 'Coach', athleteName, mobile.id).catch(() => {})
      }
    }

    // Mobile needs a refreshed token with onboardingCompleted=true and updated features
    const updatedUser = await prisma.user.findUnique({
      where: { id: mobile.id },
      select: MOBILE_USER_SELECT,
    })
    const payload = updatedUser
      ? buildMobileTokenPayload(updatedUser, { isB2B: mobile.isB2B ?? false })
      : { ...mobile, onboardingCompleted: true as const }
    const token = await signMobileToken(payload)

    return NextResponse.json({ success: true, ...result, token })
  } catch (error) {
    console.error('[mobile/onboarding/generate]', error)
    return NextResponse.json({ error: 'Error generando el plan. Intenta de nuevo.' }, { status: 500 })
  }
}
