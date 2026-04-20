import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id: athleteId } = await params
  const coachId = session.user.id

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Asesorado no encontrado.' }, { status: 404 })
  }

  const existing = await prisma.user.findUnique({
    where: { id: athleteId },
    select: { config: true },
  })
  const currentConfig = parseUserConfig(existing?.config)
  const newConfig = {
    ...currentConfig,
    features: {
      ...currentConfig.features,
      plan: true,
      checkin: true,
      nutrition: true,
      progress: true,
      log: true,
    },
  }

  await prisma.user.update({
    where: { id: athleteId },
    data: { config: newConfig },
  })

  return NextResponse.json({ success: true })
}
