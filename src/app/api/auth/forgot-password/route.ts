import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { sendPasswordResetEmail } from '@/infrastructure/email/resend'
import { emailSchema, parseBody } from '@/lib/validation'
import { rateLimitAsync } from '@/lib/rate_limit'

const ForgotSchema = z.object({ email: emailSchema })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { allowed } = await rateLimitAsync(`forgot-password:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 })

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(ForgotSchema, raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { email } = parsed.data

  // Always return 200 to avoid email enumeration
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })

  if (user) {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)
    const token = await new SignJWT({ purpose: 'set-password' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setExpirationTime('1h')
      .sign(secret)

    const resetLink = `${process.env.NEXTAUTH_URL ?? 'https://medaliq.com'}/set-password?token=${token}`

    await sendPasswordResetEmail(user.email, resetLink).catch(() => {
      // Log but don't expose email errors to client
      console.error('[forgot-password] Failed to send email to', user.email)
    })
  }

  return NextResponse.json({ ok: true })
}
