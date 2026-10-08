/**
 * Lógica de negocio pura para cálculos financieros del admin.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 */

import type { CoachTier } from '@/domain/subscription/tier_features'

export const ATHLETE_PRO_PRICE_USD = 9.99

/**
 * Fee mensual plano por tier de coach.
 * SCALE: $139 base + $4.00 por asesorado sobre 30 (Scale+).
 */
export function coachTierFee(tier: CoachTier, athleteCount: number = 0): number {
  switch (tier) {
    case 'STARTER': return 0
    case 'GROWTH':  return 59
    case 'PRO':     return 139
    case 'SCALE':   return 139 + Math.max(0, athleteCount - 30) * 4
  }
}

/**
 * Etiqueta legible del tier del coach.
 */
export function coachTierFeeLabel(tier: CoachTier, athleteCount: number = 0): string {
  switch (tier) {
    case 'STARTER': return 'Starter — $0/mes'
    case 'GROWTH':  return 'Growth — $59/mes'
    case 'PRO':     return 'Pro — $139/mes'
    case 'SCALE':
      return athleteCount > 30
        ? `Scale+ — $139 + $${((athleteCount - 30) * 4).toFixed(0)} extra`
        : 'Scale — $139/mes'
  }
}

/**
 * Calcula el MRR estimado de atletas Pro.
 */
export function mrrAthletes(proAthleteCount: number): number {
  return proAthleteCount * ATHLETE_PRO_PRICE_USD
}

/**
 * Calcula el MRR estimado de fees de coaches (suma de todos los fees).
 */
export function mrrCoaches(fees: number[]): number {
  return fees.reduce((sum, f) => sum + f, 0)
}
