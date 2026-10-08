import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { requireFeature } from '@/lib/guards/feature_gate'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getProgressData } from '@/domain/progress/get_progress_data.use_case'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:progress`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'progress')
  if (featureGuard) return featureGuard

  const result = await getProgressData(mobile.id, prisma)
  return NextResponse.json(result)
}
