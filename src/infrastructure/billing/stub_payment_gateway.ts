/**
 * Gateway stub para desarrollo y testing.
 * No procesa pagos reales.
 * Activo cuando PAYMENT_GATEWAY está ausente o = 'stub'.
 *
 * Para producción:
 *   - PAYMENT_GATEWAY=wompi  → WompiPaymentGateway (implementar cuando sea elegido)
 *   - PAYMENT_GATEWAY=stripe → StripePaymentGateway (implementar cuando sea elegido)
 */
import type { IPaymentGateway } from '@/domain/ports/payment_gateway'
import type {
  CoachCheckoutInput,
  AthleteCheckoutInput,
  CheckoutOutput,
  WebhookEvent,
} from '@/domain/billing/billing.types'

export class StubPaymentGateway implements IPaymentGateway {
  async createCoachCheckout(input: CoachCheckoutInput): Promise<CheckoutOutput> {
    const sessionId = `stub_coach_${input.userId}_${Date.now()}`
    const params = new URLSearchParams({
      sessionId,
      type: 'coach',
      tier: input.targetTier,
      userId: input.userId,
      successUrl: input.successUrl,
    })
    return {
      checkoutUrl: `/api/billing/stub/simulate?${params.toString()}`,
      sessionId,
    }
  }

  async createAthleteCheckout(input: AthleteCheckoutInput): Promise<CheckoutOutput> {
    const sessionId = `stub_athlete_${input.userId}_${Date.now()}`
    const params = new URLSearchParams({
      sessionId,
      type: 'athlete',
      userId: input.userId,
      billingCycle: input.billingCycle,
      successUrl: input.successUrl,
    })
    return {
      checkoutUrl: `/api/billing/stub/simulate?${params.toString()}`,
      sessionId,
    }
  }

  /**
   * En stub mode, el body debe ser un WebhookEvent serializado como JSON.
   * No se verifica firma.
   */
  async parseWebhookEvent(rawBody: string, _signature: string): Promise<WebhookEvent> {
    return JSON.parse(rawBody) as WebhookEvent
  }
}
