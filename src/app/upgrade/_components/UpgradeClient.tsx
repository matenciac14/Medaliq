'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DowngradeButton from './DowngradeButton'

type Props = {
  priceCOP: number
  priceUSD: number
  trmDate: string | null
  billingStatus: string | null
}

const FREE_FEATURES = [
  'Dashboard + log de entrenamientos',
  'Registro de nutricion y gym',
]

const PRO_FEATURES = [
  'Plan adaptativo periodizado',
  'Check-in semanal + ajustes de carga',
  'Nutricion personalizada diaria',
  'Metricas de progreso',
  'Tracker de ejercicios con deteccion de PRs',
]

const MAX_POLL_ATTEMPTS = 5
const POLL_INTERVAL_MS = 2_000

export default function UpgradeClient({ priceCOP, priceUSD, trmDate, billingStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!billingStatus) return

    if (billingStatus === 'cancelled') {
      setToast({ msg: 'Pago cancelado. Puedes intentarlo de nuevo.', type: 'error' })
      return
    }

    if (billingStatus !== 'success') return

    setToast({ msg: 'Procesando pago...', type: 'success' })
    setPolling(true)
    attemptsRef.current = 0

    pollRef.current = setInterval(async () => {
      attemptsRef.current++

      try {
        const res = await fetch('/api/billing/status')
        const data = (await res.json()) as { tier: string }

        if (data.tier === 'PRO') {
          stopPolling()
          setToast({ msg: 'Plan Pro activado. Redirigiendo...', type: 'success' })
          setTimeout(() => router.push('/dashboard'), 1500)
          return
        }
      } catch {
        // Red inestable — seguir intentando
      }

      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling()
        setToast({
          msg: 'Pago recibido. Si tu plan no se actualizo en un momento, recarga la pagina.',
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
      const res = await fetch('/api/billing/athlete/checkout', { method: 'POST' })
      const data = (await res.json()) as { checkoutUrl?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error al crear checkout.')
      window.location.href = data.checkoutUrl!
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.'
      setToast({ msg, type: 'error' })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      {toast && (
        <div
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-3 shadow-lg ${
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
            <button className="underline flex-shrink-0" onClick={() => setToast(null)}>
              Cerrar
            </button>
          )}
        </div>
      )}

      <div className="max-w-2xl w-full text-center mb-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)' }}>
          <span className="text-white font-bold">M</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Elige tu plan</h1>
        <p className="text-gray-500">Sigue gratis o desbloquea todo con Pro</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">Gratis</p>
          <p className="text-4xl font-bold text-gray-900 mb-1">$0</p>
          <p className="text-gray-400 text-sm mb-6">Para siempre</p>
          <ul className="text-sm text-gray-600 space-y-2 mb-8 flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f}>
                <span className="text-green-500 font-bold mr-2">&#10003;</span>{f}
              </li>
            ))}
            {PRO_FEATURES.map((f) => (
              <li key={f} className="text-gray-300">
                <span className="mr-2">&#10007;</span>{f}
              </li>
            ))}
          </ul>
          <DowngradeButton />
        </div>

        {/* Pro */}
        <div className="bg-white rounded-2xl border-2 shadow-sm p-8 flex flex-col" style={{ borderColor: '#1e3a5f' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#1e3a5f' }}>
              Pro
            </p>
            <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ea580c' }}>
              Recomendado
            </span>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">
            ${priceCOP.toLocaleString('es-CO')}
          </p>
          <p className="text-gray-400 text-sm mb-1">COP / mes</p>
          <p className="text-xs text-gray-400 mb-6">
            ~${priceUSD} USD{trmDate ? ` · TRM ${trmDate}` : ''}
          </p>
          <ul className="text-sm text-gray-600 space-y-2 mb-8 flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f}>
                <span className="text-green-500 font-bold mr-2">&#10003;</span>{f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading || polling}
            className="w-full px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' }}
          >
            {loading ? 'Redirigiendo a Wompi...' : `Activar Pro — $${priceCOP.toLocaleString('es-CO')} COP/mes`}
          </button>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Pago seguro con Wompi — PSE, Nequi, Daviplata o tarjeta
          </p>
        </div>
      </div>
    </div>
  )
}
