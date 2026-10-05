import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { countryFromTimezone } from '@/lib/utils/timezone_country'
import { requireFeature } from '@/lib/guards/feature_gate'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const gate = requireFeature(mobile.features, 'nutrition')
  if (gate) return gate
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-foods`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const userId = mobile.id

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

  // Orden de prioridad: (1) favoritos del atleta, (2) mismo país, (3) sin país (globales), (4) resto
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
