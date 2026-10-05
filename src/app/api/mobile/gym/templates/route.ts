import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'gym')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-templates`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const templates = await prisma.workoutTemplate.findMany({
    where: { isPublic: true, isActive: true },
    include: { days: { select: { isRestDay: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(templates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    goal: t.goal,
    level: t.level,
    daysPerWeek: t.daysPerWeek,
    category: t.category,
    trainingDays: t.days.filter(d => !d.isRestDay).length,
  })))
}
