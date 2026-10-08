import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:log-history`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = mobile.id

  // R1: Free users only see last 30 days of history
  const historyDateFilter = mobile.userPlan === 'FREE'
    ? { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    : undefined

  const [runLogs, gymSessions] = await Promise.all([
    prisma.sessionLog.findMany({
      where: { userId, ...(historyDateFilter ? { completedAt: historyDateFilter } : {}) },
      orderBy: { completedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        freeSessionType: true,
        completedAt: true,
        durationMin: true,
        distanceKm: true,
        rpe: true,
        hrAvg: true,
        notes: true,
        disciplineRef: { select: { slug: true, nameEs: true, icon: true, color: true } },
      },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true, ...(historyDateFilter ? { date: historyDateFilter } : {}) },
      orderBy: { date: 'desc' },
      take: 30,
      select: {
        id: true,
        date: true,
        durationMin: true,
        rpe: true,
        notes: true,
        assignedWorkout: {
          select: { template: { select: { name: true } } },
        },
        setLogs: {
          select: { exerciseName: true, workoutExercise: { select: { exercise: { select: { nameEs: true, name: true } } } } },
          take: 3,
          orderBy: { setNumber: 'asc' },
        },
      },
    }),
  ])

  type FeedEntry =
    | { kind: 'run'; id: string; date: string; sessionType: string; disciplineInfo: { slug: string; nameEs: string; icon: string; color: string } | null; durationMin: number | null; distanceKm: number | null; rpe: number | null; hrAvg: number | null; notes: string | null }
    | { kind: 'gym'; id: string; date: string; templateName: string | null; exercises: string[]; durationMin: number | null; rpe: number | null; notes: string | null }

  const feed: FeedEntry[] = [
    ...runLogs.map(l => ({
      kind: 'run' as const,
      id: l.id,
      date: (l.completedAt ?? new Date()).toISOString(),
      sessionType: l.freeSessionType ?? 'OTRO',
      disciplineInfo: l.disciplineRef ?? null,
      durationMin: l.durationMin,
      distanceKm: l.distanceKm ? Number(l.distanceKm) : null,
      rpe: l.rpe,
      hrAvg: l.hrAvg,
      notes: l.notes,
    })),
    ...gymSessions.map(s => {
      const exerciseNames = [...new Set(
        s.setLogs.map(sl => sl.workoutExercise?.exercise?.nameEs ?? sl.workoutExercise?.exercise?.name ?? sl.exerciseName).filter(Boolean)
      )] as string[]
      return {
        kind: 'gym' as const,
        id: s.id,
        date: s.date.toISOString(),
        templateName: s.assignedWorkout?.template?.name ?? null,
        exercises: exerciseNames,
        durationMin: s.durationMin,
        rpe: s.rpe,
        notes: s.notes,
      }
    }),
  ]

  feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({ sessions: feed.slice(0, 40) })
}
