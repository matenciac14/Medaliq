'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  isActive?: boolean
}

export function ActivateButton({ userId, isActive = false }: Props) {
  const [loading, setLoading] = useState<'PRO' | 'COACH' | 'FREE' | null>(null)
  const router = useRouter()

  async function callPlan(plan: 'PRO' | 'COACH' | 'FREE') {
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

  if (isActive) {
    return (
      <button
        disabled={loading !== null}
        onClick={() => callPlan('FREE')}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors border border-red-200"
      >
        {loading === 'FREE' ? '...' : 'Desactivar'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={loading !== null}
        onClick={() => callPlan('PRO')}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {loading === 'PRO' ? '...' : 'Activar Pro'}
      </button>
      <button
        disabled={loading !== null}
        onClick={() => callPlan('COACH')}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {loading === 'COACH' ? '...' : 'Activar Coach'}
      </button>
    </div>
  )
}
