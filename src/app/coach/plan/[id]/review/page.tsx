import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import PlanReviewClient from './_components/PlanReviewClient'

export default async function PlanReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: planId } = await params

  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const coachId = session.user.id

  // Fetch real plan with weeks + sessions from DB
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: { orderBy: { dayOfWeek: 'asc' } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  if (!plan) {
    redirect('/coach/dashboard')
  }

  // Verify coach owns this athlete
  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId: plan.userId },
  })

  if (!relation) {
    redirect('/coach/dashboard')
  }

  // Serialize for client component
  const planData = {
    id: plan.id,
    name: plan.name,
    totalWeeks: plan.totalWeeks,
    startDate: plan.startDate.toISOString(),
    endDate: plan.endDate.toISOString(),
    status: plan.status,
    generatedBy: plan.generatedBy,
    weeks: plan.weeks.map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      phase: w.phase,
      focusDescription: w.focusDescription,
      isRecoveryWeek: w.isRecoveryWeek,
      volumeKm: w.volumeKm,
      sessions: w.sessions.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        type: s.type,
        durationMin: s.durationMin,
        detailText: s.detailText,
        zoneTarget: s.zoneTarget,
        coachNote: s.coachNote,
      })),
    })),
    user: {
      id: plan.user.id,
      name: plan.user.name,
      email: plan.user.email,
    },
  }

  return <PlanReviewClient plan={planData} athleteId={plan.userId} />
}
