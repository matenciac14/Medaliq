/**
 * UserConfig — objeto JSON almacenado en User.config
 * Fuente de verdad de la experiencia del usuario en la app.
 *
 * El sistema lee este objeto para decidir qué mostrar y cómo comportarse.
 * El coach puede modificarlo por atleta. El onboarding lo construye progresivamente.
 */
export type UserPlan = 'TRIAL' | 'FREE' | 'PRO'

export type UserConfig = {
  features: {
    plan: boolean        // Tiene plan de entrenamiento activo
    checkin: boolean     // Puede hacer check-in semanal
    nutrition: boolean   // Tiene plan nutricional
    progress: boolean    // Tiene historial suficiente para ver progreso
    log: boolean         // Puede registrar sesiones
    coach: boolean       // Tiene acceso al panel de coach (role COACH)
    gym: boolean         // Tiene rutina de gym asignada
  }
  sport: {
    type: 'RUNNING' | 'CYCLING' | 'TRIATHLON' | 'SWIMMING' | 'STRENGTH' | 'GENERAL' | null
    goal: 'RACE' | 'BODY_RECOMPOSITION' | 'GENERAL_FITNESS' | null
  }
  plan: {
    activePlanId: string | null
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
  ai: {
    messagesThisMonth: number
    messagesResetAt: string   // "YYYY-MM" — primer día del mes actual
    monthlyLimit: number      // 100 para Pro, 0 para Free, 999999 para Trial
  }
  trial: {
    plan: UserPlan          // TRIAL | FREE | PRO
    endsAt: string | null   // ISO date — null para B2B (gestionado por coach)
  }
}

/** Config por defecto para un usuario recién registrado */
export const DEFAULT_USER_CONFIG: UserConfig = {
  features: {
    plan: false,
    checkin: false,
    nutrition: false,
    progress: false,
    log: false,
    coach: false,
    gym: false,
  },
  sport: {
    type: null,
    goal: null,
  },
  plan: {
    activePlanId: null,
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
  ai: {
    messagesThisMonth: 0,
    messagesResetAt: '',
    monthlyLimit: 0,
  },
  trial: {
    plan: 'FREE',
    endsAt: null,
  },
}

/** Config de ejemplo para un atleta con plan completo */
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
    activePlanId: 'seed-plan-1',
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
  ai: {
    messagesThisMonth: 0,
    messagesResetAt: '',
    monthlyLimit: 100,
  },
  trial: {
    plan: 'PRO',
    endsAt: null,
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
  plan: { activePlanId: null, currentWeek: 0, totalWeeks: 0, phase: null },
  onboarding: { completed: true, completedAt: '2026-04-18T00:00:00.000Z' },
  preferences: { language: 'es', units: 'metric', notifications: true },
  ai: { messagesThisMonth: 0, messagesResetAt: '', monthlyLimit: 0 },
  trial: { plan: 'FREE', endsAt: null },
}

/** Helper: parsea el JSON crudo de la DB y hace merge con defaults */
export function parseUserConfig(raw: unknown): UserConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_USER_CONFIG
  const partial = raw as Partial<UserConfig>
  return {
    ...DEFAULT_USER_CONFIG,
    ...partial,
    features: { ...DEFAULT_USER_CONFIG.features, ...(partial.features ?? {}) },
    sport: { ...DEFAULT_USER_CONFIG.sport, ...(partial.sport ?? {}) },
    plan: { ...DEFAULT_USER_CONFIG.plan, ...(partial.plan ?? {}) },
    onboarding: { ...DEFAULT_USER_CONFIG.onboarding, ...(partial.onboarding ?? {}) },
    preferences: { ...DEFAULT_USER_CONFIG.preferences, ...(partial.preferences ?? {}) },
    ai: { ...DEFAULT_USER_CONFIG.ai, ...(partial.ai ?? {}) },
    trial: { ...DEFAULT_USER_CONFIG.trial, ...(partial.trial ?? {}) },
  }
}
