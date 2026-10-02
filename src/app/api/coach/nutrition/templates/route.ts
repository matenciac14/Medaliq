import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

// GET /api/coach/nutrition/templates — lista de templates del coach con conteo de atletas asignados
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const templates = await prisma.nutritionTemplate.findMany({
    where: { coachId: session.user.id },
    include: {
      days: {
        include: {
          meals: { include: { items: { include: { food: { select: { name: true } } } } } },
        },
      },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ templates })
}

// POST /api/coach/nutrition/templates — crea template vacío con 3 días (HARD/EASY/REST)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:nutrition-templates-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const body = await req.json() as { name?: string; description?: string; goal?: string }
  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'name es requerido.' }, { status: 400 })
  }

  const template = await prisma.nutritionTemplate.create({
    data: {
      coachId: session.user.id,
      name,
      description: body.description?.trim() || null,
      goal: body.goal?.trim() || null,
      days: {
        create: [
          { dayType: 'HARD' },
          { dayType: 'EASY' },
          { dayType: 'REST' },
        ],
      },
    },
    include: {
      days: { include: { meals: { include: { items: true } } } },
    },
  })

  return NextResponse.json({ template }, { status: 201 })
}
