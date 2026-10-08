import { describe, it, expect } from 'vitest'
import { selectActivePlan } from './active_plan'

// ── Helper ──────────────────────────────────────────────────────────────────

function makePlan(id: string, logs: boolean[]) {
  return {
    id,
    weeks: [{
      sessions: logs.map((hasLog) => ({ log: hasLog ? { id: 'log-1' } : null })),
    }],
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('selectActivePlan', () => {
  it('devuelve null cuando la lista esta vacia', () => {
    const result = selectActivePlan([])
    expect(result.winner).toBeNull()
    expect(result.loserIds).toEqual([])
  })

  it('devuelve el unico plan cuando hay exactamente uno', () => {
    const plan = makePlan('p1', [true, false])
    const result = selectActivePlan([plan])
    expect(result.winner).toBe(plan)
    expect(result.loserIds).toEqual([])
  })

  it('selecciona el plan con mas logs completados', () => {
    const planA = makePlan('pA', [true, false])       // 1 log
    const planB = makePlan('pB', [true, true, true])   // 3 logs
    const planC = makePlan('pC', [true, true])          // 2 logs

    const result = selectActivePlan([planA, planB, planC])
    expect(result.winner!.id).toBe('pB')
    expect(result.loserIds).toEqual(expect.arrayContaining(['pA', 'pC']))
    expect(result.loserIds).toHaveLength(2)
  })

  it('selecciona el primero cuando hay empate en logs', () => {
    const planA = makePlan('pA', [true])
    const planB = makePlan('pB', [true])

    const result = selectActivePlan([planA, planB])
    expect(result.winner!.id).toBe('pA')
    expect(result.loserIds).toEqual(['pB'])
  })

  it('selecciona plan sin logs (0) si todos tienen 0 logs', () => {
    const planA = makePlan('pA', [false, false])
    const planB = makePlan('pB', [false])

    const result = selectActivePlan([planA, planB])
    expect(result.winner!.id).toBe('pA')
    expect(result.loserIds).toEqual(['pB'])
  })

  it('maneja plan con multiples weeks', () => {
    const planA = {
      id: 'pA',
      weeks: [
        { sessions: [{ log: { id: 'l1' } }, { log: null }] },
        { sessions: [{ log: { id: 'l2' } }] },
      ],
    }
    const planB = makePlan('pB', [true])

    const result = selectActivePlan([planA, planB])
    expect(result.winner!.id).toBe('pA') // 2 logs vs 1
    expect(result.loserIds).toEqual(['pB'])
  })
})
