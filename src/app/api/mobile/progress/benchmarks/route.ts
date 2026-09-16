import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'

const VALID_SPORTS = ['RUNNING', 'CYCLING', 'SWIMMING', 'STRENGTH', 'TRIATHLON'] as const
const VALID_METRICS = ['5K_TIME', '10K_TIME', 'HALF_MARATHON_TIME', 'MARATHON_TIME', 'FTP_WATTS', 'CSS_PACE', 'PACE_Z2', '1RM_SQUAT', '1RM_DEADLIFT', '1RM_BENCH', 'VO2MAX'] as const

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:benchmarks-get`, { limit: 120, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const benchmarks = await prisma.performanceBenchmark.findMany({
    where: { userId: mobile.id },
    orderBy: [{ sport: 'asc' }, { testedAt: 'desc' }],
    select: { id: true, sport: true, metric: true, value: true, unit: true, testedAt: true, notes: true },
  })

  return NextResponse.json({ benchmarks })
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:benchmarks-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const body = await req.json().catch(() => null) as {
    sport: string
    metric: string
    value: number
    unit: string
    testedAt: string
    notes?: string
  } | null

  if (!body?.sport || !body?.metric || body?.value == null || !body?.unit || !body?.testedAt) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }
  if (typeof body.value !== 'number' || isNaN(body.value) || body.value < 0) {
    return NextResponse.json({ error: 'value debe ser un número positivo' }, { status: 400 })
  }
  const parsedDate = new Date(body.testedAt)
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'testedAt debe ser una fecha válida' }, { status: 400 })
  }

  const sport = body.sport.toUpperCase()
  const metric = body.metric.toUpperCase()

  if (!(VALID_SPORTS as readonly string[]).includes(sport)) {
    return NextResponse.json({ error: `sport inválido. Válidos: ${VALID_SPORTS.join(', ')}` }, { status: 400 })
  }
  if (!(VALID_METRICS as readonly string[]).includes(metric)) {
    return NextResponse.json({ error: `metric inválido. Válidos: ${VALID_METRICS.join(', ')}` }, { status: 400 })
  }

  try {
    const benchmark = await prisma.performanceBenchmark.create({
      data: {
        userId: mobile.id,
        coachId: null,
        sport,
        metric,
        value: body.value,
        unit: body.unit,
        testedAt: parsedDate,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json({ benchmark }, { status: 201 })
  } catch (err) {
    console.error('[benchmarks] create failed', err)
    return NextResponse.json({ error: 'Error al guardar benchmark' }, { status: 500 })
  }
}
