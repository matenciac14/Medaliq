'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Check } from 'lucide-react'

type Activity = 'GYM' | 'RUN' | 'REST'

type RoutineDay = {
  dow: number
  activity: Activity
  split?: string | null
  runType?: string | null
}

const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const SPLITS: { value: string; label: string; sub: string }[] = [
  { value: 'PUSH',      label: 'Push',      sub: 'Pecho · Hombros · Tríceps' },
  { value: 'PULL',      label: 'Pull',      sub: 'Espalda · Bíceps' },
  { value: 'LEGS',      label: 'Piernas',   sub: 'Cuádriceps · Glúteos' },
  { value: 'FULL_BODY', label: 'Full Body', sub: 'Todo el cuerpo' },
]

const RUN_TYPES: { value: string; label: string; sub: string; icon: string }[] = [
  { value: 'RODAJE_Z2',    label: 'Rodaje Z2',    sub: 'Ritmo fácil — conversacional',    icon: '🟢' },
  { value: 'FARTLEK',      label: 'Fartlek',       sub: 'Cambios de ritmo libres',          icon: '🟡' },
  { value: 'TEMPO',        label: 'Tempo',         sub: 'Ritmo moderado-alto sostenido',    icon: '🟠' },
  { value: 'INTERVALOS',   label: 'Intervalos',    sub: 'Series a alta intensidad',         icon: '🔴' },
  { value: 'TIRADA_LARGA', label: 'Tirada larga',  sub: 'Distancia larga a ritmo suave',   icon: '🔵' },
  { value: 'OTRO',         label: 'Sesión libre',  sub: 'Otro tipo de carrera',             icon: '⚪' },
]

const ACTIVITY_CYCLE: Activity[] = ['REST', 'GYM', 'RUN']

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

const ACTIVITY_STYLES: Record<Activity, string> = {
  REST: 'border-gray-200 bg-white text-gray-400',
  GYM:  'border-[#1e3a5f] bg-[#1e3a5f] text-white',
  RUN:  'border-[#ea580c] bg-[#ea580c] text-white',
}

const ACTIVITY_LABELS: Record<Activity, string> = {
  REST: 'Descanso',
  GYM:  '💪 Entrenamiento',
  RUN:  '🏃 Correr',
}

export default function RoutineEditPage() {
  const router = useRouter()
  const [days, setDays] = useState<RoutineDay[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({ dow: i + 1, activity: 'REST' as Activity }))
  )
  const [focusedDow, setFocusedDow] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load existing routine
  useEffect(() => {
    fetch('/api/athlete/routine')
      .then((r) => r.json())
      .then(({ routine }) => {
        if (routine?.days && Array.isArray(routine.days) && routine.days.length > 0) {
          // Merge saved days into the full 7-day array
          const merged = Array.from({ length: 7 }, (_, i) => {
            const saved = (routine.days as RoutineDay[]).find((d) => d.dow === i + 1)
            return saved ?? { dow: i + 1, activity: 'REST' as Activity }
          })
          setDays(merged)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function cycleActivity(dow: number) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dow !== dow) return d
        const idx = ACTIVITY_CYCLE.indexOf(d.activity)
        const next = ACTIVITY_CYCLE[(idx + 1) % ACTIVITY_CYCLE.length]
        return { dow: d.dow, activity: next }
      })
    )
    setFocusedDow(dow)
  }

  function setDetail(dow: number, field: 'split' | 'runType', value: string) {
    setDays((prev) =>
      prev.map((d) => (d.dow === dow ? { ...d, [field]: value } : d))
    )
  }

  const daysPerWeek = days.filter((d) => d.activity !== 'REST').length

  async function handleSave() {
    setSaving(true)
    try {
      const activeDays = days.filter((d) => d.activity !== 'REST')
      await fetch('/api/athlete/routine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: activeDays, daysPerWeek: Math.max(activeDays.length, 1) }),
      })
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 800)
    } catch {
      // silent — show error state if needed
    } finally {
      setSaving(false)
    }
  }

  const focusedDay = focusedDow !== null ? days.find((d) => d.dow === focusedDow) ?? null : null

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-32 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#ea580c] transition-colors"
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-[#1e3a5f]">Mi rutina semanal</h1>
      </div>

      <p className="text-sm text-gray-500">
        Toca cada día para asignar gym, correr o descanso. El dashboard mostrará la actividad de hoy según tu rutina.
      </p>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <button
            key={d.dow}
            type="button"
            onClick={() => cycleActivity(d.dow)}
            className={cn(
              'flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-xs font-bold',
              ACTIVITY_STYLES[d.activity],
              focusedDow === d.dow && d.activity !== 'REST' && 'ring-2 ring-offset-1 ring-[#ea580c]'
            )}
          >
            <span className="text-[10px] font-semibold opacity-70">{DOW_LABELS[d.dow - 1]}</span>
            <span className="text-base leading-none">
              {d.activity === 'GYM' ? '💪' : d.activity === 'RUN' ? '🏃' : '—'}
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#1e3a5f]" />
          <span>Ejercicios</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#ea580c]" />
          <span>Correr</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-gray-200" />
          <span>Descanso</span>
        </div>
        <span className="ml-auto font-semibold text-[#1e3a5f]">{daysPerWeek} días/semana</span>
      </div>

      {/* Detail panel — split or run type */}
      {focusedDay && focusedDay.activity !== 'REST' && (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-[#1e3a5f]">
            {DOW_LABELS[focusedDay.dow - 1]} —{' '}
            {focusedDay.activity === 'GYM' ? 'Elige el split' : 'Tipo de entrenamiento'}
          </p>

          {focusedDay.activity === 'GYM' && (
            <div className="flex flex-col gap-2">
              {SPLITS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setDetail(focusedDay.dow, 'split', s.value)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between',
                    focusedDay.split === s.value
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <span>
                    <span className={cn('font-semibold text-sm block', focusedDay.split === s.value ? 'text-[#1e3a5f]' : 'text-gray-800')}>
                      {s.label}
                    </span>
                    <span className="text-xs text-gray-400">{s.sub}</span>
                  </span>
                  {focusedDay.split === s.value && (
                    <Check size={16} className="text-[#1e3a5f] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {focusedDay.activity === 'RUN' && (
            <div className="flex flex-col gap-2">
              {RUN_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setDetail(focusedDay.dow, 'runType', t.value)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3',
                    focusedDay.runType === t.value
                      ? 'border-[#ea580c] bg-[#ea580c]/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <span className="text-lg leading-none">{t.icon}</span>
                  <span className="flex-1">
                    <span className={cn('font-semibold text-sm block', focusedDay.runType === t.value ? 'text-[#ea580c]' : 'text-gray-800')}>
                      {t.label}
                    </span>
                    <span className="text-xs text-gray-400">{t.sub}</span>
                  </span>
                  {focusedDay.runType === t.value && (
                    <Check size={16} className="text-[#ea580c] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary of configured days */}
      {daysPerWeek > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resumen</p>
          {days
            .filter((d) => d.activity !== 'REST')
            .map((d) => (
              <button
                key={d.dow}
                type="button"
                onClick={() => setFocusedDow(focusedDow === d.dow ? null : d.dow)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all',
                  focusedDow === d.dow ? 'border-[#ea580c] bg-[#ea580c]/5' : 'border-gray-100 bg-white hover:border-gray-200'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-[#1e3a5f] w-8 shrink-0">{DOW_LABELS[d.dow - 1]}</span>
                  <span className="text-sm">{ACTIVITY_LABELS[d.activity]}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {d.activity === 'GYM'
                    ? (SPLITS.find((s) => s.value === d.split)?.label ?? 'Sin split')
                    : (RUN_TYPES.find((r) => r.value === d.runType)?.label ?? 'Sin tipo')}
                </span>
              </button>
            ))}
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto px-4 py-4 flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 border-2 border-gray-200 text-[#1e3a5f] font-semibold py-3 rounded-xl text-center text-sm"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 transition-colors"
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar rutina'}
          </button>
        </div>
      </footer>
    </div>
  )
}
