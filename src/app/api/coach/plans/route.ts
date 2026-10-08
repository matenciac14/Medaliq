import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

// GET /api/coach/plans — returns all plans from coach's athletes (for plan duplication UI)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:coach-plans`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const coachId = session.user.id

  const relations = await prisma.coachAthlete.findMany({
    where: { coachId, status: 'ACTIVE' },
    take: 200,
    include: {
      athlete: {
        select: {
          id: true,
          name: true,
          trainingPlans: {
            where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { id: true, name: true, totalWeeks: true, startDate: true, status: true },
          },
        },
      },
    },
  })

  const plans = relations.flatMap((rel) =>
    rel.athlete.trainingPlans.map((p) => ({
      planId:      p.id,
      planName:    p.name,
      totalWeeks:  p.totalWeeks,
      startDate:   p.startDate.toISOString(),
      status:      p.status,
      athleteId:   rel.athlete.id,
      athleteName: rel.athlete.name ?? 'Atleta',
    }))
  )

  return NextResponse.json({ plans })
}
