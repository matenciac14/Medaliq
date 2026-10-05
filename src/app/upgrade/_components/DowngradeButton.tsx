'use client'

import { useRouter } from 'next/navigation'

export default function DowngradeButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/dashboard')}
      className="block w-full text-center px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
    >
      Continuar gratis
    </button>
  )
}
