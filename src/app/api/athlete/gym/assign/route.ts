import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function POST(req: NextRequest) {
  const session = await auth()
  const athleteId = session?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = await rateLimitAsync(`web-${athleteId}:gym-assign`, { limit: 30, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  if (!session.user.features?.gym) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }
  const { templateId } = await req.json()

  if (!templateId) return NextResponse.json({ error: 'templateId requerido' }, { status: 400 })

  // Atletas con coach activo no pueden auto-asignarse rutinas
  const activeCoach = await prisma.coachAthlete.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (activeCoach) {
    return NextResponse.json({ error: 'Tu coach gestiona tu rutina. Pídele que te asigne una.' }, { status: 403 })
  }

  // Verificar que la plantilla existe: pública activa O propia del atleta
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

  // PERSIST-05: desactivar rutina anterior y crear la nueva en una sola tx
  // para evitar race condition (2 requests → atleta con 2 rutinas activas)
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
