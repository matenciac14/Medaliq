'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { CoachTier } from '@/domain/subscription/tier_features'

type UpgradeTier = {
  tier: CoachTier
  name: string
  priceCOP: number
  priceUSD: number
  maxAthletes: number
}

type Props = {
  currentTier: CoachTier
  currentTierName: string
  currentPriceCOP: number
  currentPriceUSD: number
  athleteCount: number
  maxAthletes: number
  currentPeriodEnd: string | null
  gateway: string | null
  upgradeTiers: UpgradeTier[]
  trmDate: string | null
  billingStatus: string | null
}

const TIER_FEATURES: Record<CoachTier, string[]> = {
  STARTER: ['Hasta 2 asesorados activos', 'Panel web completo', 'Planes de entrenamiento'],
  GROWTH:  ['Hasta 10 asesorados activos', 'Panel web completo', 'Planes de entrenamiento', 'Seguimiento nutricional'],
  PRO:     ['Hasta 30 asesorados activos', 'Todo Growth', 'Métricas avanzadas', 'Alertas automáticas'],
  SCALE:   ['Asesorados ilimitados', 'Todo Pro', 'Soporte prioritario'],
}

function formatCOP(amount: number): string {
  return amount === 0 ? 'Gratis' : `$${amount.toLocaleString('es-CO')} COP/mes`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

const MAX_POLL_ATTEMPTS = 5
const POLL_INTERVAL_MS  = 2_000

export default function CoachPlanClient({
  currentTier,
  currentTierName,
  currentPriceCOP,
  currentPriceUSD,
  athleteCount,
  maxAthletes,
  currentPeriodEnd,
  upgradeTiers,
  trmDate,
  billingStatus,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)

  // Cuando Wompi redirige de vuelta con ?billing=success, el webhook puede no haberse
  // procesado todavía. Hacemos polling a /api/billing/status hasta que el tier cambie
  // o se agoten los intentos, y luego refresh() recarga el server component con el dato real.
  useEffect(() => {
    if (billingStatus !== 'success') {
      if (billingStatus === 'cancelled') {
        setToast({ msg: 'Pago cancelado. Tu plan no cambió.', type: 'error' })
      }
      return
    }

    setToast({ msg: 'Procesando pago...', type: 'success' })
    setPolling(true)
    attemptsRef.current = 0

    pollRef.current = setInterval(async () => {
      attemptsRef.current++

      try {
        const res  = await fetch('/api/billing/status')
        const data = await res.json() as { coachTier: string }

        if (data.coachTier !== currentTier) {
          // Webhook procesado — recargar para mostrar el nuevo tier
          stopPolling()
          router.refresh()
          return
        }
      } catch {
        // Red inestable — seguir intentando
      }

      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling()
        setToast({
          msg: 'Pago recibido. Si tu plan no se actualizó en un momento, recarga la página.',
          type: 'success',
        })
      }
    }, POLL_INTERVAL_MS)

    return () => stopPolling()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingStatus])

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setPolling(false)
  }

  const handleUpgrade = async (targetTier: CoachTier) => {
    setLoading(targetTier)
    try {
      const res = await fetch('/api/billing/coach/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTier }),
      })
      const data = await res.json() as { checkoutUrl?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error al crear checkout.')
      window.location.href = data.checkoutUrl!
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.'
      setToast({ msg, type: 'error' })
      setLoading(null)
    }
  }

  const usagePercent = maxAthletes === Infinity
    ? 0
    : Math.min((athleteCount / maxAthletes) * 100, 100)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {toast && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {polling && (
            <svg className="animate-spin h-4 w-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          <span className="flex-1">{toast.msg}</span>
          {!polling && (
            <button className="underline flex-shrink-0" onClick={() => setToast(null)}>Cerrar</button>
          )}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Mi Plan</h1>
      <p className="text-sm text-gray-500 mb-8">
        Gestiona tu suscripción y el límite de asesorados activos.
      </p>

      {/* Plan actual */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Plan actual</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">{currentTierName}</p>
            {currentPeriodEnd && (
              <p className="text-sm text-gray-500 mt-1">
                Renueva el {formatDate(currentPeriodEnd)}
              </p>
            )}
          </div>
          <span className="px-3 py-1 bg-[#1e3a5f]/10 text-[#1e3a5f] text-sm font-semibold rounded-full">
            Activo
          </span>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Asesorados activos</span>
            <span className="font-semibold">
              {athleteCount} / {maxAthletes === Infinity ? '∞' : maxAthletes}
            </span>
          </div>
          {maxAthletes !== Infinity && (
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-[#ea580c] h-2 rounded-full transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}
        </div>

        <ul className="mt-4 space-y-1">
          {TIER_FEATURES[currentTier].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500 font-bold">✓</span> {f}
            </li>
          ))}
        </ul>

        {/* Precio del plan actual */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-0.5">Valor de tu suscripción</p>
          <p className="text-lg font-bold text-[#1e3a5f]">
            {currentPriceUSD === 0 ? 'Gratis' : `$${currentPriceCOP.toLocaleString('es-CO')} COP/mes`}
          </p>
          {currentPriceUSD > 0 && (
            <p className="text-xs text-gray-400">
              ~${currentPriceUSD} USD{trmDate ? ` · TRM ${trmDate}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Opciones de upgrade */}
      {upgradeTiers.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cambiar plan</h2>
          <div className="grid gap-4">
            {upgradeTiers.map((t) => (
              <div key={t.tier} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{t.name}</p>
                    <p className="text-sm text-gray-500">
                      {t.maxAthletes === Infinity ? 'Asesorados ilimitados' : `Hasta ${t.maxAthletes} asesorados`}
                    </p>
                    <ul className="mt-3 space-y-1">
                      {TIER_FEATURES[t.tier].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-green-500 font-bold">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-[#1e3a5f] text-base">{formatCOP(t.priceCOP)}</p>
                    {t.priceUSD > 0 && (
                      <p className="text-xs text-gray-400">~${t.priceUSD} USD</p>
                    )}
                    {trmDate && (
                      <p className="text-xs text-gray-400">TRM {trmDate}</p>
                    )}
                    <button
                      onClick={() => handleUpgrade(t.tier)}
                      disabled={loading !== null || polling}
                      className="mt-3 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
                    >
                      {loading === t.tier ? 'Redirigiendo...' : `Subir a ${t.name}`}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-gray-400 text-center">
        Los pagos se procesan de forma segura a través de Wompi (PSE, Nequi, Daviplata, tarjeta).
      </p>
    </div>
  )
}
