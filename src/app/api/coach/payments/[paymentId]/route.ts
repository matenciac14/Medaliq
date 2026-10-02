import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

// PATCH /api/coach/payments/[paymentId] — actualizar estado (PAID/PENDING)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:payments-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { paymentId } = await params
  const body = await req.json() as { status?: string; paidAt?: string }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, coachId: session.user.id },
  })
  if (!payment) {
    return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 })
  }

  const { status, paidAt } = body
  if (!status || !['PENDING', 'PAID'].includes(status)) {
    return NextResponse.json({ error: 'status inválido.' }, { status: 400 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: status as 'PENDING' | 'PAID',
        paidAt: status === 'PAID' ? (paidAt ? new Date(paidAt) : new Date()) : null,
      },
      include: { athlete: { select: { id: true, name: true, email: true } } },
    })
    await tx.paymentAuditLog.create({
      data: { paymentId, action: status === 'PAID' ? 'MARKED_PAID' : 'REMINDED', actorId: session.user.id },
    })
    return result
  })

  return NextResponse.json({ payment: updated })
}

// DELETE /api/coach/payments/[paymentId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:payments-delete`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { paymentId } = await params
  const coachId = session.user.id

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, coachId },
        select: { id: true },
      })
      if (!payment) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' })

      await tx.paymentAuditLog.create({
        data: { paymentId, action: 'DELETED', actorId: coachId },
      })
      await tx.payment.delete({ where: { id: paymentId } })
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 })
    }
    throw err
  }

  return NextResponse.json({ ok: true })
}
