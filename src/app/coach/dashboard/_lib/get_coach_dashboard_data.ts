import { prisma } from '@/lib/db/prisma'
import { mapCoachAthleteRelation } from '@/infrastructure/db/coach_athlete.mapper'
import { getCoachLimits } from '@/domain/subscription/tier_features'
import { getCoachDashboardSummary, type DashboardInput } from '@/domain/coach_dashboard/get_coach_dashboard.use_case'
import type { CoachDashboardSummary } from '@/domain/coach_dashboard/coach_dashboard.types'

export async function getCoachDashboardData(
  coachId: string,
  session: { user: { name?: string | null; profileComplete: boolean } },
): Promise<CoachDashboardSummary> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    coachRelations,
    totalCount,
    checkInsWeekCount,
    thisMonthCount,
    lastMonthTotal,
    recentCheckIns,
    sportRows,
    overduePayments,
    pendingOnboarding,
    paidThisMonthAgg,
    coachSubscription,
  ] = await Promise.all([
    prisma.coachAthlete.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        athlete: {
          include: {
            profile: true,
            trainingPlans: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: {
                weeks: {
                  orderBy: { weekNumber: 'asc' },
                  include: { sessions: { where: { date: { lte: now } }, include: { log: { select: { id: true } } } } },
                },
              },
            },
            checkIns: {
              orderBy: { recordedAt: 'desc' },
              take: 2,
              select: {
                recordedAt: true, weightKg: true, hrResting: true,
                hardestSessionRpe: true, adjustmentsTriggered: true, weekNumber: true,
              },
            },
            athleteAssignments: {
              where: { isActive: true },
              take: 1,
              select: {
                isActive: true,
                startDate: true,
                template: { select: { daysPerWeek: true } },
              },
            },
            _count: {
              select: { gymSessions: { where: { completed: true } } },
            },
          },
        },
      },
    }),
    prisma.coachAthlete.count({ where: { coachId, status: 'ACTIVE' } }),
    prisma.coachAthlete.count({
      where: { coachId, status: 'ACTIVE', athlete: { checkIns: { some: { recordedAt: { gte: sevenDaysAgo } } } } },
    }),
    prisma.coachAthlete.count({ where: { coachId, createdAt: { gte: startOfMonth } } }),
    prisma.coachAthlete.count({ where: { coachId, createdAt: { lt: startOfMonth, gte: startOfLastMonth } } }),
    prisma.weeklyCheckIn.findMany({
      where: { user: { coachedBy: { some: { coachId } } } },
      orderBy: { recordedAt: 'desc' },
      take: 5,
      select: { recordedAt: true, weekNumber: true, energyLevel: true, weightKg: true, user: { select: { id: true, name: true } } },
    }),
    prisma.healthProfile.findMany({
      where: { user: { coachedBy: { some: { coachId } } } },
      select: { sport: true },
    }),
    prisma.payment.findMany({
      where: { coachId, status: 'PENDING', dueDate: { lt: now } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      select: { id: true, amount: true, dueDate: true, athleteId: true, athlete: { select: { name: true } } },
    }),
    prisma.coachAthlete.findMany({
      where: { coachId, status: 'ACTIVE', athlete: { onboardingCompleted: false } },
      select: { athleteId: true, createdAt: true, athlete: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
      take: 5,
    }),
    prisma.payment.aggregate({
      where: { coachId, status: 'PAID', paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.userSubscription.findUnique({
      where: { userId: coachId },
      select: { coachTier: true },
    }),
  ])

  const threeWeeksAgo = new Date(now.getTime() - 21 * 86_400_000)

  const [
    unreadMessagesCount,
    lastWeekCheckInsCount,
    lastWeekPaymentAgg,
    recentGymSessions,
    recentRunSessions,
    recentPaidPayments,
    prevWeekCheckInsCount,
    prevWeekPaymentAgg,
    lastWeekGymCount,
    lastWeekRunCount,
  ] = await Promise.all([
    prisma.message.count({ where: { toId: coachId, readAt: null } }),
    prisma.weeklyCheckIn.count({
      where: { user: { coachedBy: { some: { coachId } } }, recordedAt: { gte: twoWeeksAgo, lt: sevenDaysAgo } },
    }),
    prisma.payment.aggregate({
      where: { coachId, status: 'PAID', paidAt: { gte: twoWeeksAgo, lt: sevenDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.gymSession.findMany({
      where: { athlete: { coachedBy: { some: { coachId } } }, completed: true, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'desc' },
      take: 5,
      select: { id: true, date: true, rpe: true, durationMin: true, athlete: { select: { id: true, name: true } } },
    }),
    prisma.sessionLog.findMany({
      where: { user: { coachedBy: { some: { coachId } } }, completedAt: { gte: sevenDaysAgo }, discipline: 'RUNNING' },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: { id: true, completedAt: true, durationMin: true, distanceKm: true, rpe: true, user: { select: { id: true, name: true } } },
    }),
    prisma.payment.findMany({
      where: { coachId, status: 'PAID', paidAt: { gte: sevenDaysAgo } },
      orderBy: { paidAt: 'desc' },
      take: 3,
      select: { id: true, amount: true, paidAt: true, athleteId: true, athlete: { select: { name: true } } },
    }),
    prisma.weeklyCheckIn.count({
      where: { user: { coachedBy: { some: { coachId } } }, recordedAt: { gte: threeWeeksAgo, lt: twoWeeksAgo } },
    }),
    prisma.payment.aggregate({
      where: { coachId, status: 'PAID', paidAt: { gte: threeWeeksAgo, lt: twoWeeksAgo } },
      _sum: { amount: true },
    }),
    prisma.gymSession.count({
      where: { athlete: { coachedBy: { some: { coachId } } }, completed: true, date: { gte: twoWeeksAgo, lt: sevenDaysAgo } },
    }),
    prisma.sessionLog.count({
      where: { user: { coachedBy: { some: { coachId } } }, completedAt: { gte: twoWeeksAgo, lt: sevenDaysAgo } },
    }),
  ])

  const coachTier = coachSubscription?.coachTier ?? 'STARTER'
  const { maxAthletes } = getCoachLimits(coachTier)
  const athletes = coachRelations.map((rel) => mapCoachAthleteRelation(rel as any, now))

  const input: DashboardInput = {
    coachId,
    userName: session.user.name,
    profileComplete: session.user.profileComplete,
    now,
    athletes,
    totalCount,
    checkInsWeekCount,
    thisMonthCount,
    lastMonthTotal,
    ingresosMes: Number(paidThisMonthAgg._sum.amount ?? 0),
    unreadMessagesCount,
    coachTier,
    maxAthletes,
    sportRows,
    overduePayments,
    pendingOnboarding,
    lastWeekCheckInsCount,
    lastWeekRevenue: Number(lastWeekPaymentAgg._sum.amount ?? 0),
    recentCheckIns,
    recentGymSessions,
    recentRunSessions,
    recentPaidPayments,
    prevWeekCheckInsCount,
    prevWeekRevenue: Number(prevWeekPaymentAgg._sum.amount ?? 0),
    lastWeekGymCount,
    lastWeekRunCount,
  }

  return getCoachDashboardSummary(input)
}
