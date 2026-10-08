import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseBody } from '@/lib/validation'
import { rateLimitAsync } from '@/lib/rate_limit'
import { sendAthleteWelcomeEmail } from '@/infrastructure/email/resend'
import { createAthleteUseCase, createAthleteSchema } from '@/domain/coach_dashboard/create_athlete.use_case'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:clients-create`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  try {
    const raw = await req.json().catch(() => null)
    const parsed = parseBody(createAthleteSchema, raw)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const result = await createAthleteUseCase(
      parsed.data,
      session.user.id,
      !!session.user.profileComplete,
      prisma,
    )

    sendAthleteWelcomeEmail(result.email, result.athleteName, session.user.name ?? 'Tu coach', result.resetLink)
      .catch(err => console.error('[coach/clients/create] Welcome email failed:', err))

    return NextResponse.json({
      ok: true,
      email: result.email,
      resetLink: result.resetLink,
      athleteId: result.athleteId,
      athleteName: result.athleteName,
    }, { status: 201 })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; code?: string; limit?: number; current?: number }
    if (e?.status && e?.message) {
      const body: Record<string, unknown> = { error: e.message }
      if (e.code) body.code = e.code
      if (e.limit != null) { body.limit = e.limit; body.current = e.current }
      return NextResponse.json(body, { status: e.status })
    }
    console.error('[coach/clients/create]', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
