import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { setFreshJwtCookie } from '@/lib/auth/refresh_jwt_cookie'

// GET /api/invite/[code] — valida el código y devuelve info del coach
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const invite = await prisma.inviteCode.findUnique({
    where: { code },
    include: {
      coach: {
        select: {
          id: true,
          name: true,
          image: true,
          coachProfile: { select: { headline: true, bio: true, specialties: true } },
        },
      },
    },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Código inválido.' }, { status: 404 })
  }
  if (invite.usedBy) {
    return NextResponse.json({ error: 'Este código ya fue usado.' }, { status: 410 })
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Este código expiró.' }, { status: 410 })
  }

  // Aggregate metrics for social proof
  const coachId = invite.coachId
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [activeCount, athleteRelations] = await Promise.all([
    prisma.coachAthlete.count({ where: { coachId, status: 'ACTIVE' } }),
    prisma.coachAthlete.findMany({ where: { coachId }, select: { athleteId: true } }),
  ])
  const athleteIds = athleteRelations.map((r) => r.athleteId)

  const [avgAdherenceResult, prsThisMonth] = await Promise.all([
    prisma.weeklyCheckIn.aggregate({
      where: { userId: { in: athleteIds }, dietAdherencePct: { not: null } },
      _avg: { dietAdherencePct: true },
    }),
    athleteIds.length > 0
      ? prisma.setLog.count({
          where: {
            isPR: true,
            session: { athleteId: { in: athleteIds }, date: { gte: startOfMonth } },
          },
        })
      : Promise.resolve(0),
  ])

  const avgAdherence =
    avgAdherenceResult._avg.dietAdherencePct != null
      ? Math.round(avgAdherenceResult._avg.dietAdherencePct)
      : null

  return NextResponse.json({
    valid: true,
    coachName: invite.coach.name,
    coachImage: invite.coach.image ?? null,
    coachHeadline: invite.coach.coachProfile?.headline ?? null,
    coachBio: invite.coach.coachProfile?.bio ?? null,
    coachSpecialties: invite.coach.coachProfile?.specialties ?? [],
    activeAthletes: activeCount,
    avgAdherence,
    prsThisMonth,
  })
}

// POST /api/invite/[code] — redime el código (atleta autenticado)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  if (session.user.role !== 'ATHLETE') {
    return NextResponse.json({ error: 'Solo atletas pueden usar este enlace.' }, { status: 403 })
  }

  const athleteId = session.user.id

  // Atomic redemption: mark as used only if still unclaimed (prevents race condition)
  const redeemed = await prisma.inviteCode.updateMany({
    where: { code, usedBy: null, expiresAt: { gt: new Date() } },
    data: { usedBy: athleteId, usedAt: new Date() },
  })

  if (redeemed.count === 0) {
    return NextResponse.json({ error: 'Código inválido o expirado.' }, { status: 400 })
  }

  // At this point we own the code — fetch coachId and create the relation
  const invite = await prisma.inviteCode.findUnique({ where: { code }, select: { coachId: true } })
  if (!invite) return NextResponse.json({ error: 'Código inválido o expirado.' }, { status: 400 })

  // Upsert relation — idempotent if athlete retries after a partial failure
  const existing = await prisma.coachAthlete.findFirst({
    where: { coachId: invite.coachId, athleteId },
  })

  if (!existing) {
    await prisma.coachAthlete.create({
      data: { coachId: invite.coachId, athleteId },
    })
  }

  const response = NextResponse.json({ ok: true })
  await setFreshJwtCookie(req, response, athleteId).catch((err) => console.error('[invite/redeem] setFreshJwtCookie failed:', err))
  return response
}
