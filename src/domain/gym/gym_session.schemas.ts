/**
 * Shared Zod schemas and types for gym session endpoints.
 * Used by both web (/api/athlete/gym/session/*) and mobile (/api/mobile/gym/*).
 */
import { z } from 'zod'

export const SetPayloadSchema = z.object({
  workoutExerciseId: z.string().min(1).optional(),
  exerciseName: z.string().max(200).optional(),
  setNumber: z.number().int().min(1).max(20),
  weightKg: z.number().min(0).max(1000).nullable(),
  repsCompleted: z.number().int().min(0).max(200).nullable(),
  completed: z.boolean(),
  setLogType: z.enum(['WORK', 'WARMUP', 'DROPSET']).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
})

export const ExerciseOverrideSchema = z.object({
  originalWorkoutExerciseId: z.string().min(1),
  replacedWithExerciseId: z.string().min(1),
  replacedExerciseName: z.string().max(200),
  reason: z.string().max(500).optional(),
})

export const GymCompleteSchema = z.object({
  assignedWorkoutId: z.string().min(1).optional(),
  plannedSessionId: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  rpe: z.number().int().min(1).max(10).optional(),
  durationMin: z.number().int().min(0).max(600).optional(),
  energyState: z.enum(['EXHAUSTED', 'NORMAL', 'ENERGIZED']).optional(),
  discomfort: z.enum(['NONE', 'MILD', 'MODERATE']).optional(),
  notes: z.string().max(2000).optional(),
  sets: z.array(SetPayloadSchema).max(300).optional(),
  exerciseOverrides: z.array(ExerciseOverrideSchema).max(50).optional(),
})

export type SetPayload = z.infer<typeof SetPayloadSchema>
export type ExerciseOverride = z.infer<typeof ExerciseOverrideSchema>
export type GymCompleteInput = z.infer<typeof GymCompleteSchema>
