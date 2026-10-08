import { wearableRepository } from '@/infrastructure/db/wearable.repository'

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_URL   = 'https://www.strava.com/api/v3'

// Renovar token si expira en menos de 10 minutos
const REFRESH_THRESHOLD_MS = 10 * 60 * 1000

export interface StravaActivity {
  id: number
  name: string
  sport_type: string
  distance: number       // metros
  moving_time: number    // segundos
  average_heartrate?: number
  max_heartrate?: number
  calories?: number
  average_speed?: number // m/s
  start_date: string     // ISO string
}

export async function refreshStravaTokenIfNeeded(userId: string): Promise<string | null> {
  const conn = await wearableRepository.findByUserAndProvider(userId, 'strava')
  if (!conn) return null

  const needsRefresh =
    conn.expiresAt != null &&
    conn.expiresAt.getTime() < Date.now() + REFRESH_THRESHOLD_MS

  if (!needsRefresh) return conn.accessToken

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token: conn.refreshToken,
    }),
    signal: AbortSignal.timeout(5_000),
  })

  if (!res.ok) {
    console.error('[strava] token refresh failed', res.status)
    return null
  }

  const data = await res.json() as { access_token: string; expires_at: number }

  await wearableRepository.updateTokens(userId, 'strava', {
    accessToken: data.access_token,
    expiresAt:   new Date(data.expires_at * 1000),
  })

  return data.access_token
}

export async function fetchStravaActivity(activityId: number, accessToken: string): Promise<StravaActivity | null> {
  const res = await fetch(`${STRAVA_API_URL}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(5_000),
  })

  if (!res.ok) {
    console.error('[strava] fetch activity failed', activityId, res.status)
    return null
  }

  return res.json() as Promise<StravaActivity>
}
