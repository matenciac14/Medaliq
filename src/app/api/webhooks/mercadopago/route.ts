/**
 * Webhook stub — Mercado Pago (P2).
 * Configurar esta URL en dashboard de Mercado Pago cuando se implemente el adapter.
 * URL: https://medaliq.com/api/webhooks/mercadopago
 */
import { NextResponse } from 'next/server'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ message: 'Mercado Pago integration coming in P2' })
}
