/**
 * BancoRepublicaTrmAdapter — obtiene el TRM (USD→COP) oficial del Banco de la República.
 * Fuente: API de datos abiertos del gobierno colombiano (datos.gov.co).
 *
 * Endpoint: GET https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde+DESC
 * Devuelve el registro más reciente de la serie de TRM.
 *
 * No requiere API key. Datos oficiales, actualizados diariamente en días hábiles.
 */

import type { ITrmProvider, TrmResult } from '@/domain/ports/trm.provider'

type BancoRepublicaRecord = {
  valor: string         // e.g. "3205.67"
  vigenciadesde: string // e.g. "2026-08-15T00:00:00.000"
  vigenciahasta: string // e.g. "2026-08-15T00:00:00.000"
  unidad: string        // "COP"
}

const API_URL =
  'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde+DESC'

export class BancoRepublicaTrmAdapter implements ITrmProvider {
  async getCurrentTrm(): Promise<TrmResult> {
    const res = await fetch(API_URL, {
      headers: { Accept: 'application/json' },
      // next.js cache: no almacenar — siempre fresco en el cron
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      throw new Error(`BancoRepublica API error ${res.status}: ${await res.text()}`)
    }

    const rows = (await res.json()) as BancoRepublicaRecord[]

    if (!rows || rows.length === 0) {
      throw new Error('BancoRepublica API: respuesta vacía.')
    }

    const record = rows[0]
    const value  = parseFloat(record.valor)

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`BancoRepublica API: valor inválido: ${record.valor}`)
    }

    // Extraer solo la fecha (YYYY-MM-DD) de la ISO string
    const date = record.vigenciadesde.substring(0, 10)

    return { value, date }
  }
}
