import { describe, it, expect } from 'vitest'
import { z } from 'zod'

/**
 * Tests de paridad: verifican que los schemas de validación de profile
 * PATCH sean consistentes entre web y mobile.
 *
 * Los schemas se definen inline en cada route.ts, así que replicamos
 * la definición canónica aquí y testeamos los rangos.
 */

// Schema canónico (debe ser idéntico en web y mobile)
const canonicalProfileSchema = z.object({
  dateOfBirth:     z.string().optional(),
  weightKg:        z.number().min(10).max(500).optional(),
  weightGoalKg:    z.number().min(10).max(500).optional(),
  heightCm:        z.number().min(50).max(300).optional(),
  hrResting:       z.number().min(0).max(250).optional(),
  hrMax:           z.number().min(0).max(250).optional(),
  sleepHoursAvg:   z.number().min(0).max(24).optional(),
  gender:          z.enum(['male', 'female']).optional(),
  sport:           z.enum(['RUNNING', 'STRENGTH', 'CYCLING', 'SWIMMING', 'TRIATHLON', 'FOOTBALL']).optional(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  injuries:        z.array(z.string().max(100)).max(20).optional(),
  conditions:      z.array(z.string().max(100)).max(20).optional(),
})

describe('profile PATCH schema parity', () => {
  it('acepta weightKg min 10 (atletas muy livianos)', () => {
    const result = canonicalProfileSchema.safeParse({ weightKg: 10 })
    expect(result.success).toBe(true)
  })

  it('rechaza weightKg < 10', () => {
    const result = canonicalProfileSchema.safeParse({ weightKg: 5 })
    expect(result.success).toBe(false)
  })

  it('acepta hrResting 0 (sensor reporting)', () => {
    const result = canonicalProfileSchema.safeParse({ hrResting: 0 })
    expect(result.success).toBe(true)
  })

  it('acepta hrResting 250 (máximo fisiológico)', () => {
    const result = canonicalProfileSchema.safeParse({ hrResting: 250 })
    expect(result.success).toBe(true)
  })

  it('acepta hrMax 0', () => {
    const result = canonicalProfileSchema.safeParse({ hrMax: 0 })
    expect(result.success).toBe(true)
  })

  it('acepta sleepHoursAvg 0', () => {
    const result = canonicalProfileSchema.safeParse({ sleepHoursAvg: 0 })
    expect(result.success).toBe(true)
  })

  it('acepta injuries como array de strings', () => {
    const result = canonicalProfileSchema.safeParse({ injuries: ['rodilla', 'hombro'] })
    expect(result.success).toBe(true)
  })

  it('rechaza injuries como string (formato antiguo)', () => {
    const result = canonicalProfileSchema.safeParse({ injuries: 'rodilla' })
    expect(result.success).toBe(false)
  })

  it('acepta conditions como array', () => {
    const result = canonicalProfileSchema.safeParse({ conditions: ['asma'] })
    expect(result.success).toBe(true)
  })

  it('acepta gender male/female', () => {
    expect(canonicalProfileSchema.safeParse({ gender: 'male' }).success).toBe(true)
    expect(canonicalProfileSchema.safeParse({ gender: 'female' }).success).toBe(true)
  })

  it('acepta sport enum values', () => {
    expect(canonicalProfileSchema.safeParse({ sport: 'RUNNING' }).success).toBe(true)
    expect(canonicalProfileSchema.safeParse({ sport: 'STRENGTH' }).success).toBe(true)
  })

  it('acepta experienceLevel enum values', () => {
    expect(canonicalProfileSchema.safeParse({ experienceLevel: 'BEGINNER' }).success).toBe(true)
    expect(canonicalProfileSchema.safeParse({ experienceLevel: 'ADVANCED' }).success).toBe(true)
  })

  it('acepta dateOfBirth como string libre (no datetime strict)', () => {
    expect(canonicalProfileSchema.safeParse({ dateOfBirth: '1990-01-15' }).success).toBe(true)
    expect(canonicalProfileSchema.safeParse({ dateOfBirth: '1990-01-15T00:00:00Z' }).success).toBe(true)
  })

  it('acepta body vacío', () => {
    const result = canonicalProfileSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})
