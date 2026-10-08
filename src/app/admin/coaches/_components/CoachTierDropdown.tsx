'use client'

import { useState } from 'react'

type CoachTier = 'STARTER' | 'GROWTH' | 'PRO' | 'SCALE'

const TIER_LABELS: Record<CoachTier, string> = {
  STARTER: 'Starter — gratis (≤2)',
  GROWTH:  'Growth — $59/mes (≤10)',
  PRO:     'Pro — $139/mes (≤30)',
  SCALE:   'Scale — $139+$4/atleta (30+)',
}

const TIER_COLORS: Record<CoachTier, string> = {
  STARTER: 'bg-gray-100 text-gray-600',
  GROWTH:  'bg-blue-100 text-blue-700',
  PRO:     'bg-orange-100 text-orange-700',
  SCALE:   'bg-purple-100 text-purple-700',
}

export function CoachTierDropdown({
  coachId,
  initialTier,
}: {
  coachId: string
  initialTier: CoachTier
}) {
  const [tier, setTier] = useState<CoachTier>(initialTier)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as CoachTier
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/admin/coach/${coachId}/tier`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachTier: next }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Error al guardar')
      return
    }

    setTier(next)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[tier]}`}>
          {tier}
        </span>
        <select
          value={tier}
          onChange={handleChange}
          disabled={saving}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400/40 disabled:opacity-50 cursor-pointer"
        >
          {(Object.keys(TIER_LABELS) as CoachTier[]).map((t) => (
            <option key={t} value={t}>
              {TIER_LABELS[t]}
            </option>
          ))}
        </select>
        {saving && (
          <span className="text-xs text-gray-400">Guardando...</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
