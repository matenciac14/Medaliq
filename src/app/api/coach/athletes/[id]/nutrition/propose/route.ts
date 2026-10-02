import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { CoachNutritionProposalRepository } from '@/infrastructure/db/coach_nutrition_proposal.repository'
import { rateLimitAsync } from '@/lib/rate_limit'

const bodySchema = z.object({
  message:      z.string().min(10).max(300),
  deltaKcal:    z.number().int(),
  deltaProtein: z.number().int().default(0),
  deltaCarbs:   z.number().int().default(0),
  deltaFat:     z.number().int().default(0),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-propose`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params
  const coachId = session.user.id

  // Verificar que el atleta pertenece al coach
  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId, status: 'ACTIVE' },
  })
  if (!relation) return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })

  const body = bodySchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const repo = new CoachNutritionProposalRepository(prisma)
  const proposal = await repo.create({ coachId, athleteId, ...body.data })

  return NextResponse.json(proposal, { status: 201 })
}
