import type { PrismaClient } from '../../generated/prisma/client'
import { z } from 'zod'
import { forceMonday } from '@/lib/core/date_utils'

// ── Schema ───────────────────────────────────────────────────────────────────

export const copyPlanSchema = z.object({
  sourcePlanId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
})

// ── Helper ───────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// ── Use case ─────────────────────────────────────────────────────────────────

export async function copyPlanUseCase(
  input: { coachId: string; targetAthleteId: string; sourcePlanId: string; startDate: string },
  db: PrismaClient,
): Promise<{ planId: string }> {
  const { coachId, targetAthleteId, sourcePlanId, startDate } = input

  // Verify coach owns the target athlete
  const targetRelation = await db.coachAthlete.findFirst({
    where: { coachId, athleteId: targetAthleteId, status: 'ACTIVE' },
  })
  if (!targetRelation) throw { status: 404, message: 'Atleta no encontrado.' }

  // Read source plan
  const sourcePlan = await db.trainingPlan.findFirst({
    where: { id: sourcePlanId },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: { sessions: { orderBy: { dayOfWeek: 'asc' } } },
      },
    },
  })
  if (!sourcePlan) throw { status: 404, message: 'Plan de origen no encontrado.' }

  // Verify coach owns the source plan's athlete
  const sourceRelation = await db.coachAthlete.findFirst({
    where: { coachId, athleteId: sourcePlan.userId },
  })
  if (!sourceRelation) throw { status: 403, message: 'No tienes acceso al plan de origen.' }

  const newStartDate = forceMonday(new Date(startDate))

  const newPlan = await db.$transaction(async (tx) => {
    await tx.trainingPlan.updateMany({
      where: { userId: targetAthleteId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    })

    const endDate = addDays(newStartDate, sourcePlan.totalWeeks * 7 - 1)

    const plan = await tx.trainingPlan.create({
      data: {
        userId: targetAthleteId,
        name: `${sourcePlan.name} (copia)`,
        totalWeeks: sourcePlan.totalWeeks,
        startDate: newStartDate,
        endDate,
        status: 'ACTIVE',
        generatedBy: 'COACH',
        goalType: sourcePlan.goalType,
        hrZones: sourcePlan.hrZones ?? {},
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allSessionsData: any[] = []

    for (const week of sourcePlan.weeks) {
      const weekStart = addDays(newStartDate, (week.weekNumber - 1) * 7)
      const weekEnd = addDays(weekStart, 6)

      const newWeek = await tx.planWeek.create({
        data: {
          planId: plan.id,
          weekNumber: week.weekNumber,
          phase: week.phase,
          focusDescription: week.focusDescription,
          isRecoveryWeek: week.isRecoveryWeek,
          volumeKm: week.volumeKm,
          startDate: weekStart,
          endDate: weekEnd,
        },
      })

      for (const s of week.sessions) {
        allSessionsData.push({
          weekId: newWeek.id,
          dayOfWeek: s.dayOfWeek,
          type: s.type,
          intensity: s.intensity,
          durationMin: s.durationMin ?? undefined,
          zoneTarget: s.zoneTarget ?? undefined,
          structure: s.structure ?? undefined,
          detailText: s.detailText ?? undefined,
          sportLabel: s.sportLabel ?? undefined,
          date: addDays(weekStart, s.dayOfWeek - 1),
          workoutDayId: s.workoutDayId ?? undefined,
        })
      }
    }

    if (allSessionsData.length > 0) {
      await tx.plannedSession.createMany({ data: allSessionsData })
    }

    return plan
  }, { timeout: 30_000 })

  return { planId: newPlan.id }
}
