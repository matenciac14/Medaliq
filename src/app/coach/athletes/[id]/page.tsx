import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
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
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)

  const [
    athlete, healthProfile, activePlan, recentCheckIns, nutritionPlan,
    coachRelation, coachProfile, latestPayment, prRecords,
    activeGymRoutine, lastGymSession, volumeAgg,
  ] = await Promise.all([
      // Basic user data
      prisma.user.findUnique({
        where: { id: athleteId },
        select: { id: true, name: true, email: true, createdAt: true, onboardingCompleted: true },
      }),

      // Health profile
      prisma.healthProfile.findUnique({
        where: { userId: athleteId },
      }),

      // Active training plan with weeks, sessions, and completion data
      prisma.trainingPlan.findFirst({
        where: { userId: athleteId, status: 'ACTIVE' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              sessions: {
                orderBy: { dayOfWeek: 'asc' },
                include: {
                  log: {
                    select: { rpe: true, distanceKm: true, durationMin: true, hrAvg: true, avgPaceSecPerKm: true, completedAt: true },
                  },
                  gymSession: {
                    select: {
                      rpe: true, durationMin: true, completed: true,
                      setLogs: {
                        where: { setLogType: 'WORK' },
                        select: { weightKg: true, repsCompleted: true, isPR: true, exerciseName: true },
                      },
                    },
                  },
                  workoutDay: {
                    select: {
                      label: true,
                      muscleGroups: true,
                      exercises: { orderBy: { order: 'asc' }, select: { sets: true, exercise: { select: { name: true } } } },
                    },
                  },
                },
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

      // Verify coach-athlete relation (security) + coach notes
      prisma.coachAthlete.findFirst({
        where: { coachId: session.user.id, athleteId },
        select: { id: true, status: true, coachGoal: true, privateNotes: true },
      }),

      // Coach specialties for discipline-aware plan creation
      prisma.coachProfile.findUnique({
        where: { coachId: session.user.id },
        select: { specialties: true },
      }),

      // Latest payment for this athlete
      prisma.payment.findFirst({
        where: { coachId: session.user.id, athleteId },
        orderBy: { paidAt: 'desc' },
        select: { id: true, amount: true, currency: true, status: true, paidAt: true, dueDate: true },
      }),

      // PR records (SetLog with isPR: true)
      prisma.setLog.findMany({
        where: { session: { athleteId }, isPR: true, setLogType: 'WORK' },
        orderBy: { session: { date: 'desc' } },
        take: 5,
        select: {
          exerciseName: true, weightKg: true,
          session: { select: { date: true } },
        },
      }),

      // Active gym routine (AssignedWorkout + template + workout days)
      prisma.assignedWorkout.findFirst({
        where: { athleteId, isActive: true },
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          template: {
            select: {
              name: true, goal: true, daysPerWeek: true,
              days: {
                orderBy: { order: 'asc' },
                select: {
                  label: true, dayOfWeek: true, muscleGroups: true, isRestDay: true,
                  exercises: {
                    orderBy: { order: 'asc' },
                    select: { sets: true, repsScheme: true, exercise: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
      }),

      // Last completed gym session
      prisma.gymSession.findFirst({
        where: { athleteId, completed: true },
        orderBy: { date: 'desc' },
        select: { date: true },
      }),

      // Volume total last 7 days (sum of weightKg * repsCompleted)
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(sl."weightKg" * sl."repsCompleted"), 0)::float AS total
        FROM "SetLog" sl
        JOIN "GymSession" gs ON gs.id = sl."sessionId"
        WHERE gs."athleteId" = ${athleteId}
          AND gs.completed = true
          AND gs.date >= ${sevenDaysAgo}
          AND sl."setLogType" = 'WORK'
          AND sl."weightKg" IS NOT NULL
          AND sl."repsCompleted" IS NOT NULL
      `,
    ])

  // Security: coach can only view their own athletes
  if (!coachRelation || !athlete) {
    redirect('/coach/dashboard')
  }

  // ─── Shape data for client component ─────────────────────────────────────

  const athleteData = {
    id: athlete.id,
    name: athlete.name,
    email: athlete.email,
    createdAt: athlete.createdAt,
    onboardingCompleted: athlete.onboardingCompleted,
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
        sport: healthProfile.sport,
        experienceLevel: healthProfile.experienceLevel,
        ftp: healthProfile.ftp,
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
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            type: s.type,
            durationMin: s.durationMin,
            detailText: s.detailText,
            zoneTarget: s.zoneTarget,
            coachNote: s.coachNote,
            structure: s.structure,
            intensity: s.intensity ?? 'MODERATE',
            date: s.date,
            log: s.log
              ? { rpe: s.log.rpe, distanceKm: s.log.distanceKm, durationMin: s.log.durationMin, hrAvg: s.log.hrAvg, paceSecPerKm: s.log.avgPaceSecPerKm }
              : null,
            gymLog: s.gymSession
              ? {
                  rpe: s.gymSession.rpe,
                  durationMin: s.gymSession.durationMin,
                  completed: s.gymSession.completed,
                  totalSets: s.gymSession.setLogs.length,
                  totalVolume: Math.round(s.gymSession.setLogs.reduce((sum, sl) => sum + (sl.weightKg ?? 0) * (sl.repsCompleted ?? 0), 0)),
                  exerciseCount: new Set(s.gymSession.setLogs.map(sl => sl.exerciseName)).size,
                  prs: s.gymSession.setLogs.filter(sl => sl.isPR).map(sl => ({ name: sl.exerciseName ?? '', kg: sl.weightKg ?? 0 })),
                }
              : null,
            workoutDay: s.workoutDay
              ? {
                  label: s.workoutDay.label,
                  muscleGroups: s.workoutDay.muscleGroups as string[],
                  exerciseCount: s.workoutDay.exercises.length,
                  totalSets: s.workoutDay.exercises.reduce((sum, e) => sum + e.sets, 0),
                }
              : null,
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
    stressLevel: c.stressLevel ?? null,
    motivationLevel: c.motivationLevel ?? null,
    painLevel: c.painLevel ?? null,
    dietAdherencePct: c.dietAdherencePct,
    painFlag: c.painFlag,
    hardestSessionRpe: c.hardestSessionRpe,
    adjustmentsTriggered: c.adjustmentsTriggered,
    notes: c.notes,
    waistCm: c.waistCm ?? null,
    armsCm: c.armsCm ?? null,
    hipsCm: c.hipsCm ?? null,
    thighsCm: c.thighsCm ?? null,
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
        kcalAdjustment: nutritionPlan.kcalAdjustment,
      }
    : null

  const paymentData = latestPayment
    ? {
        amount: Number(latestPayment.amount),
        currency: latestPayment.currency,
        status: latestPayment.status as 'PAID' | 'PENDING' | 'OVERDUE',
        paidAt: latestPayment.paidAt,
        dueDate: latestPayment.dueDate,
      }
    : null

  const prData = prRecords.map((pr) => ({
    exerciseName: pr.exerciseName ?? 'Ejercicio',
    weightKg: pr.weightKg ?? 0,
    date: pr.session.date,
  }))

  const gymRoutineData = activeGymRoutine
    ? {
        name: activeGymRoutine.template.name,
        goal: activeGymRoutine.template.goal,
        daysPerWeek: activeGymRoutine.template.daysPerWeek,
        lastSessionDate: lastGymSession?.date ?? null,
        days: activeGymRoutine.template.days
          .filter(d => !d.isRestDay)
          .map(d => ({
            label: d.label,
            dayOfWeek: d.dayOfWeek,
            muscleGroups: d.muscleGroups,
            exercises: d.exercises.map(e => ({
              name: e.exercise.name,
              sets: e.sets,
              repsScheme: e.repsScheme,
            })),
          })),
      }
    : null

  const volumeTotalKg = volumeAgg[0]?.total ?? 0

  return (
    <AthleteDetailClient
      athleteId={athleteId}
      athlete={athleteData}
      healthProfile={healthProfileData}
      activePlan={activePlanData}
      recentCheckIns={checkInsData}
      nutritionPlan={nutritionPlanData}
      initialStatus={(coachRelation.status as 'ACTIVE' | 'PAUSED') ?? 'ACTIVE'}
      coachGoal={coachRelation.coachGoal ?? null}
      privateNotes={coachRelation.privateNotes ?? null}
      coachSpecialties={coachProfile?.specialties ?? []}
      latestPayment={paymentData}
      prRecords={prData}
      gymRoutine={gymRoutineData}
      volumeTotalKg={volumeTotalKg}
    />
  )
}
