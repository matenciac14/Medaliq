import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rateLimitAsync } from '@/lib/rate_limit'

// Downgrade is a no-op — kept as a stub to avoid 404s from existing links.
export async function POST() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ATHLETE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:downgrade`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  return NextResponse.json({ ok: true })
}
