/**
 * UserConfig — representación en memoria / JWT del estado del usuario.
 * NO es un JSON blob en DB — la DB usa columnas Boolean tipadas en User.
 *
 * `features` espeja las columnas featurePlan | featureCheckin | featureNutrition |
 * featureProgress | featureLog | featureCoach | featureGym de la tabla User.
 *
 * Se construye al firmar el JWT (auth.ts / mobile-auth.ts) y se usa en:
 * middleware, sidebar, feature-gate, layout de atleta y token mobile.
 * El coach puede activar features por atleta vía enableFeatures() en IUserRepository.
 */
export type UserPlan = 'FREE' | 'PRO'

export type UserConfig = {
  features: {
    plan: boolean        // Tiene acceso al módulo de plan
    checkin: boolean     // Puede hacer check-in semanal
    nutrition: boolean   // Tiene plan nutricional
    progress: boolean    // Puede ver historial de progreso
    log: boolean         // Puede registrar sesiones
    coach: boolean       // Tiene acceso al panel de coach (role COACH)
    gym: boolean         // Tiene acceso al gym tracker
  }
  sport: {
    type: 'RUNNING' | 'STRENGTH' | 'GENERAL' | null
    goal: 'RACE' | 'BODY_RECOMPOSITION' | 'GENERAL_FITNESS' | null
  }
  plan: {
    currentWeek: number
    totalWeeks: number
    phase: 'BASE' | 'DESARROLLO' | 'ESPECIFICO' | 'AFINAMIENTO' | null
  }
  onboarding: {
    completed: boolean
    completedAt: string | null   // ISO date
  }
  preferences: {
    language: 'es' | 'en'
    units: 'metric' | 'imperial'
    notifications: boolean
  }
}

/** Config por defecto para un usuario recién registrado */
export const DEFAULT_USER_CONFIG: UserConfig = {
  features: {
    plan: true,
    checkin: true,
    nutrition: true,
    progress: true,
    log: true,
    coach: false,
    gym: true,
  },
  sport: {
    type: null,
    goal: null,
  },
  plan: {
    currentWeek: 0,
    totalWeeks: 0,
    phase: null,
  },
  onboarding: {
    completed: false,
    completedAt: null,
  },
  preferences: {
    language: 'es',
    units: 'metric',
    notifications: true,
  },
}

/** Config de ejemplo para un atleta con plan */
export const FULL_ATHLETE_CONFIG: UserConfig = {
  features: {
    plan: true,
    checkin: true,
    nutrition: true,
    progress: true,
    log: true,
    coach: false,
    gym: true,
  },
  sport: {
    type: 'RUNNING',
    goal: 'RACE',
  },
  plan: {
    currentWeek: 1,
    totalWeeks: 18,
    phase: 'BASE',
  },
  onboarding: {
    completed: true,
    completedAt: '2026-04-18T00:00:00.000Z',
  },
  preferences: {
    language: 'es',
    units: 'metric',
    notifications: true,
  },
}

/** Config para un coach */
export const COACH_CONFIG: UserConfig = {
  features: {
    plan: false,
    checkin: false,
    nutrition: false,
    progress: false,
    log: false,
    coach: true,
    gym: false,
  },
  sport: { type: null, goal: null },
  plan: { currentWeek: 0, totalWeeks: 0, phase: null },
  onboarding: { completed: true, completedAt: '2026-04-18T00:00:00.000Z' },
  preferences: { language: 'es', units: 'metric', notifications: true },
}

/**
 * Devuelve el plan del usuario.
 * Mientras BILLING_ENABLED=false (beta), todos son PRO.
 * Al activar billing, lee de UserSubscription.tier pasado como argumento.
 * Los atletas B2B (isB2B=true) siempre son PRO — su acceso lo gestiona el coach.
 */
export function getUserPlan(
  _features: UserConfig['features'],
  subscriptionTier?: string | null,
  isB2B?: boolean,
  trialEndsAt?: Date | null,
): UserPlan {
  const billingEnabled = process.env.BILLING_ENABLED === 'true'
  if (!billingEnabled) return 'PRO'
  if (isB2B) return 'PRO'
  if (subscriptionTier === 'PRO') return 'PRO'
  if (subscriptionTier === 'TRIAL' && trialEndsAt && trialEndsAt > new Date()) return 'PRO'
  return 'FREE'
}

/**
 * Construye un UserConfig desde un objeto parcial (eg. campos del JWT o un registro de DB legacy).
 * Hace explicit pick de features para evitar que campos stale (aiPlan, aiCoach) se filtren al token.
 */
export function parseUserConfig(raw: unknown): UserConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_USER_CONFIG
  const partial = raw as Partial<UserConfig>
  // Explicitly pick only known feature keys to prevent stale fields (e.g. aiPlan, aiCoach)
  // from old DB records from leaking into the auth token.
  const pf = (partial.features ?? {}) as Record<string, boolean | undefined>
  const pp = partial.plan as Partial<UserConfig['plan']> | undefined
  return {
    ...DEFAULT_USER_CONFIG,
    ...partial,
    features: {
      plan:      pf.plan      ?? DEFAULT_USER_CONFIG.features.plan,
      checkin:   pf.checkin   ?? DEFAULT_USER_CONFIG.features.checkin,
      nutrition: pf.nutrition ?? DEFAULT_USER_CONFIG.features.nutrition,
      progress:  pf.progress  ?? DEFAULT_USER_CONFIG.features.progress,
      log:       pf.log       ?? DEFAULT_USER_CONFIG.features.log,
      coach:     pf.coach     ?? DEFAULT_USER_CONFIG.features.coach,
      gym:       pf.gym       ?? DEFAULT_USER_CONFIG.features.gym,
    },
    sport: { ...DEFAULT_USER_CONFIG.sport, ...(partial.sport ?? {}) },
    // Explicit pick — evita que activePlanId de registros viejos en DB se filtre al tipo
    plan: {
      currentWeek: pp?.currentWeek  ?? DEFAULT_USER_CONFIG.plan.currentWeek,
      totalWeeks:  pp?.totalWeeks   ?? DEFAULT_USER_CONFIG.plan.totalWeeks,
      phase:       pp?.phase        ?? DEFAULT_USER_CONFIG.plan.phase,
    },
    onboarding: { ...DEFAULT_USER_CONFIG.onboarding, ...(partial.onboarding ?? {}) },
    preferences: { ...DEFAULT_USER_CONFIG.preferences, ...(partial.preferences ?? {}) },
  }
}
