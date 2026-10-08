import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { wearableRepository } from '@/infrastructure/db/wearable.repository'
import { rateLimitAsync } from '@/lib/rate_limit'

const STRAVA_DEAUTH_URL = 'https://www.strava.com/oauth/deauthorize'

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:strava-disconnect`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const conn = await wearableRepository.findByUserAndProvider(session.user.id, 'strava')

  if (conn) {
    // Deauthorize en Strava (best-effort — no bloquear si falla)
    fetch(STRAVA_DEAUTH_URL, {
      method:  'POST',
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    }).catch((err) => console.error('[strava/deauth] Strava deauthorize request failed:', err))

    await wearableRepository.delete(session.user.id, 'strava')
  }

  return NextResponse.json({ ok: true })
}
