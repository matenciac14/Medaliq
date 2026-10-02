const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type PushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
}

export async function sendPushNotification(
  token: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!token) return

  const message: PushMessage = {
    to: token,
    title,
    body,
    sound: 'default',
    ...(data ? { data } : {}),
  }

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(5_000),
  })
}
