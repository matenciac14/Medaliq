import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'

const epley = (kg: number, reps: number) => Math.round(kg * (1 + reps / 30) * 10) / 10

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'gym')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-prs`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const setLogs = await prisma.setLog.findMany({
    where: {
      session: { athleteId: mobile.id, completed: true },
      weightKg: { not: null },
      repsCompleted: { gte: 1, lte: 15 },
    },
    select: {
      exerciseName: true,
      weightKg: true,
      repsCompleted: true,
    },
  })

  const prMap = new Map<string, number>()
  for (const sl of setLogs) {
    if (!sl.exerciseName || !sl.weightKg || !sl.repsCompleted) continue
    const oneRm = epley(sl.weightKg, sl.repsCompleted)
    const existing = prMap.get(sl.exerciseName) ?? 0
    if (oneRm > existing) prMap.set(sl.exerciseName, oneRm)
  }

  const prs = [...prMap.entries()].map(([exerciseName, estimatedOneRM]) => ({ exerciseName, estimatedOneRM }))

  return NextResponse.json({ prs })
}
