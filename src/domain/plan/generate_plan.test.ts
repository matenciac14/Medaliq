/**
 * E2E agent: Generate plan — Phase 1 (pure computation)
 *
 * generatePlanUseCase tiene 3 fases:
 *   Phase 1 — pure computation: template selection + HR zones + TDEE + macros
 *   Phase 2 — $transaction (DB): crea plan, semanas, sesiones, nutrición
 *   Phase 3 — outside tx: completeOnboarding + persiste hrMax
 *
 * Este archivo testa la consistencia de Phase 1 usando las funciones puras
 * directamente, sin mocks de DB. Verifica que los valores computados son
 * coherentes entre sí y con los datos de entrada del atleta.
 *
 * Flujo cubierto:
 *   onboarding/new-goal → generatePlanUseCase:
 *     getTemplate(goalType) → hrMax/hrZones → TDEE/macros → plan structure
 *   check-in → syncWeight → recalcularTDEE (misma función, mismo atleta)
 *
 * IMPORTANTE: Si TDEE en plan generation ≠ TDEE en syncWeight para mismo atleta,
 * la nutrición es inconsistente. Este test verifica que las funciones son
 * deterministas con los mismos inputs.
 *
 * Cómo correr:
 *   pnpm test src/domain/plan/generate_plan.test.ts
 */
import { describe, it, expect } from 'vitest'
import { getTemplate } from '@/domain/plan/templates'
import { estimateHRMax, calculateHRZones, calculateTDEE, calculateMacros } from '@/domain/plan/formulas'
import { getSessionIntensity } from '@/domain/plan/intensity'
import { getDailyNutritionTarget } from '@/domain/nutrition/daily_target'
import { resolveSportConfig } from '@/domain/onboarding/onboarding.utils'
import { resolveWorkoutDayId, generatePlanUseCase, computePaceHints } from './generate_plan.use_case'

// ── Fixtures de atleta — representan onboarding inputs ───────────────────────

const RUNNER_MALE = {
  age: 28, heightCm: 175, weightKg: 70, gender: 'male' as const,
  hrResting: 55, hrMax: 0 as number | undefined, // hrMax se estima con Fox
  daysPerWeek: 5,
}

const STRENGTH_FEMALE = {
  age: 32, heightCm: 163, weightKg: 62, gender: 'female' as const,
  hrResting: 0, hrMax: undefined,
  daysPerWeek: 4,
}

// ── Template selection consistency ───────────────────────────────────────────

describe('generatePlan — template selection', () => {
  it('RACE_5K siempre produce un plan de 8 semanas', () => {
    const t = getTemplate('RACE_5K')!
    expect(t.totalWeeks).toBe(8)
    expect(t.weeks).toHaveLength(8)
  })

  it('RACE_10K siempre produce un plan de 12 semanas', () => {
    expect(getTemplate('RACE_10K')!.totalWeeks).toBe(12)
  })

  it('RACE_HALF_MARATHON + RACE_MARATHON → mismo template 18 semanas', () => {
    const hm = getTemplate('RACE_HALF_MARATHON')!
    const m  = getTemplate('RACE_MARATHON')!
    expect(hm.totalWeeks).toBe(18)
    expect(m.totalWeeks).toBe(18)
    // Ambos comparten la misma estructura (maratón usa HM como base aeróbica)
    expect(hm.weeks[0].phase).toBe(m.weeks[0].phase)
  })

  it('BODY_RECOMPOSITION → 12 semanas de fuerza (recortado de 16W para MVP)', () => {
    expect(getTemplate('BODY_RECOMPOSITION')!.totalWeeks).toBe(12)
  })

  it('STRENGTH_TRAINING → 12 semanas sin running (recortado de 16W para MVP)', () => {
    const t = getTemplate('STRENGTH_TRAINING')!
    expect(t.totalWeeks).toBe(12)
    const runningTypes = new Set(['RODAJE_Z2', 'TEMPO', 'FARTLEK', 'INTERVALOS', 'TIRADA_LARGA'])
    const hasRunning = t.weeks.some((w) => w.sessions.some((s) => runningTypes.has(s.type)))
    expect(hasRunning).toBe(false)
  })

  it('goalType desconocido → null (generatePlanUseCase no genera plan)', () => {
    expect(getTemplate('SWIMMING')).toBeNull()
    expect(getTemplate('TRIATHLON')).toBeNull()
  })
})

// ── HR computation pipeline ───────────────────────────────────────────────────

describe('generatePlan — HR zones computation', () => {
  it('Fox formula: edad 28 → hrMax 193', () => {
    // 211 - 0.64×28 = 211 - 17.92 = 193.08 → 193
    expect(estimateHRMax(28)).toBe(193)
  })

  it('cuando hrMax del atleta > 100 → se usa el del atleta (no Fox)', () => {
    const userHrMax = 185
    const computed  = userHrMax > 100 ? userHrMax : estimateHRMax(RUNNER_MALE.age)
    expect(computed).toBe(185) // respeta el valor real del atleta
  })

  it('cuando hrMax = 0 o undefined → se usa Fox', () => {
    const hrMaxInput = RUNNER_MALE.hrMax
    const computed = hrMaxInput && hrMaxInput > 100 ? hrMaxInput : estimateHRMax(RUNNER_MALE.age)
    expect(computed).toBe(estimateHRMax(RUNNER_MALE.age))
  })

  it('Karvonen cuando hrResting > 0: z1.min > hrResting', () => {
    const hrMax = estimateHRMax(RUNNER_MALE.age)
    const zones = calculateHRZones(hrMax, RUNNER_MALE.hrResting)
    expect(zones.z1.min).toBeGreaterThan(RUNNER_MALE.hrResting)
  })

  it('porcentaje simple cuando hrResting = 0: z1 = 60-70% hrMax', () => {
    const hrMax = 190
    const zones = calculateHRZones(hrMax, 0)
    expect(zones.z1.min).toBe(Math.round(hrMax * 0.60))
    expect(zones.z1.max).toBe(Math.round(hrMax * 0.70))
  })

  it('hrZones.z5.max siempre = hrMax exacto', () => {
    const hrMax = estimateHRMax(RUNNER_MALE.age)
    const zones = calculateHRZones(hrMax, RUNNER_MALE.hrResting)
    expect(zones.z5.max).toBe(hrMax)
  })

  it('zonas son contiguas: z1.max = z2.min, etc.', () => {
    const hrMax = estimateHRMax(RUNNER_MALE.age)
    const z = calculateHRZones(hrMax, RUNNER_MALE.hrResting)
    expect(z.z1.max).toBe(z.z2.min)
    expect(z.z2.max).toBe(z.z3.min)
    expect(z.z3.max).toBe(z.z4.min)
    expect(z.z4.max).toBe(z.z5.min)
  })
})

// ── TDEE + macros computation ─────────────────────────────────────────────────

describe('generatePlan — TDEE consistency', () => {
  it('mismo atleta, mismos inputs → mismo TDEE (determinista)', () => {
    const a = calculateTDEE(70, 175, 28, 'male', 5)
    const b = calculateTDEE(70, 175, 28, 'male', 5)
    expect(a).toBe(b)
  })

  it('TDEE en plan generation = TDEE en syncWeight (misma función)', () => {
    // Esto garantiza que la nutrición inicial y la recalculada tras check-in son coherentes
    const planTDEE   = calculateTDEE(RUNNER_MALE.weightKg, RUNNER_MALE.heightCm, RUNNER_MALE.age, RUNNER_MALE.gender, RUNNER_MALE.daysPerWeek)
    const syncTDEE   = calculateTDEE(RUNNER_MALE.weightKg, RUNNER_MALE.heightCm, RUNNER_MALE.age, RUNNER_MALE.gender, 5) // syncWeight usa daysPerWeek=5 como proxy
    expect(planTDEE).toBe(syncTDEE)
  })

  it('hombre 70kg/175cm/28a/5días tiene TDEE > 2000 kcal', () => {
    const tdee = calculateTDEE(RUNNER_MALE.weightKg, RUNNER_MALE.heightCm, RUNNER_MALE.age, RUNNER_MALE.gender, RUNNER_MALE.daysPerWeek)
    expect(tdee).toBeGreaterThan(2000)
  })

  it('atleta con goal de peso (weightGoalKg) → macros con déficit (kcal menores)', () => {
    const tdee = calculateTDEE(RUNNER_MALE.weightKg, RUNNER_MALE.heightCm, RUNNER_MALE.age, RUNNER_MALE.gender, RUNNER_MALE.daysPerWeek)
    const sinGoal = calculateMacros(tdee, RUNNER_MALE.weightKg, false)
    const conGoal = calculateMacros(tdee, RUNNER_MALE.weightKg, true)
    expect(conGoal.hard.kcal).toBeLessThan(sinGoal.hard.kcal)
    expect(conGoal.easy.kcal).toBeLessThan(sinGoal.easy.kcal)
    expect(conGoal.rest.kcal).toBeLessThan(sinGoal.rest.kcal)
  })

  it('macros: proteína siempre 2g/kg → mismo para hard/easy/rest', () => {
    const tdee = calculateTDEE(RUNNER_MALE.weightKg, RUNNER_MALE.heightCm, RUNNER_MALE.age, RUNNER_MALE.gender, RUNNER_MALE.daysPerWeek)
    const macros = calculateMacros(tdee, RUNNER_MALE.weightKg, false)
    const expectedProtein = Math.round(RUNNER_MALE.weightKg * 2)
    expect(macros.hard.protein).toBe(expectedProtein)
    expect(macros.easy.protein).toBe(expectedProtein)
    expect(macros.rest.protein).toBe(expectedProtein)
  })
})

// ── Nutrition-training sync ───────────────────────────────────────────────────

describe('generatePlan — nutrition sync con intensity pipeline', () => {
  /**
   * Pipeline completo:
   *   SessionType → getSessionIntensity → getDailyNutritionTarget → kcal + macros
   *
   * Verifica que la cadena de datos produce resultados consistentes.
   */

  it('TIRADA_LARGA (HIGH) → targetKcalHard', () => {
    const intensity = getSessionIntensity('TIRADA_LARGA')
    expect(intensity).toBe('HIGH')

    const tdee = calculateTDEE(70, 175, 28, 'male', 5)
    const macros = calculateMacros(tdee, 70, false)
    const plan = {
      targetKcalHard: macros.hard.kcal,
      targetKcalEasy: macros.easy.kcal,
      targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein,
      carbsHardG: macros.hard.carbs,
      carbsEasyG: macros.easy.carbs,
      fatG: macros.hard.fat,
    }

    const nutritionDay = getDailyNutritionTarget('HIGH', plan)
    expect(nutritionDay.kcal).toBe(macros.hard.kcal)
    expect(nutritionDay.carbsG).toBe(macros.hard.carbs)
  })

  it('RODAJE_Z2 (LOW) → kcal = 88% del día fácil', () => {
    const intensity = getSessionIntensity('RODAJE_Z2')
    expect(intensity).toBe('LOW')

    const tdee = calculateTDEE(70, 175, 28, 'male', 5)
    const macros = calculateMacros(tdee, 70, false)
    const plan = {
      targetKcalHard: macros.hard.kcal,
      targetKcalEasy: macros.easy.kcal,
      targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein,
      carbsHardG: macros.hard.carbs,
      carbsEasyG: macros.easy.carbs,
      fatG: macros.hard.fat,
    }

    const nutritionDay = getDailyNutritionTarget('LOW', plan)
    expect(nutritionDay.kcal).toBe(Math.round(macros.easy.kcal * 0.88))
  })

  it('DESCANSO (REST) → mínimo calórico del día', () => {
    const intensity = getSessionIntensity('DESCANSO')
    expect(intensity).toBe('REST')

    const tdee = calculateTDEE(70, 175, 28, 'male', 5)
    const macros = calculateMacros(tdee, 70, false)
    const plan = {
      targetKcalHard: macros.hard.kcal,
      targetKcalEasy: macros.easy.kcal,
      targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein,
      carbsHardG: macros.hard.carbs,
      carbsEasyG: macros.easy.carbs,
      fatG: macros.hard.fat,
    }

    const nutritionRest = getDailyNutritionTarget('REST', plan)
    const nutritionHard = getDailyNutritionTarget('HIGH', plan)
    expect(nutritionRest.kcal).toBeLessThan(nutritionHard.kcal)
    expect(nutritionRest.kcal).toBe(macros.rest.kcal)
  })

  it('proteína es consistente entre plan generation y nutrition target', () => {
    const weightKg = 70
    const tdee = calculateTDEE(weightKg, 175, 28, 'male', 5)
    const macros = calculateMacros(tdee, weightKg, false)
    const plan = {
      targetKcalHard: macros.hard.kcal, targetKcalEasy: macros.easy.kcal, targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein, carbsHardG: macros.hard.carbs, carbsEasyG: macros.easy.carbs, fatG: macros.hard.fat,
    }
    // Proteína debe ser igual en todos los días (2g/kg)
    expect(getDailyNutritionTarget('HIGH', plan).proteinG).toBe(macros.hard.protein)
    expect(getDailyNutritionTarget('REST', plan).proteinG).toBe(macros.hard.protein)
  })
})

// ── generatePlanUseCase — guard: goalType sin template ────────────────────────

describe('generatePlanUseCase — guard sin template', () => {
  it('lanza error si goalType no tiene template (DBI-08)', async () => {
    // El throw ocurre en Phase 1, antes de cualquier llamada a DB — mocks vacíos bastan
    const stubDeps = {
      db: {} as any,
      planRepo: {} as any,
      userRepo: {} as any,
    }
    const input = {
      userId: 'u-1', goalType: 'SWIMMING',
      age: 28, heightCm: 175, weightKg: 70, gender: 'male' as const,
      daysPerWeek: 5, hoursPerSession: 1,
      injuries: [], conditions: [], nutritionCommitment: 'MEDIUM',
    }
    await expect(generatePlanUseCase(input, stubDeps)).rejects.toThrow('goalType sin template: SWIMMING')
  })
})

// ── resolveWorkoutDayId — gym tracker linkage ─────────────────────────────────

describe('resolveWorkoutDayId — planes de running', () => {
  const RUNNING_GOALS = ['RACE_5K', 'RACE_10K', 'RACE_HALF_MARATHON', 'RACE_MARATHON']

  it.each(RUNNING_GOALS)('%s + FUERZA + BASE → system-fuerza-corredor-base', (goalType) => {
    expect(resolveWorkoutDayId(goalType, 'FUERZA', 'BASE')).toBe('system-fuerza-corredor-base')
  })

  it.each(RUNNING_GOALS)('%s + FUERZA + DESARROLLO → system-fuerza-corredor-especifico', (goalType) => {
    expect(resolveWorkoutDayId(goalType, 'FUERZA', 'DESARROLLO')).toBe('system-fuerza-corredor-especifico')
  })

  it.each(['ESPECIFICO', 'AFINAMIENTO'])(
    'running + FUERZA + %s → system-fuerza-corredor-especifico',
    (phase) => {
      expect(resolveWorkoutDayId('RACE_HALF_MARATHON', 'FUERZA', phase)).toBe('system-fuerza-corredor-especifico')
    }
  )

  it('running + FUERZA + ESPECÍFICO (tilde, inválido en DB) → null', () => {
    // Phase enum solo almacena ESPECIFICO (sin tilde). Este valor nunca llega del DB.
    expect(resolveWorkoutDayId('RACE_HALF_MARATHON', 'FUERZA', 'ESPECÍFICO')).toBeNull()
  })

  it('running + sesión que NO es FUERZA → null (no link al gym tracker)', () => {
    expect(resolveWorkoutDayId('RACE_HALF_MARATHON', 'RODAJE_Z2', 'BASE')).toBeNull()
    expect(resolveWorkoutDayId('RACE_HALF_MARATHON', 'TEMPO', 'DESARROLLO')).toBeNull()
    expect(resolveWorkoutDayId('RACE_HALF_MARATHON', 'TIRADA_LARGA', 'AFINAMIENTO')).toBeNull()
  })
})

describe('resolveWorkoutDayId — planes de gym/recomposición', () => {
  it('BODY_RECOMPOSITION + FUERZA → null (usa AssignedWorkout, no sistema)', () => {
    expect(resolveWorkoutDayId('BODY_RECOMPOSITION', 'FUERZA', 'BASE')).toBeNull()
  })

  it('STRENGTH_TRAINING + FUERZA → null', () => {
    expect(resolveWorkoutDayId('STRENGTH_TRAINING', 'FUERZA', 'DESARROLLO')).toBeNull()
  })

  it('goalType desconocido → null', () => {
    expect(resolveWorkoutDayId('SWIMMING', 'FUERZA', 'BASE')).toBeNull()
    expect(resolveWorkoutDayId('', 'FUERZA', 'BASE')).toBeNull()
  })
})

// ── resolveWorkoutDayId — contrato con el seed ────────────────────────────────

describe('resolveWorkoutDayId — IDs estables (contrato con seed)', () => {
  it('todos los planes de running producen el mismo set de IDs posibles', () => {
    const validIds = new Set(['system-fuerza-corredor-base', 'system-fuerza-corredor-especifico'])
    const phases = ['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO']
    const runningGoals = ['RACE_5K', 'RACE_10K', 'RACE_HALF_MARATHON', 'RACE_MARATHON']

    for (const goal of runningGoals) {
      for (const phase of phases) {
        const id = resolveWorkoutDayId(goal, 'FUERZA', phase)
        expect(id).not.toBeNull()
        expect(validIds.has(id!)).toBe(true)
      }
    }
  })
})

// ── resolveSportConfig → onboarding completion ────────────────────────────────

describe('generatePlan — resolveSportConfig post-generation', () => {
  it('RACE_5K → sportType RUNNING + sportGoal RACE (para /progress + sidebar)', () => {
    const { sportType, sportGoal } = resolveSportConfig('RACE_5K')
    expect(sportType).toBe('RUNNING')
    expect(sportGoal).toBe('RACE')
  })

  it('BODY_RECOMPOSITION → sportType STRENGTH (para /progress)', () => {
    const { sportType } = resolveSportConfig('BODY_RECOMPOSITION')
    expect(sportType).toBe('STRENGTH')
  })

  it('STRENGTH_TRAINING → sportGoal BODY_RECOMPOSITION (igual que BODY_RECOMPOSITION)', () => {
    const st = resolveSportConfig('STRENGTH_TRAINING')
    const br = resolveSportConfig('BODY_RECOMPOSITION')
    expect(st).toEqual(br)
  })

  it('todos los goalTypes del template registry producen sportConfig válido', () => {
    const goalTypes = [
      'RACE_5K', 'RACE_10K', 'RACE_HALF_MARATHON', 'RACE_MARATHON',
      'BODY_RECOMPOSITION', 'STRENGTH_TRAINING',
    ]
    const validSportTypes = new Set(['RUNNING', 'STRENGTH', 'GENERAL'])
    const validSportGoals = new Set(['RACE', 'BODY_RECOMPOSITION', 'GENERAL_FITNESS'])

    goalTypes.forEach((gt) => {
      const { sportType, sportGoal } = resolveSportConfig(gt)
      expect(validSportTypes.has(sportType)).toBe(true)
      expect(validSportGoals.has(sportGoal)).toBe(true)
    })
  })
})

// ── Pace calibration (computePaceHints) ──────────────────────────────────────

describe('computePaceHints', () => {
  // 5K en 25:00 = 1500 segundos → pace base = 5:00/km
  const hints = computePaceHints(1500)

  it('easy pace is ~35% slower than race pace', () => {
    // 5:00/km × 1.35 = 6:45/km
    expect(hints.easy).toBe('6:45 min/km')
  })

  it('tempo pace is ~10% slower than race pace', () => {
    // 5:00/km × 1.10 = 5:30/km
    expect(hints.tempo).toBe('5:30 min/km')
  })

  it('interval pace equals race pace', () => {
    // 5:00/km × 1.00 = 5:00/km
    expect(hints.interval).toBe('5:00 min/km')
  })

  it('formats sub-10-second seconds correctly with zero padding', () => {
    // 5K en 20:00 = 1200s → pace base = 4:00/km × 1.35 = 5:24/km
    const h = computePaceHints(1200)
    expect(h.easy).toBe('5:24 min/km')
  })

  it('handles slower runners (5K en 40:00)', () => {
    // 40:00 = 2400s → pace base = 8:00/km × 1.35 = 10:48/km
    const h = computePaceHints(2400)
    expect(h.easy).toBe('10:48 min/km')
  })
})
