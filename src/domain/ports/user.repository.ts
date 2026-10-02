export type FeatureKey = 'plan' | 'checkin' | 'nutrition' | 'progress' | 'log' | 'coach' | 'gym'

/**
 * Port — contract for user-level configuration updates.
 * Todas las operaciones escriben directamente a columnas de User (no al JSON blob config).
 */
export interface IUserRepository {
  /** Enable a specific feature flag column (atomic). */
  enableFeature(userId: string, feature: FeatureKey): Promise<void>
  /** Enable multiple feature flag columns atomically (single UPDATE). */
  enableFeatures(userId: string, features: FeatureKey[]): Promise<void>
  /** Merge arbitrary feature flags (true or false) atomically. */
  mergeFeatures(userId: string, patch: Partial<Record<FeatureKey, boolean>>): Promise<void>
  /**
   * Complete onboarding: set feature columns + onboardingCompleted + sport in HealthProfile.
   * No read-modify-write needed — each column is set independently.
   */
  completeOnboarding(
    userId: string,
    opts: {
      features?: Partial<Record<FeatureKey, boolean>>
      onboarding: { completed: boolean; completedAt: string }
      sport: { type: string | null; goal: string | null }
    }
  ): Promise<void>
}
