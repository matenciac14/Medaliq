import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { todayInTz } from '@/lib/core/date_utils'
import { z } from 'zod'
import { rateLimitAsync } from '@/lib/rate_limit'

const DailyLogSchema = z.object({
  weightKg:    z.number().positive().max(500).optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
  hrResting:   z.number().int().min(20).max(250).optional(),
  sleepHours:  z.number().min(0).max(24).optional(),
  notes:       z.string().max(500).optional(),
})

// GET — últimos 30 registros del usuario
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimitAsync(`web-${session.user.id}:metrics-log-get`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const logs = await prisma.dailyLog.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
    take: 30,
  })

  return NextResponse.json(logs)
}

// POST — crear o actualizar registro del día
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimitAsync(`web-${session.user.id}:metrics-log-post`, { limit: 100, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = DailyLogSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })

  const { weightKg, energyLevel, hrResting, sleepHours, notes } = parsed.data

  if (weightKg == null && energyLevel == null && hrResting == null && sleepHours == null) {
    return NextResponse.json({ error: 'Al menos un campo requerido.' }, { status: 400 })
  }

  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } })
  const today = todayInTz(u?.timezone ?? null)

  const log = await prisma.dailyLog.upsert({
    where: { userId_date: { userId: session.user.id, date: today } },
    create: { userId: session.user.id, date: today, weightKg, energyLevel, hrResting, sleepHours, notes },
    update: {
      ...(weightKg    != null && { weightKg }),
      ...(energyLevel != null && { energyLevel }),
      ...(hrResting   != null && { hrResting }),
      ...(sleepHours  != null && { sleepHours }),
      ...(notes       != null && { notes }),
    },
    select: { weightKg: true, energyLevel: true, hrResting: true, sleepHours: true, date: true },
  })

  return NextResponse.json({ log }, { status: 200 })
}
