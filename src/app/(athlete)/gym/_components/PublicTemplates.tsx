'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, BarChart2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type PublicTemplate = {
  id: string
  name: string
  description: string | null
  goal: string | null
  level: string | null
  daysPerWeek: number
  category: string | null
  days: { isRestDay: boolean }[]
}

const GOAL_LABELS: Record<string, string> = {
  HYPERTROPHY: 'Hipertrofia',
  STRENGTH:    'Fuerza',
  TONING:      'Tonificación',
  FUNCTIONAL:  'Funcional',
}

const LEVEL_COLORS: Record<string, { chip: string; badge: string }> = {
  BEGINNER:     { chip: 'border-green-300 bg-green-50 text-green-700',  badge: 'bg-green-100 text-green-700' },
  INTERMEDIATE: { chip: 'border-yellow-300 bg-yellow-50 text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  ADVANCED:     { chip: 'border-red-300 bg-red-50 text-red-700',        badge: 'bg-red-100 text-red-700' },
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER:     'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED:     'Avanzado',
}

const CATEGORY_ICONS: Record<string, string> = {
  PPL:         '🔄',
  FULL_BODY:   '💪',
  UPPER_LOWER: '↕️',
  STRENGTH:    '🏋️',
  BEGINNER:    '🌱',
}

const FILTERS = [
  { key: 'ALL',          label: 'Todas' },
  { key: 'BEGINNER',     label: 'Principiante' },
  { key: 'INTERMEDIATE', label: 'Intermedio' },
  { key: 'ADVANCED',     label: 'Avanzado' },
]

export default function PublicTemplates({ templates }: { templates: PublicTemplate[] }) {
  const router = useRouter()
  const [loading, setLoading]   = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter]     = useState('ALL')

  async function handleSelect(templateId: string) {
    setLoading(templateId)
    try {
      const res = await fetch('/api/athlete/gym/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      if (res.ok) {
        setSelected(templateId)
        setTimeout(() => router.refresh(), 800)
      }
    } finally {
      setLoading(null)
    }
  }

  const visible = filter === 'ALL'
    ? templates
    : templates.filter(t => t.level === filter)

  return (
    <div className="space-y-4">
      {/* Filtros de nivel */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              filter === f.key
                ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid de plantillas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((tmpl) => {
          const trainingDays = tmpl.days.filter(d => !d.isRestDay).length
          const isLoading = loading === tmpl.id
          const isDone    = selected === tmpl.id
          const lvl       = LEVEL_COLORS[tmpl.level ?? '']

          return (
            <div
              key={tmpl.id}
              className={cn(
                'bg-white border rounded-2xl shadow-sm overflow-hidden transition-all',
                isDone ? 'border-green-400 ring-1 ring-green-300' : 'border-gray-200 hover:border-[#1e3a5f]/30 hover:shadow-md'
              )}
            >
              {/* Card header */}
              <div className="bg-[#1e3a5f] px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xl">{CATEGORY_ICONS[tmpl.category ?? ''] ?? '💪'}</span>
                    <h3 className="text-white font-bold text-sm mt-1 leading-tight">{tmpl.name}</h3>
                  </div>
                  {tmpl.level && lvl && (
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-1', lvl.badge)}>
                      {LEVEL_LABELS[tmpl.level] ?? tmpl.level}
                    </span>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="px-4 py-3.5 space-y-3">
                <p className="text-xs text-gray-600 leading-relaxed">{tmpl.description}</p>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Dumbbell size={12} />
                    {GOAL_LABELS[tmpl.goal ?? ''] ?? tmpl.goal}
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart2 size={12} />
                    {trainingDays} días/semana
                  </span>
                </div>

                <button
                  onClick={() => handleSelect(tmpl.id)}
                  disabled={isLoading || !!selected}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                    isDone
                      ? 'bg-green-500 text-white'
                      : 'bg-[#ea580c] hover:bg-orange-600 active:scale-[0.98] text-white disabled:opacity-50'
                  )}
                >
                  {isDone ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 size={14} /> Seleccionada
                    </span>
                  ) : isLoading ? 'Aplicando...' : 'Elegir esta rutina →'}
                </button>
              </div>
            </div>
          )
        })}

        {visible.length === 0 && (
          <p className="col-span-2 text-center text-sm text-gray-400 py-8">
            No hay plantillas para este nivel todavía.
          </p>
        )}
      </div>
    </div>
  )
}
