import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { CoachNutritionProposalRepository } from '@/infrastructure/db/coach_nutrition_proposal.repository'
import { requireFeature } from '@/lib/guards/feature_gate'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'nutrition')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:proposals`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const repo = new CoachNutritionProposalRepository(prisma)
  const proposals = await repo.findPendingForAthlete(mobile.id)
  return NextResponse.json(proposals)
}
