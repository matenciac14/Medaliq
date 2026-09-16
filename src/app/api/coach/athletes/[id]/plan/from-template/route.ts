import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getTemplate } from '@/domain/plan/templates'
import { getSessionIntensity } from '@/domain/plan/intensity'
import { calcPlanEndDate } from '@/domain/plan/custom_plan'
import type { SessionType } from '@/generated/prisma/client'
import { forceMonday } from '@/lib/core/date_utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id: athleteId } = await params
  const coachId = session.user.id

  const relation = await prisma.coachAthlete.findFirst({ where: { coachId, athleteId, status: 'ACTIVE' } })
  if (!relation) return NextResponse.json({ error: 'Asesorado no encontrado.' }, { status: 404 })

  const body = await req.json() as { templateId?: string; name?: string; startDate?: string }
  const { templateId, name, startDate } = body

  if (!templateId) return NextResponse.json({ error: 'templateId es requerido.' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre del plan es requerido.' }, { status: 400 })
  if (!startDate) return NextResponse.json({ error: 'startDate es requerido.' }, { status: 400 })

  const template = getTemplate(templateId)
  if (!template) return NextResponse.json({ error: 'Template no encontrado.' }, { status: 400 })

  const rawStart = new Date(startDate)
  if (isNaN(rawStart.getTime())) return NextResponse.json({ error: 'startDate inválido.' }, { status: 400 })
  const start = forceMonday(rawStart)

  const end = calcPlanEndDate(start, template.totalWeeks)

  const planId = await prisma.$transaction(async (tx) => {
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
        // Template uses 1=Mon,7=Sun → builder/DB uses 0=Mon,6=Sun
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

  const created = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: { sessions: { orderBy: { dayOfWeek: 'asc' } } },
      },
    },
  })

  const planData = {
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
  }

  return NextResponse.json({ planId, plan: planData }, { status: 201 })
}
