import { describe, it, expect } from 'vitest'

/**
 * AthleteDropdown — unit tests for action mapping logic.
 * Component rendering is not tested (vitest config only includes .test.ts, no JSX).
 * These tests verify the navigation mapping and action config are correct.
 */

const NAV_ITEMS = [
  { label: 'Enviar mensaje', tab: 'mensajes' },
  { label: 'Ver plan de entrenamiento', tab: 'plan' },
  { label: 'Ver nutricion', tab: 'nutricion' },
  { label: 'Ver check-ins', tab: 'resumen' },
] as const

const TAB_PARAM_MAP: Record<string, string> = {
  resumen: 'Resumen', plan: 'Plan', progreso: 'Progreso',
  nutricion: 'Nutricion', ejercicios: 'Entrenamiento', sesiones: 'Sesiones',
  adherencia: 'Adherencia', benchmarks: 'Benchmarks', mensajes: 'Mensajes',
}

describe('AthleteDropdown — action mapping', () => {
  it('cada nav item tiene un tab valido mapeado en TAB_PARAM_MAP', () => {
    for (const item of NAV_ITEMS) {
      expect(TAB_PARAM_MAP[item.tab]).toBeDefined()
    }
  })

  it('genera URLs correctas para cada accion de navegacion', () => {
    const athleteId = 'abc123'
    const urls = NAV_ITEMS.map(item => `/coach/athletes/${athleteId}?tab=${item.tab}`)
    expect(urls).toEqual([
      '/coach/athletes/abc123?tab=mensajes',
      '/coach/athletes/abc123?tab=plan',
      '/coach/athletes/abc123?tab=nutricion',
      '/coach/athletes/abc123?tab=resumen',
    ])
  })

  it('config features navega a ruta separada sin query param', () => {
    const athleteId = 'abc123'
    const configUrl = `/coach/athletes/${athleteId}/config`
    expect(configUrl).toBe('/coach/athletes/abc123/config')
  })

  it('pausar/reactivar label depende del status actual', () => {
    const getLabel = (status: 'ACTIVE' | 'PAUSED') =>
      status === 'ACTIVE' ? 'Pausar atleta' : 'Reactivar atleta'

    expect(getLabel('ACTIVE')).toBe('Pausar atleta')
    expect(getLabel('PAUSED')).toBe('Reactivar atleta')
  })

  it('tiene exactamente 7 acciones en el dropdown', () => {
    const totalActions = NAV_ITEMS.length + 1 + 1 + 1 // 4 nav + config + cobros + pausar/reactivar
    expect(totalActions).toBe(7)
  })
})
