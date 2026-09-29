import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

/** GET — list session templates for the coach */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await prisma.sessionTemplate.findMany({
    where: { coachId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ templates })
}

/** POST — create a session template */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, type, durationMin, distanceKm, zoneTarget, detailText, sportLabel } = body

  if (!name?.trim() || !type || !durationMin)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const template = await prisma.sessionTemplate.create({
    data: {
      coachId: session.user.id,
      name: name.trim(),
      type,
      durationMin: Number(durationMin),
      distanceKm: typeof distanceKm === 'number' && distanceKm > 0 ? distanceKm : null,
      zoneTarget: zoneTarget?.trim() || null,
      detailText: detailText?.trim() || null,
      sportLabel: sportLabel?.trim() || null,
    },
  })

  return NextResponse.json({ template }, { status: 201 })
}

/** DELETE — delete a session template */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const template = await prisma.sessionTemplate.findUnique({ where: { id } })
  if (!template || template.coachId !== session.user.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.sessionTemplate.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
