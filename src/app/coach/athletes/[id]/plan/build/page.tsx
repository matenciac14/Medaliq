import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import PlanBuilderClient from './_components/PlanBuilderClient'

export default async function PlanBuildPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: athleteId } = await params
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') redirect('/login')

  const coachId = session.user.id

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId } },
  })
  if (!relation) redirect('/coach/athletes')

  const athlete = await prisma.user.findUnique({
    where: { id: athleteId },
    select: { name: true },
  })
  if (!athlete) redirect('/coach/athletes')

  const [plan, gymTemplates, nutritionPlan, assignedWorkout, coachNutritionTemplates] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: 'ACTIVE' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { dayOfWeek: 'asc' },
              include: {
                workoutDay: {
                  include: { exercises: { include: { exercise: { select: { name: true } } }, orderBy: { order: 'asc' } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.workoutTemplate.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      include: {
        days: {
          where: { isRestDay: false },
          orderBy: { order: 'asc' },
          include: { exercises: { include: { exercise: { select: { name: true } } }, orderBy: { order: 'asc' } } },
        },
      },
    }),
    prisma.nutritionPlan.findUnique({
      where: { userId: athleteId },
      select: {
        targetKcalHard: true, targetKcalEasy: true, targetKcalRest: true,
        proteinG: true, carbsHardG: true, carbsEasyG: true, fatG: true,
      },
    }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId, isActive: true },
      include: {
        template: {
          include: {
            days: {
              where: { isRestDay: false },
              orderBy: { order: 'asc' },
              include: { exercises: { include: { exercise: { select: { name: true } } }, orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    }),
    prisma.nutritionTemplate.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    }),
  ])

  const planData = plan
    ? {
        id: plan.id,
        name: plan.name,
        totalWeeks: plan.totalWeeks,
        startDate: plan.startDate.toISOString(),
        weeks: plan.weeks.map((w) => ({
          id: w.id,
          weekNumber: w.weekNumber,
          phase: w.phase as string,
          focusDescription: w.focusDescription,
          isRecoveryWeek: w.isRecoveryWeek,
          volumeKm: w.volumeKm ?? null,
          startDate: w.startDate.toISOString(),
          endDate: w.endDate.toISOString(),
          sessions: w.sessions.map((s) => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            type: s.type as string,
            durationMin: s.durationMin,
            distanceKm:  s.distanceKm ?? null,
            zoneTarget:  s.zoneTarget,
            detailText:  s.detailText,
            sportLabel:  s.sportLabel ?? null,
            workoutDayId: s.workoutDayId ?? null,
            workoutDay: s.workoutDay
              ? {
                  id: s.workoutDay.id,
                  label: s.workoutDay.label,
                  exercises: s.workoutDay.exercises.map(e => ({
                    name: e.exercise.name,
                    sets: e.sets,
                    repsScheme: e.repsScheme,
                  })),
                }
              : null,
          })),
        })),
      }
    : null

  const gymTemplatesData = gymTemplates.map(t => ({
    id: t.id,
    name: t.name,
    days: t.days.map(d => ({
      id: d.id,
      label: d.label,
      muscleGroups: d.muscleGroups,
      exercises: d.exercises.map(e => ({ name: e.exercise.name, sets: e.sets, repsScheme: e.repsScheme })),
    })),
  }))

  const assignedRoutineData = assignedWorkout
    ? {
        id: assignedWorkout.id,
        name: assignedWorkout.template.name,
        daysPerWeek: assignedWorkout.template.daysPerWeek,
        days: assignedWorkout.template.days.map(d => ({
          id: d.id,
          dayOfWeek: d.dayOfWeek,
          label: d.label,
          muscleGroups: d.muscleGroups,
          exerciseCount: d.exercises.length,
        })),
      }
    : null

  return (
    <PlanBuilderClient
      athleteId={athleteId}
      athleteName={athlete.name ?? 'Atleta'}
      initialPlan={planData}
      gymTemplates={gymTemplatesData}
      nutritionPlan={nutritionPlan}
      assignedRoutine={assignedRoutineData}
      coachNutritionTemplates={coachNutritionTemplates}
      linkedNutritionTemplateId={plan?.nutritionTemplateId ?? null}
    />
  )
}
