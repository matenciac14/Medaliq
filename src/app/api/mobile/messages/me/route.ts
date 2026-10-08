import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

// GET /api/mobile/messages/me — coachId + coachName del atleta
export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:messages-me`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const coachRelation = await prisma.coachAthlete.findFirst({
    where: { athleteId: mobile.id, status: 'ACTIVE' },
    select: { coach: { select: { id: true, name: true } } },
  })

  return NextResponse.json({
    id: mobile.id,
    coachId: coachRelation?.coach.id ?? null,
    coachName: coachRelation?.coach.name ?? null,
  })
}
