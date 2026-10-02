import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { generateCoachPlanUseCase, generateCoachPlanSchema } from '@/domain/plan/generate_coach_plan.use_case'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:athlete-plan-post`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params
  const body = await req.json()

  const parsed = generateCoachPlanSchema.safeParse({ coachId: session.user.id, athleteId, ...body })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const result = await generateCoachPlanUseCase(parsed.data, prisma)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status && e?.message) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw err
  }
}
