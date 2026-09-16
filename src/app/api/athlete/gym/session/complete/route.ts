import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'
import { GymCompleteSchema } from '@/domain/gym/gym_session.schemas'
import { completeGymSession, SessionNotFoundError } from '@/domain/gym/complete_session.orchestrator'

export async function POST(req: NextRequest) {
  const athleteId = (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userRecord = await prisma.user.findUnique({ where: { id: athleteId }, select: { featureGym: true, name: true, timezone: true } })
  if (!userRecord?.featureGym) {
    return NextResponse.json({ error: 'La función de Ejercicios está disponible en el plan Pro.' }, { status: 403 })
  }

  const parsed = GymCompleteSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })

  try {
    const result = await completeGymSession(athleteId, userRecord.name, userRecord.timezone, parsed.data, prisma)
    revalidatePath('/dashboard')
    return NextResponse.json(result, { status: result.alreadyCompleted ? 200 : 201 })
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    throw err
  }
}
