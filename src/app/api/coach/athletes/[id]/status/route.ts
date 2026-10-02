import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { configToAthleteFeatures } from '@/domain/subscription/tier_features'
import { getTierFeatureConfig } from '@/infrastructure/db/tier_feature_config.repository'
import { sendPushNotification } from '@/lib/push/expo_push'
import { rateLimitAsync } from '@/lib/rate_limit'

// B2B-01: Al activar → features de tipo B2B según TierFeatureConfig (configurable por admin).
// Al pausar → features de tipo B2C_FREE (configurable por admin).
// El coach paga por que sus atletas tengan acceso completo — no hay toggles granulares.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:athlete-status-patch`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params
  const { status } = await req.json() as { status: 'ACTIVE' | 'PAUSED' }

  if (status !== 'ACTIVE' && status !== 'PAUSED') {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  // Aplicar features según config del admin (TierFeatureConfig)
  const userType = status === 'ACTIVE' ? 'B2B' : 'B2C_FREE'
  const config = await getTierFeatureConfig(userType)
  const features = configToAthleteFeatures(config)

  await prisma.$transaction(async (tx) => {
    await new PrismaUserRepository(tx).mergeFeatures(athleteId, features)
    await tx.coachAthlete.update({
      where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
      data: { status },
    })
  })

  // Notificar al atleta (fire-and-forget)
  prisma.user.findUnique({ where: { id: athleteId }, select: { pushToken: true } })
    .then((athlete) => {
      if (!athlete?.pushToken) return
      const title = status === 'ACTIVE' ? 'Tu entrenador te activó' : 'Tu plan fue pausado'
      const body = status === 'ACTIVE'
        ? 'Abre la app para acceder a tu plan de entrenamiento.'
        : 'Sigues usando Medaliq en modo básico.'
      return sendPushNotification(athlete.pushToken, title, body, { type: 'features_updated' })
    })
    .catch((err) => console.error('[coach/athletes/status] sendPushNotification failed:', err))

  return NextResponse.json({ ok: true, status })
}
