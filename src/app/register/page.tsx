'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MedaliqLogo } from '@/components/brand/MedaliqLogo'

type Role = 'ATHLETE' | 'COACH'

function RegisterForm() {
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('code')

  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!role) { setError('Selecciona si eres atleta o coach.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }

    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al crear la cuenta.')
      setLoading(false)
      return
    }

    const callbackUrl = role === 'COACH'
      ? '/coach/dashboard'
      : inviteCode ? `/join/${inviteCode}` : '/onboarding'

    await signIn('credentials', { email, password, callbackUrl, redirect: true })
  }

  async function handleGoogle() {
    const callbackUrl = inviteCode ? `/join/${inviteCode}` : '/onboarding'
    await signIn('google', { callbackUrl })
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile hero */}
      <div className="lg:hidden relative h-[36vh] min-h-[240px] shrink-0 overflow-hidden bg-[#162B45]">
        <Image src="/hero-auth.jpg" alt="" fill className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#162B45]/30 via-[#162B45]/60 to-[#162B45]/80" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <MedaliqLogo variant="dark" size="lg" />
          <p className="text-sm text-white/70 mt-2">Empieza gratis, sin tarjeta.</p>
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
          <div className="hidden lg:block mb-8 text-center">
            <MedaliqLogo variant="light" size="md" />
          </div>

          <h1 className="text-xl lg:text-2xl font-bold text-[#1e3a5f] mb-1 text-center">Crea tu cuenta</h1>
          <p className="text-sm lg:text-sm text-gray-500 mb-6 lg:mb-8 text-center">
            <span className="lg:hidden">Solo toma un minuto</span>
            <span className="hidden lg:inline">&nbsp;</span>
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-[#545c66] lg:text-gray-700 mb-1.5">Nombre completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full h-12 lg:h-auto rounded-xl lg:rounded-lg border-0 lg:border-[1.5px] lg:border-gray-200 bg-[#f6f7f8] lg:bg-white px-4 py-3 text-sm lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-[#545c66] lg:text-gray-700 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full h-12 lg:h-auto rounded-xl lg:rounded-lg border-0 lg:border-[1.5px] lg:border-gray-200 bg-[#f6f7f8] lg:bg-white px-4 py-3 text-sm lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-[#545c66] lg:text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full h-12 lg:h-auto rounded-xl lg:rounded-lg border-0 lg:border-[1.5px] lg:border-gray-200 bg-[#f6f7f8] lg:bg-white px-4 py-3 text-sm lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
              />
            </div>

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setRole('ATHLETE')}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                  role === 'ATHLETE'
                    ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Soy Atleta
              </button>
              <button
                type="button"
                onClick={() => setRole('COACH')}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                  role === 'COACH'
                    ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Soy Coach
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !role}
              className="w-full h-[52px] lg:h-auto rounded-xl lg:rounded-lg bg-[#ea580c] text-white py-3 text-base lg:text-sm font-semibold hover:bg-[#d4520b] transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            onClick={handleGoogle}
            className="w-full h-12 lg:h-auto flex items-center justify-center gap-3 rounded-xl lg:rounded-lg border border-[#e0e5ed] lg:border-gray-200 bg-white py-3 text-sm lg:text-sm font-medium text-[#1e3a5f] lg:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </button>

          <p className="mt-5 text-center text-sm lg:text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-[#1e3a5f] font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}
