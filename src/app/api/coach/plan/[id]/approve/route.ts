import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// PATCH /api/coach/plan/[id]/approve
// Updates plan generatedBy to AI_COACH_APPROVED
// Verifies coach owns the athlete before approving

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: planId } = await params
  const coachId = session.user.id

  try {
    // Fetch the plan with its owner
    const plan = await prisma.trainingPlan.findUnique({
      where: { id: planId },
      select: { id: true, userId: true },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado.' }, { status: 404 })
    }

    // Verify coach owns this athlete
    const relation = await prisma.coachAthlete.findFirst({
      where: { coachId, athleteId: plan.userId },
    })

    if (!relation) {
      return NextResponse.json({ error: 'No autorizado para este atleta.' }, { status: 403 })
    }

    // Mark plan as coach-approved
    const updated = await prisma.trainingPlan.update({
      where: { id: planId },
      data: { generatedBy: 'AI_COACH_APPROVED' },
      select: { id: true, generatedBy: true, status: true },
    })

    return NextResponse.json({ ok: true, plan: updated })
  } catch (err) {
    console.error('[coach/plan/approve]', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}

// POST kept for backwards-compat with older client code
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: planId } = await params
  const coachId = session.user.id

  try {
    const body = await req.json() as { action?: string; comment?: string }

    // Only the 'approve' action does a real DB write
    if (body.action === 'approve') {
      const plan = await prisma.trainingPlan.findUnique({
        where: { id: planId },
        select: { id: true, userId: true },
      })

      if (!plan) {
        return NextResponse.json({ error: 'Plan no encontrado.' }, { status: 404 })
      }

      const relation = await prisma.coachAthlete.findFirst({
        where: { coachId, athleteId: plan.userId },
      })

      if (!relation) {
        return NextResponse.json({ error: 'No autorizado para este atleta.' }, { status: 403 })
      }

      await prisma.trainingPlan.update({
        where: { id: planId },
        data: { generatedBy: 'AI_COACH_APPROVED' },
      })

      return NextResponse.json({ ok: true, status: 'APROBADO', planId })
    }

    // request_adjustment is UI-only for now (no DB field yet)
    if (body.action === 'request_adjustment') {
      return NextResponse.json({ ok: true, status: 'AJUSTE_SOLICITADO', planId, comment: body.comment ?? '' })
    }

    return NextResponse.json({ ok: false, error: 'Acción inválida' }, { status: 400 })
  } catch (err) {
    console.error('[coach/plan/approve POST]', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
