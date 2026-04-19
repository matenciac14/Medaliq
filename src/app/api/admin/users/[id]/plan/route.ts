import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import {
  DEFAULT_USER_CONFIG,
  FULL_ATHLETE_CONFIG,
  COACH_CONFIG,
} from '@/lib/config/user-config'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { plan } = await req.json() // 'FREE' | 'PRO' | 'COACH'

  let config: typeof DEFAULT_USER_CONFIG
  let role: 'ATHLETE' | 'COACH'

  if (plan === 'COACH') {
    config = COACH_CONFIG
    role = 'COACH'
  } else if (plan === 'PRO') {
    config = { ...FULL_ATHLETE_CONFIG, features: { ...FULL_ATHLETE_CONFIG.features, gym: true } }
    role = 'ATHLETE'
  } else {
    // FREE
    config = DEFAULT_USER_CONFIG
    role = 'ATHLETE'
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      role,
      config: config as object,
    },
    select: { id: true, role: true, config: true },
  })

  return NextResponse.json({ ok: true, user })
}
