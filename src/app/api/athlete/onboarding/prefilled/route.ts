import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:onboarding-prefilled`, { limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const profile = await prisma.healthProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      age:             true,
      heightCm:        true,
      weightKg:        true,
      gender:          true,
      dateOfBirth:     true,
      experienceLevel: true,
    },
  })

  if (!profile) {
    return NextResponse.json({ prefilled: null })
  }

  return NextResponse.json({ prefilled: profile })
}
