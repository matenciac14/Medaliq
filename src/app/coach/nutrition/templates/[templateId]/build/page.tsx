import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import NutritionBuilderClient from './_components/NutritionBuilderClient'

export default async function NutritionBuilderPage({
  params,
}: {
  params: Promise<{ templateId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') redirect('/login')

  const { templateId } = await params

  const template = await prisma.nutritionTemplate.findFirst({
    where: { id: templateId, coachId: session.user.id },
    include: {
      days: {
        orderBy: { dayType: 'asc' },
        include: {
          meals: {
            orderBy: { order: 'asc' },
            include: {
              items: {
                orderBy: { order: 'asc' },
                include: {
                  food: {
                    select: {
                      id: true, name: true, category: true,
                      kcalPer100g: true, proteinPer100g: true,
                      carbsPer100g: true, fatPer100g: true,
                      servingG: true, servingLabel: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!template) notFound()

  // Atletas activos del coach para el selector de asignación
  const athletes = await prisma.coachAthlete.findMany({
    where: { coachId: session.user.id, status: 'ACTIVE' },
    include: {
      athlete: {
        select: {
          id: true, name: true, email: true,
          assignedNutritionPlan: { select: { templateId: true } },
          trainingPlans: { where: { status: 'ACTIVE' }, select: { id: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <NutritionBuilderClient
      template={template}
      athletes={athletes.map((a) => ({
        id: a.athlete.id,
        name: a.athlete.name,
        email: a.athlete.email,
        assignedTemplateId: a.athlete.assignedNutritionPlan?.templateId ?? null,
        hasActivePlan: a.athlete.trainingPlans.length > 0,
      }))}
    />
  )
}
