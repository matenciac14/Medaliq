export type AthleteHealthProfile = {
  weightKg: number | null
  weightGoalKg: number | null
  heightCm: number | null
  age: number | null
  dateOfBirth: Date | null   // fuente canónica — calcular edad en runtime con calcAge(dob)
  gender: string | null
  sessionMinutes: number | null  // GAP-02: used for more precise TDEE calculation
  daysPerWeek: number | null     // GAP-02: sessions per week from onboarding
}

export type NutritionTargets = {
  tdee: number
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
}

export type CreateHealthProfile = {
  age: number
  heightCm: number
  weightKg: number
  weightGoalKg?: number
  gender?: string
  hrResting?: number
  hrMax?: number
  ftp?: number
  injuries?: string[]
  conditions?: string[]
  sessionMinutes?: number
  sport?: string
  experienceLevel?: string
  sportDetails?: Record<string, unknown>
  dataSources?: Record<string, unknown>
}

/**
 * Port — contract for health profile and nutrition plan persistence.
 */
export interface IHealthProfileRepository {
  find(userId: string): Promise<AthleteHealthProfile | null>
  updateWeight(userId: string, weightKg: number): Promise<void>
  updateHrResting(userId: string, hrResting: number): Promise<void>
  updateNutritionTargets(userId: string, targets: NutritionTargets): Promise<void>
  hasNutritionPlan(userId: string): Promise<boolean>
  getNutritionKcalAdjustment(userId: string): Promise<number>
  /** Creates or fully replaces an athlete's health profile. */
  upsertProfile(userId: string, data: CreateHealthProfile): Promise<void>
}
