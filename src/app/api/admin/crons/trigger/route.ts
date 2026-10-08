import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'

const VALID_CRONS = ['checkin-reminder', 'session-reminder', 'payment-overdue'] as const
type CronName = (typeof VALID_CRONS)[number]

// POST /api/admin/crons/trigger — dispara un cron manualmente
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (admin?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rl = await rateLimitAsync(`web-${session.user.id}:admin-crons-trigger`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { cron } = await req.json()
  if (!VALID_CRONS.includes(cron as CronName)) {
    return NextResponse.json({ error: 'Cron no válido.' }, { status: 400 })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado.' }, { status: 500 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const cronUrl = `${baseUrl}/api/cron/${cron}`

  try {
    const res = await fetch(cronUrl, {
      method: 'GET',
      headers: { authorization: `Bearer ${cronSecret}` },
    })

    const body = await res.json().catch(() => ({}))
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      result: body,
    }, { status: res.ok ? 200 : 502 })
  } catch (err) {
    return NextResponse.json({ error: 'Error al llamar al cron.', detail: String(err) }, { status: 502 })
  }
}
