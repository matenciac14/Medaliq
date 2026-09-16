import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import { resolveExerciseGifUrl } from '@/lib/gym/gif_url'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:exercises`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params

  const exercise = await prisma.exercise.findUnique({
    where: { id },
    select: { bodyPart: true, equipment: true },
  })
  if (!exercise) return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 })

  const select = {
    id: true,
    name: true,
    nameEs: true,
    bodyPart: true,
    target: true,
    equipment: true,
    gifUrl: true,
    gifStoredUrl: true,
  }

  // Primaries: same bodyPart + same equipment OR body weight
  const primaries = await prisma.exercise.findMany({
    where: {
      id: { not: id },
      bodyPart: exercise.bodyPart,
      OR: [
        { equipment: exercise.equipment },
        { equipment: 'body weight' },
      ],
      coachId: null, // solo librería global
    },
    orderBy: [{ popularityRank: 'asc' }, { name: 'asc' }],
    take: 5,
    select,
  })

  // Fallback: fill with same bodyPart, any equipment
  let results = primaries
  if (results.length < 5) {
    const alreadyIds = new Set([id, ...results.map(e => e.id)])
    const extras = await prisma.exercise.findMany({
      where: {
        id: { notIn: [...alreadyIds] },
        bodyPart: exercise.bodyPart,
        coachId: null,
      },
      orderBy: [{ popularityRank: 'asc' }, { name: 'asc' }],
      take: 5 - results.length,
      select,
    })
    results = [...results, ...extras]
  }

  return NextResponse.json(
    results.map(e => ({
      id: e.id,
      name: e.name,
      nameEs: e.nameEs ?? undefined,
      bodyPart: e.bodyPart,
      target: e.target,
      equipment: e.equipment,
      gif: resolveExerciseGifUrl(e.id, e.gifStoredUrl, e.gifUrl) ?? undefined,
    }))
  )
}
