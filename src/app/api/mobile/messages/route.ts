import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { sendPushNotification } from '@/lib/push/expo_push'
import { createNotification } from '@/infrastructure/db/notification'

// GET /api/mobile/messages?with=[userId] — paginada, asc
export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:messages-get`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const withId = req.nextUrl.searchParams.get('with')
  if (!withId) return NextResponse.json({ error: 'Falta parámetro with' }, { status: 400 })

  const relationship = await prisma.coachAthlete.findFirst({
    where: { OR: [{ coachId: mobile.id, athleteId: withId }, { coachId: withId, athleteId: mobile.id }] },
    select: { id: true },
  })
  if (!relationship) return NextResponse.json({ error: 'Sin relación coach-atleta' }, { status: 403 })

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: mobile.id, toId: withId },
        { fromId: withId, toId: mobile.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json({ messages })
}

// POST /api/mobile/messages — { toId, content }
export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:messages-post`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const body = await req.json()
  const { toId, content } = body
  if (!toId || !content?.trim()) return NextResponse.json({ error: 'toId y content requeridos' }, { status: 400 })

  const [recipient, relationship] = await Promise.all([
    prisma.user.findUnique({ where: { id: toId }, select: { pushToken: true, name: true } }),
    prisma.coachAthlete.findFirst({
      where: { OR: [{ coachId: mobile.id, athleteId: toId }, { coachId: toId, athleteId: mobile.id }] },
      select: { id: true },
    }),
  ])
  if (!relationship) return NextResponse.json({ error: 'Sin relación coach-atleta con este usuario' }, { status: 403 })

  const message = await prisma.message.create({
    data: { fromId: mobile.id, toId, content: content.trim() },
  })

  const senderName = mobile.name ?? 'Tu atleta'
  sendPushNotification(recipient?.pushToken, `Mensaje de ${senderName}`, content.trim(), { screen: 'messages' }).catch(() => {})

  // PLT-11: crear registro de notificación in-app (push ya enviado arriba)
  createNotification(
    toId,
    'MENSAJE_COACH',
    `Mensaje de ${senderName}`,
    content.trim().slice(0, 120),
    { push: false, metadata: { fromId: mobile.id } },
  ).catch(() => {})

  return NextResponse.json({ message }, { status: 201 })
}
