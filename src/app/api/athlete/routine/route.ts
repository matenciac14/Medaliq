import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

type RoutineDayInput = {
  dow: number
  activity: 'GYM' | 'RUN' | 'REST'
  split?: string | null
  runType?: string | null
}

const VALID_SPLITS = ['PUSH', 'PULL', 'LEGS', 'FULL_BODY']
const VALID_RUN_TYPES = ['RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA', 'OTRO']
const VALID_ACTIVITIES = ['GYM', 'RUN', 'REST']

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed: allowedGet } = await rateLimitAsync(`web-${session.user.id}:routine-get`, { limit: 300, windowMs: 60_000 })
  if (!allowedGet) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const routine = await prisma.weeklyRoutine.findUnique({ where: { userId: session.user.id } })
  return NextResponse.json({ routine })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed: allowedPut } = await rateLimitAsync(`web-${session.user.id}:routine-put`, { limit: 60, windowMs: 60_000 })
  if (!allowedPut) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const body = await req.json()
  const { days, daysPerWeek } = body as { days: RoutineDayInput[]; daysPerWeek: number }

  if (!Array.isArray(days)) return NextResponse.json({ error: 'days must be an array' }, { status: 400 })
  if (typeof daysPerWeek !== 'number' || daysPerWeek < 1 || daysPerWeek > 7) {
    return NextResponse.json({ error: 'daysPerWeek must be 1–7' }, { status: 400 })
  }

  for (const d of days) {
    if (!Number.isInteger(d.dow) || d.dow < 1 || d.dow > 7) {
      return NextResponse.json({ error: `Invalid dow: ${d.dow}` }, { status: 400 })
    }
    if (!VALID_ACTIVITIES.includes(d.activity)) {
      return NextResponse.json({ error: `Invalid activity: ${d.activity}` }, { status: 400 })
    }
    if (d.activity === 'GYM' && d.split && !VALID_SPLITS.includes(d.split)) {
      return NextResponse.json({ error: `Invalid split: ${d.split}` }, { status: 400 })
    }
    if (d.activity === 'RUN' && d.runType && !VALID_RUN_TYPES.includes(d.runType)) {
      return NextResponse.json({ error: `Invalid runType: ${d.runType}` }, { status: 400 })
    }
  }

  const sanitized = days.map((d) => ({
    dow: d.dow,
    activity: d.activity,
    ...(d.activity === 'GYM' && d.split ? { split: d.split } : {}),
    ...(d.activity === 'RUN' && d.runType ? { runType: d.runType } : {}),
  }))

  const routine = await prisma.weeklyRoutine.upsert({
    where: { userId: session.user.id },
    update: { days: sanitized, daysPerWeek },
    create: { userId: session.user.id, days: sanitized, daysPerWeek },
  })

  return NextResponse.json({ routine })
}
