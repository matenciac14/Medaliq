/**
 * Zod validation for WizardData — used by both web and mobile onboarding routes.
 * Validates AFTER mobile payload mapping (i.e. always validates WizardData shape).
 */
import { z } from 'zod'

export const wizardDataSchema = z.object({
  dateOfBirth: z.string().nullable(),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(20).max(300),
  gender: z.enum(['male', 'female', 'other']).nullable(),
  goal: z.enum(['LOSE_FAT', 'GAIN_MUSCLE', 'STAY_HEALTHY']).nullable(),
  weightGoalKg: z.number().min(20).max(299).nullable().default(null),
  daysPerWeek: z.number().int().min(2).max(7),

  // Legacy fields — mobile backward compat
  age: z.number().int().min(10).max(100).nullable().optional(),
  activityType: z.enum(['GYM', 'RUNNING', 'BOTH', 'FREE']).nullable().optional(),
  gymGoal: z.enum(['MUSCLE_GAIN', 'FAT_LOSS', 'RECOMPOSITION']).nullable().optional(),
  runningGoal: z.enum(['GENERAL_FITNESS', 'RACE_5K', 'RACE_10K']).nullable().optional(),
  sessionMinutes: z.number().min(10).max(300).optional(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).nullable().optional(),
  injuries: z.string().optional(),
  conditions: z.string().optional(),
}).refine(
  (d) => d.dateOfBirth || (d.age != null && d.age > 0),
  { message: 'Fecha de nacimiento o edad requerida.', path: ['dateOfBirth'] },
).refine(
  (d) => {
    if (!d.dateOfBirth) return true
    const dob = new Date(d.dateOfBirth)
    if (isNaN(dob.getTime())) return false
    const ageMs = Date.now() - dob.getTime()
    const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000)
    return ageYears >= 10 && ageYears <= 100
  },
  { message: 'Fecha de nacimiento inválida (edad debe ser entre 10 y 100).', path: ['dateOfBirth'] },
).refine(
  (d) => {
    if (d.goal !== 'LOSE_FAT' || d.weightGoalKg == null) return true
    return d.weightGoalKg < (d.weightKg ?? Infinity)
  },
  { message: 'El peso objetivo debe ser menor al peso actual.', path: ['weightGoalKg'] },
)
