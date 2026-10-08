// DASH-MEAL-01 — Widget de comidas del dia
// Muestra 4 slots (Desayuno, Almuerzo, Cena, Snack) con estado logged/pending
// Fetcha GET /api/nutrition/log al montar para obtener kcal por mealType

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UtensilsCrossed } from 'lucide-react'

type MealSlot = {
  key: string
  label: string
  emoji: string
  kcal: number | null
}

const SLOTS: { key: string; label: string; emoji: string }[] = [
  { key: 'BREAKFAST', label: 'Desayuno', emoji: '🌅' },
  { key: 'LUNCH',     label: 'Almuerzo', emoji: '☀️' },
  { key: 'DINNER',    label: 'Cena',     emoji: '🌙' },
  { key: 'SNACK',     label: 'Snack',    emoji: '🍎' },
]

type Props = {
  initialLogs?: { mealType: string; kcal: number }[]
}

export default function MealSlotsWidget({ initialLogs }: Props = {}) {
  const hasInitial = initialLogs !== undefined

  function buildSlots(logs: { mealType: string; kcal: number }[]): MealSlot[] {
    const kcalByType: Record<string, number> = {}
    for (const log of logs) {
      kcalByType[log.mealType] = (kcalByType[log.mealType] ?? 0) + (log.kcal ?? 0)
    }
    return SLOTS.map(s => ({
      ...s,
      kcal: kcalByType[s.key] ? Math.round(kcalByType[s.key]) : null,
    }))
  }

  const [slots, setSlots] = useState<MealSlot[]>(
    hasInitial ? buildSlots(initialLogs) : SLOTS.map(s => ({ ...s, kcal: null }))
  )
  const [loading, setLoading] = useState(!hasInitial)

  useEffect(() => {
    if (hasInitial) return
    fetch('/api/athlete/nutrition/log')
      .then(r => r.json())
      .then(data => {
        setSlots(buildSlots(data.logs ?? []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [hasInitial])

  const loggedCount = slots.filter(s => s.kcal !== null).length

  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[3px] bg-[#22c55e]" />
      <div className="px-4 pt-3 pb-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={14} className="text-[#22c55e] shrink-0" />
            <p className="text-sm font-bold text-[#1e3a5f]">Tu alimentacion hoy</p>
          </div>
          <Link
            href="/nutrition"
            className="text-[10px] font-semibold text-[#22c55e] bg-green-50 px-2.5 py-1 rounded-lg"
          >
            Ver detalle →
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {slots.map(slot => {
            const logged = slot.kcal !== null
            return (
              <Link
                key={slot.key}
                href={logged ? '/nutrition' : `/nutrition?meal=${slot.key}`}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors ${
                  logged
                    ? 'bg-green-50/80'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl leading-none">{slot.emoji}</span>
                <span className={`text-[10px] font-semibold ${
                  logged ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {slot.label}
                </span>
                {loading ? (
                  <span className="text-[10px] text-gray-300">...</span>
                ) : logged ? (
                  <span className="text-[10px] font-semibold text-[#22c55e]">
                    ✓ {slot.kcal} kcal
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-[#ea580c]">
                    + Agregar
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
