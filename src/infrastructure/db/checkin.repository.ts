/**
 * Infrastructure — Prisma implementation of ICheckInRepository.
 * Maps domain field names → actual weeklyCheckIn model columns.
 */
import type { ICheckInRepository, SaveCheckInPayload } from '@/domain/ports/checkin.repository'
import type { PreviousCheckIn, WeekActivitySummary } from '@/domain/checkin/check_in.types'
import type { PrismaDbClient } from '@/lib/db/prisma_client'
import { prisma } from '@/lib/db/prisma'
import { getWeekMonday, todayInTz } from '@/lib/core/date_utils'

export class PrismaCheckInRepository implements ICheckInRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async findLatest(userId: string): Promise<PreviousCheckIn | null> {
    const record = await this.db.weeklyCheckIn.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      select: { hrResting: true, weightKg: true },
    })
    if (!record) return null
    return {
      heartRate: record.hrResting,
      weight: record.weightKg,
    }
  }

  async save(userId: string, data: SaveCheckInPayload): Promise<{ id: string }> {
    const hasPain = (data.painLevel ?? 0) >= 5
    const record = {
      weightKg: data.weight ?? undefined,
      hrResting: data.heartRate ?? undefined,
      sleepHours: data.sleepHours ?? undefined,
      sleepScore: data.sleepScore ?? undefined,
      hardestSessionRpe: data.rpe ?? undefined,
      energyLevel: data.energyLevel ?? undefined,
      stressLevel: data.stressLevel ?? undefined,
      motivationLevel: data.motivation ?? null,
      nutritionAdherencePct: data.nutritionAdherence
        ? Math.round(data.nutritionAdherence * 10)  // 1-10 scale → 0-100
        : undefined,
      painLevel: data.painLevel ?? null,
      painDescription: data.painDescription ?? null,
      painFlag: hasPain,
      notes: data.notes ?? null,
      waistCm: data.waistCm ?? null,
      armsCm: data.armsCm ?? null,
      hipsCm: data.hipsCm ?? null,
      thighsCm: data.thighsCm ?? null,
      adjustmentsTriggered: data.triggers,
      recordedAt: new Date(),
    }

    // Upsert manual por (userId, planId, weekNumber) — necesario porque los partial indexes
    // de PostgreSQL no son expresables como compound key en Prisma (NULL != NULL en unique).
    const existing = await this.db.weeklyCheckIn.findFirst({
      where: { userId, planId: data.planId ?? null, weekNumber: data.weekNumber },
      select: { id: true },
    })

    if (existing) {
      await this.db.weeklyCheckIn.update({
        where: { id: existing.id },
        data: record,
      })
      return { id: existing.id }
    } else {
      const created = await this.db.weeklyCheckIn.create({
        data: { userId, planId: data.planId ?? null, weekNumber: data.weekNumber, ...record },
        select: { id: true },
      })
      return { id: created.id }
    }
  }

  async count(userId: string): Promise<number> {
    return this.db.weeklyCheckIn.count({ where: { userId } })
  }

  async getWeekActivitySummary(userId: string, timezone?: string | null): Promise<WeekActivitySummary> {
    const monday = getWeekMonday(0, timezone)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 7)

    // Current week + previous 4 weeks for volume trend
    const fiveWeeksAgo = new Date(monday)
    fiveWeeksAgo.setDate(monday.getDate() - 28)

    const [sessionLogs, gymSessions] = await Promise.all([
      this.db.sessionLog.findMany({
        where: { userId, completedAt: { gte: fiveWeeksAgo, lt: sunday } },
        select: { completedAt: true, sessionDate: true, durationMin: true, rpe: true, hrAvg: true },
        orderBy: { completedAt: 'desc' },
      }),
      this.db.gymSession.findMany({
        where: { athleteId: userId, completed: true, date: { gte: fiveWeeksAgo, lt: sunday } },
        select: { date: true, durationMin: true, rpe: true },
        orderBy: { date: 'desc' },
      }),
    ])

    // Split into current week vs previous weeks
    const thisWeekLogs = sessionLogs.filter(l => (l.sessionDate ?? l.completedAt) >= monday)
    const thisWeekGym = gymSessions.filter(g => g.date >= monday)
    const prevLogs = sessionLogs.filter(l => (l.sessionDate ?? l.completedAt) < monday)
    const prevGym = gymSessions.filter(g => g.date < monday)

    // Current week stats
    let totalMinutes = 0
    let rpeSum = 0; let rpeCount = 0; let maxRpe: number | null = null
    let hrSum = 0; let hrCount = 0

    for (const l of thisWeekLogs) {
      totalMinutes += l.durationMin ?? 0
      if (l.rpe != null) { rpeSum += l.rpe; rpeCount++; maxRpe = Math.max(maxRpe ?? 0, l.rpe) }
      if (l.hrAvg != null) { hrSum += l.hrAvg; hrCount++ }
    }
    for (const g of thisWeekGym) {
      totalMinutes += g.durationMin ?? 0
      if (g.rpe != null) { rpeSum += g.rpe; rpeCount++; maxRpe = Math.max(maxRpe ?? 0, g.rpe) }
    }

    const totalSessions = thisWeekLogs.length + thisWeekGym.length

    // Consecutive active days — count backwards from today (timezone-aware)
    const activeDates = new Set<string>()
    for (const l of [...thisWeekLogs, ...prevLogs]) {
      activeDates.add((l.sessionDate ?? l.completedAt).toISOString().slice(0, 10))
    }
    for (const g of [...thisWeekGym, ...prevGym]) {
      activeDates.add(g.date.toISOString().slice(0, 10))
    }

    let consecutiveActiveDays = 0
    const todayStart = todayInTz(timezone)
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(todayStart.getTime() - i * 86_400_000)
      if (activeDates.has(checkDate.toISOString().slice(0, 10))) {
        consecutiveActiveDays++
      } else {
        break
      }
    }

    // Previous 4 weeks average minutes
    let prevWeeksAvgMinutes: number | null = null
    if (prevLogs.length > 0 || prevGym.length > 0) {
      const weekBuckets = new Map<number, number>()
      for (let w = 1; w <= 4; w++) {
        const wStart = new Date(monday)
        wStart.setDate(monday.getDate() - w * 7)
        const wEnd = new Date(wStart)
        wEnd.setDate(wStart.getDate() + 7)

        let wMin = 0
        for (const l of prevLogs) {
          const d = l.sessionDate ?? l.completedAt
          if (d >= wStart && d < wEnd) wMin += l.durationMin ?? 0
        }
        for (const g of prevGym) {
          if (g.date >= wStart && g.date < wEnd) wMin += g.durationMin ?? 0
        }
        if (wMin > 0) weekBuckets.set(w, wMin)
      }
      if (weekBuckets.size > 0) {
        const total = [...weekBuckets.values()].reduce((a, b) => a + b, 0)
        prevWeeksAvgMinutes = Math.round(total / weekBuckets.size)
      }
    }

    return {
      totalSessions,
      totalMinutes,
      avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
      maxRpe,
      consecutiveActiveDays,
      avgHrReal: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
      prevWeeksAvgMinutes,
    }
  }
}
