/**
 * PLT-11 — createNotification helper
 *
 * Fire-and-forget desde cualquier route/use-case.
 * Crea el registro en DB y, si el usuario tiene pushToken, envía push.
 *
 * Tipos válidos (Notification.type en schema):
 *   PLAN_ACTUALIZADO | MENSAJE_COACH | AJUSTE_NUTRICIONAL | LOGRO
 *   SESION_HOY | CHECKIN_DISPONIBLE | PROPUESTA_COACH
 *
 * Uso:
 *   createNotification(userId, 'PLAN_ACTUALIZADO', 'Título', 'Cuerpo').catch((err) => console.error('[modulo] createNotification failed:', err))
 *   createNotification(userId, 'MENSAJE_COACH', ..., { push: false }).catch((err) => console.error('[modulo] createNotification failed:', err))
 */

import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push/expo_push'
import { Prisma } from '@/generated/prisma/client'

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  options?: { metadata?: Record<string, unknown>; push?: boolean }
): Promise<void> {
  const sendPush = options?.push !== false
  const metadata = options?.metadata as Prisma.InputJsonValue | undefined

  const [, user] = await Promise.all([
    prisma.notification.create({
      data: { userId, type, title, body, metadata },
    }),
    sendPush
      ? prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } })
      : Promise.resolve(null),
  ])

  if (sendPush && user?.pushToken) {
    sendPushNotification(user.pushToken, title, body, { screen: 'notifications' }).catch((err) => console.error('[notification] sendPushNotification failed:', err))
  }
}
