import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { requireFeature } from '@/lib/guards/feature_gate'
import { rateLimitAsync } from '@/lib/rate_limit'
import { GymCompleteSchema } from '@/domain/gym/gym_session.schemas'
import { completeGymSession, SessionNotFoundError } from '@/domain/gym/complete_session.orchestrator'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-complete`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'gym')
  if (featureGuard) return featureGuard

  const userRecord = await prisma.user.findUnique({ where: { id: mobile.id }, select: { name: true, timezone: true } })

  const parsed = GymCompleteSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })

  try {
    const result = await completeGymSession(mobile.id, userRecord?.name ?? null, userRecord?.timezone ?? null, parsed.data, prisma)
    return NextResponse.json(result, { status: result.alreadyCompleted ? 200 : 201 })
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    throw err
  }
}
