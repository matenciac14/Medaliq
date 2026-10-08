import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { requireFeature } from '@/lib/guards/feature_gate'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getGymWeek } from '@/domain/gym/get_gym_week.use_case'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-week`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'gym')
  if (featureGuard) return featureGuard

  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0') || 0
  const selectedDow = parseInt(req.nextUrl.searchParams.get('selectedDow') ?? '0') || 0
  const tz = req.nextUrl.searchParams.get('tz') || undefined

  if (Math.abs(weekOffset) > 52) {
    return NextResponse.json({ error: 'weekOffset fuera de rango' }, { status: 400 })
  }

  const result = await getGymWeek({ athleteId: mobile.id, weekOffset, selectedDow, tz }, prisma)

  if (!result) {
    return NextResponse.json({ error: 'Sin rutina asignada' }, { status: 404 })
  }

  return NextResponse.json(result)
}
