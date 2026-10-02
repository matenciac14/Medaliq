import type { PrismaClient } from '../../generated/prisma/client'
import { jsToOurDow, MONTHS, getWeekMonday, todayDowInTz } from '@/lib/core/date_utils'
import { getPlanWeekNumber } from '@/lib/core/week_number'

// ── Types ────────────────────────────────────────────────────────────────────

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

export type WeekSessionsResult = {
  weekSessions: WeekSessionSlot[]
  completedCount: number
  totalTraining: number
  weekLabel: string | null
  weekOffset: number
  isCurrentWeek: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekLabel(startDate: Date, endDate: Date): string {
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDate.getDate()}–${endDate.getDate()} ${MONTHS[startDate.getMonth()]}`
  }
  return `${startDate.getDate()} ${MONTHS[startDate.getMonth()]} – ${endDate.getDate()} ${MONTHS[endDate.getMonth()]}`
}

function emptyWeekSlots(weekOffset: number, todayDow: number): WeekSessionSlot[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    type: null,
    done: false,
    isToday: weekOffset === 0 && i + 1 === todayDow,
    id: null,
    durationMin: null,
    zoneTarget: null,
    gymLabel: null,
  }))
}

async function overlayGymSessions(
  weekSessions: WeekSessionSlot[],
  userId: string,
  weekOffset: number,
  db: PrismaClient,
  timezone?: string,
): Promise<{ addedTraining: number; addedCompleted: number }> {
  const monday = getWeekMonday(weekOffset, timezone)
  const sunday = new Date(monday.getTime() + 7 * 86_400_000 - 1)

  const [assignedWorkout, gymCompletions] = await Promise.all([
    db.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: { template: { select: { days: { where: { isRestDay: false }, select: { dayOfWeek: true, label: true } } } } },
    }),
    db.gymSession.findMany({
      where: { athleteId: userId, date: { gte: monday, lte: sunday } },
      select: { dayOfWeek: true, date: true, completed: true, durationMin: true },
    }),
  ])

  if (!assignedWorkout) return { addedTraining: 0, addedCompleted: 0 }

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

// ── Use case ─────────────────────────────────────────────────────────────────

export async function getWeekSessions(
  input: { userId: string; weekOffset: number; tz?: string },
  db: PrismaClient,
): Promise<WeekSessionsResult> {
  const { userId, weekOffset, tz } = input
  const todayDow = todayDowInTz(tz)

  const planMeta = await db.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, startDate: true, totalWeeks: true },
  })

  // ── No active plan ──
  if (!planMeta) {
    const weekSessions = emptyWeekSlots(weekOffset, todayDow)
    const { addedTraining, addedCompleted } = await overlayGymSessions(weekSessions, userId, weekOffset, db, tz)

    if (addedTraining === 0) {
      return buildFreeLogsResult(weekSessions, userId, weekOffset, tz, todayDow, db)
    }

    return {
      weekSessions,
      completedCount: addedCompleted,
      totalTraining: addedTraining,
      weekLabel: null,
      weekOffset,
      isCurrentWeek: weekOffset === 0,
    }
  }

  // ── Has active plan ──
  const currentWeek = getPlanWeekNumber(planMeta.startDate, planMeta.totalWeeks)
  const selectedWeekNum = currentWeek + weekOffset

  const selectedWeek = await db.planWeek.findFirst({
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

  const weekSessions = emptyWeekSlots(weekOffset, todayDow)
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
    const result = await buildFreeLogsForPlanGap(weekSessions, userId, weekOffset, tz, db)
    completedCount = result.completedCount
    totalTraining = result.totalTraining
    weekLabel = result.weekLabel
  }

  const { addedTraining, addedCompleted } = await overlayGymSessions(weekSessions, userId, weekOffset, db, tz)
  totalTraining += addedTraining
  completedCount += addedCompleted

  return { weekSessions, completedCount, totalTraining, weekLabel, weekOffset, isCurrentWeek: weekOffset === 0 }
}

// ── Sub-helpers ──────────────────────────────────────────────────────────────

async function buildFreeLogsResult(
  weekSessions: WeekSessionSlot[],
  userId: string,
  weekOffset: number,
  tz: string | undefined,
  todayDow: number,
  db: PrismaClient,
): Promise<WeekSessionsResult> {
  const monday = getWeekMonday(weekOffset, tz)
  const sunday = new Date(monday.getTime() + 7 * 86_400_000 - 1)

  const freeLogs = await db.sessionLog.findMany({
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

  return {
    weekSessions,
    completedCount: freeTotal,
    totalTraining: freeTotal,
    weekLabel: formatWeekLabel(monday, sunday),
    weekOffset,
    isCurrentWeek: weekOffset === 0,
  }
}

async function buildFreeLogsForPlanGap(
  weekSessions: WeekSessionSlot[],
  userId: string,
  weekOffset: number,
  tz: string | undefined,
  db: PrismaClient,
): Promise<{ completedCount: number; totalTraining: number; weekLabel: string }> {
  const monday = getWeekMonday(weekOffset, tz)
  const sunday = new Date(monday.getTime() + 7 * 86_400_000 - 1)

  const freeLogs = await db.sessionLog.findMany({
    where: { userId, completedAt: { gte: monday, lte: sunday }, plannedSessionId: null },
    select: { completedAt: true, freeSessionType: true, durationMin: true },
  })

  let completedCount = 0
  let totalTraining = 0
  for (const log of freeLogs) {
    if (!log.completedAt) continue
    const jsDay = log.completedAt.getUTCDay()
    const idx = (jsDay === 0 ? 7 : jsDay) - 1
    if (idx >= 0 && idx < 7) {
      weekSessions[idx].type = log.freeSessionType ?? 'OTRO'
      weekSessions[idx].done = true
      weekSessions[idx].durationMin = log.durationMin
      completedCount++
      totalTraining++
    }
  }

  return { completedCount, totalTraining, weekLabel: formatWeekLabel(monday, sunday) }
}
