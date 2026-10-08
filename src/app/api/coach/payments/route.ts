import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

// GET /api/coach/payments — todos los pagos del coach (con info del atleta)
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const rl = await rateLimitAsync(`web-${session.user.id}:coach-payments-get`, { limit: 300, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const payments = await prisma.payment.findMany({
    where: { coachId: session.user.id },
    include: { athlete: { select: { id: true, name: true, email: true } } },
    orderBy: [{ status: 'asc' }, { dueDate: 'desc' }],
    take: 500,
  })

  return NextResponse.json({ payments })
}

// POST /api/coach/payments — registrar nuevo pago
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:payments-post`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const body = await req.json() as {
    athleteId?: string
    amount?: number
    currency?: string
    description?: string
    dueDate?: string
    notes?: string
  }

  const { athleteId, amount, currency = 'COP', description, dueDate, notes } = body

  if (!athleteId || !amount || amount <= 0 || !dueDate) {
    return NextResponse.json({ error: 'athleteId, amount y dueDate son requeridos.' }, { status: 400 })
  }

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Atleta no encontrado.' }, { status: 404 })
  }

  const due = new Date(dueDate)
  if (isNaN(due.getTime())) {
    return NextResponse.json({ error: 'dueDate inválido.' }, { status: 400 })
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        coachId: session.user.id,
        athleteId,
        amount,
        currency,
        description: description?.trim() || null,
        dueDate: due,
        notes: notes?.trim() || null,
        status: 'PENDING',
      },
      include: { athlete: { select: { id: true, name: true, email: true } } },
    })
    await tx.paymentAuditLog.create({
      data: { paymentId: created.id, action: 'CREATED', actorId: session.user.id },
    })
    return created
  })

  return NextResponse.json({ payment }, { status: 201 })
}
