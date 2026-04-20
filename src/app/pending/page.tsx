import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import PendingPoller from './_components/PendingPoller'

export const metadata = {
  title: 'Cuenta en revisión — Medaliq',
}

export default async function PendingPage() {
  const session = await auth()

  if (!session?.user) redirect('/login')
  if ((session.user as any).activated) redirect('/dashboard')

  const email = session.user.email ?? ''
  const name = session.user.name ?? null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10">
        <span className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
          Medal<span style={{ color: '#f97316' }}>iq</span>
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center text-center gap-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1e3a5f15' }}>
          <svg className="w-8 h-8" style={{ color: '#1e3a5f' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>
            Tu cuenta está siendo revisada
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Recibimos tu información y tu plan está listo. Uno de nuestros coaches
            revisará tu perfil y activará tu cuenta en las próximas horas.
          </p>
        </div>

        {/* User info */}
        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-0.5">
          {name && <p className="text-xs text-gray-400">Registrado como</p>}
          {name && <p className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>{name}</p>}
          <p className="text-sm text-gray-600">{email}</p>
        </div>

        {/* Info */}
        <div className="w-full rounded-xl px-4 py-3" style={{ backgroundColor: '#f9731610', border: '1px solid #f9731630' }}>
          <p className="text-xs font-medium" style={{ color: '#f97316' }}>
            Te avisaremos por email cuando tu cuenta esté activa.
          </p>
        </div>

        {/* Poller — redirige automáticamente cuando se activa */}
        <PendingPoller />

        {/* Sign out */}
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}
        >
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        ¿Tienes preguntas? Escríbenos a{' '}
        <a href="mailto:hola@medaliq.com" className="hover:underline" style={{ color: '#1e3a5f' }}>
          hola@medaliq.com
        </a>
      </p>
    </div>
  )
}
