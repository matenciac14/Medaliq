'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, CheckCircle2, Clock, MapPin, Heart, FileText } from 'lucide-react'
import { mockTodaySession } from '@/lib/mock/dashboard-data'

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2',
  FARTLEK: 'Fartlek',
  TIRADA_LARGA: 'Tirada larga',
  CICLA: 'Cicla',
  NATACION: 'Natación',
  FUERZA: 'Fuerza',
  DESCANSO: 'Descanso activo',
}

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃',
  FARTLEK: '🏃',
  TIRADA_LARGA: '🏃',
  CICLA: '🚴',
  NATACION: '🏊',
  FUERZA: '💪',
  DESCANSO: '😴',
}

const RPE_LABELS: Record<number, string> = {
  1: 'Muy fácil',
  2: 'Muy fácil',
  3: 'Fácil',
  4: 'Algo fácil',
  5: 'Moderado',
  6: 'Algo duro',
  7: 'Duro',
  8: 'Muy duro',
  9: 'Casi máximo',
  10: 'Máximo',
}

function getRpeColor(rpe: number): string {
  if (rpe <= 3) return '#22c55e'
  if (rpe <= 6) return '#eab308'
  if (rpe <= 8) return '#f97316'
  return '#ef4444'
}

function getRpeTrackStyle(rpe: number): string {
  const pct = ((rpe - 1) / 9) * 100
  return `linear-gradient(to right, #22c55e 0%, #eab308 30%, #f97316 60%, #ef4444 100%) 0 0 / ${pct}% 100% no-repeat, #e5e7eb`
}

const RUNNING_TYPES = ['RODAJE_Z2', 'FARTLEK', 'TIRADA_LARGA', 'CICLA']

export default function LogPage() {
  const router = useRouter()

  const [completed, setCompleted] = useState<boolean | null>(null)
  const [rpe, setRpe] = useState(5)
  const [durationMin, setDurationMin] = useState<string>(String(mockTodaySession.durationMin))
  const [distanceKm, setDistanceKm] = useState<string>('')
  const [hrAvg, setHrAvg] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [notCompleted_reason, setNotCompletedReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isRunning = RUNNING_TYPES.includes(mockTodaySession.type)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/log/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedSessionId: 'session-demo',
          completed,
          rpe: completed ? rpe : undefined,
          durationMin: completed ? Number(durationMin) : undefined,
          distanceKm: completed && isRunning && distanceKm ? Number(distanceKm) : undefined,
          hrAvg: hrAvg ? Number(hrAvg) : undefined,
          notes: completed ? notes : notCompleted_reason,
        }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-[#22c55e]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Sesion guardada</h2>
          <p className="text-sm text-gray-500">Tu progreso ha sido registrado correctamente.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Registrar sesion</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Card sesion planificada */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#1e3a5f] px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">{SESSION_ICONS[mockTodaySession.type] ?? '🏅'}</span>
            <div>
              <p className="text-white font-semibold">
                {SESSION_LABELS[mockTodaySession.type] ?? mockTodaySession.type}
              </p>
              <p className="text-white/70 text-sm">
                {mockTodaySession.durationMin} min · Zona {mockTodaySession.zoneTarget}
              </p>
            </div>
          </div>
          <div className="px-5 py-3">
            <p className="text-sm text-gray-600">{mockTodaySession.detailText}</p>
          </div>
        </div>

        {/* Toggle completada */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Completaste la sesion?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCompleted(true)}
              className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                completed === true
                  ? 'bg-[#22c55e] border-[#22c55e] text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-[#22c55e]/50'
              }`}
            >
              Si
            </button>
            <button
              onClick={() => setCompleted(false)}
              className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                completed === false
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Si no completo: razon */}
        {completed === false && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
            <label className="text-sm font-semibold text-gray-700 block">Por que no la completaste?</label>
            <textarea
              value={notCompleted_reason}
              onChange={(e) => setNotCompletedReason(e.target.value)}
              placeholder="Lesion, cansancio, tiempo, etc."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
            <button
              onClick={handleSave}
              disabled={saving || !notCompleted_reason.trim()}
              className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}

        {/* Si completo: formulario */}
        {completed === true && (
          <>
            {/* RPE */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Esfuerzo percibido (RPE)</p>

              {/* Numero grande */}
              <div className="text-center">
                <span
                  className="text-5xl font-black tabular-nums"
                  style={{ color: getRpeColor(rpe) }}
                >
                  {rpe}
                </span>
              </div>

              {/* Slider */}
              <div className="relative pt-1">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:shadow-md"
                  style={{ background: getRpeTrackStyle(rpe) }}
                />
                <div className="flex justify-between mt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <span key={n} className="text-[10px] text-gray-400 w-4 text-center">{n}</span>
                  ))}
                </div>
              </div>

              {/* Etiqueta */}
              <p
                className="text-center text-sm font-semibold"
                style={{ color: getRpeColor(rpe) }}
              >
                {RPE_LABELS[rpe]}
              </p>
            </div>

            {/* Metricas */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Datos de la sesion</p>

              <div className="grid grid-cols-2 gap-4">
                {/* Duracion real */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Clock size={13} />
                    Duracion real (min)
                  </label>
                  <input
                    type="number"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder="45"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>

                {/* FC promedio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Heart size={13} />
                    FC promedio (bpm)
                  </label>
                  <input
                    type="number"
                    value={hrAvg}
                    onChange={(e) => setHrAvg(e.target.value)}
                    placeholder="Opcional"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              {/* Distancia — solo si es running/cicla */}
              {isRunning && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <MapPin size={13} />
                    Distancia real (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    placeholder="Ej. 7.2"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
              )}
            </div>

            {/* Notas libres */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText size={15} />
                Notas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Como te sentiste, condiciones, algo que destacar..."
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>

            {/* Boton guardar */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#f97316] hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-sm"
            >
              {saving ? 'Guardando...' : 'Guardar sesion'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
