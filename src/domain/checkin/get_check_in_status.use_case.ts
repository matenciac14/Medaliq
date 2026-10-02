import type { PrismaClient } from '../../generated/prisma/client'
import { getPlanWeekNumber, getCurrentISOWeek } from '@/lib/core/week_number'

export interface CheckInStatusResult {
  submitted: boolean
  weekNumber: number
  totalWeeks: number | null
  weekSessions: { dayOfWeek: number; completed: boolean }[]
  hasAutoData: boolean
  data: object | null
  pendingSuggestions: {
    id: string
    type: string
    title: string
    description: string
    expiresAt: Date
  }[]
}

export async function getCheckInStatus(
  userId: string,
  prisma: PrismaClient
): Promise<CheckInStatusResult> {
  const plan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: {
      startDate: true,
      totalWeeks: true,
      weeks: {
        select: {
          weekNumber: true,
          sessions: {
            select: {
              dayOfWeek: true,
              type: true,
              log: { select: { id: true } },
            },
          },
        },
        orderBy: { weekNumber: 'asc' },
      },
    },
  })

  const weekNumber = plan
    ? getPlanWeekNumber(plan.startDate, plan.totalWeeks)
    : getCurrentISOWeek()

  const [existing, pendingSuggestions, healthProfile] = await Promise.all([
    prisma.weeklyCheckIn.findFirst({
      where: { userId, weekNumber },
      select: {
        id: true,
        weightKg: true,
        hrResting: true,
        sleepHours: true,
        sleepScore: true,
        energyLevel: true,
        stressLevel: true,
        motivationLevel: true,
        hardestSessionRpe: true,
        painLevel: true,
        notes: true,
        recordedAt: true,
      },
    }),
    prisma.checkInSuggestion.findMany({
      where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
      select: { id: true, type: true, title: true, description: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, hrResting: true },
    }),
  ])

  const currentWeekData = plan?.weeks.find((w) => w.weekNumber === weekNumber)
  const weekSessions =
    currentWeekData?.sessions
      .filter((s) => s.type !== 'DESCANSO')
      .map((s) => ({ dayOfWeek: s.dayOfWeek, completed: !!s.log })) ?? []

  const hasAutoData = !!(healthProfile?.weightKg || healthProfile?.hrResting)

  return {
    submitted: !!existing,
    weekNumber,
    totalWeeks: plan?.totalWeeks ?? null,
    weekSessions,
    hasAutoData,
    data: existing ?? null,
    pendingSuggestions,
  }
}
