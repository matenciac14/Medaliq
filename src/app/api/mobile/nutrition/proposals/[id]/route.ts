import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { z } from 'zod'
import { respondCoachProposal, ProposalError } from '@/domain/nutrition/respond_coach_proposal.use_case'
import { requireFeature } from '@/lib/guards/feature_gate'

const bodySchema = z.object({
  action: z.enum(['ACCEPTED', 'REJECTED']),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'nutrition')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:proposal-respond`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const body = bodySchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  try {
    const result = await respondCoachProposal(prisma, {
      proposalId: id,
      athleteId: mobile.id,
      action: body.data.action,
    })
    return NextResponse.json(result.proposal)
  } catch (err) {
    if (err instanceof ProposalError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
