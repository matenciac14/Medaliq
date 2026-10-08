/**
 * WompiPaymentGateway — adaptador de producción para Wompi (Colombia).
 * Wompi NO tiene suscripciones nativas: se crea un payment link por ciclo,
 * el webhook APPROVED extiende currentPeriodEnd +30 días (suscripción manual).
 *
 * Env vars requeridas:
 *   WOMPI_PRIVATE_KEY       — dashboard.wompi.co > API keys
 *   WOMPI_INTEGRITY_SECRET  — dashboard.wompi.co > Webhooks > Integrity
 *   WOMPI_SANDBOX           — 'true' para usar sandbox.wompi.co (dev/test)
 */
import { createHash } from 'crypto'
import type { IPaymentGateway } from '@/domain/ports/payment_gateway'
import type { CoachTier } from '@/domain/subscription/tier_features'
import type {
  CoachCheckoutInput,
  AthleteCheckoutInput,
  CheckoutOutput,
  WebhookEvent,
} from '@/domain/billing/billing.types'
import {
  COACH_TIER_PRICES_USD,
  ATHLETE_PRO_PRICE_USD,
  ATHLETE_PRO_ANNUAL_PRICE_USD,
  BILLING_CYCLE_DAYS,
  usdToCopCents,
} from '@/domain/billing/billing.types'
import { getTrm } from './trm'

type WompiPaymentLinkResponse = {
  data: { id: string; url: string }
}

type WompiTransaction = {
  id: string
  status: 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED' | 'PENDING'
  reference: string
  amount_in_cents: number
  currency: string
  metadata: {
    userId: string
    userRole: 'COACH' | 'ATHLETE'
    targetTier?: string
    billingCycle?: string
  }
  signature: { checksum: string; properties: string[] }
}

type WompiWebhookPayload = {
  event: string
  data: { transaction: WompiTransaction }
}

function getWompiBaseUrl(): string {
  return process.env.WOMPI_SANDBOX === 'true'
    ? 'https://sandbox.wompi.co/v1'
    : 'https://production.wompi.co/v1'
}

async function createPaymentLink(
  reference: string,
  amountInCents: number,
  metadata: Record<string, string>,
): Promise<{ url: string }> {
  const privateKey = process.env.WOMPI_PRIVATE_KEY
  if (!privateKey) throw new Error('WOMPI_PRIVATE_KEY no configurado.')

  const body = {
    name: `Medaliq — ${reference}`,
    description: 'Suscripción Medaliq',
    single_use: true,
    currency: 'COP',
    amount_in_cents: amountInCents,
    redirect_url: metadata.successUrl ?? 'https://medaliq.com',
    collect_shipping: false,
    metadata,
  }

  const res = await fetch(`${getWompiBaseUrl()}/payment_links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${privateKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Wompi payment link error ${res.status}: ${err}`)
  }

  const json = (await res.json()) as WompiPaymentLinkResponse
  return { url: json.data.url }
}

function verifyIntegrity(
  reference: string,
  amountInCents: number,
  currency: string,
  checksum: string,
): boolean {
  const secret = process.env.WOMPI_INTEGRITY_SECRET
  if (!secret) throw new Error('WOMPI_INTEGRITY_SECRET no configurado.')
  const payload = `${reference}${amountInCents}${currency}${secret}`
  const expected = createHash('sha256').update(payload).digest('hex')
  return expected === checksum
}

export class WompiPaymentGateway implements IPaymentGateway {
  async createCoachCheckout(input: CoachCheckoutInput): Promise<CheckoutOutput> {
    const reference = `coach-${input.userId}-${input.targetTier}-${Date.now()}`
    const amountInCents = usdToCopCents(COACH_TIER_PRICES_USD[input.targetTier], await getTrm())

    const { url } = await createPaymentLink(reference, amountInCents, {
      userId: input.userId,
      userRole: 'COACH',
      targetTier: input.targetTier,
      successUrl: input.successUrl,
    })

    return { checkoutUrl: url, sessionId: reference }
  }

  async createAthleteCheckout(input: AthleteCheckoutInput): Promise<CheckoutOutput> {
    const cycle = input.billingCycle
    const priceUsd = cycle === 'annual' ? ATHLETE_PRO_ANNUAL_PRICE_USD : ATHLETE_PRO_PRICE_USD
    const reference = `athlete-${input.userId}-pro-${cycle}-${Date.now()}`
    const amountInCents = usdToCopCents(priceUsd, await getTrm())

    const { url } = await createPaymentLink(reference, amountInCents, {
      userId: input.userId,
      userRole: 'ATHLETE',
      billingCycle: cycle,
      successUrl: input.successUrl,
    })

    return { checkoutUrl: url, sessionId: reference }
  }

  async parseWebhookEvent(rawBody: string, _signature: string): Promise<WebhookEvent> {
    const payload = JSON.parse(rawBody) as WompiWebhookPayload
    const tx = payload.data?.transaction

    if (!tx) throw new Error('Payload Wompi inválido: sin transaction.')

    // Verificar integridad (reference + amount + currency + secret)
    const valid = verifyIntegrity(
      tx.reference,
      tx.amount_in_cents,
      tx.currency,
      tx.signature?.checksum,
    )
    if (!valid) throw new Error('Firma Wompi inválida.')

    const { userId, userRole, targetTier, billingCycle } = tx.metadata ?? {}
    if (!userId || !userRole) throw new Error('Metadata Wompi incompleta.')

    if (tx.status === 'APPROVED') {
      const cycle = (billingCycle === 'annual' ? 'annual' : 'monthly') as import('@/domain/billing/billing.types').BillingCycle
      const days = BILLING_CYCLE_DAYS[cycle]
      const newPeriodEnd = new Date()
      newPeriodEnd.setDate(newPeriodEnd.getDate() + days)

      return {
        eventId: tx.id,
        eventType: 'charge.success',
        userId,
        userRole,
        newPeriodEnd,
        coachTargetTier: targetTier as CoachTier | undefined,
      }
    }

    // DECLINED / ERROR / VOIDED
    return {
      eventId: tx.id,
      eventType: 'charge.failed',
      userId,
      userRole,
    }
  }
}
