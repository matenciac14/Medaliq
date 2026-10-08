import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

const CATEGORY_LABELS: Record<string, string> = {
  PROTEIN:   'Proteínas',
  CARB:      'Carbohidratos',
  FAT:       'Grasas',
  VEGETABLE: 'Verduras',
  FRUIT:     'Frutas',
  DAIRY:     'Lácteos',
  LEGUME:    'Legumbres',
  NUT_SEED:  'Nueces y semillas',
  OTHER:     'Otros',
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-grocery-list`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id

  // weekStart param: YYYY-MM-DD. Default: lunes de la semana actual.
  const weekStartParam = req.nextUrl.searchParams.get('weekStart')
  let weekStart: Date
  if (weekStartParam && /^\d{4}-\d{2}-\d{2}$/.test(weekStartParam)) {
    weekStart = new Date(`${weekStartParam}T00:00:00Z`)
  } else {
    const now = new Date()
    const day = now.getUTCDay() // 0=Dom
    const diff = day === 0 ? -6 : 1 - day // ajustar al lunes
    weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff))
  }
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  const meals = await prisma.plannedMeal.findMany({
    where: {
      userId,
      date: { gte: weekStart, lt: weekEnd },
    },
    select: {
      grams: true,
      food: {
        select: { id: true, name: true, category: true, servingLabel: true },
      },
    },
  })

  // Agregar gramos por alimento
  const totals = new Map<string, { name: string; category: string; servingLabel: string | null; totalG: number }>()
  for (const m of meals) {
    const existing = totals.get(m.food.id)
    if (existing) {
      existing.totalG += m.grams
    } else {
      totals.set(m.food.id, {
        name:         m.food.name,
        category:     m.food.category,
        servingLabel: m.food.servingLabel,
        totalG:       m.grams,
      })
    }
  }

  // Agrupar por categoría
  const grouped: Record<string, { label: string; items: { name: string; totalG: number; unit: string }[] }> = {}
  for (const item of totals.values()) {
    const cat = item.category
    if (!grouped[cat]) {
      grouped[cat] = { label: CATEGORY_LABELS[cat] ?? cat, items: [] }
    }
    grouped[cat].items.push({
      name:   item.name,
      totalG: Math.round(item.totalG),
      unit:   'g',
    })
  }

  // Ordenar items alfabéticamente dentro de cada categoría
  for (const group of Object.values(grouped)) {
    group.items.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }

  // Orden de categorías por relevancia deportiva
  const CAT_ORDER = ['PROTEIN', 'CARB', 'VEGETABLE', 'FRUIT', 'DAIRY', 'LEGUME', 'FAT', 'NUT_SEED', 'OTHER']
  const categories = CAT_ORDER
    .filter(c => grouped[c])
    .map(c => ({ category: c, ...grouped[c] }))

  return NextResponse.json({
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd:   new Date(weekEnd.getTime() - 1).toISOString().slice(0, 10),
    totalItems: totals.size,
    categories,
  })
}
