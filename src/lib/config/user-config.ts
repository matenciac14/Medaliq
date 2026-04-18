/**
 * UserConfig — objeto JSON almacenado en User.config
 * Fuente de verdad de la experiencia del usuario en la app.
 *
 * El sistema lee este objeto para decidir qué mostrar y cómo comportarse.
 * El coach puede modificarlo por atleta. El onboarding lo construye progresivamente.
 */
export type UserConfig = {
  features: {
    plan: boolean        // Tiene plan de entrenamiento activo
    checkin: boolean     // Puede hacer check-in semanal
    nutrition: boolean   // Tiene plan nutricional
    progress: boolean    // Tiene historial suficiente para ver progreso
    log: boolean         // Puede registrar sesiones
    coach: boolean       // Tiene acceso al panel de coach (role COACH)
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
  },
  sport: { type: null, goal: null },
  plan: { activePlanId: null, currentWeek: 0, totalWeeks: 0, phase: null },
  onboarding: { completed: true, completedAt: '2026-04-18T00:00:00.000Z' },
  preferences: { language: 'es', units: 'metric', notifications: true },
}

/** Helper: parsea el JSON crudo de la DB y hace merge con defaults */
export function parseUserConfig(raw: unknown): UserConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_USER_CONFIG
  return { ...DEFAULT_USER_CONFIG, ...(raw as Partial<UserConfig>) }
}
