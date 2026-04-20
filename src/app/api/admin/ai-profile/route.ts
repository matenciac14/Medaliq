import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseAIProfile } from '@/lib/ai/profile'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const config = await prisma.systemConfig.findUnique({ where: { id: 'singleton' } })
  const profile = parseAIProfile(config?.aiProfile)
  return NextResponse.json(profile)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const body = await req.json()
  const current = await prisma.systemConfig.findUnique({ where: { id: 'singleton' } })
  const currentProfile = parseAIProfile(current?.aiProfile)
  const newProfile = { ...currentProfile, ...body }

  await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', aiProfile: newProfile },
    update: { aiProfile: newProfile },
  })

  return NextResponse.json({ success: true })
}
