// ---------------------------------------------------------------------------
// WizardData — datos recolectados durante el onboarding
// Diseñado para soportar múltiples deportes y futuras integraciones
// ---------------------------------------------------------------------------

export type MainGoal = 'SPORT' | 'BODY'
export type Sport = 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'TRIATHLON' | 'FOOTBALL' | 'STRENGTH'
export type BodyGoal = 'FAT_LOSS' | 'MUSCLE_GAIN' | 'RECOMPOSITION'
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type HRSource = 'known' | 'estimated'

export type WizardData = {
  // ── Paso 1: Meta principal
  mainGoal: MainGoal | null

  // ── Paso 2a: Deporte (si mainGoal = SPORT)
  sport: Sport | null

  // ── Paso 2b: Objetivo corporal (si mainGoal = BODY)
  bodyGoal: BodyGoal | null

  // ── Detalles de deporte
  // Running
  raceDistance: 'RACE_5K' | 'RACE_10K' | 'RACE_HALF_MARATHON' | 'RACE_MARATHON' | null
  raceDate: string | null
  targetTime: string | null
  recentBestTime: string | null         // marca reciente en el formato mm:ss o hh:mm:ss

  // Ciclismo
  cyclingModality: 'ROAD' | 'MTB' | null
  hasPowerMeter: boolean | null
  ftp: number | null                    // Functional Threshold Power (watts)

  // Natación
  swimStroke: 'FREESTYLE' | 'BACKSTROKE' | 'BREASTSTROKE' | 'BUTTERFLY' | 'MIXED' | null
  recentSwimTime: string | null         // 100m time

  // Triatlón
  triathlonDistance: 'SPRINT' | 'OLYMPIC' | 'HALF' | 'FULL' | null
  weakestSegment: 'SWIM' | 'BIKE' | 'RUN' | null

  // Fútbol
  footballPosition: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' | null
  competitionLevel: 'RECREATIONAL' | 'AMATEUR' | 'SEMIPRO' | null
  seasonPhase: 'PRESEASON' | 'INSEASON' | 'OFFSEASON' | null

  // Fuerza
  strengthStyle: 'POWERLIFTING' | 'HYPERTROPHY' | 'FUNCTIONAL' | null

  // ── Perfil físico (común a todos)
  age: number | null
  heightCm: number | null
  weightKg: number | null
  gender: 'male' | 'female' | null
  weightGoalKg: number | null           // solo BODY

  // ── FC y rendimiento
  hrResting: number | null
  hrMax: number | null
  hrSource: HRSource | null             // 'known' = ingresado, 'estimated' = 220-edad
  experienceLevel: ExperienceLevel | null

  // ── Disponibilidad (común)
  daysPerWeek: number
  hoursPerSession: number

  // ── Salud (común)
  injuries: string[]
  conditions: string[]

  // ── Equipamiento (fuerza/ciclismo)
  equipment: string[]

  // ── Nutrición
  nutritionCommitment: 'strict' | 'moderate' | 'flexible' | null
}

export const INITIAL_DATA: WizardData = {
  mainGoal: null,
  sport: null,
  bodyGoal: null,
  raceDistance: null,
  raceDate: null,
  targetTime: null,
  recentBestTime: null,
  cyclingModality: null,
  hasPowerMeter: null,
  ftp: null,
  swimStroke: null,
  recentSwimTime: null,
  triathlonDistance: null,
  weakestSegment: null,
  footballPosition: null,
  competitionLevel: null,
  seasonPhase: null,
  strengthStyle: null,
  age: null,
  heightCm: null,
  weightKg: null,
  gender: null,
  weightGoalKg: null,
  hrResting: null,
  hrMax: null,
  hrSource: null,
  experienceLevel: null,
  daysPerWeek: 4,
  hoursPerSession: 1,
  injuries: [],
  conditions: [],
  equipment: [],
  nutritionCommitment: null,
}

// ---------------------------------------------------------------------------
// Routing de pasos según mainGoal y sport
// ---------------------------------------------------------------------------

export type StepId =
  | 'main-goal'
  | 'sport-select'
  | 'body-goal'
  | 'sport-details'
  | 'physical'
  | 'hr-fitness'
  | 'schedule'
  | 'health'
  | 'generating'

export function getSteps(data: WizardData): StepId[] {
  if (!data.mainGoal) return ['main-goal']

  const common: StepId[] = ['physical', 'hr-fitness', 'schedule', 'health', 'generating']

  if (data.mainGoal === 'SPORT') {
    if (!data.sport) return ['main-goal', 'sport-select']
    return ['main-goal', 'sport-select', 'sport-details', ...common]
  }

  // BODY
  return ['main-goal', 'body-goal', 'sport-details', ...common]
}
