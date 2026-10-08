'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Props {
  initial: { weightKg: number | null; energyLevel: number | null } | null
}

export default function TodayLogCard({ initial }: Props) {
  const [weightInput, setWeightInput] = useState(initial?.weightKg != null ? String(initial.weightKg) : '')
  const [energy, setEnergy] = useState<number | null>(initial?.energyLevel ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(!initial)

  async function save() {
    const weightKg = weightInput ? parseFloat(weightInput) : undefined
    if (!weightKg && !energy) return
    setSaving(true)
    try {
      await fetch('/api/athlete/metrics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(weightKg && { weightKg }), ...(energy && { energyLevel: energy }) }),
      })
      setSaved(true)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-3.5">
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="text-sm font-bold text-[#1e3a5f]">Registro de hoy</span>
          {(initial || saved) && <div className="w-[7px] h-[7px] rounded-full bg-[#22c55e]" />}
        </div>
        <div className="flex items-center gap-2.5">
          {initial?.weightKg && !open && (
            <span className="text-sm font-bold text-gray-700">{initial.weightKg} kg</span>
          )}
          {initial?.energyLevel && !open && (
            <span className="text-xs font-semibold text-[#f97316]">E{initial.energyLevel}/5</span>
          )}
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="mt-2.5 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-gray-500 w-[60px]">Peso (kg)</span>
            <input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder="ej. 70.5"
              className="flex-1 h-10 rounded-[10px] border border-gray-200 px-3 text-sm font-semibold text-gray-900 bg-gray-50 placeholder:text-gray-300 outline-none focus:border-[#ea580c] transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-500">Energía</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setEnergy(n)}
                  className={`flex-1 h-9 rounded-lg text-xs font-bold transition-colors ${
                    energy === n ? 'bg-[#f97316] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-center">1 = sin energía · 5 = excelente</p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-[#1e3a5f] text-white text-sm font-bold py-3 rounded-[10px] hover:bg-[#243f6a] transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  )
}
