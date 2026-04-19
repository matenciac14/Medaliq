import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import ProfileClient from './_components/ProfileClient'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [dbUser, plan, logs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        goals: { where: { status: 'ACTIVE' }, take: 1 },
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE' },
      select: { name: true, totalWeeks: true },
    }),
    prisma.dailyLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
      take: 14,
    }),
  ])

  if (!dbUser) redirect('/login')

  const p = dbUser.profile

  return (
    <ProfileClient
      user={{
        name: dbUser.name ?? dbUser.email ?? 'Atleta',
        email: dbUser.email ?? '',
        profile: p ? {
          age: p.age,
          heightCm: p.heightCm,
          weightKg: p.weightKg,
          weightGoalKg: p.weightGoalKg ?? null,
          hrResting: p.hrResting ?? null,
          hrMax: p.hrMax ?? null,
          injuries: p.injuries,
          conditions: p.conditions,
          sleepHoursAvg: p.sleepHoursAvg ?? null,
        } : null,
        goal: dbUser.goals[0] ? {
          type: dbUser.goals[0].type,
          raceDate: dbUser.goals[0].raceDate?.toISOString() ?? null,
        } : null,
        plan: plan ? { name: plan.name, totalWeeks: plan.totalWeeks } : null,
        dailyLogs: logs.map(l => ({
          id: l.id,
          date: l.date.toISOString().split('T')[0],
          weightKg: l.weightKg ?? null,
          hrResting: l.hrResting ?? null,
          sleepHours: l.sleepHours ?? null,
          energyLevel: l.energyLevel ?? null,
          notes: l.notes ?? null,
        })),
      }}
    />
  )
}
