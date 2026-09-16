import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { OpenFoodFactsClient } from '@/infrastructure/food/open_food_facts.client'

const foodSelect = {
  id: true, name: true, category: true,
  kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
  fiberPer100g: true, servingG: true, servingLabel: true, barcode: true,
  source: true,
} as const

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:foods-barcode`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code || !/^\d{8,14}$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido. Debe ser EAN-8 o EAN-13.' }, { status: 400 })
  }

  // Phase 1: buscar en DB por barcode
  const existing = await prisma.food.findUnique({
    where: { barcode: code, isActive: true },
    select: foodSelect,
  })
  if (existing) return NextResponse.json({ food: existing, source: 'db' })

  // Phase 2: consultar Open Food Facts
  const client = new OpenFoodFactsClient()
  const result = await client.lookupByBarcode(code)

  if (!result) {
    return NextResponse.json({ food: null, source: 'not_found', barcode: code }, { status: 404 })
  }

  // Retornar con needsConfirmation — el atleta confirma antes de crear
  return NextResponse.json({
    food: null,
    source: 'openfoodfacts',
    needsConfirmation: true,
    suggestion: result,
  })
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:foods-barcode-create`, { limit: 10, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  // Confirmar y crear el alimento desde OFF en DB
  const body = await req.json() as {
    barcode: string; name: string; kcalPer100g: number
    proteinPer100g: number; carbsPer100g: number; fatPer100g: number
    fiberPer100g?: number; servingG?: number; servingLabel?: string; country?: string
  }

  if (!body.barcode || !body.name) {
    return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
  }
  const macroFields = [body.kcalPer100g, body.proteinPer100g, body.carbsPer100g, body.fatPer100g]
  if (macroFields.some(v => typeof v !== 'number' || isNaN(v) || v < 0 || v > 900)) {
    return NextResponse.json({ error: 'Los valores nutricionales deben ser números entre 0 y 900.' }, { status: 400 })
  }

  // Verificar que no existe ya (race condition)
  const exists = await prisma.food.findUnique({ where: { barcode: body.barcode } })
  if (exists) return NextResponse.json({ food: exists, source: 'db_existing' })

  const food = await prisma.food.create({
    data: {
      name:           body.name,
      barcode:        body.barcode,
      kcalPer100g:    body.kcalPer100g,
      proteinPer100g: body.proteinPer100g,
      carbsPer100g:   body.carbsPer100g,
      fatPer100g:     body.fatPer100g,
      fiberPer100g:   body.fiberPer100g ?? undefined,
      servingG:       body.servingG ?? undefined,
      servingLabel:   body.servingLabel ?? undefined,
      country:        body.country ?? undefined,
      source:         'openfoodfacts',
      isVerified:     false,
      isActive:       true,
      category:       'OTHER',
    },
    select: foodSelect,
  })

  return NextResponse.json({ food, source: 'created' }, { status: 201 })
}
