/**
 * Tipos puros del dominio de billing.
 * Sin dependencias de Prisma, Next.js ni ningún gateway de pago.
 */
import type { CoachTier } from '../subscription/tier_features'

// ── Precios (fuente canónica del dominio) ─────────────────────────────────────

export const COACH_TIER_PRICES_USD: Record<CoachTier, number> = {
  STARTER: 0,
  GROWTH: 59,
  PRO: 139,
  SCALE: 139,  // base — variable pricing: +$4/atleta sobre 30
}

export const ATHLETE_PRO_PRICE_USD = 9.99
export const ATHLETE_PRO_ANNUAL_PRICE_USD = 59.99

export type BillingCycle = 'monthly' | 'annual'

/** Días de suscripción según ciclo. */
export const BILLING_CYCLE_DAYS: Record<BillingCycle, number> = {
  monthly: 30,
  annual: 365,
}

/**
 * Convierte un precio USD a centavos COP para Wompi.
 * El TRM viene de infraestructura (env var TRM_USD_COP) — el dominio lo recibe como parámetro.
 * Redondea al múltiplo de 100 COP más cercano para precios más limpios.
 *
 * @param usdAmount - precio en USD (ej. 9.99)
 * @param trm       - tasa de cambio 1 USD = TRM COP (ej. 4200)
 * @returns centavos COP para el campo amount_in_cents de Wompi
 */
export function usdToCopCents(usdAmount: number, trm: number): number {
  const cop = usdAmount * trm
  const rounded = Math.round(cop / 100) * 100  // redondea a COP 100 más cercano
  return rounded * 100                          // centavos para Wompi
}

/** Precio COP display (sin centavos) — para mostrar en UI. */
export function usdToCopDisplay(usdAmount: number, trm: number): number {
  return Math.round(usdAmount * trm / 100) * 100
}

/** Días de gracia tras expiración antes de hacer downgrade efectivo. */
export const BILLING_GRACE_DAYS = 3

// ── Input / Output de checkout ────────────────────────────────────────────────

export type BillingUserRole = 'COACH' | 'ATHLETE'

export type CoachCheckoutInput = {
  userId: string
  currentTier: CoachTier
  targetTier: CoachTier
  successUrl: string
  cancelUrl: string
}

export type AthleteCheckoutInput = {
  userId: string
  billingCycle: BillingCycle
  successUrl: string
  cancelUrl: string
}

export type CheckoutOutput = {
  checkoutUrl: string
  sessionId: string
}

// ── Eventos de webhook ────────────────────────────────────────────────────────

export type WebhookEventType =
  | 'charge.success'
  | 'charge.failed'
  | 'subscription.cancelled'

export type WebhookEvent = {
  /** ID único del evento — usado para idempotencia. */
  eventId: string
  eventType: WebhookEventType
  userId: string
  userRole: BillingUserRole
  /** Presente en charge.success: nueva fecha de fin del período. */
  newPeriodEnd?: Date
  /** Presente en charge.success de coach: tier pagado. */
  coachTargetTier?: CoachTier
}

// ── Snapshot de suscripción (vista de dominio, sin modelos Prisma) ─────────────

export type SubscriptionSnapshot = {
  userId: string
  userRole: BillingUserRole
  tier: 'FREE' | 'PRO'
  coachTier: CoachTier
  currentPeriodEnd: Date | null
}
