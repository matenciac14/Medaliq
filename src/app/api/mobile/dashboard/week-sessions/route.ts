import { NextRequest, NextResponse } from 'next/server'
import { jsToOurDow, MONTHS, getWeekMonday, todayDowInTz } from '@/lib/core/date_utils'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getPlanWeekNumber } from '@/lib/core/week_number'

function formatWeekLabel(startDate: Date, endDate: Date): string {
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDate.getDate()}–${endDate.getDate()} ${MONTHS[startDate.getMonth()]}`
  }
  return `${startDate.getDate()} ${MONTHS[startDate.getMonth()]} – ${endDate.getDate()} ${MONTHS[endDate.getMonth()]}`
}

type WeekSessionSlot = {
  dayIndex: number
  type: string | null
  done: boolean
  isToday: boolean
  id: string | null
  durationMin: number | null
  zoneTarget: string | null
  gymLabel: string | null
}

/**
 * Overlay gym data onto weekSessions for days that don't already have a sport session.
 * Mirrors web's buildCalendarWeek logic — gym + running coexist on the same calendar.
 */
async function overlayGymSessions(
  weekSessions: WeekSessionSlot[],
  userId: string,
  weekOffset: number,
  timezone?: string,
): Promise<{ addedTraining: number; addedCompleted: number }> {
  const monday = getWeekMonday(weekOffset, timezone)
  const sunday = new Date(monday.getTime() + 7 * 86_400_000 - 1)

  const [assignedWorkout, gymCompletions] = await Promise.all([
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: { template: { select: { days: { where: { isRestDay: false }, select: { dayOfWeek: true, label: true } } } } },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, date: { gte: monday, lte: sunday } },
      select: { dayOfWeek: true, date: true, completed: true, durationMin: true },
    }),
  ])

  if (!assignedWorkout) return { addedTraining: 0, addedCompleted: 0 }

  // Build gym completion lookup by dow (derived from actual date)
  const gymDoneByDow = new Map<number, typeof gymCompletions[number]>()
  for (const gs of gymCompletions) {
    const jsDay = new Date(gs.date).getUTCDay()
    const dow = jsDay === 0 ? 7 : jsDay
    gymDoneByDow.set(dow, gs)
  }

  let addedTraining = 0
  let addedCompleted = 0

  for (const day of assignedWorkout.template.days) {
    const idx = day.dayOfWeek - 1
    if (idx < 0 || idx >= 7) continue
    // Only add gym if the slot doesn't already have a sport session
    if (weekSessions[idx].type && weekSessions[idx].type !== 'DESCANSO') continue

    const completion = gymDoneByDow.get(day.dayOfWeek)
    weekSessions[idx].type = 'FUERZA'
    weekSessions[idx].durationMin = completion?.durationMin ?? 60
    weekSessions[idx].done = completion?.completed ?? false
    weekSessions[idx].gymLabel = day.label
    addedTraining++
    if (weekSessions[idx].done) addedCompleted++
  }

  return { addedTraining, addedCompleted }
}


export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:week-sessions`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const userId = mobile.id
  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0') || 0
  const tz = req.nextUrl.searchParams.get('tz') || undefined
  const todayDow = todayDowInTz(tz)

  const planMeta = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, startDate: true, totalWeeks: true },
  })

  if (!planMeta) {
    const weekSessions: WeekSessionSlot[] = Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i, type: null, done: false,
      isToday: weekOffset === 0 && i + 1 === todayDow,
      id: null, durationMin: null, zoneTarget: null, gymLabel: null,
    }))

    // Try gym overlay first (same user might have gym without running plan)
    const { addedTraining, addedCompleted } = await overlayGymSessions(weekSessions, userId, weekOffset, tz)

    if (addedTraining === 0) {
      // B2C Free: no plan, no gym — show free SessionLogs for the requested week
      const monday = getWeekMonday(weekOffset, tz)
      const sunday = new Date(monday.getTime() + 7 * 86_400_000 - 1)

      const freeLogs = await prisma.sessionLog.findMany({
        where: { userId, completedAt: { gte: monday, lte: sunday } },
        select: {
          completedAt: true,
          freeSessionType: true,
          durationMin: true,
          plannedSession: { select: { type: true } },
        },
      })

      let freeTotal = 0
      for (const log of freeLogs) {
        if (!log.completedAt) continue
        const jsDay = log.completedAt.getUTCDay()
        const idx = (jsDay === 0 ? 7 : jsDay) - 1
        if (idx >= 0 && idx < 7) {
          weekSessions[idx].type = log.freeSessionType ?? log.plannedSession?.type ?? 'OTRO'
          weekSessions[idx].done = true
          freeTotal++
        }
      }

      return NextResponse.json({
        weekSessions,
        completedCount: freeTotal,
        totalTraining: freeTotal,
        weekLabel: formatWeekLabel(monday, sunday),
        weekOffset,
        isCurrentWeek: weekOffset === 0,
      })
    }

    return NextResponse.json({
      weekSessions,
      completedCount: addedCompleted,
      totalTraining: addedTraining,
      weekLabel: null,
      weekOffset,
      isCurrentWeek: weekOffset === 0,
    })
  }

  // ── Has active plan: load sport sessions + overlay gym ──
  const currentWeek = getPlanWeekNumber(planMeta.startDate, planMeta.totalWeeks)
  const selectedWeekNum = currentWeek + weekOffset

  const selectedWeek = await prisma.planWeek.findFirst({
    where: { planId: planMeta.id, weekNumber: selectedWeekNum },
    select: {
      startDate: true,
      endDate: true,
      sessions: {
        where: { type: { not: 'DESCANSO' } },
        select: {
          id: true, type: true, dayOfWeek: true, durationMin: true, zoneTarget: true,
          log: { select: { id: true } },
        },
      },
    },
  })

  const weekSessions: WeekSessionSlot[] = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i, type: null, done: false,
    isToday: weekOffset === 0 && i + 1 === todayDow,
    id: null, durationMin: null, zoneTarget: null, gymLabel: null,
  }))

  let completedCount = 0
  let totalTraining = 0
  let weekLabel: string | null = null

  if (selectedWeek) {
    totalTraining = selectedWeek.sessions.length
    completedCount = selectedWeek.sessions.filter(s => s.log).length
    for (const s of selectedWeek.sessions) {
      const idx = s.dayOfWeek - 1
      if (idx >= 0 && idx < 7) {
        weekSessions[idx].type = s.type
        weekSessions[idx].done = !!s.log
        weekSessions[idx].id = s.id
        weekSessions[idx].durationMin = s.durationMin
        weekSessions[idx].zoneTarget = s.zoneTarget ?? '2'
      }
    }
    weekLabel = formatWeekLabel(selectedWeek.startDate, selectedWeek.endDate)
  } else {
    // Plan activo pero sin PlanWeek para esta semana — mostrar SessionLogs libres
    const monday = getWeekMonday(weekOffset, tz)
    const sunday = new Date(monday.getTime() + 7 * 86_400_000 - 1)

    const freeLogs = await prisma.sessionLog.findMany({
      where: { userId, completedAt: { gte: monday, lte: sunday }, plannedSessionId: null },
      select: { completedAt: true, freeSessionType: true, durationMin: true },
    })

    for (const log of freeLogs) {
      if (!log.completedAt) continue
      const jsDay2 = log.completedAt.getUTCDay()
      const idx = (jsDay2 === 0 ? 7 : jsDay2) - 1
      if (idx >= 0 && idx < 7) {
        weekSessions[idx].type = log.freeSessionType ?? 'OTRO'
        weekSessions[idx].done = true
        weekSessions[idx].durationMin = log.durationMin
        completedCount++
        totalTraining++
      }
    }
    weekLabel = formatWeekLabel(monday, sunday)
  }

  // Overlay gym sessions on empty slots — same logic as web's buildCalendarWeek
  const { addedTraining, addedCompleted } = await overlayGymSessions(weekSessions, userId, weekOffset, tz)
  totalTraining += addedTraining
  completedCount += addedCompleted

  return NextResponse.json({
    weekSessions,
    completedCount,
    totalTraining,
    weekLabel,
    weekOffset,
    isCurrentWeek: weekOffset === 0,
  })
}
