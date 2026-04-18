import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const suffix = Math.random().toString(36).substr(2, 4).toUpperCase()
  const code = `MEDAL-${suffix}`

  return NextResponse.json({ code, url: `medaliq.com/join/${code}` })
}
