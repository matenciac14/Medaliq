import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { countryFromTimezone } from '@/lib/utils/timezone_country'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }
  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-foods`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const userId = session.user.id

  const [foods, foodProfile, user] = await Promise.all([
    prisma.food.findMany({
      where: {
        isActive: true,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 80,
      select: {
        id: true,
        name: true,
        category: true,
        kcalPer100g: true,
        proteinPer100g: true,
        carbsPer100g: true,
        fatPer100g: true,
        fiberPer100g: true,
        calciumMg: true,
        ironMg: true,
        potassiumMg: true,
        vitaminCMg: true,
        magnesiumMg: true,
        servingG: true,
        servingLabel: true,
        country: true,
      },
    }),
    prisma.foodProfile.findUnique({
      where: { userId },
      select: { availableFoodIds: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    }),
  ])

  const userCountry = countryFromTimezone(user?.timezone)
  const preferred = new Set(foodProfile?.availableFoodIds ?? [])

  // Orden de prioridad: (1) favoritos del atleta, (2) mismo país, (3) globales, (4) resto
  foods.sort((a, b) => {
    const rank = (f: typeof a) => {
      if (preferred.has(f.id)) return 0
      if (f.country === userCountry) return 1
      if (!f.country) return 2
      return 3
    }
    return rank(a) - rank(b)
  })

  return NextResponse.json(foods.slice(0, 50))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }
  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-foods-create`, { limit: 10, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const body = await req.json()
  const {
    name, category,
    kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g,
    fiberPer100g, calciumMg, ironMg, potassiumMg, vitaminCMg, magnesiumMg,
    servingG, servingLabel,
  } = body

  if (!name || !category || kcalPer100g == null || proteinPer100g == null || carbsPer100g == null || fatPer100g == null) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const food = await prisma.food.create({
    data: {
      name: name.trim(),
      category,
      kcalPer100g: Number(kcalPer100g),
      proteinPer100g: Number(proteinPer100g),
      carbsPer100g: Number(carbsPer100g),
      fatPer100g: Number(fatPer100g),
      fiberPer100g: fiberPer100g != null ? Number(fiberPer100g) : null,
      calciumMg: calciumMg != null ? Number(calciumMg) : null,
      ironMg: ironMg != null ? Number(ironMg) : null,
      potassiumMg: potassiumMg != null ? Number(potassiumMg) : null,
      vitaminCMg: vitaminCMg != null ? Number(vitaminCMg) : null,
      magnesiumMg: magnesiumMg != null ? Number(magnesiumMg) : null,
      servingG: servingG ? Number(servingG) : 100,
      servingLabel: servingLabel?.trim() || null,
      isVerified: false,
      createdBy: session.user.id,
    },
    select: {
      id: true, name: true, category: true,
      kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
      fiberPer100g: true, calciumMg: true, ironMg: true,
      potassiumMg: true, vitaminCMg: true, magnesiumMg: true,
      servingG: true, servingLabel: true,
    },
  })

  return NextResponse.json(food, { status: 201 })
}
