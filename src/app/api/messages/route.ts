import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push/expo_push'
import { rateLimitAsync } from '@/lib/rate_limit'
import { createNotification } from '@/infrastructure/db/notification'

// GET /api/messages?with=[userId] — conversación paginada (más recientes primero)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { allowed: rlGet } = await rateLimitAsync(`web-${session.user.id}:messages`, { limit: 300, windowMs: 60_000 })
  if (!rlGet) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const withId = req.nextUrl.searchParams.get('with')
  if (!withId) return NextResponse.json({ error: 'Param ?with= requerido' }, { status: 400 })

  const userId = session.user.id
  const take = Math.min(parseInt(req.nextUrl.searchParams.get('take') ?? '50'), 100)
  const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: userId, toId: withId },
        { fromId: withId, toId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, fromId: true, toId: true, content: true, readAt: true, createdAt: true },
  })

  return NextResponse.json({ messages })
}

// POST /api/messages — { toId, content }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { allowed: rlPost } = await rateLimitAsync(`web-${session.user.id}:messages`, { limit: 100, windowMs: 60_000 })
  if (!rlPost) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { toId, content } = await req.json()
  if (!toId || !content?.trim()) {
    return NextResponse.json({ error: 'toId y content requeridos' }, { status: 400 })
  }

  const fromId = session.user.id
  if (fromId === toId) return NextResponse.json({ error: 'No puedes enviarte mensajes a ti mismo' }, { status: 400 })

  const [recipient, relationship] = await Promise.all([
    prisma.user.findUnique({ where: { id: toId }, select: { id: true, name: true, pushToken: true } }),
    prisma.coachAthlete.findFirst({
      where: { status: 'ACTIVE', OR: [{ coachId: fromId, athleteId: toId }, { coachId: toId, athleteId: fromId }] },
      select: { id: true },
    }),
  ])
  if (!recipient) return NextResponse.json({ error: 'Destinatario no encontrado' }, { status: 404 })
  if (!relationship) return NextResponse.json({ error: 'Sin relación coach-atleta con este usuario' }, { status: 403 })

  const message = await prisma.message.create({
    data: { fromId, toId, content: content.trim() },
    select: { id: true, fromId: true, toId: true, content: true, readAt: true, createdAt: true },
  })

  const senderName = session.user.name ?? 'Tu coach'
  sendPushNotification(recipient.pushToken, `Mensaje de ${senderName}`, content.trim(), { screen: 'messages' }).catch((err) => console.error('[messages] sendPushNotification failed:', err))

  // PLT-11: crear registro de notificación in-app (push ya enviado arriba)
  createNotification(
    toId,
    'MENSAJE_COACH',
    `Mensaje de ${senderName}`,
    content.trim().slice(0, 120),
    { push: false, metadata: { fromId } },
  ).catch((err) => console.error('[messages] createNotification failed:', err))

  return NextResponse.json({ message }, { status: 201 })
}
