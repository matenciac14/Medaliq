// NUT-WATER-01 (mobile) — WaterLog endpoint
// GET  → { mlLogged, waterMlTarget }
// POST → body { delta: number } — atomic upsert mlLogged += delta (min 0)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { todayInTz } from '@/lib/core/date_utils'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:water-get`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = mobile.id
  const tz = req.nextUrl.searchParams.get('tz') || undefined
  const today = todayInTz(tz)

  const [log, plan] = await Promise.all([
    prisma.waterLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.nutritionPlan.findUnique({ where: { userId }, select: { waterMlTarget: true } }),
  ])

  return NextResponse.json({
    mlLogged: log?.mlLogged ?? 0,
    waterMlTarget: plan?.waterMlTarget ?? 2000,
  })
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:water-post`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = mobile.id
  const body = await req.json().catch(() => ({}))
  const delta = Number(body.delta)
  if (!delta || isNaN(delta)) return NextResponse.json({ error: 'delta requerido' }, { status: 400 })

  // POST no recibe tz auto-inyectado (solo GET) → leer de DB como fallback
  const tz = req.nextUrl.searchParams.get('tz') || undefined
  let resolvedTz = tz
  if (!resolvedTz) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } })
    resolvedTz = u?.timezone ?? undefined
  }
  const today = todayInTz(resolvedTz)
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
