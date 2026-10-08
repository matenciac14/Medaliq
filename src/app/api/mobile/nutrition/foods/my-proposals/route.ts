import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { PrismaFoodProposalRepository } from '@/infrastructure/db/food_proposal.repository'
import { requireFeature } from '@/lib/guards/feature_gate'

const repo = new PrismaFoodProposalRepository()

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'nutrition')
  if (gate) return gate

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:my-proposals`, { limit: 120, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const proposals = await repo.listByUser(mobile.id)
  return NextResponse.json({ proposals })
}
