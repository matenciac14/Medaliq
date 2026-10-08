import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaSuggestionRepository } from '@/infrastructure/db/suggestion.repository'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:suggestion-reject`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const userId = session.user.id

  const suggRepo = new PrismaSuggestionRepository()
  const suggestion = await suggRepo.findById(id)

  if (!suggestion) return NextResponse.json({ error: 'Sugerencia no encontrada' }, { status: 404 })
  if (suggestion.userId !== userId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (suggestion.status !== 'PENDING') {
    return NextResponse.json({ error: 'Sugerencia ya respondida o expirada' }, { status: 409 })
  }

  await suggRepo.reject(id, userId)

  return NextResponse.json({ ok: true })
}
