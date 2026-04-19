'use client'

import { useState } from 'react'
import { User, Scale, Heart, Moon, Zap, AlertTriangle, Target, ChevronDown, ChevronUp, Check } from 'lucide-react'

type DailyLog = {
  id: string
  date: string
  weightKg: number | null
  hrResting: number | null
  sleepHours: number | null
  energyLevel: number | null
  notes: string | null
}

type Props = {
  user: {
    name: string
    email: string
    profile: {
      age: number
      heightCm: number
      weightKg: number
      weightGoalKg: number | null
      hrResting: number | null
      hrMax: number | null
      injuries: string[]
      conditions: string[]
      sleepHoursAvg: number | null
    } | null
    goal: { type: string; raceDate: string | null } | null
    plan: { name: string; totalWeeks: number } | null
    dailyLogs: DailyLog[]
  }
}

const ENERGY_LABELS = ['', 'Muy baja', 'Baja', 'Normal', 'Buena', 'Excelente']
const ENERGY_COLORS = ['', 'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-green-100 text-green-700', 'bg-emerald-100 text-emerald-700']

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function ProfileClient({ user }: Props) {
  const todayLog = user.dailyLogs.find(l => l.date === today()) ?? null

  const [form, setForm] = useState({
    date: today(),
    weightKg: todayLog?.weightKg?.toString() ?? '',
    hrResting: todayLog?.hrResting?.toString() ?? '',
    sleepHours: todayLog?.sleepHours?.toString() ?? '',
    energyLevel: todayLog?.energyLevel?.toString() ?? '',
    notes: todayLog?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/metrics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
          hrResting: form.hrResting ? parseInt(form.hrResting) : null,
          sleepHours: form.sleepHours ? parseFloat(form.sleepHours) : null,
          energyLevel: form.energyLevel ? parseInt(form.energyLevel) : null,
          notes: form.notes || null,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const p = user.profile

  // Calcular completitud del perfil
  const profileFields = [
    { label: 'Edad', ok: !!p?.age },
    { label: 'Peso y altura', ok: !!p?.weightKg && !!p?.heightCm },
    { label: 'FC reposo y máx', ok: !!p?.hrResting && !!p?.hrMax },
    { label: 'Lesiones/condiciones', ok: true }, // always ok (puede ser vacío)
    { label: 'Plan activo', ok: !!user.plan },
  ]
  const completePct = Math.round((profileFields.filter(f => f.ok).length / profileFields.length) * 100)

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xl font-bold shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.plan && (
            <p className="text-xs text-[#f97316] font-medium mt-0.5">{user.plan.name} · {user.plan.totalWeeks} semanas</p>
          )}
        </div>
      </div>

      {/* Completitud del perfil */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Completitud del perfil</p>
          <span className="text-sm font-bold" style={{ color: completePct === 100 ? '#22c55e' : '#f97316' }}>{completePct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${completePct}%`, backgroundColor: completePct === 100 ? '#22c55e' : '#f97316' }} />
        </div>
        <div className="mt-3 space-y-1">
          {profileFields.map(f => (
            <div key={f.label} className="flex items-center gap-2 text-xs">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${f.ok ? 'bg-green-100' : 'bg-gray-100'}`}>
                {f.ok ? <Check size={10} className="text-green-600" /> : <span className="text-gray-400">·</span>}
              </div>
              <span className={f.ok ? 'text-gray-600' : 'text-gray-400'}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Datos del perfil de salud */}
      {p && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-[#1e3a5f]" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Datos de salud</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500 text-xs">Edad</span><p className="font-semibold">{p.age} años</p></div>
            <div><span className="text-gray-500 text-xs">Altura</span><p className="font-semibold">{p.heightCm} cm</p></div>
            <div><span className="text-gray-500 text-xs">Peso actual</span><p className="font-semibold">{p.weightKg} kg</p></div>
            <div><span className="text-gray-500 text-xs">Peso objetivo</span><p className="font-semibold">{p.weightGoalKg ?? '—'} kg</p></div>
            <div><span className="text-gray-500 text-xs">FC reposo</span><p className="font-semibold">{p.hrResting ?? '—'} bpm</p></div>
            <div><span className="text-gray-500 text-xs">FC máxima</span><p className="font-semibold">{p.hrMax ?? '—'} bpm</p></div>
          </div>

          {(p.injuries.length > 0 || p.conditions.length > 0) && (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              {p.injuries.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Lesiones</p>
                    <p className="text-xs text-gray-500">{p.injuries.join(', ')}</p>
                  </div>
                </div>
              )}
              {p.conditions.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Condiciones médicas</p>
                    <p className="text-xs text-gray-500">{p.conditions.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Formulario de métricas diarias */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[#f97316]" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Registrar métricas</h2>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Scale size={12} /> Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="75.0"
              value={form.weightKg}
              onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Heart size={12} /> FC reposo (bpm)
            </label>
            <input
              type="number"
              placeholder="55"
              value={form.hrResting}
              onChange={e => setForm(f => ({ ...f, hrResting: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Moon size={12} /> Horas de sueño
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="7.5"
              value={form.sleepHours}
              onChange={e => setForm(f => ({ ...f, sleepHours: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Zap size={12} /> Energía (1-5)
            </label>
            <select
              value={form.energyLevel}
              onChange={e => setForm(f => ({ ...f, energyLevel: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f] bg-white"
            >
              <option value="">— selecciona</option>
              {[1,2,3,4,5].map(n => (
                <option key={n} value={n}>{n} — {ENERGY_LABELS[n]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Notas (opcional)</label>
          <textarea
            placeholder="Ej: dormí mal, pierna cansada..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f] resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: saved ? '#22c55e' : '#f97316' }}
        >
          {saved ? <><Check size={16} /> Guardado</> : saving ? 'Guardando...' : 'Guardar métricas'}
        </button>
      </div>

      {/* Historial */}
      {user.dailyLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
          >
            <span>Historial de métricas ({user.dailyLogs.length} registros)</span>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showHistory && (
            <div className="divide-y divide-gray-100">
              {user.dailyLogs.map(log => (
                <div key={log.id} className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">{new Date(log.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <div className="flex flex-wrap gap-2">
                    {log.weightKg && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">⚖️ {log.weightKg} kg</span>}
                    {log.hrResting && <span className="text-xs bg-red-50 px-2 py-0.5 rounded-full">❤️ {log.hrResting} bpm</span>}
                    {log.sleepHours && <span className="text-xs bg-indigo-50 px-2 py-0.5 rounded-full">🌙 {log.sleepHours}h sueño</span>}
                    {log.energyLevel && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ENERGY_COLORS[log.energyLevel]}`}>
                        ⚡ {ENERGY_LABELS[log.energyLevel]}
                      </span>
                    )}
                  </div>
                  {log.notes && <p className="text-xs text-gray-500 mt-1 italic">"{log.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
