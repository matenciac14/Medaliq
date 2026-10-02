import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'
import { getAthleteNutrition } from '@/domain/nutrition/get_athlete_nutrition.use_case'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  try {
    const result = await getAthleteNutrition(session.user.id, athleteId, prisma)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status && e?.message) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw err
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = (await request.json()) as Record<string, unknown>
  const fields = ['tdee', 'targetKcalHard', 'targetKcalEasy', 'targetKcalRest', 'proteinG', 'carbsHardG', 'carbsEasyG', 'fatG']
  const data: Record<string, number> = {}
  for (const f of fields) {
    const v = Number(body[f])
    if (!isNaN(v) && v > 0) data[f] = Math.round(v)
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  const defaults = {
    tdee: 2000, targetKcalHard: 2200, targetKcalEasy: 1800, targetKcalRest: 1600,
    proteinG: 120, carbsHardG: 250, carbsEasyG: 200, fatG: 80,
  }

  const updated = await prisma.nutritionPlan.upsert({
    where: { userId: athleteId },
    update: { ...data, source: 'COACH' },
    create: { userId: athleteId, ...defaults, ...data, source: 'COACH' },
  })

  return NextResponse.json({ ok: true, plan: updated })
}
