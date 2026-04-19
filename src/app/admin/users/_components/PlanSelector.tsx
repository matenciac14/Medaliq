'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PlanTier = 'FREE' | 'PRO' | 'COACH'

interface Props {
  userId: string
  currentTier: PlanTier
}

const PLAN_BADGE: Record<PlanTier, string> = {
  FREE:  'bg-gray-100 text-gray-600',
  PRO:   'bg-emerald-100 text-emerald-700',
  COACH: 'bg-orange-100 text-orange-700',
}

export function PlanSelector({ userId, currentTier }: Props) {
  const [tier, setTier] = useState<PlanTier>(currentTier)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleChange(newTier: PlanTier) {
    if (newTier === tier) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newTier }),
      })
      if (res.ok) {
        setTier(newTier)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const selectColor: Record<PlanTier, string> = {
    FREE:  'bg-gray-100 text-gray-700 border-gray-200',
    PRO:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    COACH: 'bg-orange-50 text-orange-700 border-orange-200',
  }

  return (
    <select
      disabled={loading}
      value={tier}
      onChange={(e) => handleChange(e.target.value as PlanTier)}
      className={`text-xs font-medium border rounded-full px-2.5 py-0.5 cursor-pointer disabled:opacity-50 transition-colors ${selectColor[tier]}`}
    >
      <option value="FREE">Free</option>
      <option value="PRO">Pro</option>
      <option value="COACH">Coach</option>
    </select>
  )
}
