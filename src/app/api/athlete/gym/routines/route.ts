import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { createAthleteRoutineUseCase } from '@/domain/gym/create_athlete_routine.use_case'

export async function GET(req: NextRequest) {
  const athleteId = (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const templates = await prisma.workoutTemplate.findMany({
    where: { athleteId },
    include: {
      days: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
      assignments: { where: { isActive: true }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const athleteId = (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()

  try {
    const template = await createAthleteRoutineUseCase({ athleteId, ...body }, prisma)
    return NextResponse.json(template, { status: 201 })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status && e?.message) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw err
  }
}
