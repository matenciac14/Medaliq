import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push/expo_push'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:celebrate-pr`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params
  const { exerciseName, weightKg } = await req.json() as { exerciseName: string; weightKg: number }

  if (!exerciseName) {
    return NextResponse.json({ error: 'exerciseName requerido' }, { status: 400 })
  }

  // Verify ownership
  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  // Get athlete push token + coach name (parallel)
  const [athlete, coach] = await Promise.all([
    prisma.user.findUnique({ where: { id: athleteId }, select: { pushToken: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ])

  const coachName = coach?.name ?? 'Tu coach'
  const detail = weightKg ? `${exerciseName} — ${weightKg} kg` : exerciseName

  // Fire-and-forget push notification
  sendPushNotification(
    athlete?.pushToken,
    `🏆 ${coachName} celebró tu PR`,
    detail,
    { type: 'pr_celebration', exerciseName, weightKg }
  ).catch(err => console.error('[celebrate-pr] push failed', err))

  return NextResponse.json({ ok: true })
}
