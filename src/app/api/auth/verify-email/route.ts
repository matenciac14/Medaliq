import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=token-invalido', req.url))
  }

  // Delete-and-check: if delete fails, another request already consumed the token
  const record = await prisma.verificationToken.delete({ where: { token } }).catch(() => null)
  if (!record) {
    return NextResponse.redirect(new URL('/login?error=token-invalido', req.url))
  }

  if (new Date() > record.expires) {
    return NextResponse.redirect(new URL('/login?error=token-expirado', req.url))
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=usuario-no-encontrado', req.url))
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  })

  return NextResponse.redirect(new URL('/login?verified=1', req.url))
}
