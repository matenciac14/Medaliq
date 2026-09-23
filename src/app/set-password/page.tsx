'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MedaliqLogo } from '@/components/brand/MedaliqLogo'

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <p className="text-sm text-red-600 text-center">
        Link inválido. Pide a tu coach que genere un nuevo link de acceso.
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar la contraseña.'); return }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl mx-auto">✓</div>
        <p className="font-semibold text-gray-900">Contraseña guardada</p>
        <p className="text-sm text-gray-500">Redirigiendo al login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs lg:text-sm font-medium text-[#545c66] lg:text-gray-700 mb-1.5">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoFocus
          placeholder="Mínimo 8 caracteres"
          className="w-full h-12 lg:h-auto rounded-xl lg:rounded-lg border-0 lg:border-[1.5px] lg:border-gray-200 bg-[#f6f7f8] lg:bg-white px-4 py-3 text-sm lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs lg:text-sm font-medium text-[#545c66] lg:text-gray-700 mb-1.5">Confirmar contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="Repite la contraseña"
          className="w-full h-12 lg:h-auto rounded-xl lg:rounded-lg border-0 lg:border-[1.5px] lg:border-gray-200 bg-[#f6f7f8] lg:bg-white px-4 py-3 text-sm lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-[52px] lg:h-auto rounded-xl lg:rounded-lg bg-[#1e3a5f] text-white py-3 text-base lg:text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Establecer contraseña'}
      </button>
    </form>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile hero */}
      <div className="lg:hidden relative h-[45vh] min-h-[300px] shrink-0 overflow-hidden bg-[#162B45]">
        <Image src="/hero-auth.jpg" alt="" fill className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#162B45]/30 via-[#162B45]/60 to-[#162B45]/80" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <MedaliqLogo variant="dark" size="lg" />
          <p className="text-sm text-white/70 mt-2">Tu progreso continúa.</p>
        </div>
      </div>

      {/* Desktop hero panel */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-[#162B45]">
        <Image src="/hero-auth.jpg" alt="" fill className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[#162B45] via-[#162B45]/60 to-[#162B45]/30" />
        <div className="relative z-10 flex flex-col justify-between p-12 h-full">
          <MedaliqLogo variant="dark" size="md" />
          <div>
            <div className="w-12 h-1 bg-[#ea580c] mb-4 rounded-full" />
            <p className="text-xs font-medium text-white/50 tracking-widest uppercase mb-2">Plataforma de entrenamiento</p>
            <h2 className="text-5xl font-black text-white leading-tight max-w-lg">
              Tu progreso<br />continúa.
            </h2>
            <div className="flex gap-2 mt-8">
              {['Zonas FC Karvonen', 'Nutrición diaria', 'Check-in semanal'].map((pill) => (
                <span key={pill} className="px-4 py-1.5 rounded-full border border-white/20 text-xs font-medium text-white/70">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form — bottom sheet on mobile, card on desktop */}
      <div className="-mt-7 relative z-10 bg-white rounded-t-[28px] shadow-[0px_-8px_24px_rgba(15,30,48,0.2)] flex-1 px-7 pb-8 lg:mt-0 lg:rounded-none lg:shadow-none lg:bg-gray-50 lg:flex lg:items-center lg:justify-center lg:px-6">
        <div className="w-full max-w-[448px] mx-auto lg:bg-white lg:rounded-xl lg:shadow-sm lg:shadow-black/5 lg:p-10 lg:border lg:border-gray-100">
          {/* Drag handle — mobile only */}
          <div className="flex justify-center pt-3 pb-5 lg:hidden">
            <div className="w-10 h-1 bg-[#d1d4d6] rounded-full" />
          </div>

          {/* Logo — desktop only */}
          <div className="hidden lg:block mb-10 text-center">
            <MedaliqLogo variant="light" size="md" />
          </div>

          <h1 className="text-xl lg:text-2xl font-bold text-[#1e3a5f] mb-1 text-center">Crear contraseña</h1>
          <p className="text-sm lg:text-sm text-gray-500 mb-6 lg:mb-8 text-center">Elige una contraseña para tu cuenta</p>

          <Suspense fallback={<p className="text-sm text-gray-400 text-center">Cargando...</p>}>
            <SetPasswordForm />
          </Suspense>

          <p className="mt-6 text-center text-sm lg:text-sm text-gray-500">
            ¿Ya tienes contraseña?{' '}
            <Link href="/login" className="text-[#ea580c] font-semibold hover:underline">
              Inicia sesión →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
