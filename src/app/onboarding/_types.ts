import type { WizardData, OnboardingGoal } from '@/domain/onboarding/onboarding.types'

export type StepId = 'profile' | 'generating'

export { type WizardData, type OnboardingGoal }

export const INITIAL_DATA: WizardData = {
  dateOfBirth: null,
  heightCm: null,
  weightKg: null,
  gender: null,
  goal: null,
  weightGoalKg: null,
  daysPerWeek: 4,
}

export function getSteps(data: WizardData): StepId[] {
  const steps: StepId[] = ['profile']
  if (
    data.dateOfBirth &&
    data.heightCm &&
    data.weightKg &&
    data.gender &&
    data.goal &&
    data.daysPerWeek >= 2
  ) {
    steps.push('generating')
  }
  return steps
}

export function isStepValid(_stepId: StepId, data: WizardData): boolean {
  if (!data.dateOfBirth) return false
  if (!data.gender) return false

  const h = data.heightCm
  if (!h || h < 100 || h > 250) return false

  const w = data.weightKg
  if (!w || w < 30 || w > 300) return false

  if (!data.goal) return false

  // Validate age from DOB (10-80 years)
  const age = Math.floor((Date.now() - new Date(data.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (age < 10 || age > 80) return false

  return true
}
