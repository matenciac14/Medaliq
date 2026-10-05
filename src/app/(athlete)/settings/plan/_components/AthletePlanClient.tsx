'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  tier: 'FREE' | 'PRO'
  currentPeriodEnd: string | null
  coachName: string | null
  priceCOP: number
  priceUSD: number
  trmDate: string | null
  billingStatus: string | null
}

const FREE_FEATURES = [
  { label: 'Log de sesiones de running y gym', included: true },
  { label: 'Seguimiento nutricional (calorías y macros)', included: true },
  { label: 'Plan de entrenamiento adaptativo', included: false },
  { label: 'Check-in semanal con ajustes automáticos', included: false },
  { label: 'Métricas de progreso', included: false },
]

const PRO_FEATURES = [
  { label: 'Log de sesiones de running y gym', included: true },
  { label: 'Seguimiento nutricional (calorías y macros)', included: true },
  { label: 'Plan de entrenamiento adaptativo', included: true },
  { label: 'Check-in semanal con ajustes automáticos', included: true },
  { label: 'Métricas de progreso', included: true },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

const MAX_POLL_ATTEMPTS = 5
const POLL_INTERVAL_MS  = 2_000

export default function AthletePlanClient({
  tier,
  currentPeriodEnd,
  coachName,
  priceCOP,
  priceUSD,
  trmDate,
  billingStatus,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (billingStatus !== 'success') {
      if (billingStatus === 'cancelled') {
        setToast({ msg: 'Pago cancelado. Puedes intentarlo de nuevo.', type: 'error' })
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
        const data = await res.json() as { tier: string }

        if (data.tier === 'PRO' && tier !== 'PRO') {
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

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/athlete/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo: '/settings/plan' }),
      })
      const data = await res.json() as { checkoutUrl?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error al crear checkout.')
      window.location.href = data.checkoutUrl!
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.'
      setToast({ msg, type: 'error' })
      setLoading(false)
    }
  }

  // Atleta B2B con coach activo — su acceso lo gestiona el coach
  if (coachName) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Mi Plan</h1>
        <div className="mt-6 bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-2xl p-6">
          <p className="text-base font-semibold text-[#1e3a5f] mb-2">
            Tu acceso está gestionado por {coachName}
          </p>
          <p className="text-sm text-gray-600">
            Tienes acceso completo a todas las features de Medaliq incluido en el plan de tu entrenador.
            No necesitas ninguna suscripción adicional.
          </p>
        </div>
      </div>
    )
  }

  const features = tier === 'PRO' ? PRO_FEATURES : FREE_FEATURES

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
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
        Gestiona tu suscripción y accede a todas las features de Medaliq.
      </p>

      {/* Plan actual */}
      <div className={`rounded-2xl border p-6 mb-6 ${
        tier === 'PRO'
          ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className={`text-xs uppercase tracking-wide mb-1 ${tier === 'PRO' ? 'text-white/60' : 'text-gray-400'}`}>
              Plan actual
            </p>
            <p className={`text-2xl font-bold ${tier === 'PRO' ? 'text-white' : 'text-[#1e3a5f]'}`}>
              {tier === 'PRO' ? 'Pro' : 'Free'}
            </p>
            {tier === 'PRO' && currentPeriodEnd && (
              <p className="text-sm text-white/70 mt-1">
                Renueva el {formatDate(currentPeriodEnd)}
              </p>
            )}
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
            tier === 'PRO'
              ? 'bg-white/20 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {tier === 'PRO' ? 'Activo' : 'Básico'}
          </span>
        </div>

        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f.label} className="flex items-center gap-2 text-sm">
              <span className={f.included
                ? (tier === 'PRO' ? 'text-green-300' : 'text-green-500') + ' font-bold'
                : 'text-gray-400'
              }>
                {f.included ? '✓' : '✗'}
              </span>
              <span className={
                f.included
                  ? (tier === 'PRO' ? 'text-white/90' : 'text-gray-700')
                  : 'text-gray-400'
              }>
                {f.label}
              </span>
            </li>
          ))}
        </ul>

        {/* Precio siempre visible — transparencia total */}
        {priceCOP > 0 && (
          <div className={`mt-5 pt-4 border-t ${tier === 'PRO' ? 'border-white/20' : 'border-gray-100'}`}>
            <p className={`text-xs mb-0.5 ${tier === 'PRO' ? 'text-white/50' : 'text-gray-400'}`}>
              {tier === 'PRO' ? 'Valor de tu suscripción' : 'Precio del plan Pro'}
            </p>
            <p className={`text-lg font-bold ${tier === 'PRO' ? 'text-white' : 'text-[#1e3a5f]'}`}>
              ${priceCOP.toLocaleString('es-CO')} COP/mes
            </p>
            <p className={`text-xs ${tier === 'PRO' ? 'text-white/40' : 'text-gray-400'}`}>
              ~${priceUSD} USD{trmDate ? ` · TRM ${trmDate}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* CTA upgrade si es FREE */}
      {tier === 'FREE' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <p className="font-bold text-gray-900 text-lg mb-1">Activa Pro</p>
          <p className="text-sm text-gray-500 mb-4">
            Plan adaptativo, check-in semanal y métricas de progreso.
          </p>
          <button
            onClick={handleUpgrade}
            disabled={loading || polling}
            className="w-full px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl disabled:opacity-60 transition-colors"
          >
            {loading ? 'Redirigiendo...' : 'Activar Pro'}
          </button>
          <p className="text-xs text-gray-400 mt-3">
            Pago seguro con Wompi — PSE, Nequi, Daviplata o tarjeta.
          </p>
        </div>
      )}
    </div>
  )
}
