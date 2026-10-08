import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getWeekSessions } from '@/domain/dashboard/get_week_sessions.use_case'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:week-sessions`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0') || 0
  const tz = req.nextUrl.searchParams.get('tz') || undefined

  if (Math.abs(weekOffset) > 52) {
    return NextResponse.json({ error: 'weekOffset fuera de rango' }, { status: 400 })
  }

  const result = await getWeekSessions({ userId: mobile.id, weekOffset, tz }, prisma)
  return NextResponse.json(result)
}
