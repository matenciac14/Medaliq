/**
 * TrainingActivity — tipo unificado que normaliza SessionLog (running/cardio)
 * y GymSession (fuerza/gym) en una interfaz común.
 *
 * Usado por: adherencia, historial, métricas de progreso, señales al coach.
 * NO reemplaza los modelos DB — es una abstracción de dominio para lectura.
 */

export type TrainingDiscipline = 'RUNNING' | 'GYM' | 'CYCLING' | 'SWIMMING' | 'FUNCTIONAL' | 'REST' | 'OTHER'

export type TrainingSource = 'PLAN' | 'ROUTINE' | 'FREE'

export type TrainingActivity = {
  id: string
  date: Date
  sessionType: string         // SessionType enum value (RODAJE_Z2, FUERZA, etc.)
  discipline: TrainingDiscipline
  source: TrainingSource
  durationMin: number | null
  rpe: number | null
  intensity: 'HIGH' | 'MODERATE' | 'LOW' | 'REST'
  completed: boolean
}

export type TrainingAdherenceResult = {
  totalAdherence: number        // 0-100
  completed: number
  expected: number
  byDiscipline: {
    running: DisciplineAdherence
    gym: DisciplineAdherence
  }
}

export type DisciplineAdherence = {
  completed: number
  expected: number
  pct: number                   // 0-100
}
