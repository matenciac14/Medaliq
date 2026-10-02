import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { copyPlanUseCase, copyPlanSchema } from '@/domain/plan/copy_plan.use_case'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:athlete-plan-copy-from`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: targetAthleteId } = await params
  const raw = await req.json().catch(() => null)
  const parsed = copyPlanSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  try {
    const result = await copyPlanUseCase(
      { coachId: session.user.id, targetAthleteId, ...parsed.data },
      prisma,
    )
    return NextResponse.json({ ok: true, ...result }, { status: 201 })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status && e?.message) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[plan/copy-from]', err)
    return NextResponse.json({ error: 'Error al copiar el plan.' }, { status: 500 })
  }
}
