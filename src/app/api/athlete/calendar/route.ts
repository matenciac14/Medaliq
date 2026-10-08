import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildCalendarWeek } from '@/infrastructure/db/calendar'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:calendar`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0', 10)
  if (isNaN(weekOffset) || weekOffset < -52 || weekOffset > 52) {
    return NextResponse.json({ error: 'Invalid weekOffset' }, { status: 400 })
  }

  const timezone = req.nextUrl.searchParams.get('tz') || undefined
  const week = await buildCalendarWeek(session.user.id, weekOffset, timezone)
  return NextResponse.json(week)
}
