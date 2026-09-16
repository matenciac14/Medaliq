import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { translateBodyPart } from '@/lib/gym/labels'
import { resolveExerciseGifUrl } from '@/lib/gym/gif_url'

export async function GET(req: NextRequest) {
  const userId = (await auth())?.user?.id
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ exercises: [] })

  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [
        { nameEs: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      nameEs: true,
      bodyPart: true,
      target: true,
      gifStoredUrl: true,
      gifUrl: true,
      popularityRank: true,
    },
    orderBy: { popularityRank: 'asc' },
    take: 20,
  })

  return NextResponse.json({
    exercises: exercises.map((e) => ({
      id: e.id,
      name: e.nameEs ?? e.name,
      bodyPart: translateBodyPart(e.bodyPart),
      gif: resolveExerciseGifUrl(e.id, e.gifStoredUrl, e.gifUrl),
    })),
  })
}
