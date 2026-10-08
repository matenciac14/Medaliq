import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api/responses'
import { rateLimitAsync } from '@/lib/rate_limit'
import { z } from 'zod'

const createSchema = z.object({
  name:     z.string().min(1).max(100),
  mealType: z.string().optional(),
  items:    z.array(z.object({
    foodId: z.string().min(1),
    grams:  z.number().min(1).max(5000),
  })).min(1).max(20),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-meal-templates`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  try {
    const templates = await prisma.mealTemplate.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            food: {
              select: {
                id: true, name: true, category: true,
                kcalPer100g: true, proteinPer100g: true,
                carbsPer100g: true, fatPer100g: true,
                servingG: true, servingLabel: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ templates })
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-meal-templates-post`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const raw = await req.json()
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Datos inválidos.')

  const { name, mealType, items } = parsed.data

  try {
    const template = await prisma.mealTemplate.create({
      data: {
        userId: session.user.id,
        name,
        mealType: mealType as any ?? null,
        items: {
          create: items.map(i => ({ foodId: i.foodId, grams: i.grams })),
        },
      },
      include: {
        items: {
          include: {
            food: {
              select: {
                id: true, name: true, kcalPer100g: true,
                proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
              },
            },
          },
        },
      },
    })
    return ok({ template })
  } catch {
    return serverError()
  }
}
