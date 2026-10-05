import { describe, it, expect } from 'vitest'
import { requireFeature } from './feature_gate'
import type { UserConfig } from '@/lib/config/user_config'

type Features = UserConfig['features']

const ALL_ON: Features = {
  plan: true, checkin: true, nutrition: true,
  progress: true, log: true, coach: false, gym: true,
}

const ALL_OFF: Features = {
  plan: false, checkin: false, nutrition: false,
  progress: false, log: false, coach: false, gym: false,
}

describe('requireFeature', () => {
  it('feature activa → retorna null (acceso permitido)', () => {
    expect(requireFeature(ALL_ON, 'plan')).toBeNull()
    expect(requireFeature(ALL_ON, 'nutrition')).toBeNull()
    expect(requireFeature(ALL_ON, 'gym')).toBeNull()
  })

  it('feature inactiva → retorna NextResponse 402', () => {
    const res = requireFeature(ALL_OFF, 'plan')
    expect(res).not.toBeNull()
    expect(res!.status).toBe(402)
  })

  it('respuesta 402 incluye upgrade URL relativa', async () => {
    const res = requireFeature(ALL_OFF, 'progress')
    const body = await res!.json()
    expect(body.upgrade).toBe('/upgrade')
    expect(body.error).toContain('no disponible')
  })

  it('features undefined → retorna 402', () => {
    const res = requireFeature(undefined, 'plan')
    expect(res).not.toBeNull()
    expect(res!.status).toBe(402)
  })

  it('funciona con todas las feature keys', () => {
    const keys: (keyof Features)[] = ['plan', 'checkin', 'nutrition', 'progress', 'log', 'coach', 'gym']
    for (const key of keys) {
      // ALL_OFF → siempre 402
      expect(requireFeature(ALL_OFF, key)?.status).toBe(402)
    }
  })
})
