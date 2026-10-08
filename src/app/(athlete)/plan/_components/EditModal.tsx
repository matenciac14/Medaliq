'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import type { PlanWeekSession as PlanClientWeekSession } from '../_lib/plan.types'

const RUNNING_TYPES = new Set(['RODAJE_Z2','FARTLEK','TEMPO','INTERVALOS','TIRADA_LARGA','SIMULACRO','TEST'])

const SESSION_TYPE_OPTIONS = [
  { value: 'RODAJE_Z2',    label: 'Rodaje Z2' },
  { value: 'FARTLEK',      label: 'Fartlek' },
  { value: 'TEMPO',        label: 'Tempo' },
  { value: 'INTERVALOS',   label: 'Intervalos' },
  { value: 'TIRADA_LARGA', label: 'Tirada Larga' },
  { value: 'FUERZA',       label: 'Fuerza' },
  { value: 'CICLA',        label: 'Cicla' },
  { value: 'NATACION',     label: 'Natación' },
  { value: 'SIMULACRO',    label: 'Simulacro' },
  { value: 'DESCANSO',     label: 'Descanso' },
  { value: 'OTRO',         label: 'Otro' },
]

function formatPace(distanceKm: number, durationMin: number): string {
  const secPerKm = (durationMin * 60) / distanceKm
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}:${String(sec).padStart(2, '0')} /km`
}

export default function EditModal({ session, onClose, onSaved }: {
  session: PlanClientWeekSession
  onClose: () => void
  onSaved: (updates: Partial<PlanClientWeekSession>) => void
}) {
  const isLogged = !!session.logId

  const [type, setType]             = useState(session.type)
  const [durationMin, setDuration]  = useState(String(session.durationMin))
  const [zoneTarget, setZone]       = useState(session.zoneTarget)
  const [detailText, setDetail]     = useState(session.detailText)

  const isEditRunning = RUNNING_TYPES.has(type)

  const [logDuration, setLogDuration] = useState(String(session.logDurationMin ?? ''))
  const [logDistance, setLogDistance] = useState(String(session.logDistanceKm ?? ''))
  const [rpe, setRpe]                 = useState(session.logRpe ?? 0)
  const [hrAvg, setHrAvg]             = useState(String(session.logHrAvg ?? ''))
  const [logNotes, setLogNotes]       = useState(session.logNotes ?? '')

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      const sessionUpdates: Record<string, unknown> = {}
      if (type !== session.type) sessionUpdates.type = type
      if (parseInt(durationMin) !== session.durationMin) sessionUpdates.durationMin = parseInt(durationMin)
      if (zoneTarget !== session.zoneTarget) sessionUpdates.zoneTarget = zoneTarget
      if (detailText !== session.detailText) sessionUpdates.detailText = detailText

      const logUpdates: Record<string, unknown> = {}
      if (isLogged) {
        const ld = logDuration ? parseInt(logDuration) : null
        if (ld !== session.logDurationMin) logUpdates.durationMin = ld
        const r = rpe > 0 ? rpe : null
        if (r !== session.logRpe) logUpdates.rpe = r
        const hr = hrAvg ? parseInt(hrAvg) : null
        if (hr !== session.logHrAvg) logUpdates.hrAvg = hr
        if (logNotes.trim() !== (session.logNotes ?? '')) logUpdates.notes = logNotes.trim() || null
        if (isEditRunning) {
          const dist = logDistance ? parseFloat(logDistance) : null
          if (dist !== session.logDistanceKm) logUpdates.distanceKm = dist
        }
      }

      const [sessionRes, logRes] = await Promise.all([
        Object.keys(sessionUpdates).length > 0
          ? fetch(`/api/athlete/sessions/${session.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sessionUpdates),
            })
          : Promise.resolve(null),
        isLogged && Object.keys(logUpdates).length > 0
          ? fetch(`/api/athlete/log/session/${session.logId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(logUpdates),
            })
          : Promise.resolve(null),
      ])

      if (sessionRes && !sessionRes.ok) { setError('Error al guardar sesión.'); return }
      if (logRes && !logRes.ok) { setError('Error al guardar registro.'); return }

      const merged: Partial<PlanClientWeekSession> = {
        ...sessionUpdates as Partial<PlanClientWeekSession>,
        ...(isLogged ? {
          logDurationMin:  (logUpdates.durationMin as number) ?? session.logDurationMin,
          logRpe:          (logUpdates.rpe as number) ?? session.logRpe,
          logHrAvg:        (logUpdates.hrAvg as number) ?? session.logHrAvg,
          logNotes:        (logUpdates.notes as string) ?? session.logNotes,
          logDistanceKm:   (logUpdates.distanceKm as number) ?? session.logDistanceKm,
        } : {}),
      }
      onSaved(merged)
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
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{SESSION_ICONS[session.type] ?? '🏅'}</span>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Editar sesión</p>
              <p className="font-black text-gray-900">{session.label || SESSION_NAMES[session.type] || session.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none pb-0.5">×</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sesión planificada</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Tipo de sesión</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f] bg-white"
              >
                {SESSION_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Duración (min)</label>
                <input type="number" value={durationMin} onChange={e => setDuration(e.target.value)} min={1}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Zona objetivo</label>
                <input type="text" value={zoneTarget} onChange={e => setZone(e.target.value)} placeholder="Z2, Z3-Z4…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Descripción / estructura</label>
              <textarea value={detailText} onChange={e => setDetail(e.target.value)} rows={3} placeholder="Describe la sesión…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1e3a5f]" />
            </div>
          </div>

          {isLogged && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registro de sesión</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Duración real (min)</label>
                  <input type="number" value={logDuration} onChange={e => setLogDuration(e.target.value)} placeholder={String(session.durationMin)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">FC media (bpm)</label>
                  <input type="number" value={hrAvg} onChange={e => setHrAvg(e.target.value)} placeholder="148"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]" />
                </div>
              </div>
              {isEditRunning && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Distancia (km)</label>
                  <input type="number" step="0.01" value={logDistance} onChange={e => setLogDistance(e.target.value)} placeholder="8.5"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]" />
                  {logDistance && parseFloat(logDistance) > 0 && logDuration && parseInt(logDuration) > 0 && (
                    <p className="text-xs text-[#1e3a5f] font-medium">
                      Ritmo: {formatPace(parseFloat(logDistance), parseInt(logDuration))}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-600">RPE — Esfuerzo percibido</p>
                  <span className="text-base font-black text-[#ea580c]">{rpe > 0 ? rpe : '–'}</span>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} type="button" onClick={() => setRpe(rpe === n ? 0 : n)}
                      className={cn('flex-1 h-8 rounded-lg text-xs font-bold border transition-colors',
                        rpe === n ? 'bg-[#ea580c] border-[#ea580c] text-white'
                          : n < rpe ? 'bg-orange-50 border-[#ea580c] text-[#ea580c]'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      )}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Notas</label>
                <textarea value={logNotes} onChange={e => setLogNotes(e.target.value)} rows={2} placeholder="Cómo te sentiste, condiciones…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1e3a5f]" />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button onClick={handleSave} disabled={loading}
            className="w-full bg-[#1e3a5f] hover:opacity-90 text-white font-bold py-3.5 rounded-xl text-sm transition-opacity disabled:opacity-60">
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
