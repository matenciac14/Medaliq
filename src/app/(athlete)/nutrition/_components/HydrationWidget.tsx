// NUT-WATER-01 — Widget de hidratacion diaria
// compact (default): 1 fila horizontal — mobile
// vertical: valor arriba, barra, botones abajo — desktop dashboard

'use client'

import { useState, useEffect } from 'react'

const ADD_BUTTONS = [
  { label: '+250ml', delta: 250 },
  { label: '+500ml', delta: 500 },
  { label: '+1L',    delta: 1000 },
]

type Props = {
  initialMl?: number
  initialTarget?: number
  vertical?: boolean
}

export default function HydrationWidget({ initialMl, initialTarget, vertical }: Props = {}) {
  const hasInitial = initialMl !== undefined
  const [mlLogged, setMlLogged]    = useState(initialMl ?? 0)
  const [waterMlTarget, setTarget] = useState(initialTarget ?? 2000)
  const [loading, setLoading]      = useState(!hasInitial)
  const [adding, setAdding]        = useState<number | null>(null)

  useEffect(() => {
    if (hasInitial) return
    fetch('/api/athlete/nutrition/water')
      .then(r => r.json())
      .then(d => {
        setMlLogged(d.mlLogged ?? 0)
        setTarget(d.waterMlTarget ?? 2000)
      })
      .finally(() => setLoading(false))
  }, [hasInitial])

  async function handleAdd(delta: number) {
    setAdding(delta)
    const prev = mlLogged
    const optimistic = Math.max(0, mlLogged + delta)
    setMlLogged(optimistic)
    try {
      const res = await fetch('/api/athlete/nutrition/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
      if (res.ok) {
        const data = await res.json()
        setMlLogged(data.mlLogged ?? optimistic)
      } else {
        setMlLogged(prev)
      }
    } catch {
      setMlLogged(prev)
    } finally {
      setAdding(null)
    }
  }

  const pct = waterMlTarget > 0 ? Math.min((mlLogged / waterMlTarget) * 100, 100) : 0
  const liters = (mlLogged / 1000).toFixed(1)
  const targetL = (waterMlTarget / 1000).toFixed(1)

  if (vertical) {
    return (
      <div className="bg-white rounded-[16px] border border-[#f0f2f5] px-4 py-3 h-full flex flex-col justify-center gap-2">
        {/* Header row: label left, value right */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-[#1f3b5e]">Agua</p>
            <p className="text-[10px] text-[#8c99a6]">Objetivo: {targetL} L</p>
          </div>
          {loading ? (
            <span className="text-[10px] text-gray-400">...</span>
          ) : (
            <span className="text-xl font-bold text-[#3b82f5] leading-none">{liters} L</span>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 bg-[#3b82f5]"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Buttons */}
        <div className="flex gap-1.5">
          {ADD_BUTTONS.map(({ label, delta }) => (
            <button
              key={delta}
              onClick={() => handleAdd(delta)}
              disabled={adding !== null}
              className="flex-1 py-1.5 rounded-[8px] text-[10px] font-semibold text-[#2e61c2] bg-[#ebf2ff] hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {adding === delta ? '...' : label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 bg-white rounded-[14px] border border-[#f0f0f0] px-3.5 py-2.5">
      {/* Left: emoji + value + bar */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-base leading-none shrink-0">💧</span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            {loading ? (
              <span className="text-[10px] text-gray-400">...</span>
            ) : (
              <>
                <span className="text-base font-bold text-[#3b82f5] leading-none">{liters}</span>
                <span className="text-[10px] text-[#8c99a6]">/ {targetL} L</span>
              </>
            )}
          </div>
          <div className="h-1 w-20 bg-blue-100 rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-300 bg-[#3b82f5]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: 3 add buttons */}
      <div className="flex gap-1 min-w-0 flex-wrap justify-end">
        {ADD_BUTTONS.map(({ label, delta }) => (
          <button
            key={delta}
            onClick={() => handleAdd(delta)}
            disabled={adding !== null}
            className="px-2 py-1.5 rounded-[8px] text-[10px] font-semibold text-[#2e61c2] bg-[#ebf2ff] hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {adding === delta ? '...' : label}
          </button>
        ))}
      </div>
    </div>
  )
}
