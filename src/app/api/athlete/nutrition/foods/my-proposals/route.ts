import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaFoodProposalRepository } from '@/infrastructure/db/food_proposal.repository'
import { rateLimitAsync } from '@/lib/rate_limit'

const repo = new PrismaFoodProposalRepository()

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }
  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-my-proposals`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const proposals = await repo.listByUser(session.user.id)
  return NextResponse.json({ proposals })
}
