'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import type { PlanWeekSession as PlanClientWeekSession } from '../_lib/plan.types'

const RUNNING_TYPES = new Set(['RODAJE_Z2','FARTLEK','TEMPO','INTERVALOS','TIRADA_LARGA','SIMULACRO','TEST'])

function formatPace(distanceKm: number, durationMin: number): string {
  const secPerKm = (durationMin * 60) / distanceKm
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}:${String(sec).padStart(2, '0')} /km`
}

export default function LogModal({ session, onClose, onSuccess }: {
  session: PlanClientWeekSession
  onClose: () => void
  onSuccess: () => void
}) {
  const isRunning  = RUNNING_TYPES.has(session.type)
  const isStrength = session.type === 'FUERZA'

  const [completed, setCompleted] = useState<boolean | null>(null)
  const [actualDuration, setActualDuration] = useState(String(session.durationMin))
  const [distanceKm, setDistanceKm] = useState('')
  const [rpe, setRpe] = useState(0)
  const [hrAvg, setHrAvg] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (completed === null) { setError('¿Completaste la sesión?'); return }
    if (!completed) { onClose(); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/athlete/log/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedSessionId: session.id,
          completed: true,
          durationMin: actualDuration ? parseInt(actualDuration) : undefined,
          rpe: rpe > 0 ? rpe : undefined,
          hrAvg: hrAvg ? parseInt(hrAvg) : undefined,
          distanceKm: isRunning && distanceKm ? parseFloat(distanceKm) : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) { setError('No se pudo guardar. Intenta de nuevo.'); return }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{SESSION_ICONS[session.type] ?? '🏅'}</span>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Registrar sesión</p>
              <p className="font-black text-gray-900">{session.durationMin} min · {session.label || SESSION_NAMES[session.type] || session.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none pb-0.5">×</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">¿Completaste la sesión?</p>
            <div className="flex gap-3">
              <button onClick={() => setCompleted(true)}
                className={cn('flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors',
                  completed === true ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-700 hover:border-green-300'
                )}>✓ Sí, la hice</button>
              <button onClick={() => setCompleted(false)}
                className={cn('flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors',
                  completed === false ? 'bg-red-500 border-red-500 text-white' : 'border-gray-200 text-gray-700 hover:border-red-300'
                )}>✗ No la hice</button>
            </div>
          </div>

          {completed && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Duración real (min)</label>
                  <input type="number" value={actualDuration} onChange={e => setActualDuration(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">FC media (bpm)</label>
                  <input type="number" value={hrAvg} onChange={e => setHrAvg(e.target.value)} placeholder="148"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]" />
                </div>
              </div>
              {isRunning && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Distancia (km)</label>
                  <input type="number" step="0.01" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} placeholder="8.5"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]" />
                  {distanceKm && parseFloat(distanceKm) > 0 && actualDuration && parseInt(actualDuration) > 0 && (
                    <p className="text-xs text-[#1e3a5f] font-semibold">
                      Ritmo: {formatPace(parseFloat(distanceKm), parseInt(actualDuration))}
                    </p>
                  )}
                </div>
              )}
              {isStrength && (
                <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                  <span className="text-xl">💪</span>
                  <div>
                    <p className="text-xs font-semibold text-purple-800">¿Quieres registrar series y reps?</p>
                    <a href="/gym" className="text-xs text-purple-600 underline hover:text-purple-800">Ir al módulo de Ejercicios →</a>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">RPE — Esfuerzo percibido</p>
                  <span className="text-lg font-black text-[#ea580c]">{rpe > 0 ? rpe : '–'}</span>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setRpe(n)}
                      className={cn('flex-1 h-9 rounded-lg text-xs font-bold border transition-colors',
                        rpe === n ? 'bg-[#ea580c] border-[#ea580c] text-white'
                          : n < rpe ? 'bg-orange-50 border-[#ea580c] text-[#ea580c]'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      )}>{n}</button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Muy fácil</span><span>Máximo</span>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cómo te sentiste, condiciones, ajustes..."
              rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1e3a5f]" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-[#ea580c] hover:opacity-90 text-white font-bold py-3.5 rounded-xl text-sm transition-opacity disabled:opacity-60">
            {loading ? 'Guardando...' : 'Guardar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
