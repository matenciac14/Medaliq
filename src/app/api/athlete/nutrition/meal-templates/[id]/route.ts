import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { ok, unauthorized, notFound, serverError } from '@/lib/api/responses'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  if (!session.user.features?.nutrition) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:nutrition-meal-templates-del`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params

  try {
    const template = await prisma.mealTemplate.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!template || template.userId !== session.user.id) return notFound()

    await prisma.mealTemplate.delete({ where: { id } })
    return ok({ ok: true })
  } catch {
    return serverError()
  }
}
