import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { generatePlan } from '@/lib/plan/generator'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id: athleteId } = await params
  const coachId = session.user.id

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Asesorado no encontrado.' }, { status: 404 })
  }

  const body = await req.json()
  const { goalType, daysPerWeek, hoursPerSession } = body

  if (!goalType) {
    return NextResponse.json({ error: 'goalType es requerido.' }, { status: 400 })
  }

  // Load athlete health profile for plan generation
  const athlete = await prisma.user.findUnique({
    where: { id: athleteId },
    include: { profile: true },
  })

  const profile = athlete?.profile

  const result = await generatePlan({
    userId: athleteId,
    goalType,
    daysPerWeek: daysPerWeek ?? profile?.daysPerWeek ?? 4,
    hoursPerSession: hoursPerSession ?? 1,
    age: profile?.age ?? 30,
    heightCm: profile?.heightCm ?? 170,
    weightKg: profile?.weightKg ?? 70,
    gender: (profile?.gender as 'male' | 'female') ?? 'male',
    hrResting: profile?.hrResting ?? undefined,
    hrMax: profile?.hrMax ?? undefined,
    injuries: (profile?.injuries as string[]) ?? [],
    conditions: (profile?.conditions as string[]) ?? [],
    nutritionCommitment: 'moderate',
    weightGoalKg: profile?.weightGoalKg ?? undefined,
    generatedBy: 'COACH',
  })

  return NextResponse.json({ success: true, planId: result.planId })
}
