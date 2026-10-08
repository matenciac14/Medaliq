/**
 * GET /api/mobile/billing/prices
 * Devuelve el precio Pro en USD y COP con el TRM vigente.
 * Público (no requiere auth) — se usa en la pantalla de pricing antes del login.
 */

import { NextResponse } from 'next/server'
import { ATHLETE_PRO_PRICE_USD, ATHLETE_PRO_ANNUAL_PRICE_USD, usdToCopDisplay } from '@/domain/billing/billing.types'
import { getTrmWithMeta } from '@/infrastructure/billing/trm'

export async function GET() {
  const trm = await getTrmWithMeta()

  return NextResponse.json({
    priceUSD: ATHLETE_PRO_PRICE_USD,
    priceCOP: usdToCopDisplay(ATHLETE_PRO_PRICE_USD, trm.value),
    annualPriceUSD: ATHLETE_PRO_ANNUAL_PRICE_USD,
    annualPriceCOP: usdToCopDisplay(ATHLETE_PRO_ANNUAL_PRICE_USD, trm.value),
    trmValue: trm.value,
    trmDate: trm.date,
  })
}
