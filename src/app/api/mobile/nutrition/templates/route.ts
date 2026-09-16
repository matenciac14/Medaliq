// MOB-NUT-04 — GET + POST /api/mobile/nutrition/templates
// GET:  Lista las NutritionTemplates propias del atleta B2C
// POST: Crea una NutritionTemplate (solo B2C sin coach activo)

import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-templates`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const templates = await prisma.nutritionTemplate.findMany({
    where: { athleteId: mobile.id },
    select: {
      id: true,
      name: true,
      goal: true,
      days: {
        select: {
          id: true,
          dayType: true,
          meals: {
            select: {
              id: true,
              mealType: true,
              items: { select: { id: true, grams: true, food: { select: { name: true, kcalPer100g: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-templates-create`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const hasCoach = await prisma.coachAthlete.findFirst({
    where: { athleteId: mobile.id, status: 'ACTIVE' },
    select: { id: true },
  })
  if (hasCoach) {
    return NextResponse.json({ error: 'Tu entrenador gestiona tu plan nutricional.' }, { status: 403 })
  }

  const body = await req.json() as { name?: string; goal?: string }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name es requerido.' }, { status: 400 })

  const template = await prisma.nutritionTemplate.create({
    data: {
      athleteId: mobile.id,
      name,
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
