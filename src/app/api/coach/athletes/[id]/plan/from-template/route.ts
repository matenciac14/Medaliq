import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { createPlanFromTemplateUseCase } from '@/domain/plan/create_plan_from_template.use_case'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:athlete-plan-from-template`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params
  const body = await req.json() as { templateId?: string; name?: string; startDate?: string }

  try {
    const result = await createPlanFromTemplateUseCase(
      { coachId: session.user.id, athleteId, templateId: body.templateId ?? '', name: body.name ?? '', startDate: body.startDate ?? '' },
      prisma,
    )
    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status && e?.message) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw err
  }
}
