/**
 * Calcula adherencia de entrenamiento unificada: plan (running + FUERZA) + rutina (gym).
 *
 * Función pura — recibe datos pre-fetched, no hace queries.
 * Usada por: coach mapper, coach adherence endpoint, progress del atleta.
 */
import type { TrainingAdherenceResult } from './training_activity.types'

const GYM_SESSION_TYPES = new Set(['FUERZA'])

type PlanSessionInput = {
  type: string
  log: { id: string } | null
}

type GymRoutineInput = {
  daysPerWeek: number
  weeksActive: number       // semanas desde startDate hasta hoy (o endDate)
}

type GymSessionsDone = {
  count: number
}

export type AdherenceInput = {
  planSessions: PlanSessionInput[]
  gymRoutine: GymRoutineInput | null
  gymSessionsDone: GymSessionsDone
}

export function calculateTrainingAdherence(input: AdherenceInput): TrainingAdherenceResult {
  const { planSessions, gymRoutine, gymSessionsDone } = input

  // Plan adherence: split by discipline
  const runningSessions = planSessions.filter(s => !GYM_SESSION_TYPES.has(s.type))
  const planGymSessions = planSessions.filter(s => GYM_SESSION_TYPES.has(s.type))

  const runningCompleted = runningSessions.filter(s => s.log !== null).length
  const runningExpected = runningSessions.length

  // Gym from plan (FUERZA sessions logged via autoCompleteStrengthSession)
  const planGymCompleted = planGymSessions.filter(s => s.log !== null).length
  const planGymExpected = planGymSessions.length

  // Gym from routine (AssignedWorkout — independent of plan)
  let routineGymExpected = 0
  let routineGymCompleted = 0
  if (gymRoutine && gymRoutine.weeksActive > 0) {
    routineGymExpected = gymRoutine.daysPerWeek * gymRoutine.weeksActive
    // Total gym sessions done minus the ones already counted via plan
    routineGymCompleted = Math.max(gymSessionsDone.count - planGymCompleted, 0)
    // Cap at expected to avoid >100%
    routineGymCompleted = Math.min(routineGymCompleted, routineGymExpected)
  }

  const gymCompleted = planGymCompleted + routineGymCompleted
  const gymExpected = planGymExpected + routineGymExpected

  const totalCompleted = runningCompleted + gymCompleted
  const totalExpected = runningExpected + gymExpected

  return {
    totalAdherence: totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0,
    completed: totalCompleted,
    expected: totalExpected,
    byDiscipline: {
      running: {
        completed: runningCompleted,
        expected: runningExpected,
        pct: runningExpected > 0 ? Math.round((runningCompleted / runningExpected) * 100) : 0,
      },
      gym: {
        completed: gymCompleted,
        expected: gymExpected,
        pct: gymExpected > 0 ? Math.round((gymCompleted / gymExpected) * 100) : 0,
      },
    },
  }
}
