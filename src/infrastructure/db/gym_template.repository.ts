import type { PrismaDbClient } from '@/lib/db/prisma_client'

export async function getCoachRoutines(coachId: string, db: PrismaDbClient) {
  return db.workoutTemplate.findMany({
    where: { coachId },
    include: {
      days: {
        include: { exercises: { include: { exercise: true } } },
        orderBy: { order: 'asc' },
      },
      assignments: {
        where: { isActive: true },
        select: { id: true, athleteId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}
