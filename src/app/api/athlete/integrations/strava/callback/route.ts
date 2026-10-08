import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { wearableRepository } from '@/infrastructure/db/wearable.repository'
import { rateLimitAsync } from '@/lib/rate_limit'

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:strava-callback`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=strava_denied`)
  }

  // Verificar que el state coincide con el userId de la sesión activa
  if (!code || state !== session.user.id) {
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=strava_invalid`)
  }

  const tokenRes = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type:    'authorization_code',
    }),
    signal: AbortSignal.timeout(5_000),
  })

  if (!tokenRes.ok) {
    console.error('[strava callback] token exchange failed', tokenRes.status)
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=strava_token`)
  }

  const data = await tokenRes.json() as {
    access_token: string
    refresh_token: string
    expires_at: number
    athlete: { id: number }
  }

  await wearableRepository.upsert({
    userId:            session.user.id,
    provider:          'strava',
    accessToken:       data.access_token,
    refreshToken:      data.refresh_token,
    expiresAt:         new Date(data.expires_at * 1000),
    scopes:            ['activity:read_all'],
    providerAccountId: data.athlete.id.toString(),
  })

  return NextResponse.redirect(`${baseUrl}/settings/integrations?connected=strava`)
}
