import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { forceMonday } from '@/lib/core/date_utils'

const Schema = z.object({
  sourcePlanId: z.string().min(1),
  startDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
})

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const coachId = session.user.id
  const { id: targetAthleteId } = await params

  // Verify coach owns the target athlete
  const targetRelation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId: targetAthleteId, status: 'ACTIVE' },
  })
  if (!targetRelation) {
    return NextResponse.json({ error: 'Atleta no encontrado.' }, { status: 404 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }
  const { sourcePlanId, startDate } = parsed.data

  // Read source plan (verify coach also owns the source athlete)
  const sourcePlan = await prisma.trainingPlan.findFirst({
    where: { id: sourcePlanId },
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
  })
  if (!sourcePlan) {
    return NextResponse.json({ error: 'Plan de origen no encontrado.' }, { status: 404 })
  }

  // Verify coach owns the source plan's athlete
  const sourceRelation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId: sourcePlan.userId },
  })
  if (!sourceRelation) {
    return NextResponse.json({ error: 'No tienes acceso al plan de origen.' }, { status: 403 })
  }

  const newStartDate = forceMonday(new Date(startDate))

  try {
    const newPlan = await prisma.$transaction(async (tx) => {
      // Deactivate existing active plans for the target athlete
      await tx.trainingPlan.updateMany({
        where: { userId: targetAthleteId, status: 'ACTIVE' },
        data:  { status: 'COMPLETED' },
      })

      const endDate = addDays(newStartDate, sourcePlan.totalWeeks * 7 - 1)

      // Create the new plan
      const plan = await tx.trainingPlan.create({
        data: {
          userId:      targetAthleteId,
          name:        `${sourcePlan.name} (copia)`,
          totalWeeks:  sourcePlan.totalWeeks,
          startDate:   newStartDate,
          endDate,
          status:      'ACTIVE',
          generatedBy: 'COACH',
          goalType:    sourcePlan.goalType,
          hrZones:     sourcePlan.hrZones ?? {},
        },
      })

      // Copy weeks + sessions with recalculated dates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allSessionsData: any[] = []

      for (const week of sourcePlan.weeks) {
        const weekStart = addDays(newStartDate, (week.weekNumber - 1) * 7)
        const weekEnd   = addDays(weekStart, 6)

        const newWeek = await tx.planWeek.create({
          data: {
            planId:           plan.id,
            weekNumber:       week.weekNumber,
            phase:            week.phase,
            focusDescription: week.focusDescription,
            isRecoveryWeek:   week.isRecoveryWeek,
            volumeKm:         week.volumeKm,
            startDate:        weekStart,
            endDate:          weekEnd,
          },
        })

        for (const s of week.sessions) {
          allSessionsData.push({
            weekId:       newWeek.id,
            dayOfWeek:    s.dayOfWeek,
            type:         s.type,
            intensity:    s.intensity,
            durationMin:  s.durationMin ?? undefined,
            zoneTarget:   s.zoneTarget ?? undefined,
            structure:    s.structure ?? undefined,
            detailText:   s.detailText ?? undefined,
            sportLabel:   s.sportLabel ?? undefined,
            date:         addDays(weekStart, s.dayOfWeek - 1),
            workoutDayId: s.workoutDayId ?? undefined,
          })
        }
      }

      if (allSessionsData.length > 0) {
        await tx.plannedSession.createMany({ data: allSessionsData })
      }

      return plan
    }, { timeout: 30_000 })

    return NextResponse.json({ ok: true, planId: newPlan.id }, { status: 201 })
  } catch (err) {
    console.error('[plan/copy-from]', err)
    return NextResponse.json({ error: 'Error al copiar el plan.' }, { status: 500 })
  }
}
