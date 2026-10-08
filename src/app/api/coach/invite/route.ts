import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

const INVITE_SELECT = {
  id: true,
  code: true,
  usedBy: true,
  usedAt: true,
  expiresAt: true,
  createdAt: true,
} as const

export async function POST() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:invite-post`, { limit: 10, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const coachId = session.user.id
  const suffix = Math.random().toString(36).substr(2, 6).toUpperCase()
  const code = `MEDAL-${suffix}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await prisma.inviteCode.create({
    data: { code, coachId, expiresAt },
    select: INVITE_SELECT,
  })

  return NextResponse.json({ invite })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const codes = await prisma.inviteCode.findMany({
    where: { coachId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: INVITE_SELECT,
  })

  return NextResponse.json({ codes })
}
