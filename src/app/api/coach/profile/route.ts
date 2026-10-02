import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { updateCoachProfileUseCase } from '@/domain/coach_dashboard/update_coach_profile.use_case'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [profile, user] = await Promise.all([
    prisma.coachProfile.findUnique({
      where: { coachId: session.user.id },
      include: { programs: true, posts: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { identification: true, phoneWa: true, showPhoneWa: true },
    }),
  ])

  return NextResponse.json({ profile, identification: user?.identification ?? null, phoneWa: user?.phoneWa ?? null, showPhoneWa: user?.showPhoneWa ?? false })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:profile-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  try {
    const body = await req.json()
    const profile = await updateCoachProfileUseCase(body, session.user.id, prisma)
    return NextResponse.json({ profile })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status && e?.message) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw err
  }
}
