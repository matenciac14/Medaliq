import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <span className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Medaliq</span>
        </div>

        <h1 className="text-8xl font-bold mb-4" style={{ color: '#1e3a5f' }}>404</h1>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Página no encontrada
        </h2>

        <p className="text-gray-500 mb-8">
          La página que buscas no existe o fue movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#f97316' }}
          >
            Ir al inicio
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium border-2 transition-colors hover:bg-gray-50"
            style={{ color: '#1e3a5f', borderColor: '#1e3a5f' }}
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
