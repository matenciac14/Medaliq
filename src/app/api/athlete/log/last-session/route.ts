import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

// GET /api/athlete/log/last-session?type=RODAJE_Z2
// Devuelve la última sesión libre del atleta de ese tipo para mostrar comparativa
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:log-last-session`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const type = req.nextUrl.searchParams.get('type')
  if (!type) return NextResponse.json({ error: 'Tipo requerido' }, { status: 400 })

  const log = await prisma.sessionLog.findFirst({
    where: { userId: session.user.id, freeSessionType: type as never },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      completedAt: true,
      durationMin: true,
      distanceKm: true,
      rpe: true,
      notes: true,
    },
  })

  return NextResponse.json({ log: log ?? null })
}
