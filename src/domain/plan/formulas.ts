// ---------------------------------------------------------------------------
// formulas.ts — Pure math functions for training plan engine
// No AI, no DB. All functions are deterministic and testable.
// ---------------------------------------------------------------------------

export type HRZone = { min: number; max: number }
export type HRZones = { z1: HRZone; z2: HRZone; z3: HRZone; z4: HRZone; z5: HRZone }

/**
 * Calcula zonas FC.
 * - Si hrResting > 0: usa método Karvonen (FC reserva)
 * - Si hrResting === 0: usa porcentaje simple de hrMax
 *
 * Z1: 60-70%, Z2: 70-80%, Z3: 80-85%, Z4: 85-90%, Z5: 90-100%
 */
export function calculateHRZones(hrMax: number, hrResting: number = 0): HRZones {
  if (hrResting > 0) {
    // Karvonen: FCobj = FCreposo + %reserva × (FCmax - FCreposo)
    const reserve = hrMax - hrResting
    return {
      z1: { min: Math.round(hrResting + reserve * 0.60), max: Math.round(hrResting + reserve * 0.70) },
      z2: { min: Math.round(hrResting + reserve * 0.70), max: Math.round(hrResting + reserve * 0.80) },
      z3: { min: Math.round(hrResting + reserve * 0.80), max: Math.round(hrResting + reserve * 0.85) },
      z4: { min: Math.round(hrResting + reserve * 0.85), max: Math.round(hrResting + reserve * 0.90) },
      z5: { min: Math.round(hrResting + reserve * 0.90), max: hrMax },
    }
  }

  // Porcentaje simple de hrMax
  return {
    z1: { min: Math.round(hrMax * 0.60), max: Math.round(hrMax * 0.70) },
    z2: { min: Math.round(hrMax * 0.70), max: Math.round(hrMax * 0.80) },
    z3: { min: Math.round(hrMax * 0.80), max: Math.round(hrMax * 0.85) },
    z4: { min: Math.round(hrMax * 0.85), max: Math.round(hrMax * 0.90) },
    z5: { min: Math.round(hrMax * 0.90), max: hrMax },
  }
}

/**
 * Estima hrMax si el usuario no lo conoce.
 * Fórmula: 211 - (0.64 × edad)
 */
export function estimateHRMax(age: number): number {
  return Math.round(211 - 0.64 * age)
}

/**
 * Calcula TDEE con Mifflin-St Jeor.
 * Factor de actividad basado en volumen semanal (daysPerWeek × sessionMinutes) cuando se provee,
 * o solo en daysPerWeek cuando sessionMinutes no está disponible (compatibilidad hacia atrás).
 *
 * Bandas por volumen semanal:
 *   < 120 min/sem  → 1.375 (ligeramente activo)
 *   120–300 min/sem → 1.55 (moderadamente activo)
 *   300–600 min/sem → 1.725 (muy activo)
 *   > 600 min/sem  → 1.9  (extremadamente activo)
 *
 * Sin sessionMinutes: 3 días = 1.375 | 4 días = 1.55 | 5 días = 1.725 | ≥6 días = 1.9
 */
export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female',
  daysPerWeek: number,
  sessionMinutes?: number | null,
): number {
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161

  let factor: number
  if (sessionMinutes != null && sessionMinutes > 0) {
    // GAP-02: factor por volumen semanal real
    const weeklyMinutes = daysPerWeek * sessionMinutes
    if (weeklyMinutes < 120)       factor = 1.375
    else if (weeklyMinutes < 300)  factor = 1.55
    else if (weeklyMinutes <= 600) factor = 1.725
    else                           factor = 1.9
  } else {
    if (daysPerWeek <= 3) factor = 1.375
    else if (daysPerWeek === 4) factor = 1.55
    else if (daysPerWeek === 5) factor = 1.725
    else factor = 1.9
  }

  return Math.round(bmr * factor)
}

export type MacroDay = { kcal: number; protein: number; carbs: number; fat: number }
export type Macros = { hard: MacroDay; easy: MacroDay; rest: MacroDay }

/** Rango seguro para kcalAdjustment: -750 (déficit agresivo) a +500 (bulk) */
export const KCAL_ADJUSTMENT_MIN = -750
export const KCAL_ADJUSTMENT_MAX = 500

/** Opciones predefinidas para UI (coach + atleta Pro) */
export const KCAL_ADJUSTMENT_OPTIONS = [
  { value: -750, label: 'Déficit agresivo', desc: '-750 kcal (~0.7 kg/sem)' },
  { value: -500, label: 'Déficit estándar', desc: '-500 kcal (~0.5 kg/sem)' },
  { value: -250, label: 'Déficit moderado', desc: '-250 kcal (~0.25 kg/sem)' },
  { value: 0,    label: 'Mantenimiento',    desc: 'Sin cambio calórico' },
  { value: 250,  label: 'Superávit moderado', desc: '+250 kcal (lean bulk)' },
  { value: 500,  label: 'Superávit',        desc: '+500 kcal (bulk)' },
] as const

/**
 * Calcula macros periodizados por tipo de día.
 * - Proteína: 2g/kg siempre
 * - kcalAdjustment: negativo = déficit, positivo = superávit
 * - Carbos periodizados: día duro 50%, fácil 35%, descanso 25% de kcal
 * - Grasa: resto de kcal (mínimo 0.5g/kg)
 *
 * Backward-compatible: `hasWeightGoal` (boolean) se convierte a -500 internamente.
 */
export function calculateMacros(tdee: number, weightKg: number, kcalAdjustmentOrLegacy: number | boolean): Macros {
  const adjustment = typeof kcalAdjustmentOrLegacy === 'boolean'
    ? (kcalAdjustmentOrLegacy ? -500 : 0)
    : Math.max(KCAL_ADJUSTMENT_MIN, Math.min(KCAL_ADJUSTMENT_MAX, kcalAdjustmentOrLegacy))

  const proteinG = Math.round(weightKg * 2)
  const proteinKcal = proteinG * 4

  function buildDay(kcalTarget: number, carbPct: number): MacroDay {
    const baseKcal = Math.max(kcalTarget, 1200)
    const carbKcal = baseKcal * carbPct
    const carbsG = Math.round(carbKcal / 4)
    const minFatG = Math.round(weightKg * 0.5)
    const derivedFatG = Math.round((baseKcal - proteinKcal - carbKcal) / 9)
    const fatG = Math.max(derivedFatG, minFatG)
    const kcal = proteinKcal + carbsG * 4 + fatG * 9
    return { kcal, protein: proteinG, carbs: carbsG, fat: fatG }
  }

  return {
    hard: buildDay(tdee + adjustment, 0.50),
    easy: buildDay(tdee + adjustment - 200, 0.35),
    rest: buildDay(tdee + adjustment - 400, 0.25),
  }
}

/**
 * Predice tiempo en carrera usando la fórmula de Riegel.
 * T2 = T1 × (D2/D1)^1.06
 * Devuelve null si no hay datos de referencia.
 */
export function predictRaceTime(
  best5kSecs: number | null,
  best10kSecs: number | null,
  weightKg: number,
  targetDistanceKm: number
): number | null {
  // Preferir el dato más cercano a la distancia objetivo
  let refTimeSecs: number | null = null
  let refDistKm: number | null = null

  if (best10kSecs !== null && targetDistanceKm >= 10) {
    refTimeSecs = best10kSecs
    refDistKm = 10
  } else if (best5kSecs !== null) {
    refTimeSecs = best5kSecs
    refDistKm = 5
  } else if (best10kSecs !== null) {
    refTimeSecs = best10kSecs
    refDistKm = 10
  }

  if (refTimeSecs === null || refDistKm === null) return null

  const predicted = refTimeSecs * Math.pow(targetDistanceKm / refDistKm, 1.06)

  // Factor corrector de peso (atletas más pesados son ligeramente más lentos en carreras largas)
  // Ajuste mínimo — no sobreingeniería
  const weightFactor = weightKg > 80 ? 1.02 : 1.0

  return Math.round(predicted * weightFactor)
}
