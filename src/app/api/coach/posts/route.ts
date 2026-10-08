import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:coach-posts-get`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const profile = await prisma.coachProfile.findUnique({
    where: { coachId: session.user.id },
  })

  if (!profile) {
    return NextResponse.json({ posts: [] })
  }

  const posts = await prisma.coachPost.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:posts-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const profile = await prisma.coachProfile.findUnique({
    where: { coachId: session.user.id },
  })

  if (!profile) {
    return NextResponse.json(
      { error: 'Debes crear tu perfil público primero.' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { type, title, body: postBody, tags, isPublic } = body

  if (!type || !title || !postBody) {
    return NextResponse.json(
      { error: 'Tipo, título y contenido son obligatorios.' },
      { status: 400 }
    )
  }

  const validTypes = ['TIP', 'ROUTINE_SHOWCASE', 'ACHIEVEMENT', 'ANNOUNCEMENT']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Tipo de publicación inválido.' }, { status: 400 })
  }

  const post = await prisma.coachPost.create({
    data: {
      profileId: profile.id,
      type,
      title,
      body: postBody,
      tags: tags ?? [],
      isPublic: isPublic ?? true,
    },
  })

  return NextResponse.json({ post }, { status: 201 })
}
