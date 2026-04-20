import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  // Verify coach-athlete relationship
  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = (await request.json()) as Record<string, unknown>
  const fields = [
    'tdee',
    'targetKcalHard',
    'targetKcalEasy',
    'targetKcalRest',
    'proteinG',
    'carbsHardG',
    'carbsEasyG',
    'fatG',
  ]
  const data: Record<string, number> = {}
  for (const f of fields) {
    const v = Number(body[f])
    if (!isNaN(v) && v > 0) data[f] = Math.round(v)
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  const updated = await prisma.nutritionPlan.update({
    where: { userId: athleteId },
    data,
  })

  return NextResponse.json({ ok: true, plan: updated })
}
