import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { mapCoachAthleteRelation } from '@/infrastructure/db/coach_athlete.mapper'

const TAKE = 20

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:coach-dashboard-athletes`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const coachId = session.user.id
  const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined

  const now = new Date()

  const relations = await prisma.coachAthlete.findMany({
    where: { coachId },
    take: TAKE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'asc' },
    include: {
      athlete: {
        include: {
          profile: true,
          trainingPlans: {
            where: { status: 'ACTIVE' },
            take: 1,
            include: {
              weeks: {
                where: { startDate: { lte: now } },
                orderBy: { weekNumber: 'asc' },
                include: {
                  sessions: {
                    where: { date: { lte: now } },
                    include: { log: { select: { id: true } } },
                  },
                },
              },
            },
          },
          checkIns: {
            orderBy: { recordedAt: 'desc' },
            take: 2,
            select: {
              recordedAt: true,
              weightKg: true,
              hrResting: true,
              hardestSessionRpe: true,
              adjustmentsTriggered: true,
              weekNumber: true,
            },
          },
          athleteAssignments: {
            where: { isActive: true },
            take: 1,
            select: {
              isActive: true,
              startDate: true,
              template: { select: { daysPerWeek: true } },
            },
          },
          _count: {
            select: { gymSessions: { where: { completed: true } } },
          },
        },
      },
    },
  })

  const hasMore = relations.length > TAKE
  const page = hasMore ? relations.slice(0, TAKE) : relations
  const nextCursor = hasMore ? page[page.length - 1].id : null
  const athletes = page.map((rel) => mapCoachAthleteRelation(rel, now))

  return NextResponse.json({ athletes, hasMore, nextCursor })
}
