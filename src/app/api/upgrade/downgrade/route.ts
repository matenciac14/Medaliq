import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ATHLETE') {
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL!))
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { config: true },
  })
  const currentConfig = parseUserConfig(existing?.config)

  const newConfig = {
    ...currentConfig,
    features: {
      ...currentConfig.features,
      plan: false,
      checkin: false,
      nutrition: false,
      progress: true,   // mantiene historial visible
      log: true,        // mantiene log manual
    },
    trial: {
      plan: 'FREE' as const,
      endsAt: currentConfig.trial?.endsAt ?? null,
    },
    ai: {
      ...currentConfig.ai,
      monthlyLimit: 0,
    },
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { config: newConfig },
  })

  return NextResponse.redirect(new URL('/dashboard', process.env.NEXTAUTH_URL!))
}
