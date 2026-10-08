/**
 * Cron diario: downgrade automático de suscripciones vencidas.
 * Vercel cron: schedule en vercel.json → "0 2 * * *" (2am UTC = 9pm COT).
 * Auth: header Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { BillingRepository } from '@/infrastructure/billing/billing.repository'
import { runBillingCheck } from '@/domain/billing/downgrade.use_case'

async function handler(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const repo   = new BillingRepository()
  const result = await runBillingCheck(repo)

  return NextResponse.json({ ok: true, ...result, timestamp: new Date().toISOString() })
}

// Vercel cron envía GET — exponer ambos métodos
export const GET = handler
export const POST = handler
