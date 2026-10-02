/**
 * Infrastructure — Prisma implementation of IUserRepository.
 * Escribe directamente a columnas de User (no al JSON blob config).
 */
import type { IUserRepository, FeatureKey } from '@/domain/ports/user.repository'
import type { PrismaDbClient } from '@/lib/db/prisma_client'
import { prisma } from '@/lib/db/prisma'

const FEATURE_COLUMN: Record<FeatureKey, string> = {
  plan:      'featurePlan',
  checkin:   'featureCheckin',
  nutrition: 'featureNutrition',
  progress:  'featureProgress',
  log:       'featureLog',
  coach:     'featureCoach',
  gym:       'featureGym',
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async enableFeature(userId: string, feature: FeatureKey): Promise<void> {
    await this.mergeFeatures(userId, { [feature]: true })
  }

  async enableFeatures(userId: string, features: FeatureKey[]): Promise<void> {
    if (features.length === 0) return
    await this.mergeFeatures(userId, Object.fromEntries(features.map(f => [f, true])))
  }

  async mergeFeatures(userId: string, patch: Partial<Record<FeatureKey, boolean>>): Promise<void> {
    const entries = Object.entries(patch) as [FeatureKey, boolean][]
    if (entries.length === 0) return

    const data: Record<string, boolean> = {}
    for (const [k, v] of entries) {
      const col = FEATURE_COLUMN[k]
      if (col) data[col] = v
    }
    await this.db.user.update({ where: { id: userId }, data })
  }

  async completeOnboarding(
    userId: string,
    opts: {
      features?: Partial<Record<FeatureKey, boolean>>
      onboarding: { completed: boolean; completedAt: string }
      sport: { type: string | null; goal: string | null }
    }
  ): Promise<void> {
    // Build update data from features + onboarding fields (typed, no raw SQL interpolation)
    const updateData: Record<string, unknown> = {
      onboardingCompleted: opts.onboarding.completed,
      onboardingCompletedAt: new Date(opts.onboarding.completedAt),
    }
    if (opts.features) {
      for (const [k, v] of Object.entries(opts.features) as [FeatureKey, boolean][]) {
        const col = FEATURE_COLUMN[k]
        if (col) updateData[col] = v
      }
    }

    await this.db.user.update({ where: { id: userId }, data: updateData })

    // sport type + goal → HealthProfile (upsertProfile ya escribe estos campos,
    // pero completeOnboarding puede ser llamado sin upsertProfile en algunos paths)
    await this.db.healthProfile.updateMany({
      where: { userId },
      data: { sport: opts.sport.type, sportGoal: opts.sport.goal },
    })
  }
}
