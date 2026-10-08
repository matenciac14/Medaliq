import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { resolveDisciplineId } from '@/domain/discipline/discipline_resolver'
import { rateLimitAsync } from '@/lib/rate_limit'

const VALID_RUN_TYPES = ['RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA', 'OTRO'] as const

const LogRunSchema = z.object({
  type: z.enum(VALID_RUN_TYPES),
  durationMin: z.number().int().min(0).max(600).optional(),
  distanceKm: z.number().min(0).max(1000).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:log-run`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id
  const parsed = LogRunSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })

  const { type, durationMin, distanceKm, rpe, notes } = parsed.data

  const disciplineId = await resolveDisciplineId('RUNNING')
  const log = await prisma.sessionLog.create({
    data: {
      userId,
      plannedSessionId: null,
      freeSessionType: type,
      completedAt: new Date(),
      durationMin: durationMin ?? null,
      distanceKm: distanceKm ?? null,
      rpe: rpe ?? null,
      notes: notes ?? null,
      discipline: 'RUNNING',
      disciplineId,
    },
  })

  return NextResponse.json({ ok: true, id: log.id })
}
