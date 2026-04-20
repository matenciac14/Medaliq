import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function UpgradePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ATHLETE') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center mb-10">
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tu trial de 30 días terminó</h1>
        <p className="text-gray-500">Elige cómo continuar con Medaliq</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">Free</p>
          <p className="text-4xl font-bold text-gray-900 mb-1">$0</p>
          <p className="text-gray-400 text-sm mb-6">Para siempre</p>
          <ul className="text-sm text-gray-600 space-y-2 mb-8 flex-1">
            <li>✓ Dashboard básico</li>
            <li>✓ Registro manual de sesiones</li>
            <li className="text-gray-300">✗ Plan adaptativo AI</li>
            <li className="text-gray-300">✗ Nutrición personalizada</li>
            <li className="text-gray-300">✗ AI Coach chat</li>
            <li className="text-gray-300">✗ Gym tracker</li>
          </ul>
          <Link
            href="/api/upgrade/downgrade"
            className="block text-center px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Continuar gratis
          </Link>
        </div>

        {/* Pro */}
        <div
          className="bg-white rounded-2xl border-2 shadow-sm p-8 flex flex-col"
          style={{ borderColor: '#1e3a5f' }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#1e3a5f' }}>Pro</p>
            <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f97316' }}>Recomendado</span>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">$15</p>
          <p className="text-gray-400 text-sm mb-6">por mes</p>
          <ul className="text-sm text-gray-600 space-y-2 mb-8 flex-1">
            <li>✓ Todo lo del trial, para siempre</li>
            <li>✓ Plan adaptativo AI</li>
            <li>✓ Nutrición personalizada</li>
            <li>✓ AI Coach chat (100 msgs/mes)</li>
            <li>✓ Gym tracker completo</li>
            <li>✓ Check-ins semanales</li>
          </ul>
          <button
            disabled
            className="block w-full text-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white opacity-60 cursor-not-allowed"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Suscribirse — próximamente
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-8">
        ¿Tienes preguntas? Escríbenos a{' '}
        <a href="mailto:hola@medaliq.com" className="underline">hola@medaliq.com</a>
      </p>
    </div>
  )
}
