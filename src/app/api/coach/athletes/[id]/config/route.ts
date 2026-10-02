import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

// /config maneja solo metadatos del coach sobre el atleta: goal y notas privadas.
// Para activar o pausar un atleta usar PATCH /api/coach/athletes/[id]/status.

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed } = await rateLimitAsync(`coach-${session.user.id}:athlete-config-patch`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return Response.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id: athleteId } = await params

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
  })
  if (!relation) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 })

  const body = (await req.json()) as { coachGoal?: string | null; privateNotes?: string | null }

  if (!('coachGoal' in body) && !('privateNotes' in body)) {
    return Response.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const data: { coachGoal?: string | null; privateNotes?: string | null } = {}
  if ('coachGoal' in body) data.coachGoal = body.coachGoal ?? null
  if ('privateNotes' in body) data.privateNotes = body.privateNotes ?? null

  await prisma.coachAthlete.update({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
    data,
  })

  return Response.json({ ok: true })
}
