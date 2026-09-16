/**
 * Infrastructure — Prisma implementation of IHealthProfileRepository.
 */
import type {
  IHealthProfileRepository,
  AthleteHealthProfile,
  NutritionTargets,
  CreateHealthProfile,
} from '@/domain/ports/health_profile.repository'
import type { PrismaDbClient } from '@/lib/db/prisma_client'
import { prisma } from '@/lib/db/prisma'

export class PrismaHealthProfileRepository implements IHealthProfileRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async find(userId: string): Promise<AthleteHealthProfile | null> {
    // daysPerWeek lives in WeeklyRoutine (GAP-02), not HealthProfile — fetch in parallel
    const [profile, routine] = await Promise.all([
      this.db.healthProfile.findUnique({
        where: { userId },
        select: {
          weightKg: true,
          weightGoalKg: true,
          heightCm: true,
          age: true,
          dateOfBirth: true,
          gender: true,
          sessionMinutes: true,
        },
      }),
      this.db.weeklyRoutine.findUnique({ where: { userId }, select: { daysPerWeek: true } }),
    ])
    if (!profile) return null
    return { ...profile, daysPerWeek: routine?.daysPerWeek ?? null }
  }

  async updateWeight(userId: string, weightKg: number): Promise<void> {
    await this.db.healthProfile.update({
      where: { userId },
      data: { weightKg },
    })
  }

  async updateHrResting(userId: string, hrResting: number): Promise<void> {
    await this.db.healthProfile.updateMany({
      where: { userId },
      data: { hrResting },
    })
  }

  async updateNutritionTargets(userId: string, targets: NutritionTargets): Promise<void> {
    await this.db.nutritionPlan.update({
      where: { userId },
      data: targets,
    })
  }

  async hasNutritionPlan(userId: string): Promise<boolean> {
    const plan = await this.db.nutritionPlan.findUnique({
      where: { userId },
      select: { id: true },
    })
    return !!plan
  }

  async getNutritionKcalAdjustment(userId: string): Promise<number> {
    const plan = await this.db.nutritionPlan.findUnique({
      where: { userId },
      select: { kcalAdjustment: true },
    })
    return plan?.kcalAdjustment ?? 0
  }

  async upsertProfile(userId: string, data: CreateHealthProfile): Promise<void> {
    const payload = {
      age: data.age,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      ...(data.weightGoalKg !== undefined && { weightGoalKg: data.weightGoalKg }),
      gender: data.gender,
      ...(data.hrResting !== undefined && { hrResting: data.hrResting }),
      ...(data.hrMax !== undefined && { hrMax: data.hrMax }),
      ...(data.ftp !== undefined && { ftp: data.ftp }),
      ...(data.injuries !== undefined && { injuries: data.injuries }),
      ...(data.conditions !== undefined && { conditions: data.conditions }),
      ...(data.sessionMinutes !== undefined && { sessionMinutes: data.sessionMinutes }),
      ...(data.sport !== undefined && { sport: data.sport }),
      ...(data.experienceLevel !== undefined && { experienceLevel: data.experienceLevel }),
      ...(data.sportDetails !== undefined && { sportDetails: data.sportDetails as object }),
      ...(data.dataSources !== undefined && { dataSources: data.dataSources as object }),
    }
    await this.db.healthProfile.upsert({
      where: { userId },
      create: { userId, ...payload, sportDetails: data.sportDetails as object ?? {}, dataSources: data.dataSources as object ?? {} },
      update: payload,
    })
  }
}
