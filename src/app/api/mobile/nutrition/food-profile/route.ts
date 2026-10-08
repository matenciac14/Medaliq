import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { z } from 'zod'
import { requireFeature } from '@/lib/guards/feature_gate'

const UpdateSchema = z.object({
  availableFoodIds: z.array(z.string()).min(1, 'Selecciona al menos 1 alimento'),
  restrictions: z.array(z.string()).default([]),
  mealsPerDay: z.number().int().min(2).max(6).default(3),
  weighsFood: z.boolean().default(false),
  notes: z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'nutrition')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:food-profile`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const profile = await prisma.foodProfile.findUnique({
    where: { userId: mobile.id },
  })

  return NextResponse.json({ profile })
}

export async function PUT(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate2 = requireFeature(mobile.features, 'nutrition')
  if (gate2) return gate2
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:food-profile-write`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const body = UpdateSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const { availableFoodIds, restrictions, mealsPerDay, weighsFood, notes } = body.data

  const validFoods = await prisma.food.findMany({
    where: { id: { in: availableFoodIds }, isActive: true },
    select: { id: true, name: true },
  })
  const validIds = validFoods.map(f => f.id)
  const validNames = validFoods.map(f => f.name)

  const profile = await prisma.foodProfile.upsert({
    where: { userId: mobile.id },
    update: {
      availableFoodIds: validIds,
      availableFoods: validNames,
      restrictions,
      mealsPerDay,
      weighsFood,
      notes: notes ?? null,
    },
    create: {
      userId: mobile.id,
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
