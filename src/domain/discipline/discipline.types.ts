/**
 * Discipline — configuracion dinamica de disciplinas deportivas.
 * Fuente canonica de que disciplinas existen en el sistema,
 * que campos necesita cada una para registrar sesion,
 * y que tipos de sesion tiene disponibles.
 */

export type DisciplineTrackingFields = {
  [key: string]: boolean | undefined
  /** Gym/Fuerza */
  sets?: boolean
  reps?: boolean
  weight?: boolean
  /** Running/Cardio */
  distanceKm?: boolean
  durationMin?: boolean
  pace?: boolean
  zones?: boolean
  /** Otros */
  rounds?: boolean
  timePerRound?: boolean
  laps?: boolean
  strokes?: boolean
  cadence?: boolean
  power?: boolean
}

export interface DisciplineSeed {
  slug: string
  name: string
  nameEs: string
  icon: string
  color: string
  sortOrder: number
  hasExerciseLibrary: boolean
  trackingFields: DisciplineTrackingFields
  sessionTypes: string[]
}

/** Seed inicial con las disciplinas construidas en el sistema */
export const DISCIPLINE_SEEDS: DisciplineSeed[] = [
  {
    slug: 'strength',
    name: 'Strength',
    nameEs: 'Fuerza',
    icon: '🏋️',
    color: '#f97316',
    sortOrder: 1,
    hasExerciseLibrary: true,
    trackingFields: { sets: true, reps: true, weight: true, durationMin: true },
    sessionTypes: ['FUERZA'],
  },
  {
    slug: 'running',
    name: 'Running',
    nameEs: 'Running',
    icon: '🏃',
    color: '#3b82f6',
    sortOrder: 2,
    hasExerciseLibrary: false,
    trackingFields: { distanceKm: true, durationMin: true, pace: true, zones: true },
    sessionTypes: ['RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA', 'TEST', 'SIMULACRO'],
  },
  {
    slug: 'cycling',
    name: 'Cycling',
    nameEs: 'Ciclismo',
    icon: '🚴',
    color: '#10b981',
    sortOrder: 3,
    hasExerciseLibrary: false,
    trackingFields: { distanceKm: true, durationMin: true, zones: true, cadence: true, power: true },
    sessionTypes: ['CICLA'],
  },
  {
    slug: 'swimming',
    name: 'Swimming',
    nameEs: 'Natacion',
    icon: '🏊',
    color: '#06b6d4',
    sortOrder: 4,
    hasExerciseLibrary: false,
    trackingFields: { distanceKm: true, durationMin: true, laps: true, strokes: true },
    sessionTypes: ['NATACION'],
  },
  {
    slug: 'other',
    name: 'Other',
    nameEs: 'Otro',
    icon: '⚡',
    color: '#6b7280',
    sortOrder: 99,
    hasExerciseLibrary: false,
    trackingFields: { durationMin: true },
    sessionTypes: ['OTRO'],
  },
]

/**
 * Mapeo sessionType → intensidad.
 * Fuente canonica — usado por domain/plan/intensity.ts y nutrition adjustment.
 */
export const SESSION_INTENSITY_MAP: Record<string, 'HIGH' | 'MODERATE' | 'LOW' | 'REST'> = {
  // Running — HIGH
  INTERVALOS: 'HIGH',
  TIRADA_LARGA: 'HIGH',
  SIMULACRO: 'HIGH',
  TEST: 'HIGH',
  // Running — MODERATE
  TEMPO: 'MODERATE',
  FARTLEK: 'MODERATE',
  // Running — LOW
  RODAJE_Z2: 'LOW',
  // Cycling
  CICLA: 'MODERATE',
  // Swimming
  NATACION: 'MODERATE',
  // Strength
  FUERZA: 'MODERATE',
  // General
  OTRO: 'MODERATE',
  DESCANSO: 'REST',
}

/** Mapeo slug → enum SessionDiscipline legacy (para backfill) */
export const SLUG_TO_SESSION_DISCIPLINE: Record<string, string> = {
  strength: 'STRENGTH',
  running: 'RUNNING',
  cycling: 'CYCLING',
  swimming: 'SWIMMING',
  other: 'OTHER',
}
