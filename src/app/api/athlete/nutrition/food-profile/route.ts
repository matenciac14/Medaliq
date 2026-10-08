import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { rateLimitAsync } from '@/lib/rate_limit'

const VALID_RESTRICTIONS = [
  'SIN_GLUTEN', 'SIN_LACTEOS', 'VEGETARIANO', 'VEGANO',
  'SIN_FRUTOS_SECOS', 'SIN_MARISCOS', 'SIN_HUEVO', 'SIN_SOYA',
] as const

const UpdateSchema = z.object({
  availableFoodIds: z.array(z.string()).min(1, 'Selecciona al menos 1 alimento'),
  restrictions: z.array(z.string()).default([]),
  mealsPerDay: z.number().int().min(2).max(6).default(3),
  weighsFood: z.boolean().default(false),
  notes: z.string().max(500).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }
  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-food-profile`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const profile = await prisma.foodProfile.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ profile })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }
  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-food-profile-write`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const body = UpdateSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const { availableFoodIds, restrictions, mealsPerDay, weighsFood, notes } = body.data

  // Verificar que los foodIds existan
  const validFoods = await prisma.food.findMany({
    where: { id: { in: availableFoodIds }, isActive: true },
    select: { id: true, name: true },
  })
  const validIds = validFoods.map(f => f.id)
  const validNames = validFoods.map(f => f.name)

  const profile = await prisma.foodProfile.upsert({
    where: { userId: session.user.id },
    update: {
      availableFoodIds: validIds,
      availableFoods: validNames,
      restrictions,
      mealsPerDay,
      weighsFood,
      notes: notes ?? null,
    },
    create: {
      userId: session.user.id,
      availableFoodIds: validIds,
      availableFoods: validNames,
      restrictions,
      mealsPerDay,
      weighsFood,
      notes: notes ?? null,
    },
  })

  return NextResponse.json({ profile })
}
