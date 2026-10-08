import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'
import { getPlanWeekNumber } from '@/lib/core/week_number'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'plan')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:plan`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: mobile.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: {
            orderBy: { dayOfWeek: 'asc' },
            include: { log: true },
          },
        },
      },
    },
  })

  if (!plan) {
    const lastCompleted = await prisma.trainingPlan.findFirst({
      where: { userId: mobile.id, status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      select: {
        name: true,
        totalWeeks: true,
        endDate: true,
        weeks: { select: { sessions: { select: { log: { select: { id: true } } } } } },
      },
    })
    if (!lastCompleted) return NextResponse.json(null)
    const allSessions = lastCompleted.weeks.flatMap(w => w.sessions)
    return NextResponse.json({
      lastCompletedPlan: {
        name: lastCompleted.name,
        totalWeeks: lastCompleted.totalWeeks,
        endDate: lastCompleted.endDate?.toISOString() ?? null,
        sessionsLogged: allSessions.filter(s => s.log).length,
        sessionsTotal: allSessions.length,
      },
    })
  }

  const currentWeek = getPlanWeekNumber(plan.startDate, plan.totalWeeks)

  return NextResponse.json({
    id: plan.id,
    name: plan.name,
    currentWeek,
    totalWeeks: plan.totalWeeks,
    weeks: plan.weeks.map(w => ({
      id: w.id,
      weekNumber: w.weekNumber,
      phase: w.phase,
      volumeKm: w.volumeKm ?? 0,
      focusDescription: w.focusDescription ?? null,
      isRecoveryWeek: w.isRecoveryWeek,
      sessions: w.sessions.map(s => ({
        id: s.id,
        type: s.type,
        durationMin: s.durationMin,
        zoneTarget: s.zoneTarget ?? '',
        dayOfWeek: s.dayOfWeek,
        coachNote: s.coachNote ?? null,
        sportLabel: s.sportLabel ?? null,
        detailText: s.detailText ?? null,
        structure: s.structure ?? null,
        intensity: s.intensity ?? null,
        completed: !!s.log,
        log: s.log ? {
          id: s.log.id,
          durationMin: s.log.durationMin ?? null,
          distanceKm: s.log.distanceKm ?? null,
          rpe: s.log.rpe ?? null,
          hrAvg: s.log.hrAvg ?? null,
          notes: s.log.notes ?? null,
        } : null,
      })),
    })),
  })
}
