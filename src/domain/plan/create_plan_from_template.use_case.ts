import type { PrismaClient } from '../../generated/prisma/client'
import type { SessionType } from '../../generated/prisma/enums'
import { getTemplate } from '@/domain/plan/templates'
import { getSessionIntensity } from '@/domain/plan/intensity'
import { calcPlanEndDate } from '@/domain/plan/custom_plan'
import { forceMonday } from '@/lib/core/date_utils'

// ── Use case ─────────────────────────────────────────────────────────────────

export async function createPlanFromTemplateUseCase(
  input: { coachId: string; athleteId: string; templateId: string; name: string; startDate: string },
  db: PrismaClient,
) {
  const { coachId, athleteId, templateId, name, startDate } = input

  const relation = await db.coachAthlete.findFirst({ where: { coachId, athleteId, status: 'ACTIVE' } })
  if (!relation) throw { status: 404, message: 'Asesorado no encontrado.' }

  if (!templateId) throw { status: 400, message: 'templateId es requerido.' }
  if (!name?.trim()) throw { status: 400, message: 'El nombre del plan es requerido.' }
  if (!startDate) throw { status: 400, message: 'startDate es requerido.' }

  const template = getTemplate(templateId)
  if (!template) throw { status: 400, message: 'Template no encontrado.' }

  const rawStart = new Date(startDate)
  if (isNaN(rawStart.getTime())) throw { status: 400, message: 'startDate inválido.' }
  const start = forceMonday(rawStart)
  const end = calcPlanEndDate(start, template.totalWeeks)

  const planId = await db.$transaction(async (tx) => {
    await tx.trainingPlan.updateMany({
      where: { userId: athleteId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    })

    const plan = await tx.trainingPlan.create({
      data: {
        userId: athleteId,
        name: name.trim(),
        totalWeeks: template.totalWeeks,
        startDate: start,
        endDate: end,
        status: 'ACTIVE',
        generatedBy: 'COACH',
        hrZones: {},
      },
    })

    const weeksData = template.weeks.map((w) => {
      const weekStart = new Date(start)
      weekStart.setDate(weekStart.getDate() + (w.weekNumber - 1) * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return {
        planId: plan.id,
        weekNumber: w.weekNumber,
        phase: w.phase,
        volumeKm: w.volumeKm,
        isRecoveryWeek: w.isRecoveryWeek,
        focusDescription: w.focusDescription,
        startDate: weekStart,
        endDate: weekEnd,
      }
    })

    await tx.planWeek.createMany({ data: weeksData })

    const createdWeeks = await tx.planWeek.findMany({
      where: { planId: plan.id },
      orderBy: { weekNumber: 'asc' },
      select: { id: true, weekNumber: true, startDate: true },
    })

    const weekById = new Map(createdWeeks.map((w) => [w.weekNumber, w]))

    const sessionsData = template.weeks.flatMap((wt) =>
      wt.sessions.map((s) => {
        const week = weekById.get(wt.weekNumber)!
        const dayOfWeek = s.dayOfWeek - 1
        const sessionDate = new Date(week.startDate)
        sessionDate.setDate(sessionDate.getDate() + dayOfWeek)
        return {
          weekId: week.id,
          dayOfWeek,
          type: s.type as SessionType,
          intensity: getSessionIntensity(s.type),
          durationMin: s.durationMin,
          zoneTarget: s.zoneTarget || null,
          detailText: s.structure || null,
          sportLabel: null as null,
          workoutDayId: null as null,
          date: sessionDate,
        }
      })
    )

    await tx.plannedSession.createMany({ data: sessionsData })

    return plan.id
  }, { timeout: 30_000 })

  // Load created plan with full structure for response
  const created = await db.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: { sessions: { orderBy: { dayOfWeek: 'asc' } } },
      },
    },
  })

  return {
    planId,
    plan: {
      id: created!.id,
      name: created!.name,
      totalWeeks: created!.totalWeeks,
      startDate: created!.startDate.toISOString(),
      weeks: created!.weeks.map((w) => ({
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
          type: s.type,
          durationMin: s.durationMin,
          zoneTarget: s.zoneTarget ?? null,
          detailText: s.detailText ?? null,
          sportLabel: s.sportLabel ?? null,
          workoutDayId: s.workoutDayId ?? null,
          workoutDay: null,
        })),
      })),
    },
  }
}
