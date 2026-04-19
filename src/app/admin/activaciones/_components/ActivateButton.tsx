'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
}

export function ActivateButton({ userId }: Props) {
  const [loading, setLoading] = useState<'PRO' | 'COACH' | null>(null)
  const router = useRouter()

  async function activate(plan: 'PRO' | 'COACH') {
    setLoading(plan)
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={loading !== null}
        onClick={() => activate('PRO')}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {loading === 'PRO' ? '...' : 'Activar Pro'}
      </button>
      <button
        disabled={loading !== null}
        onClick={() => activate('COACH')}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {loading === 'COACH' ? '...' : 'Activar Coach'}
      </button>
    </div>
  )
}
