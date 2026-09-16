'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type LogEntry = {
  id: string
  mealType: string
  grams: number
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  food: { name: string }
}

type Props = {
  open: boolean
  onClose: () => void
}

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Desayuno', LUNCH: 'Almuerzo', DINNER: 'Cena',
  SNACK: 'Merienda', PRE_WORKOUT: 'Pre-entreno', POST_WORKOUT: 'Post-entreno',
}

export default function ConsumedModal({ open, onClose }: Props) {
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/athlete/nutrition/log')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchLogs()
  }, [open, fetchLogs])

  async function handleDelete(id: string) {
    setLogs(prev => prev.filter(l => l.id !== id))
    await fetch(`/api/athlete/nutrition/log/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  if (!open) return null

  const totalKcal = logs.reduce((s, l) => s + l.kcal, 0)
  const totalP = logs.reduce((s, l) => s + l.proteinG, 0)
  const totalC = logs.reduce((s, l) => s + l.carbsG, 0)
  const totalF = logs.reduce((s, l) => s + l.fatG, 0)

  // Group by meal type
  const grouped = logs.reduce<Record<string, LogEntry[]>>((acc, l) => {
    const key = l.mealType || 'OTHER'
    ;(acc[key] ??= []).push(l)
    return acc
  }, {})
  const mealOrder = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'PRE_WORKOUT', 'POST_WORKOUT', 'OTHER']
  const sortedKeys = Object.keys(grouped).sort((a, b) => mealOrder.indexOf(a) - mealOrder.indexOf(b))

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[85vh] flex flex-col md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:rounded-2xl md:max-h-[80vh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#1e3a5f]">Lo que consumi hoy</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Totals */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-2xl font-black text-[#1e3a5f]">
            {totalKcal.toLocaleString('es')} <span className="text-sm font-normal text-gray-400">kcal consumidas</span>
          </p>
          <div className="flex gap-4 mt-1">
            <span className="text-xs"><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />P {totalP}g</span>
            <span className="text-xs"><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />C {totalC}g</span>
            <span className="text-xs"><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />G {totalF}g</span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Cargando...</div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Sin registros hoy</div>
          ) : (
            sortedKeys.map((mealKey) => (
              <div key={mealKey} className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {MEAL_LABELS[mealKey] ?? mealKey}
                </p>
                {grouped[mealKey].map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{log.food.name}</p>
                      <p className="text-xs text-gray-400">{log.grams}g</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-600">{log.kcal} kcal</span>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="w-6 h-6 rounded-full border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold hover:bg-[#162d4a] transition-colors"
          >
            + Agregar comida
          </button>
        </div>
      </div>
    </>
  )
}
