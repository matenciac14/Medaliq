import { describe, it, expect } from 'vitest'
import {
  estimateHRMax,
  calculateHRZones,
  calculateTDEE,
  calculateMacros,
  predictRaceTime,
} from './formulas'

// ---------------------------------------------------------------------------
// estimateHRMax
// ---------------------------------------------------------------------------
describe('estimateHRMax', () => {
  it('aplica 211 - 0.64 × edad', () => {
    expect(estimateHRMax(30)).toBe(192) // 211 - 19.2 = 191.8 → 192
    expect(estimateHRMax(20)).toBe(198) // 211 - 12.8 = 198.2 → 198
    expect(estimateHRMax(50)).toBe(179) // 211 - 32 = 179
    expect(estimateHRMax(40)).toBe(185) // 211 - 25.6 = 185.4 → 185
  })

  it('decrece con la edad', () => {
    expect(estimateHRMax(20)).toBeGreaterThan(estimateHRMax(30))
    expect(estimateHRMax(30)).toBeGreaterThan(estimateHRMax(50))
  })
})

// ---------------------------------------------------------------------------
// calculateHRZones
// ---------------------------------------------------------------------------
describe('calculateHRZones', () => {
  it('usa Karvonen cuando hrResting > 0', () => {
    const zones = calculateHRZones(190, 60)
    // reserve = 130
    // z1: 60 + 130×0.60 = 138  →  60 + 130×0.70 = 151
    expect(zones.z1).toEqual({ min: 138, max: 151 })
    // z5.max siempre = hrMax
    expect(zones.z5.max).toBe(190)
  })

  it('usa porcentaje simple cuando hrResting === 0', () => {
    const zones = calculateHRZones(200, 0)
    expect(zones.z1).toEqual({ min: 120, max: 140 })
    expect(zones.z5).toEqual({ min: 180, max: 200 })
  })

  it('usa porcentaje simple por defecto (sin hrResting)', () => {
    const zones = calculateHRZones(200)
    expect(zones.z1.min).toBe(120)
    expect(zones.z5.max).toBe(200)
  })

  it('z5.max siempre iguala hrMax exacto', () => {
    expect(calculateHRZones(185, 55).z5.max).toBe(185)
    expect(calculateHRZones(175).z5.max).toBe(175)
  })

  it('zonas son contiguas (max z_n = min z_{n+1})', () => {
    const z = calculateHRZones(190, 60)
    expect(z.z1.max).toBe(z.z2.min)
    expect(z.z2.max).toBe(z.z3.min)
    expect(z.z3.max).toBe(z.z4.min)
    expect(z.z4.max).toBe(z.z5.min)
  })

  it('zonas son contiguas con porcentaje simple', () => {
    const z = calculateHRZones(200)
    expect(z.z1.max).toBe(z.z2.min)
    expect(z.z4.max).toBe(z.z5.min)
  })
})

// ---------------------------------------------------------------------------
// calculateTDEE
// ---------------------------------------------------------------------------
describe('calculateTDEE', () => {
  it('hombre 70kg / 175cm / 30a / 4 días → 2556 kcal', () => {
    // BMR = 10×70 + 6.25×175 - 5×30 + 5 = 1648.75 · factor 1.55 = 2555.56 → 2556
    expect(calculateTDEE(70, 175, 30, 'male', 4)).toBe(2556)
  })

  it('mujer 60kg / 165cm / 25a / 3 días → 1850 kcal', () => {
    // BMR = 10×60 + 6.25×165 - 5×25 - 161 = 1345.25 · factor 1.375 = 1849.72 → 1850
    expect(calculateTDEE(60, 165, 25, 'female', 3)).toBe(1850)
  })

  it('más días de entrenamiento → mayor TDEE', () => {
    const base = calculateTDEE(70, 175, 30, 'male', 4)
    expect(calculateTDEE(70, 175, 30, 'male', 3)).toBeLessThan(base)
    expect(calculateTDEE(70, 175, 30, 'male', 5)).toBeGreaterThan(base)
    expect(calculateTDEE(70, 175, 30, 'male', 6)).toBeGreaterThan(
      calculateTDEE(70, 175, 30, 'male', 5)
    )
  })

  it('mujer siempre < hombre con mismos parámetros', () => {
    const male = calculateTDEE(70, 175, 30, 'male', 4)
    const female = calculateTDEE(70, 175, 30, 'female', 4)
    expect(female).toBeLessThan(male)
  })

  // GAP-02: sessionMinutes modifica el factor de actividad por volumen semanal
  describe('con sessionMinutes (GAP-02)', () => {
    // BMR hombre 70/175/30 = 1648.75
    it('4d × 30min = 120 min/sem → factor 1.55 (límite inferior moderado)', () => {
      // 120 min/sem → < 300 → factor 1.55
      expect(calculateTDEE(70, 175, 30, 'male', 4, 30)).toBe(Math.round(1648.75 * 1.55))
    })

    it('4d × 25min = 100 min/sem → factor 1.375 (ligeramente activo)', () => {
      // 100 min/sem → < 120 → factor 1.375
      expect(calculateTDEE(70, 175, 30, 'male', 4, 25)).toBe(Math.round(1648.75 * 1.375))
    })

    it('4d × 90min = 360 min/sem → factor 1.725 (muy activo)', () => {
      // 360 min/sem → 300–600 → factor 1.725
      expect(calculateTDEE(70, 175, 30, 'male', 4, 90)).toBe(Math.round(1648.75 * 1.725))
    })

    it('5d × 130min = 650 min/sem → factor 1.9 (extremadamente activo)', () => {
      // 650 min/sem → > 600 → factor 1.9
      expect(calculateTDEE(70, 175, 30, 'male', 5, 130)).toBe(Math.round(1648.75 * 1.9))
    })

    it('sessionMinutes=null → comportamiento sin sessionMinutes (compat. hacia atrás)', () => {
      expect(calculateTDEE(70, 175, 30, 'male', 4, null)).toBe(calculateTDEE(70, 175, 30, 'male', 4))
    })

    it('4d × 90min (muy activo) > 4d sin sessionMinutes (moderado)', () => {
      const withMinutes = calculateTDEE(70, 175, 30, 'male', 4, 90)
      const withoutMinutes = calculateTDEE(70, 175, 30, 'male', 4)
      expect(withMinutes).toBeGreaterThan(withoutMinutes)
    })
  })
})

// ---------------------------------------------------------------------------
// calculateMacros
// ---------------------------------------------------------------------------
describe('calculateMacros', () => {
  it('proteína siempre es 2g/kg en todos los días', () => {
    const m = calculateMacros(2500, 75, false)
    expect(m.hard.protein).toBe(150)
    expect(m.easy.protein).toBe(150)
    expect(m.rest.protein).toBe(150)
  })

  it('kcal: hard > easy > rest', () => {
    const m = calculateMacros(2500, 70, false)
    expect(m.hard.kcal).toBeGreaterThan(m.easy.kcal)
    expect(m.easy.kcal).toBeGreaterThan(m.rest.kcal)
  })

  it('carbos: hard > easy > rest', () => {
    const m = calculateMacros(2500, 70, false)
    expect(m.hard.carbs).toBeGreaterThan(m.easy.carbs)
    expect(m.easy.carbs).toBeGreaterThan(m.rest.carbs)
  })

  it('aplica déficit cuando hasWeightGoal = true (kcal con déficit < kcal sin déficit)', () => {
    const sin = calculateMacros(2500, 70, false)
    const con = calculateMacros(2500, 70, true)
    expect(con.hard.kcal).toBeLessThan(sin.hard.kcal)
    expect(con.easy.kcal).toBeLessThan(sin.easy.kcal)
    expect(con.rest.kcal).toBeLessThan(sin.rest.kcal)
  })

  it('mínimo seguro ~1200 kcal aunque tdee sea muy bajo (±5 por redondeo de macros)', () => {
    const m = calculateMacros(800, 40, true)
    // El floor es 1200 pero kcal se recalcula desde macros redondeados → puede variar ±5
    expect(m.hard.kcal).toBeGreaterThanOrEqual(1195)
    expect(m.easy.kcal).toBeGreaterThanOrEqual(1195)
    expect(m.rest.kcal).toBeGreaterThanOrEqual(1195)
  })

  it('grasa nunca es negativa', () => {
    const m = calculateMacros(1500, 80, true)
    expect(m.hard.fat).toBeGreaterThan(0)
    expect(m.easy.fat).toBeGreaterThan(0)
    expect(m.rest.fat).toBeGreaterThan(0)
  })

  it('invariante: protein*4 + carbs*4 + fat*9 === kcal reportado (todos los días)', () => {
    const m = calculateMacros(2500, 75, false)
    for (const dayType of ['hard', 'easy', 'rest'] as const) {
      const day = m[dayType]
      const sum = day.protein * 4 + day.carbs * 4 + day.fat * 9
      expect(sum).toBe(day.kcal)
    }
  })

  it('invariante de macros se mantiene con déficit y atleta pesado (fat floor activo)', () => {
    const m = calculateMacros(2000, 100, true)
    for (const dayType of ['hard', 'easy', 'rest'] as const) {
      const day = m[dayType]
      const sum = day.protein * 4 + day.carbs * 4 + day.fat * 9
      expect(sum).toBe(day.kcal)
    }
  })

  it('invariante de macros se mantiene con atleta liviano', () => {
    const m = calculateMacros(1800, 50, false)
    for (const dayType of ['hard', 'easy', 'rest'] as const) {
      const day = m[dayType]
      const sum = day.protein * 4 + day.carbs * 4 + day.fat * 9
      expect(sum).toBe(day.kcal)
    }
  })

  it('grasa mínima es 0.5g/kg incluso con TDEE bajo', () => {
    const m = calculateMacros(1200, 80, false)
    const minFat = Math.round(80 * 0.5) // 40g
    expect(m.hard.fat).toBeGreaterThanOrEqual(minFat)
    expect(m.easy.fat).toBeGreaterThanOrEqual(minFat)
    expect(m.rest.fat).toBeGreaterThanOrEqual(minFat)
  })
})

// ---------------------------------------------------------------------------
// predictRaceTime
// ---------------------------------------------------------------------------
describe('predictRaceTime', () => {
  it('devuelve null sin tiempos de referencia', () => {
    expect(predictRaceTime(null, null, 70, 21.1)).toBeNull()
  })

  it('predice tiempo de maratón desde 10K', () => {
    // 10K en 50min (3000s) → maratón > 3h = 10800s
    const result = predictRaceTime(null, 3000, 70, 42.195)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(10000)
  })

  it('predice tiempo usando solo 5K', () => {
    const result = predictRaceTime(1200, null, 65, 10)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(1200) // 10K siempre > 5K en tiempo
  })

  it('para distancias ≥10K prefiere 10K sobre 5K como referencia', () => {
    const con10k = predictRaceTime(1200, 2600, 70, 21.1)
    const solo5k = predictRaceTime(1200, null, 70, 21.1)
    expect(con10k).not.toEqual(solo5k)
  })

  it('atletas >80kg son ligeramente más lentos que <80kg', () => {
    const ligero = predictRaceTime(null, 2400, 75, 21.1)
    const pesado = predictRaceTime(null, 2400, 85, 21.1)
    expect(pesado!).toBeGreaterThan(ligero!)
  })

  it('la predicción escala con la distancia (más lejos = más tiempo)', () => {
    const t5k = predictRaceTime(1200, null, 70, 5)
    const t10k = predictRaceTime(1200, null, 70, 10)
    const t21k = predictRaceTime(1200, null, 70, 21.1)
    expect(t10k!).toBeGreaterThan(t5k!)
    expect(t21k!).toBeGreaterThan(t10k!)
  })
})
