'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KCAL_ADJUSTMENT_OPTIONS } from '@/domain/plan/formulas'

export default function AthleteKcalStrategy({ currentAdjustment }: { currentAdjustment: number }) {
  const router = useRouter()
  const [selected, setSelected] = useState(currentAdjustment)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const changed = selected !== currentAdjustment

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/athlete/nutrition/targets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kcalAdjustment: selected }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[#1e3a5f]">Estrategia calorica</h2>
        {saved && <span className="text-xs text-green-600 font-medium">Guardado</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KCAL_ADJUSTMENT_OPTIONS.map(opt => {
          const isActive = selected === opt.value
          const isDeficit = opt.value < 0
          const isSurplus = opt.value > 0
          return (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`rounded-xl border p-2.5 text-left transition-all ${
                isActive
                  ? isDeficit ? 'border-blue-400 bg-blue-50' : isSurplus ? 'border-orange-400 bg-orange-50' : 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <p className={`text-xs font-semibold ${isActive ? (isDeficit ? 'text-blue-700' : isSurplus ? 'text-orange-700' : 'text-[#1e3a5f]') : 'text-gray-700'}`}>
                {opt.label}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{opt.desc}</p>
            </button>
          )
        })}
      </div>
      {changed && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {saving ? 'Guardando...' : 'Aplicar estrategia'}
        </button>
      )}
    </div>
  )
}
