/**
 * E2E agent: Date utilities
 *
 * Estas funciones son la base de la navegación semanal de ATLETA y COACH.
 * jsToOurDow se usa en getDashboardSummary para encontrar la sesión de hoy.
 * buildWeekDateNumbers se usa en PlanBuilderClient y en el weekly strip del atleta.
 * Un error aquí hace que el atleta vea la sesión incorrecta como "sesión de hoy".
 *
 * Convención DB vs JS:
 *   JS getDay():   0=Dom  1=Lun  2=Mar  3=Mié  4=Jue  5=Vie  6=Sáb
 *   Nuestro schema: 1=Lun  2=Mar  3=Mié  4=Jue  5=Vie  6=Sáb  7=Dom
 *
 * Cómo correr:
 *   pnpm test src/lib/core/date_utils.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  jsToOurDow,
  jsToWeekIdx,
  formatWeekRange,
  buildWeekDateNumbers,
  todayInTz,
  forceMonday,
  MONTHS,
} from './date_utils'

// ── jsToOurDow — conversión JS → schema ──────────────────────────────────────

describe('jsToOurDow', () => {
  it('Lunes (JS=1) → 1', () => expect(jsToOurDow(1)).toBe(1))
  it('Martes (JS=2) → 2', () => expect(jsToOurDow(2)).toBe(2))
  it('Miércoles (JS=3) → 3', () => expect(jsToOurDow(3)).toBe(3))
  it('Jueves (JS=4) → 4', () => expect(jsToOurDow(4)).toBe(4))
  it('Viernes (JS=5) → 5', () => expect(jsToOurDow(5)).toBe(5))
  it('Sábado (JS=6) → 6', () => expect(jsToOurDow(6)).toBe(6))
  it('Domingo (JS=0) → 7 (caso especial — única conversión no trivial)', () => {
    expect(jsToOurDow(0)).toBe(7)
  })

  it('todos los días JS [0-6] mapean a valores en [1-7]', () => {
    for (let jsDay = 0; jsDay <= 6; jsDay++) {
      const ourDow = jsToOurDow(jsDay)
      expect(ourDow).toBeGreaterThanOrEqual(1)
      expect(ourDow).toBeLessThanOrEqual(7)
    }
  })

  it('resultado es biyectivo — cada JS day produce un our dow único', () => {
    const results = new Set([0, 1, 2, 3, 4, 5, 6].map(jsToOurDow))
    expect(results.size).toBe(7) // 7 valores distintos
  })
})

// ── jsToWeekIdx — conversión JS → índice 0-based Mon-first ───────────────────

describe('jsToWeekIdx', () => {
  it('Lunes (JS=1) → índice 0', () => expect(jsToWeekIdx(1)).toBe(0))
  it('Martes (JS=2) → índice 1', () => expect(jsToWeekIdx(2)).toBe(1))
  it('Miércoles (JS=3) → índice 2', () => expect(jsToWeekIdx(3)).toBe(2))
  it('Jueves (JS=4) → índice 3', () => expect(jsToWeekIdx(4)).toBe(3))
  it('Viernes (JS=5) → índice 4', () => expect(jsToWeekIdx(5)).toBe(4))
  it('Sábado (JS=6) → índice 5', () => expect(jsToWeekIdx(6)).toBe(5))
  it('Domingo (JS=0) → índice 6 (último día de la semana)', () => {
    expect(jsToWeekIdx(0)).toBe(6)
  })

  it('todos los índices están en [0-6]', () => {
    for (let jsDay = 0; jsDay <= 6; jsDay++) {
      const idx = jsToWeekIdx(jsDay)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThanOrEqual(6)
    }
  })

  it('jsToOurDow y jsToWeekIdx son consistentes: ourDow - 1 === weekIdx para Lun-Sáb', () => {
    for (let jsDay = 1; jsDay <= 6; jsDay++) {
      expect(jsToOurDow(jsDay) - 1).toBe(jsToWeekIdx(jsDay))
    }
  })

  it('weekSessions[jsToWeekIdx(jsDay)] alinea con sessionDayOfWeek=jsToOurDow(jsDay)', () => {
    // Esta es la invariante crítica del dashboard: el índice en el array weekSessions
    // corresponde a dayOfWeek en la sesión del plan.
    // weekSessions[idx] ↔ session.dayOfWeek === idx + 1
    for (let jsDay = 0; jsDay <= 6; jsDay++) {
      const ourDow = jsToOurDow(jsDay)
      const idx = jsToWeekIdx(jsDay)
      // Para DOM: ourDow=7, idx=6 → 6 === 7-1 ✓
      if (jsDay !== 0) {
        expect(ourDow - 1).toBe(idx)
      } else {
        expect(idx).toBe(6)  // domingo: índice 6
        expect(ourDow).toBe(7) // domingo: dow 7
      }
    }
  })
})

// ── formatWeekRange — formato visual para coach y atleta ─────────────────────

describe('formatWeekRange — misma semana (mismo mes)', () => {
  it('lunes 7 jul → "7–13 jul"', () => {
    const monday = new Date(2026, 6, 7) // 7 julio 2026 (lunes)
    expect(formatWeekRange(monday)).toBe('7–13 jul')
  })

  it('lunes 1 jun → "1–7 jun"', () => {
    const monday = new Date(2026, 5, 1) // 1 junio 2026
    expect(formatWeekRange(monday)).toBe('1–7 jun')
  })

  it('lunes 16 mar → "16–22 mar"', () => {
    const monday = new Date(2026, 2, 16)
    expect(formatWeekRange(monday)).toBe('16–22 mar')
  })
})

describe('formatWeekRange — semana que cruza mes', () => {
  it('lunes 28 jul → "28 jul – 3 ago"', () => {
    const monday = new Date(2026, 6, 28)
    expect(formatWeekRange(monday)).toBe('28 jul – 3 ago')
  })

  it('lunes 30 jun → "30 jun – 6 jul"', () => {
    const monday = new Date(2026, 5, 30)
    expect(formatWeekRange(monday)).toBe('30 jun – 6 jul')
  })

  it('lunes 28 dic → "28 dic – 3 ene"', () => {
    const monday = new Date(2026, 11, 28)
    expect(formatWeekRange(monday)).toBe('28 dic – 3 ene')
  })
})

describe('formatWeekRange — invariantes', () => {
  it('siempre retorna string no vacío', () => {
    const monday = new Date(2026, 0, 5)
    expect(formatWeekRange(monday)).toBeTruthy()
  })

  it('los 12 meses usan las abreviaciones en español', () => {
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    expect(MONTHS).toEqual(months)
  })
})

// ── buildWeekDateNumbers ──────────────────────────────────────────────────────

describe('buildWeekDateNumbers', () => {
  it('lunes 7 jul: dow 1=7, 2=8, ... 7=13', () => {
    const monday = new Date(2026, 6, 7) // lunes 7 julio
    const dates = buildWeekDateNumbers(monday)
    expect(dates[1]).toBe(7)  // Lun
    expect(dates[2]).toBe(8)  // Mar
    expect(dates[3]).toBe(9)  // Mié
    expect(dates[4]).toBe(10) // Jue
    expect(dates[5]).toBe(11) // Vie
    expect(dates[6]).toBe(12) // Sáb
    expect(dates[7]).toBe(13) // Dom
  })

  it('genera exactamente 7 entradas (dow 1–7)', () => {
    const dates = buildWeekDateNumbers(new Date(2026, 0, 5))
    expect(Object.keys(dates)).toHaveLength(7)
    for (let dow = 1; dow <= 7; dow++) {
      expect(dates).toHaveProperty(String(dow))
    }
  })

  it('semana que cruza mes: dow 7 tiene fecha del mes siguiente', () => {
    const monday = new Date(2026, 6, 28) // lunes 28 jul
    const dates = buildWeekDateNumbers(monday)
    expect(dates[7]).toBe(3) // domingo 3 agosto
  })

  it('no muta el objeto monday original', () => {
    const monday = new Date(2026, 6, 7)
    const original = monday.getTime()
    buildWeekDateNumbers(monday)
    expect(monday.getTime()).toBe(original)
  })

  it('dow 1 siempre coincide con el día del lunes pasado como input', () => {
    const monday = new Date(2026, 3, 6) // lunes 6 abril
    expect(buildWeekDateNumbers(monday)[1]).toBe(6)
  })
})

// ── todayInTz — resolución de "hoy" en timezone del usuario ─────────────────

describe('todayInTz', () => {
  it('sin timezone (null) usa UTC como default', () => {
    const result = todayInTz(null)
    // Debe ser medianoche UTC de hoy
    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCMinutes()).toBe(0)
    expect(result.getUTCSeconds()).toBe(0)
    expect(result.getUTCMilliseconds()).toBe(0)
  })

  it('sin timezone (undefined) usa UTC como default', () => {
    const result = todayInTz(undefined)
    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCMinutes()).toBe(0)
  })

  it('con timezone válido retorna medianoche UTC del día local', () => {
    const result = todayInTz('America/Bogota')
    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCMinutes()).toBe(0)
    expect(result.getUTCSeconds()).toBe(0)
  })

  it('retorna un Date válido para cualquier IANA timezone', () => {
    const zones = ['America/Bogota', 'America/Mexico_City', 'Europe/Madrid', 'Asia/Tokyo', 'UTC']
    for (const tz of zones) {
      const result = todayInTz(tz)
      expect(result).toBeInstanceOf(Date)
      expect(isNaN(result.getTime())).toBe(false)
    }
  })

  it('dos llamadas con la misma timezone retornan la misma fecha', () => {
    const a = todayInTz('America/Bogota')
    const b = todayInTz('America/Bogota')
    expect(a.toISOString()).toBe(b.toISOString())
  })
})

// ── forceMonday — alinear fechas de plan al lunes ───────────────────────────

describe('forceMonday', () => {
  it('lunes se queda igual', () => {
    const mon = new Date('2026-09-07T00:00:00.000Z') // lunes
    const result = forceMonday(mon)
    expect(result.getUTCDay()).toBe(1)
    expect(result.toISOString()).toBe('2026-09-07T00:00:00.000Z')
  })

  it('martes avanza al próximo lunes (+6 días)', () => {
    const tue = new Date('2026-09-08T00:00:00.000Z') // martes
    const result = forceMonday(tue)
    expect(result.getUTCDay()).toBe(1)
    expect(result.toISOString()).toBe('2026-09-14T00:00:00.000Z')
  })

  it('miércoles avanza al próximo lunes (+5 días)', () => {
    const wed = new Date('2026-09-09T00:00:00.000Z') // miércoles
    const result = forceMonday(wed)
    expect(result.getUTCDay()).toBe(1)
    expect(result.toISOString()).toBe('2026-09-14T00:00:00.000Z')
  })

  it('jueves avanza al próximo lunes (+4 días)', () => {
    const thu = new Date('2026-09-10T00:00:00.000Z') // jueves
    const result = forceMonday(thu)
    expect(result.getUTCDay()).toBe(1)
    expect(result.toISOString()).toBe('2026-09-14T00:00:00.000Z')
  })

  it('viernes avanza al próximo lunes (+3 días)', () => {
    const fri = new Date('2026-09-11T00:00:00.000Z') // viernes
    const result = forceMonday(fri)
    expect(result.getUTCDay()).toBe(1)
    expect(result.toISOString()).toBe('2026-09-14T00:00:00.000Z')
  })

  it('sábado avanza al próximo lunes (+2 días)', () => {
    const sat = new Date('2026-09-12T00:00:00.000Z') // sábado
    const result = forceMonday(sat)
    expect(result.getUTCDay()).toBe(1)
    expect(result.toISOString()).toBe('2026-09-14T00:00:00.000Z')
  })

  it('domingo avanza al día siguiente (+1 día)', () => {
    const sun = new Date('2026-09-13T00:00:00.000Z') // domingo
    const result = forceMonday(sun)
    expect(result.getUTCDay()).toBe(1)
    expect(result.toISOString()).toBe('2026-09-14T00:00:00.000Z')
  })

  it('no muta la fecha original', () => {
    const original = new Date('2026-09-09T00:00:00.000Z') // miércoles
    const originalTime = original.getTime()
    forceMonday(original)
    expect(original.getTime()).toBe(originalTime)
  })

  it('invariante: resultado siempre es lunes (getUTCDay === 1)', () => {
    // Probar todos los días de una semana
    for (let day = 7; day <= 13; day++) {
      const date = new Date(`2026-09-${String(day).padStart(2, '0')}T00:00:00.000Z`)
      const result = forceMonday(date)
      expect(result.getUTCDay()).toBe(1)
    }
  })

  it('cruza mes correctamente (viernes 30 oct → lunes 2 nov)', () => {
    const fri = new Date('2026-10-30T00:00:00.000Z') // viernes
    const result = forceMonday(fri)
    expect(result.getUTCDay()).toBe(1)
    expect(result.getUTCMonth()).toBe(10) // noviembre (0-indexed)
    expect(result.getUTCDate()).toBe(2)
  })

  it('cruza año correctamente (miércoles 30 dic → lunes 4 ene)', () => {
    const wed = new Date('2026-12-30T00:00:00.000Z') // miércoles
    const result = forceMonday(wed)
    expect(result.getUTCDay()).toBe(1)
    expect(result.getUTCFullYear()).toBe(2027)
    expect(result.getUTCMonth()).toBe(0) // enero
    expect(result.getUTCDate()).toBe(4)
  })
})
