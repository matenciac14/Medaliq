import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import CreateTemplateClient from './_components/CreateTemplateClient'

export default async function NutritionBuilderIndexPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  // Atletas B2B usan plantillas del coach — no pueden crear las propias
  const coachRelation = await prisma.coachAthlete.findFirst({
    where: { athleteId: userId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (coachRelation) redirect('/nutrition')

  // Si ya tiene plantillas, ir directo al editor de la primera
  const existing = await prisma.nutritionTemplate.findFirst({
    where: { athleteId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (existing) redirect(`/nutrition/builder/${existing.id}`)

  // Metas diarias para el sidebar
  const nutritionPlan = await prisma.nutritionPlan.findUnique({
    where: { userId },
    select: {
      targetKcalHard: true,
      targetKcalEasy: true,
      targetKcalRest: true,
    },
  })

  return (
    <CreateTemplateClient
      targets={nutritionPlan ? {
        hard: nutritionPlan.targetKcalHard,
        easy: nutritionPlan.targetKcalEasy,
        rest: nutritionPlan.targetKcalRest,
      } : null}
    />
  )
}
