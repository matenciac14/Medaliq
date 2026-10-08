import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { createRoutine } from '@/domain/gym/create_routine.use_case'
import { getCoachRoutines } from '@/infrastructure/db/gym_template.repository'
import { z } from 'zod'
import { rateLimitAsync } from '@/lib/rate_limit'

const DayExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(20).optional(),
  repsScheme: z.string().max(50).optional(),
  restSeconds: z.number().int().min(0).max(600).nullable().optional(),
  setType: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
  order: z.number().int().min(0),
  supersetWithOrder: z.number().int().nullable().optional(),
})

const DaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  label: z.string().max(100),
  muscleGroups: z.array(z.string().max(50)),
  isRestDay: z.boolean(),
  warmupNotes: z.string().max(1000).optional(),
  cardioNotes: z.string().max(1000).optional(),
  exercises: z.array(DayExerciseSchema),
})

const CreateRoutineSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  goal: z.string().max(200).optional(),
  level: z.string().max(100).optional(),
  daysPerWeek: z.number().int().min(1).max(7),
  days: z.array(DaySchema).min(1),
})

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:coach-routines`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const templates = await getCoachRoutines(session.user.id, prisma)
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:routines-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const parsed = CreateRoutineSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })

  const result = await createRoutine({ coachId: session.user.id, ...parsed.data }, prisma)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result.template, { status: 201 })
}
