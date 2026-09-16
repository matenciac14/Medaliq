import type { CheckInInput, PreviousCheckIn, WeekActivitySummary } from '@/domain/checkin/check_in.types'

export type SaveCheckInPayload = CheckInInput & {
  trainingAdherence: number    // calculated server-side from session logs
  triggers: string[]           // adjustment triggers from rule evaluation
  weekNumber: number
  planId: string | null        // null = sin plan activo (check-in usa ISO week)
}

/**
 * Port — contract for check-in persistence.
 * Domain depends on this interface, NOT on Prisma.
 */
export interface ICheckInRepository {
  /** Most recent check-in for a user, for HR and weight baseline. */
  findLatest(userId: string): Promise<PreviousCheckIn | null>

  /** Persist check-in (upsert by userId + weekNumber). Returns the check-in id. */
  save(userId: string, data: SaveCheckInPayload): Promise<{ id: string }>

  /** Count total check-ins for a user (used to activate progress feature on first check-in). */
  count(userId: string): Promise<number>

  /** Objective training data for the current week — aggregates SessionLog + GymSession. */
  getWeekActivitySummary(userId: string, timezone?: string | null): Promise<WeekActivitySummary>
}
