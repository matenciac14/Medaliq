import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

async function requireAdmin(req?: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return null
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return u?.role === 'ADMIN' ? session : null
}

// GET /api/admin/invite-codes — lista todos los códigos de todos los coaches
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, code: true, usedBy: true, usedAt: true, expiresAt: true, createdAt: true,
      coach: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ codes })
}

// POST /api/admin/invite-codes — genera un código para un coach específico
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { coachId } = await req.json()
  if (!coachId) return NextResponse.json({ error: 'coachId requerido.' }, { status: 400 })

  const coach = await prisma.user.findUnique({ where: { id: coachId }, select: { role: true } })
  if (!coach || coach.role !== 'COACH') {
    return NextResponse.json({ error: 'El usuario no es un coach.' }, { status: 400 })
  }

  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase()
  const code = `MEDAL-${suffix}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await prisma.inviteCode.create({
    data: { code, coachId, expiresAt },
    select: { id: true, code: true, expiresAt: true },
  })

  return NextResponse.json({ invite })
}
