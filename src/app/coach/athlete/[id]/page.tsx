import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'
import AthleteDetailClient from './_components/AthleteDetailClient'

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: athleteId } = await params

  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // ─── Parallel DB queries ──────────────────────────────────────────────────
  const [athlete, healthProfile, activePlan, recentCheckIns, nutritionPlan, coachRelation] =
    await Promise.all([
      // Basic user data
      prisma.user.findUnique({
        where: { id: athleteId },
        select: { id: true, name: true, email: true, createdAt: true, config: true },
      }),

      // Health profile
      prisma.healthProfile.findUnique({
        where: { userId: athleteId },
      }),

      // Active training plan with weeks and sessions
      prisma.trainingPlan.findFirst({
        where: { userId: athleteId, status: 'ACTIVE' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              sessions: {
                orderBy: { dayOfWeek: 'asc' },
              },
            },
          },
        },
      }),

      // Last 8 weekly check-ins for progress
      prisma.weeklyCheckIn.findMany({
        where: { userId: athleteId },
        orderBy: { weekNumber: 'desc' },
        take: 8,
      }),

      // Nutrition plan (unique per user)
      prisma.nutritionPlan.findUnique({
        where: { userId: athleteId },
      }),

      // Verify coach-athlete relation (security)
      prisma.coachAthlete.findFirst({
        where: { coachId: session.user.id, athleteId },
      }),
    ])

  // Security: coach can only view their own athletes
  if (!coachRelation || !athlete) {
    redirect('/coach/dashboard')
  }

  // ─── Parse athlete features from UserConfig ───────────────────────────────
  const athleteConfig = parseUserConfig(athlete.config)
  const initialFeatures = {
    plan: athleteConfig.features.plan,
    checkin: athleteConfig.features.checkin,
    nutrition: athleteConfig.features.nutrition,
    progress: athleteConfig.features.progress,
  }

  // ─── Shape data for client component ─────────────────────────────────────

  const athleteData = {
    id: athlete.id,
    name: athlete.name,
    email: athlete.email,
    createdAt: athlete.createdAt,
  }

  const healthProfileData = healthProfile
    ? {
        age: healthProfile.age,
        weightKg: healthProfile.weightKg,
        weightGoalKg: healthProfile.weightGoalKg,
        hrResting: healthProfile.hrResting,
        hrMax: healthProfile.hrMax,
        heightCm: healthProfile.heightCm,
        injuries: healthProfile.injuries,
        conditions: healthProfile.conditions,
      }
    : null

  const activePlanData = activePlan
    ? {
        id: activePlan.id,
        name: activePlan.name,
        totalWeeks: activePlan.totalWeeks,
        startDate: activePlan.startDate,
        status: activePlan.status,
        weeks: activePlan.weeks.map((week) => ({
          weekNumber: week.weekNumber,
          phase: week.phase,
          focusDescription: week.focusDescription,
          isRecoveryWeek: week.isRecoveryWeek,
          sessions: week.sessions.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            type: s.type,
            durationMin: s.durationMin,
            detailText: s.detailText,
            zoneTarget: s.zoneTarget,
          })),
        })),
      }
    : null

  const checkInsData = recentCheckIns.map((c) => ({
    id: c.id,
    weekNumber: c.weekNumber,
    recordedAt: c.recordedAt,
    weightKg: c.weightKg,
    hrResting: c.hrResting,
    sleepScore: c.sleepScore,
    energyLevel: c.energyLevel,
    dietAdherencePct: c.dietAdherencePct,
    painFlag: c.painFlag,
  }))

  const nutritionPlanData = nutritionPlan
    ? {
        tdee: nutritionPlan.tdee,
        targetKcalHard: nutritionPlan.targetKcalHard,
        targetKcalEasy: nutritionPlan.targetKcalEasy,
        targetKcalRest: nutritionPlan.targetKcalRest,
        proteinG: nutritionPlan.proteinG,
        carbsHardG: nutritionPlan.carbsHardG,
        carbsEasyG: nutritionPlan.carbsEasyG,
        fatG: nutritionPlan.fatG,
      }
    : null

  return (
    <AthleteDetailClient
      athleteId={athleteId}
      athlete={athleteData}
      healthProfile={healthProfileData}
      activePlan={activePlanData}
      recentCheckIns={checkInsData}
      nutritionPlan={nutritionPlanData}
      initialFeatures={initialFeatures}
    />
  )
}
