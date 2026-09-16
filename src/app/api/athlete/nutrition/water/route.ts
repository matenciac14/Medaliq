// NUT-WATER-01 — WaterLog endpoint
// GET  → { mlLogged, waterMlTarget } para hoy
// POST → body { delta: number } — upsert mlLogged += delta (mínimo 0)

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'
import { todayInTz } from '@/lib/core/date_utils'

async function getUserTimezone(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } })
  return u?.timezone ?? null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const tz = await getUserTimezone(userId)
  const today = todayInTz(tz)

  const [log, plan] = await Promise.all([
    prisma.waterLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.nutritionPlan.findUnique({ where: { userId }, select: { waterMlTarget: true } }),
  ])

  return NextResponse.json({
    mlLogged:      log?.mlLogged       ?? 0,
    waterMlTarget: plan?.waterMlTarget ?? 2000,
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json().catch(() => ({}))
  const delta = Number(body.delta)
  if (isNaN(delta) || delta === 0) return NextResponse.json({ error: 'delta requerido' }, { status: 400 })

  const tz = await getUserTimezone(userId)
  const today = todayInTz(tz)
  const dateStr = today.toISOString()

  // Atomic upsert — avoids read-then-write race condition on parallel taps
  const result = await prisma.$queryRaw<{ ml_logged: number }[]>`
    INSERT INTO "WaterLog" ("id", "userId", "date", "mlLogged")
    VALUES (gen_random_uuid(), ${userId}, ${dateStr}::timestamp, GREATEST(0, ${delta}))
    ON CONFLICT ("userId", "date")
    DO UPDATE SET "mlLogged" = GREATEST(0, "WaterLog"."mlLogged" + ${delta})
    RETURNING "mlLogged" AS ml_logged
  `

  return NextResponse.json({ mlLogged: result[0]?.ml_logged ?? 0 })
}
