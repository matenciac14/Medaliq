import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getTodaySession } from '@/domain/gym/get_today_session.use_case'

export async function GET(req: NextRequest) {
  const athleteId = (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userRecord = await prisma.user.findUnique({ where: { id: athleteId }, select: { featureGym: true, timezone: true } })
  if (!userRecord?.featureGym) {
    return NextResponse.json({ error: 'La función de Ejercicios está disponible en el plan Pro.' }, { status: 403 })
  }

  const result = await getTodaySession(athleteId, userRecord.timezone, prisma)
  return NextResponse.json(result)
}
