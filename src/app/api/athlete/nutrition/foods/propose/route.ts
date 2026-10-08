import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { rateLimitAsync } from '@/lib/rate_limit'
import { PrismaFoodProposalRepository } from '@/infrastructure/db/food_proposal.repository'

const VALID_CATEGORIES = ['PROTEIN', 'CARB', 'FAT', 'VEGETABLE', 'FRUIT', 'DAIRY', 'LEGUME', 'OTHER']

const Schema = z.object({
  name:           z.string().min(2).max(120),
  category:       z.enum(VALID_CATEGORIES as [string, ...string[]]),
  kcalPer100g:    z.number().positive().max(1000),
  proteinPer100g: z.number().min(0).max(100),
  carbsPer100g:   z.number().min(0).max(100),
  fatPer100g:     z.number().min(0).max(100),
  servingG:       z.number().positive().max(2000).optional(),
  servingLabel:   z.string().max(80).optional(),
  country:        z.string().length(2).optional().nullable(),
  notes:          z.string().max(500).optional().nullable(),
})

const repo = new PrismaFoodProposalRepository()

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`propose-food:${session.user.id}`, { limit: 10, windowMs: 3_600_000 })
  if (!allowed) return NextResponse.json({ error: 'Límite de propuestas por hora alcanzado.' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const result = await repo.propose({ submittedById: session.user.id, ...parsed.data })
  return NextResponse.json(result, { status: 201 })
}
