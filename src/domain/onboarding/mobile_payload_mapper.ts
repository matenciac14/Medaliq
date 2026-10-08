import type { ActivityType, GymGoal, RunningGoal, OnboardingGoal, WizardData } from './onboarding.types'

// ── Mobile payload shape ─────────────────────────────────────────────────────

export type MobileOnboardingPayload = {
  mainGoal?: string | null
  sport?: string | null
  raceDistance?: string | null
  hrMax?: number
  hrSource?: string
  gender?: string
  age?: number
  dateOfBirth?: string | null
  weightKg?: number
  heightCm?: number
  daysPerWeek?: number
  hoursPerSession?: number
  injuries?: string[]
  conditions?: string[]
  experienceLevel?: string | null
  goal?: OnboardingGoal | null
  weightGoalKg?: number | null
  activityType?: string | null
  gymGoal?: string | null
  runningGoal?: string | null
  sessionMinutes?: number
}

// ── Mappers ──────────────────────────────────────────────────────────────────

const VALID_GENDERS = new Set(['male', 'female', 'other'])

function normalizeGender(raw: string | null | undefined): 'male' | 'female' | 'other' | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  return VALID_GENDERS.has(lower) ? (lower as 'male' | 'female' | 'other') : null
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

/** Maps mobile onboarding payload to a raw object for Zod validation */
export function mapMobilePayload(p: MobileOnboardingPayload): Record<string, unknown> {
  // New simplified format
  if (p.goal && p.dateOfBirth) {
    return {
      dateOfBirth: p.dateOfBirth,
      heightCm: p.heightCm ?? null,
      weightKg: p.weightKg ?? null,
      gender: normalizeGender(p.gender),
      goal: p.goal,
      weightGoalKg: p.weightGoalKg ?? null,
      daysPerWeek: p.daysPerWeek ?? 4,
      age: p.age ?? null,
      sessionMinutes: p.sessionMinutes ?? 60,
      experienceLevel: (p.experienceLevel as WizardData['experienceLevel']) ?? null,
      injuries: Array.isArray(p.injuries) ? p.injuries.join(', ') : '',
      conditions: Array.isArray(p.conditions) ? p.conditions.join(', ') : '',
    }
  }

  // Web format (forward-compatible)
  if (p.activityType) {
    return {
      dateOfBirth: p.dateOfBirth ?? null,
      heightCm: p.heightCm ?? null,
      weightKg: p.weightKg ?? null,
      gender: normalizeGender(p.gender),
      goal: null,
      weightGoalKg: p.weightGoalKg ?? null,
      daysPerWeek: p.daysPerWeek ?? 4,
      activityType: p.activityType as ActivityType,
      gymGoal: (p.gymGoal as GymGoal) ?? null,
      runningGoal: (p.runningGoal as RunningGoal) ?? null,
      age: p.age ?? null,
      sessionMinutes: p.sessionMinutes ?? 60,
      experienceLevel: (p.experienceLevel as WizardData['experienceLevel']) ?? null,
      injuries: Array.isArray(p.injuries) ? p.injuries.join(', ') : '',
      conditions: Array.isArray(p.conditions) ? p.conditions.join(', ') : '',
    }
  }

  // Legacy mobile format
  const activityType = deriveActivityType(p.mainGoal, p.sport)
  const gymGoal = deriveGymGoal(p.mainGoal)
  const runningGoal = deriveRunningGoal(p.raceDistance)
  const sessionMinutes = Math.round((p.hoursPerSession ?? 1) * 60)

  return {
    dateOfBirth: p.dateOfBirth ?? null,
    heightCm: p.heightCm ?? null,
    weightKg: p.weightKg ?? null,
    gender: normalizeGender(p.gender),
    goal: null,
    weightGoalKg: null,
    daysPerWeek: p.daysPerWeek ?? 4,
    activityType,
    gymGoal,
    runningGoal,
    age: p.age ?? null,
    sessionMinutes,
    experienceLevel: (p.experienceLevel as WizardData['experienceLevel']) ?? null,
    injuries: Array.isArray(p.injuries) ? p.injuries.filter(i => i !== 'Ninguna').join(', ') : '',
    conditions: Array.isArray(p.conditions) ? p.conditions.filter(c => c !== 'Ninguna').join(', ') : '',
  }
}
