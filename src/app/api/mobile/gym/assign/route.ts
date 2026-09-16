import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-assign`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const athleteId = mobile.id
  const { templateId } = await req.json()
  if (!templateId) return NextResponse.json({ error: 'templateId requerido' }, { status: 400 })

  const activeCoach = await prisma.coachAthlete.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (activeCoach) {
    return NextResponse.json({ error: 'Tu coach gestiona tu rutina. Pidele que te asigne una.' }, { status: 403 })
  }

  const template = await prisma.workoutTemplate.findFirst({
    where: {
      id: templateId,
      OR: [
        { isPublic: true, isActive: true },
        { athleteId },
      ],
    },
  })
  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })

  const assigned = await prisma.$transaction(async (tx) => {
    await tx.assignedWorkout.updateMany({
      where: { athleteId, isActive: true },
      data: { isActive: false },
    })
    return tx.assignedWorkout.create({
      data: {
        templateId,
        athleteId,
        coachId: null,
        startDate: new Date(),
        isActive: true,
      },
    })
  })

  return NextResponse.json({ ok: true, id: assigned.id })
}
