'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <span className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Medaliq</span>
        </div>

        <h1 className="text-8xl font-bold mb-4" style={{ color: '#1e3a5f' }}>500</h1>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Algo salió mal
        </h2>

        <p className="text-gray-500 mb-8">
          Ocurrió un error inesperado. Intenta de nuevo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#f97316' }}
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium border-2 transition-colors hover:bg-gray-50"
            style={{ color: '#1e3a5f', borderColor: '#1e3a5f' }}
          >
            Ir al inicio
          </Link>
        </div>

        {error.digest && (
          <p className="text-xs text-gray-400 mt-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
