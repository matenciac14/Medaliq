'use client'

import { useState } from 'react'

type Props = {
  logId: string
  logType: 'session' | 'gym'
  sessionLabel: string
  sessionIcon: string
  sessionMeta: string
}

const ENERGY_MAP = {
  EXHAUSTED: { emoji: '\u{1F319}', label: 'Cansado' },
  NORMAL:    { emoji: '\u{23F0}',  label: 'Regular' },
  ENERGIZED: { emoji: '\u{1F4AA}', label: 'Fuerte' },
} as const

type EnergyState = keyof typeof ENERGY_MAP

export default function QuickSessionFeedback({ logId, logType, sessionLabel, sessionIcon, sessionMeta }: Props) {
  const [selected, setSelected] = useState<EnergyState | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSelect(state: EnergyState) {
    if (saving || selected) return
    setSelected(state)
    setSaving(true)
    try {
      const url = logType === 'gym'
        ? `/api/athlete/gym/session/${logId}`
        : `/api/athlete/log/session/${logId}`
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energyState: state }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-green-50 rounded-2xl border border-green-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-3.5 py-3">
      <p className="text-[10px] font-semibold text-green-600 uppercase tracking-widest mb-2">
        {'\u2713'} Sesión de hoy
      </p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{sessionIcon}</span>
        <p className="text-sm font-semibold text-gray-900">{sessionLabel}{sessionMeta}</p>
      </div>

      {selected ? (
        <div className="text-center py-2">
          <span className="text-2xl">{ENERGY_MAP[selected].emoji}</span>
          <p className="text-xs font-semibold text-[#1e3a5f] mt-1">{ENERGY_MAP[selected].label}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 text-center mb-2">
            {'\u00BF'}Cómo te sentiste?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ENERGY_MAP) as EnergyState[]).map(key => (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                disabled={saving}
                className={`text-center py-2 rounded-xl border transition-colors ${
                  key === 'ENERGIZED'
                    ? 'border-[#1e3a5f] bg-blue-50 hover:bg-blue-100'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                <span className="text-lg">{ENERGY_MAP[key].emoji}</span>
                <p className={`text-[10px] mt-0.5 ${
                  key === 'ENERGIZED' ? 'text-[#1e3a5f] font-semibold' : 'text-gray-500'
                }`}>
                  {ENERGY_MAP[key].label}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
