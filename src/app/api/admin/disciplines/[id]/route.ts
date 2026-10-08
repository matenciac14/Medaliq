import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { __clearCache } from '@/domain/discipline/discipline_resolver'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return u?.role === 'ADMIN' ? session : null
}

const UpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  nameEs: z.string().min(2).max(100).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  hasExerciseLibrary: z.boolean().optional(),
  trackingFields: z.record(z.string(), z.boolean()).optional(),
  sessionTypes: z.array(z.string().max(50)).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/admin/disciplines/[id] — get discipline detail with usage counts
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const discipline = await prisma.discipline.findUnique({
    where: { id },
    include: {
      _count: { select: { exercises: true, sessionLogs: true } },
    },
  })

  if (!discipline) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json(discipline)
}

/**
 * PATCH /api/admin/disciplines/[id] — update discipline fields
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const parsed = UpdateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body invalido' }, { status: 400 })

  const existing = await prisma.discipline.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const discipline = await prisma.discipline.update({
    where: { id },
    data: parsed.data,
  })
  __clearCache()

  return NextResponse.json(discipline)
}

/**
 * DELETE /api/admin/disciplines/[id] — soft delete (isActive = false)
 * Hard delete only if no exercises or session logs reference it.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const discipline = await prisma.discipline.findUnique({
    where: { id },
    include: { _count: { select: { exercises: true, sessionLogs: true } } },
  })

  if (!discipline) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const hasReferences = discipline._count.exercises > 0 || discipline._count.sessionLogs > 0

  if (hasReferences) {
    await prisma.discipline.update({ where: { id }, data: { isActive: false } })
    __clearCache()
    return NextResponse.json({ ok: true, action: 'deactivated', reason: `${discipline._count.exercises} exercises, ${discipline._count.sessionLogs} session logs` })
  }

  await prisma.discipline.delete({ where: { id } })
  __clearCache()
  return NextResponse.json({ ok: true, action: 'deleted' })
}
