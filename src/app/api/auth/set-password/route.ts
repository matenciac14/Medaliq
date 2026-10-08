import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { passwordSchema, parseBody } from '@/lib/validation'
import { rateLimitAsync } from '@/lib/rate_limit'

const SetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido.'),
  newPassword: passwordSchema,
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { allowed } = await rateLimitAsync(`set-password:${ip}`, { limit: 5, windowMs: 900_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 })

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(SetPasswordSchema, raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { token, newPassword } = parsed.data

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)
  let userId: string

  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== 'set-password' || typeof payload.sub !== 'string') {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
    }
    userId = payload.sub
  } catch {
    return NextResponse.json({ error: 'El link expiró o no es válido. Pide a tu coach un nuevo link.' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  })

  return NextResponse.json({ ok: true })
}
