'use client'

import { useState } from 'react'
import { MedaliqLogo } from '@/components/brand/MedaliqLogo'
import { useSession } from 'next-auth/react'

export default function SelectRolePage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState<'ATHLETE' | 'COACH' | null>(null)

  async function handleSelect(role: 'ATHLETE' | 'COACH') {
    setLoading(role)
    try {
      const res = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error('Error al configurar el rol.')

      // API response includes Set-Cookie with updated JWT — hard navigate to use it
      window.location.href = role === 'COACH' ? '/coach/dashboard' : '/onboarding'
    } catch (err) {
      console.error(err)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10">
        <MedaliqLogo variant="light" size="md" />
      </div>

      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          ¿Cómo vas a usar Medaliq?
        </h1>
        {session?.user?.name && (
          <p className="text-center text-gray-500 mb-8">
            Hola, <span className="font-medium text-gray-700">{session.user.name.split(' ')[0]}</span>. Elige tu perfil para empezar.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Atleta */}
          <button
            onClick={() => handleSelect('ATHLETE')}
            disabled={loading !== null}
            className="group relative flex flex-col items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-[#ea580c] hover:shadow-md transition-all disabled:opacity-60"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#1e3a5f]/5 flex items-center justify-center group-hover:bg-[#ea580c]/10 transition-colors">
              <svg className="w-8 h-8 text-[#1e3a5f] group-hover:text-[#ea580c] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 text-base">Soy atleta</p>
              <p className="text-xs text-gray-500 mt-1">Entreno y sigo mi plan</p>
            </div>
            {loading === 'ATHLETE' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                <div className="w-5 h-5 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          {/* Coach */}
          <button
            onClick={() => handleSelect('COACH')}
            disabled={loading !== null}
            className="group relative flex flex-col items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-[#ea580c] hover:shadow-md transition-all disabled:opacity-60"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#1e3a5f]/5 flex items-center justify-center group-hover:bg-[#ea580c]/10 transition-colors">
              <svg className="w-8 h-8 text-[#1e3a5f] group-hover:text-[#ea580c] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 text-base">Soy coach</p>
              <p className="text-xs text-gray-500 mt-1">Gestiono mis atletas</p>
            </div>
            {loading === 'COACH' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                <div className="w-5 h-5 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Este ajuste no se puede cambiar después. Escoge con cuidado.
        </p>
      </div>
    </div>
  )
}
