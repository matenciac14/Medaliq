import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { buildCustomPlanWeeks, calcPlanEndDate } from '@/domain/plan/custom_plan'
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

  const body = await req.json() as { name?: string; totalWeeks?: number; startDate?: string }
  const { name, totalWeeks, startDate } = body

  if (!name?.trim()) return NextResponse.json({ error: 'El nombre del plan es requerido.' }, { status: 400 })
  if (!totalWeeks || totalWeeks < 1 || totalWeeks > 52) return NextResponse.json({ error: 'totalWeeks debe estar entre 1 y 52.' }, { status: 400 })
  if (!startDate) return NextResponse.json({ error: 'startDate es requerido.' }, { status: 400 })

  const rawStart = new Date(startDate)
  if (isNaN(rawStart.getTime())) return NextResponse.json({ error: 'startDate inválido.' }, { status: 400 })
  const start = forceMonday(rawStart)

  const end = calcPlanEndDate(start, totalWeeks)

  // ── Transacción: desactivar plan anterior + crear plan + semanas ───────────

  const planId = await prisma.$transaction(async (tx) => {
    await tx.trainingPlan.updateMany({
      where: { userId: athleteId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    })

    const plan = await tx.trainingPlan.create({
      data: {
        userId: athleteId,
        name: name.trim(),
        totalWeeks,
        startDate: start,
        endDate: end,
        status: 'ACTIVE',
        generatedBy: 'COACH',
        hrZones: {},
      },
    })

    await tx.planWeek.createMany({ data: buildCustomPlanWeeks(plan.id, start, totalWeeks) })

    return plan.id
  }, { timeout: 15_000 })

  // ── Retornar plan completo para el builder ─────────────────────────────────

  const created = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: { sessions: true },
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
      sessions: [],
    })),
  }

  return NextResponse.json({ planId, plan: planData }, { status: 201 })
}
