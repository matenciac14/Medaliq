import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'
import { evaluateAndAdjust } from '@/lib/plan/adjustments'

interface CheckInBody {
  weightKg?: number
  hrResting?: number
  sleepHours?: number
  sleepScore?: number
  hardestRpe: number
  adherencePct: number
  hasPain: boolean
  painDescription?: string
  energyLevel: number
  notes?: string
  previousWeightKg?: number
  previousHrResting?: number
}

function evaluateAlerts(data: CheckInBody): string[] {
  const alerts: string[] = []

  if (data.hrResting && data.previousHrResting && data.hrResting > data.previousHrResting * 1.10) {
    alerts.push('FC reposo elevada — considera un dia extra de descanso')
  }
  if (data.sleepScore && data.sleepScore < 70) {
    alerts.push('Sleep score bajo — revisa tus habitos de sueno')
  }
  if (data.weightKg && data.previousWeightKg && (data.previousWeightKg - data.weightKg) > 1.2) {
    alerts.push('Bajaste mas de 1.2kg esta semana — aumenta 200-300 kcal')
  }
  if (data.adherencePct !== undefined && data.adherencePct < 40) {
    alerts.push('Adherencia baja — necesitas ajustar la carga del plan?')
  }

  return alerts
}

function getCurrentWeekNumber(startDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - startDate.getTime()
  return Math.max(1, Math.floor(elapsed / msPerWeek) + 1)
}

function getISOWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil(((now.getTime() - start.getTime()) / msPerWeek) + 1)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = session.user.id
  const body: CheckInBody = await req.json()

  // Calcular weekNumber desde el plan activo o usar semana ISO del año
  let weekNumber: number

  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { weeks: { orderBy: { weekNumber: 'asc' }, take: 1 } },
  })

  if (activePlan) {
    weekNumber = getCurrentWeekNumber(activePlan.startDate)
  } else {
    weekNumber = getISOWeekNumber()
  }

  const alerts = evaluateAlerts(body)

  // Obtener contexto del plan para el motor de ajuste
  const planContext = activePlan
    ? {
        currentWeek: getCurrentWeekNumber(activePlan.startDate),
        totalWeeks: activePlan.totalWeeks,
        phase: activePlan.weeks[0]?.phase ?? 'BASE',
        weeklyVolumeKm: activePlan.weeks[0]?.volumeKm ?? undefined,
        isRecoveryWeek: activePlan.weeks[0]?.isRecoveryWeek ?? false,
      }
    : { currentWeek: 1, totalWeeks: 18, phase: 'BASE' }

  // Evaluar ajustes con motor + AI
  const adjustmentResult = await evaluateAndAdjust(
    {
      weightKg: body.weightKg,
      hrResting: body.hrResting,
      sleepHours: body.sleepHours,
      sleepScore: body.sleepScore,
      hardestSessionRpe: body.hardestRpe,
      dietAdherencePct: body.adherencePct,
      painFlag: body.hasPain,
      energyLevel: body.energyLevel,
      notes: body.notes,
    },
    planContext
  )

  const checkInData = {
    weightKg: body.weightKg,
    hrResting: body.hrResting,
    sleepHours: body.sleepHours,
    sleepScore: body.sleepScore,
    hardestSessionRpe: body.hardestRpe,
    dietAdherencePct: body.adherencePct,
    painFlag: body.hasPain,
    energyLevel: body.energyLevel,
    notes: body.notes,
    adjustmentsTriggered: adjustmentResult.triggers,
    recordedAt: new Date(),
  }

  await prisma.weeklyCheckIn.upsert({
    where: { userId_weekNumber: { userId, weekNumber } },
    update: { ...checkInData },
    create: { userId, weekNumber, ...checkInData },
  })

  // Si es el primer check-in, activar features.progress
  const checkInCount = await prisma.weeklyCheckIn.count({ where: { userId } })
  if (checkInCount === 1) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { config: true },
    })
    if (user) {
      const config = parseUserConfig(user.config)
      config.features.progress = true
      await prisma.user.update({
        where: { id: userId },
        data: { config: config as any },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    alerts,
    adjustment: {
      severity: adjustmentResult.severity,
      recommendation: adjustmentResult.recommendation,
      adjustments: adjustmentResult.adjustments,
    },
  })
}
