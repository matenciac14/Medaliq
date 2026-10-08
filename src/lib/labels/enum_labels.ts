// Fuente canónica de labels para enums de DB — usar en toda la UI

export const GOAL_LABEL: Record<string, string> = {
  RACE_5K:            '5K',
  RACE_10K:           '10K',
  RACE_HALF_MARATHON: 'Media maratón',
  RACE_MARATHON:      'Maratón',
  BODY_RECOMPOSITION: 'Recomposición corporal',
  STRENGTH_TRAINING:  'Fuerza',
}

export const SPORT_LABEL: Record<string, string> = {
  RUNNING:  'Running',
  STRENGTH: 'Fuerza',
  GYM:      'Fuerza',
  CYCLING:  'Ciclismo',
  SWIMMING: 'Natacion',
  OTHER:    'Otro',
  // slugs (lowercase) for Discipline model compatibility
  running:  'Running',
  strength: 'Fuerza',
  cycling:  'Ciclismo',
  swimming: 'Natacion',
  other:    'Otro',
}

export const ROLE_LABEL: Record<string, string> = {
  ATHLETE: 'Atleta',
  COACH:   'Coach',
  ADMIN:   'Admin',
}

/** Devuelve el label legible o el valor raw si no está mapeado */
export function label<T extends string>(map: Record<string, string>, value: T | null | undefined): string {
  if (!value) return '—'
  return map[value] ?? value
}
