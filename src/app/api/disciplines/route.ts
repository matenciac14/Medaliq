import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/disciplines — lista de disciplinas activas.
 * Publico, cacheable. Usado por UI para selectores de disciplina
 * en onboarding, sesion libre, rutina, y coach panel.
 */
export async function GET() {
  const disciplines = await prisma.discipline.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      nameEs: true,
      icon: true,
      color: true,
      hasExerciseLibrary: true,
      trackingFields: true,
      sessionTypes: true,
    },
  })

  return NextResponse.json(disciplines, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
