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

/**
 * GET /api/admin/disciplines — list all disciplines (including inactive)
 */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const disciplines = await prisma.discipline.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { exercises: true, sessionLogs: true } },
    },
  })

  return NextResponse.json(disciplines)
}

const CreateSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(100),
  nameEs: z.string().min(2).max(100),
  icon: z.string().max(10).default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6b7280'),
  sortOrder: z.number().int().min(0).max(999).default(50),
  hasExerciseLibrary: z.boolean().default(false),
  trackingFields: z.record(z.string(), z.boolean()).default({}),
  sessionTypes: z.array(z.string().max(50)).default([]),
  isActive: z.boolean().default(true),
})

/**
 * POST /api/admin/disciplines — create a new discipline
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = CreateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body invalido' }, { status: 400 })

  const existing = await prisma.discipline.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) return NextResponse.json({ error: 'Slug ya existe' }, { status: 409 })

  const discipline = await prisma.discipline.create({ data: parsed.data })
  __clearCache()

  return NextResponse.json(discipline, { status: 201 })
}
