/**
 * JS getDay() returns 0=Sun, 1=Mon … 6=Sat.
 * Our schema uses dayOfWeek 1=Mon … 7=Sun.
 */
export function jsToOurDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

/**
 * Converts JS getDay() to a 0-based Mon-first week index.
 * Mon=0, Tue=1, … Sun=6
 */
export function jsToWeekIdx(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

/** Spanish month abbreviations (0-indexed). */
export const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'] as const

/**
 * Returns the Monday of the calendar week that is `offsetWeeks` away from today.
 * offsetWeeks=0 → this week's Monday, offsetWeeks=1 → next Monday, etc.
 *
 * When `timezone` is provided, "today" is resolved in that IANA timezone
 * so the week boundary is correct for the user (not the server).
 */
export function getWeekMonday(offsetWeeks = 0, timezone?: string | null): Date {
  const tz = timezone ?? undefined
  const nowStr = tz
    ? new Date().toLocaleDateString('en-CA', { timeZone: tz })
    : undefined
  const today = nowStr ? new Date(`${nowStr}T00:00:00.000Z`) : new Date()
  const dow = tz ? today.getUTCDay() : today.getDay()
  const diffToMon = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  if (tz) {
    monday.setUTCDate(today.getUTCDate() + diffToMon + offsetWeeks * 7)
  } else {
    monday.setDate(today.getDate() + diffToMon + offsetWeeks * 7)
    monday.setHours(0, 0, 0, 0)
  }
  return monday
}

/**
 * Formats a week as "16–22 jun" or "30 jun – 6 jul".
 * Accepts the Monday of the week.
 */
export function formatWeekRange(monday: Date): string {
  const sun = new Date(monday)
  sun.setDate(monday.getDate() + 6)
  if (monday.getMonth() === sun.getMonth()) {
    return `${monday.getDate()}–${sun.getDate()} ${MONTHS[monday.getMonth()]}`
  }
  return `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]}`
}

/**
 * Returns a Record<dow, calendarDayNumber> for the week starting on `monday`.
 * dow follows our schema convention: 1=Mon … 7=Sun.
 */
export function buildWeekDateNumbers(monday: Date): Record<number, number> {
  const result: Record<number, number> = {}
  for (let dow = 1; dow <= 7; dow++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + (dow - 1))
    result[dow] = d.getDate()
  }
  return result
}

/**
 * Returns midnight (00:00:00.000) of "today" in the given IANA timezone.
 *
 * CRITICAL: always use this instead of `new Date(); d.setHours(0,0,0,0)`
 * for DB queries that compare dates. `setHours(0,0,0,0)` uses server TZ (UTC on Vercel),
 * which is wrong for LatAm users (COT = UTC-5, MXN = UTC-6).
 *
 * The returned Date is a UTC instant that represents midnight in the user's timezone.
 * Example: user in America/Bogota at 2026-09-03 8pm COT
 *   → todayInTz returns 2026-09-03T05:00:00.000Z (midnight COT = 5am UTC)
 */
export function todayInTz(timezone: string | null | undefined): Date {
  const tz = timezone ?? 'UTC'
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  return new Date(`${dateStr}T00:00:00.000Z`)
}

/**
 * Adjusts a date to the nearest Monday (same or next).
 * Plans must start on Monday so session dayOfWeek aligns with calendar display.
 */
export function forceMonday(date: Date): Date {
  const d = new Date(date)
  const dow = d.getUTCDay() // 0=Sun..6=Sat
  if (dow === 1) return d // already Monday
  const daysToAdd = dow === 0 ? 1 : 8 - dow // Sun→+1, Tue→+6, Wed→+5...
  d.setUTCDate(d.getUTCDate() + daysToAdd)
  return d
}

/**
 * Returns "today's" day-of-week (1=Mon…7=Sun) in the user's timezone.
 * Use instead of `jsToOurDow(new Date().getDay())` which uses server TZ.
 */
export function todayDowInTz(timezone?: string | null): number {
  const tz = timezone ?? undefined
  const dateStr = tz
    ? new Date().toLocaleDateString('en-CA', { timeZone: tz })
    : undefined
  const today = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date()
  const jsDay = tz ? today.getUTCDay() : today.getDay()
  return jsDay === 0 ? 7 : jsDay
}
