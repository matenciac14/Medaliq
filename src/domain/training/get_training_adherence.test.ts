import { describe, it, expect } from 'vitest'
import { calculateTrainingAdherence, type AdherenceInput } from './get_training_adherence'

function makeInput(overrides: Partial<AdherenceInput> = {}): AdherenceInput {
  return {
    planSessions: [],
    gymRoutine: null,
    gymSessionsDone: { count: 0 },
    ...overrides,
  }
}

describe('calculateTrainingAdherence', () => {
  it('retorna 0% sin sesiones esperadas', () => {
    const result = calculateTrainingAdherence(makeInput())
    expect(result.totalAdherence).toBe(0)
    expect(result.completed).toBe(0)
    expect(result.expected).toBe(0)
  })

  it('calcula adherencia solo de plan (running)', () => {
    const result = calculateTrainingAdherence(makeInput({
      planSessions: [
        { type: 'RODAJE_Z2', log: { id: '1' } },
        { type: 'TEMPO', log: { id: '2' } },
        { type: 'INTERVALOS', log: null },
        { type: 'RODAJE_Z2', log: null },
      ],
    }))
    expect(result.totalAdherence).toBe(50)
    expect(result.byDiscipline.running).toEqual({ completed: 2, expected: 4, pct: 50 })
    expect(result.byDiscipline.gym).toEqual({ completed: 0, expected: 0, pct: 0 })
  })

  it('cuenta FUERZA del plan como gym, no running', () => {
    const result = calculateTrainingAdherence(makeInput({
      planSessions: [
        { type: 'RODAJE_Z2', log: { id: '1' } },
        { type: 'FUERZA', log: { id: '2' } },
        { type: 'FUERZA', log: null },
      ],
    }))
    expect(result.byDiscipline.running).toEqual({ completed: 1, expected: 1, pct: 100 })
    expect(result.byDiscipline.gym).toEqual({ completed: 1, expected: 2, pct: 50 })
    expect(result.totalAdherence).toBe(67) // 2/3
  })

  it('calcula adherencia de rutina gym (sin plan)', () => {
    const result = calculateTrainingAdherence(makeInput({
      gymRoutine: { daysPerWeek: 3, weeksActive: 4 },
      gymSessionsDone: { count: 10 },
    }))
    // expected: 3*4=12, completed: min(10,12)=10
    expect(result.byDiscipline.gym).toEqual({ completed: 10, expected: 12, pct: 83 })
    expect(result.totalAdherence).toBe(83)
  })

  it('combina plan + rutina gym', () => {
    const result = calculateTrainingAdherence(makeInput({
      planSessions: [
        { type: 'RODAJE_Z2', log: { id: '1' } },
        { type: 'TEMPO', log: { id: '2' } },
        { type: 'RODAJE_Z2', log: null },
      ],
      gymRoutine: { daysPerWeek: 2, weeksActive: 2 },
      gymSessionsDone: { count: 3 },
    }))
    // Running: 2/3, Gym routine: 3/4
    // Total: 5/7 = 71%
    expect(result.completed).toBe(5)
    expect(result.expected).toBe(7)
    expect(result.totalAdherence).toBe(71)
  })

  it('no cuenta gym sessions doble si ya estan en plan FUERZA', () => {
    const result = calculateTrainingAdherence(makeInput({
      planSessions: [
        { type: 'FUERZA', log: { id: '1' } },
        { type: 'FUERZA', log: { id: '2' } },
      ],
      gymRoutine: { daysPerWeek: 2, weeksActive: 1 },
      gymSessionsDone: { count: 3 },
    }))
    // Plan gym: 2 completed, 2 expected
    // Routine gym: expected=2, done=3 total - 2 plan = 1 routine
    // Total gym: 3 completed, 4 expected
    expect(result.byDiscipline.gym).toEqual({ completed: 3, expected: 4, pct: 75 })
  })

  it('cap gym routine completed al expected (no >100%)', () => {
    const result = calculateTrainingAdherence(makeInput({
      gymRoutine: { daysPerWeek: 2, weeksActive: 1 },
      gymSessionsDone: { count: 5 }, // mas de lo esperado
    }))
    expect(result.byDiscipline.gym.completed).toBe(2) // capped at expected
    expect(result.byDiscipline.gym.pct).toBe(100)
  })

  it('maneja weeksActive=0 sin error', () => {
    const result = calculateTrainingAdherence(makeInput({
      gymRoutine: { daysPerWeek: 3, weeksActive: 0 },
      gymSessionsDone: { count: 5 },
    }))
    expect(result.byDiscipline.gym).toEqual({ completed: 0, expected: 0, pct: 0 })
  })
})
