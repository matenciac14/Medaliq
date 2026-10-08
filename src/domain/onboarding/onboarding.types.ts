/**
 * Onboarding data types — simplified single-step wizard.
 * Discipline (sport) is NOT asked at onboarding — deferred to first activity log.
 */

export type OnboardingGoal = 'LOSE_FAT' | 'GAIN_MUSCLE' | 'STAY_HEALTHY'

// Keep legacy types for mobile backward compatibility
export type ActivityType = 'GYM' | 'RUNNING' | 'BOTH' | 'FREE'
export type GymGoal = 'MUSCLE_GAIN' | 'FAT_LOSS' | 'RECOMPOSITION'
export type RunningGoal = 'GENERAL_FITNESS' | 'RACE_5K' | 'RACE_10K'
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

/** New simplified wizard data — single step */
export type WizardData = {
  dateOfBirth: string | null  // ISO date string
  heightCm: number | null
  weightKg: number | null
  gender: 'male' | 'female' | 'other' | null
  goal: OnboardingGoal | null
  weightGoalKg: number | null
  daysPerWeek: number

  // Legacy fields — still accepted for backward compatibility with mobile
  age?: number | null
  activityType?: ActivityType | null
  gymGoal?: GymGoal | null
  runningGoal?: RunningGoal | null
  sessionMinutes?: number
  experienceLevel?: ExperienceLevel | null
  injuries?: string
  conditions?: string
}
