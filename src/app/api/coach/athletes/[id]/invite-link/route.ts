import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

async function generateResetLink(athleteId: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)
  const token = await new SignJWT({ sub: athleteId, purpose: 'set-password' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://medaliq.com'}/set-password?token=${token}`
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:coach-invite-link`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id: athleteId } = await params

  // Verify ownership
  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Atleta no encontrado.' }, { status: 404 })
  }

  const link = await generateResetLink(athleteId)
  return NextResponse.json({ link })
}
