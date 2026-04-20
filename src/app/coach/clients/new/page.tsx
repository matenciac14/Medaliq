'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Options ──────────────────────────────────────────────────────────────────

const SPORTS = [
  { value: '', label: 'Sin especificar' },
  { value: 'RUNNING', label: 'Atletismo / Running' },
  { value: 'CYCLING', label: 'Ciclismo' },
  { value: 'TRIATHLON', label: 'Triatlón' },
  { value: 'GYM', label: 'Gimnasio' },
  { value: 'SWIMMING', label: 'Natación' },
  { value: 'FUNCTIONAL', label: 'Funcional' },
  { value: 'OTHER', label: 'Otro' },
]

const GOALS = [
  { value: '', label: 'Sin especificar' },
  { value: 'RACE_5K', label: 'Carrera 5K' },
  { value: 'RACE_10K', label: 'Carrera 10K' },
  { value: 'RACE_HALF_MARATHON', label: 'Media Maratón' },
  { value: 'RACE_MARATHON', label: 'Maratón' },
  { value: 'BODY_RECOMPOSITION', label: 'Recomposición Corporal' },
  { value: 'WEIGHT_LOSS', label: 'Pérdida de Peso' },
  { value: 'GENERAL_FITNESS', label: 'Condición General' },
]

const PLAN_TIERS = [
  { value: 'free', label: 'Solo seguimiento (Free)' },
  { value: 'pro', label: 'Acceso completo (Pro)' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type CreatedAthlete = {
  email: string
  tempPassword: string
  athleteId: string
  athleteName: string
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar al portapapeles"
      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors"
      style={
        copied
          ? { backgroundColor: '#dcfce7', color: '#15803d' }
          : { backgroundColor: '#f3f4f6', color: '#374151' }
      }
    >
      {copied ? '✓ Copiado' : '📋'}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateAthletePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sport, setSport] = useState('')
  const [goal, setGoal] = useState('')
  const [planTier, setPlanTier] = useState<'free' | 'pro'>('free')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<CreatedAthlete | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/coach/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          sport: sport || null,
          goal: goal || null,
          planTier,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear el atleta.')
        return
      }

      setCreated({
        email: data.email,
        tempPassword: data.tempPassword,
        athleteId: data.athleteId,
        athleteName: data.athleteName,
      })
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setCreated(null)
    setName('')
    setEmail('')
    setSport('')
    setGoal('')
    setPlanTier('free')
    setError('')
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (created) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-center mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3"
              style={{ backgroundColor: '#f97316' }}
            >
              ✓
            </div>
            <h1 className="text-xl font-bold text-gray-900">Atleta creado</h1>
            <p className="text-sm text-gray-500 mt-1">
              {created.athleteName} ya está vinculado a tu cuenta de coach.
            </p>
          </div>

          <div
            className="rounded-xl p-5 mb-6 border-2"
            style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac' }}
          >
            <p className="text-sm font-semibold text-green-800 mb-3">
              Credenciales de acceso — compártelas con el atleta
            </p>
            <div className="space-y-2">
              {/* Email row */}
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200 gap-2">
                <span className="text-xs text-gray-500 font-medium shrink-0">Email</span>
                <span className="text-sm font-mono text-gray-900 truncate flex-1 text-right">
                  {created.email}
                </span>
                <CopyButton value={created.email} />
              </div>

              {/* Password row */}
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200 gap-2">
                <span className="text-xs text-gray-500 font-medium shrink-0">Contraseña temporal</span>
                <span className="text-sm font-mono font-bold text-gray-900 flex-1 text-right">
                  {created.tempPassword}
                </span>
                <CopyButton value={created.tempPassword} />
              </div>

              {/* URL row */}
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200 gap-2">
                <span className="text-xs text-gray-500 font-medium shrink-0">URL de ingreso</span>
                <span className="text-sm font-mono text-[#1e3a5f] flex-1 text-right">
                  medaliq.com/login
                </span>
                <CopyButton value="https://medaliq.com/login" />
              </div>
            </div>
            <p className="text-xs text-green-700 mt-3">
              El atleta puede cambiar su contraseña desde la configuración de su cuenta.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Crear otro atleta
            </button>
            <Link
              href={`/coach/athlete/${created.athleteId}`}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg text-center transition-colors hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Ver perfil del atleta
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Creation form ───────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Crear asesorado</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Crea la cuenta del atleta directamente, sin necesidad de código de invitación.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Carlos Gómez"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 transition-shadow"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="carlos@ejemplo.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 transition-shadow"
          />
        </div>

        {/* Sport */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deporte principal</label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 bg-white transition-shadow"
          >
            {SPORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 bg-white transition-shadow"
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        {/* Plan tier */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Acceso inicial</label>
          <div className="grid grid-cols-2 gap-3">
            {PLAN_TIERS.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => setPlanTier(tier.value as 'free' | 'pro')}
                className="py-2.5 px-3 rounded-lg border-2 text-sm font-medium text-left transition-all"
                style={
                  planTier === tier.value
                    ? { borderColor: '#1e3a5f', backgroundColor: '#eff6ff', color: '#1e3a5f' }
                    : { borderColor: '#e5e7eb', color: '#6b7280' }
                }
              >
                <span className="block font-semibold">{tier.value === 'free' ? 'Free' : 'Pro'}</span>
                <span className="block text-xs mt-0.5 font-normal opacity-75">{tier.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {planTier === 'pro'
              ? 'Activa plan, check-in, nutrición y progreso desde el primer día.'
              : 'El atleta accede solo al dashboard básico. Activa funciones después.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="pt-1 border-t border-gray-100 flex gap-3">
          <Link
            href="/coach/dashboard"
            className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#f97316' }}
          >
            {loading ? 'Creando...' : 'Crear asesorado'}
          </button>
        </div>
      </form>
    </div>
  )
}
