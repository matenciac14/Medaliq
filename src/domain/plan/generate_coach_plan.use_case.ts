import { z } from 'zod'
import { generatePlanUseCase } from '@/domain/plan/generate_plan.use_case'
import { PLAN_TEMPLATES } from '@/domain/plan/templates'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import type { PrismaDbClient } from '@/lib/db/prisma_client'

// ── Validation schema ──────────────────────────────────────────────────────────

const VALID_GOAL_TYPES = Object.keys(PLAN_TEMPLATES)

export const generateCoachPlanSchema = z.object({
  coachId: z.string(),
  athleteId: z.string(),
  goalType: z.string().refine(
    (v: string) => VALID_GOAL_TYPES.includes(v),
    { message: `goalType inválido. Válidos: ${VALID_GOAL_TYPES.join(', ')}` },
  ),
  daysPerWeek: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).optional(),
  hoursPerSession: z.number().min(0.5).max(3).optional(),
})

export type GenerateCoachPlanInput = z.infer<typeof generateCoachPlanSchema>

// ── Use case ──────────────────────────────────────────────────────────────────

export async function generateCoachPlanUseCase(
  input: GenerateCoachPlanInput,
  db: PrismaDbClient,
): Promise<{ success: true; planId: string }> {
  const { coachId, athleteId, goalType, daysPerWeek, hoursPerSession } = input

  const relation = await db.coachAthlete.findFirst({
    where: { coachId, athleteId, status: 'ACTIVE' },
  })
  if (!relation) {
    throw { status: 404, message: 'Asesorado no encontrado.' }
  }

  const athlete = await db.user.findUnique({
    where: { id: athleteId },
    include: { profile: true },
  })
  const profile = athlete?.profile
  if (!profile) {
    throw { status: 400, message: 'El atleta no tiene perfil físico. Completa el onboarding antes de generar un plan.' }
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const benchmark5K = await db.performanceBenchmark.findFirst({
    where: {
      userId: athleteId,
      sport: 'RUNNING',
      metric: '5K_TIME',
      testedAt: { gte: ninetyDaysAgo },
    },
    orderBy: { testedAt: 'desc' },
    select: { value: true },
  })

  const result = await generatePlanUseCase(
    {
      userId: athleteId,
      goalType,
      daysPerWeek: daysPerWeek ?? 4,
      hoursPerSession: hoursPerSession ?? 1,
      age: profile.age ?? 30,
      heightCm: profile.heightCm ?? 170,
      weightKg: profile.weightKg ?? 70,
      gender: (profile.gender ?? 'male') as 'male' | 'female',
      hrResting: profile.hrResting ?? undefined,
      hrMax: profile.hrMax ?? undefined,
      injuries: (profile.injuries as string[]) ?? [],
      conditions: (profile.conditions as string[]) ?? [],
      nutritionCommitment: 'moderate',
      weightGoalKg: profile.weightGoalKg ?? undefined,
      generatedBy: 'COACH',
      recentBenchmark5KSecs: benchmark5K ? Number(benchmark5K.value) : undefined,
    },
    {
      db,
      planRepo: new PrismaPlanRepository(),
      userRepo: new PrismaUserRepository(),
    },
  )

  return { success: true, planId: result.planId }
}
