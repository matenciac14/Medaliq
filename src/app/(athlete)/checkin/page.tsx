'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scale, Heart, Moon, Zap, FileText, AlertTriangle } from 'lucide-react'
import { mockMetrics } from '@/lib/mock/dashboard-data'

// ——— Tipos ———
interface CheckInData {
  weightKg?: number
  hrResting?: number
  sleepHours?: number
  sleepScore?: number
  hardestRpe: number
  adherencePct: number
  hasPain: boolean
  painDescription?: string
  energyLevel: number
  notes?: string
  // Para motor de alertas
  previousWeightKg?: number
  previousHrResting?: number
}

// ——— Motor de alertas ———
function evaluateAlerts(data: CheckInData): string[] {
  const alerts: string[] = []
  // FC reposo elevada
  if (data.hrResting && data.previousHrResting && data.hrResting > data.previousHrResting * 1.10) {
    alerts.push('FC reposo elevada — considera un dia extra de descanso')
  }
  // Sleep score bajo
  if (data.sleepScore && data.sleepScore < 70) {
    alerts.push('Sleep score bajo — revisa tus habitos de sueno')
  }
  // Perdida de peso agresiva
  if (data.weightKg && data.previousWeightKg && (data.previousWeightKg - data.weightKg) > 1.2) {
    alerts.push('Bajaste mas de 1.2kg esta semana — aumenta 200-300 kcal')
  }
  // Adherencia muy baja
  if (data.adherencePct !== undefined && data.adherencePct < 40) {
    alerts.push('Adherencia baja — necesitas ajustar la carga del plan?')
  }
  return alerts
}

// ——— Componente slider RPE ———
function RpeSlider({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  const RPE_LABELS: Record<number, string> = {
    1: 'Muy facil', 2: 'Muy facil', 3: 'Facil',
    4: 'Algo facil', 5: 'Moderado', 6: 'Algo duro',
    7: 'Duro', 8: 'Muy duro', 9: 'Casi maximo', 10: 'Maximo',
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

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <div className="text-center">
        <span
          className="text-4xl font-black tabular-nums"
          style={{ color: getRpeColor(value) }}
        >
          {value}
        </span>
      </div>
      <div className="pt-1">
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:shadow-md"
          style={{ background: getRpeTrackStyle(value) }}
        />
        <div className="flex justify-between mt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <span key={n} className="text-[10px] text-gray-400 w-4 text-center">{n}</span>
          ))}
        </div>
      </div>
      <p
        className="text-center text-sm font-semibold"
        style={{ color: getRpeColor(value) }}
      >
        {RPE_LABELS[value]}
      </p>
    </div>
  )
}

// ——— Opciones de energia ———
const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Muy baja', sublabel: '1-2' },
  { value: 3, emoji: '😔', label: 'Baja', sublabel: '3-4' },
  { value: 5, emoji: '😐', label: 'Normal', sublabel: '5-6' },
  { value: 7, emoji: '😊', label: 'Buena', sublabel: '7-8' },
  { value: 9, emoji: '🔥', label: 'Excelente', sublabel: '9-10' },
]

// ——— Page ———
export default function CheckinPage() {
  const router = useRouter()

  // Seccion 1 — cuerpo
  const [weightKg, setWeightKg] = useState<string>('')
  const [hrResting, setHrResting] = useState<string>('')
  const [sleepHours, setSleepHours] = useState(7)
  const [sleepScore, setSleepScore] = useState<string>('')

  // Seccion 2 — entrenamiento
  const [hardestRpe, setHardestRpe] = useState(5)
  const [adherencePct, setAdherencePct] = useState(80)
  const [hasPain, setHasPain] = useState<boolean>(false)
  const [painDescription, setPainDescription] = useState('')

  // Seccion 3 — energia
  const [energyLevel, setEnergyLevel] = useState<number>(5)
  const [notes, setNotes] = useState('')

  // Estado guardado / alertas
  const [alerts, setAlerts] = useState<string[]>([])
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSubmit() {
    const data: CheckInData = {
      weightKg: weightKg ? Number(weightKg) : undefined,
      hrResting: hrResting ? Number(hrResting) : undefined,
      sleepHours,
      sleepScore: sleepScore ? Number(sleepScore) : undefined,
      hardestRpe,
      adherencePct,
      hasPain,
      painDescription: hasPain ? painDescription : undefined,
      energyLevel,
      notes: notes || undefined,
      // Valores previos del mock para comparar
      previousWeightKg: mockMetrics.weightKg,
      previousHrResting: mockMetrics.hrResting,
    }

    const found = evaluateAlerts(data)
    if (found.length > 0) {
      setAlerts(found)
      setShowAlertModal(true)
    } else {
      doSave(data)
    }
  }

  async function doSave(data?: CheckInData) {
    setSaving(true)
    setShowAlertModal(false)
    try {
      await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data ?? {
          weightKg: weightKg ? Number(weightKg) : undefined,
          hrResting: hrResting ? Number(hrResting) : undefined,
          sleepHours,
          sleepScore: sleepScore ? Number(sleepScore) : undefined,
          hardestRpe,
          adherencePct,
          hasPain,
          painDescription: hasPain ? painDescription : undefined,
          energyLevel,
          notes: notes || undefined,
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
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-gray-900">Check-in guardado</h2>
          <p className="text-sm text-gray-500">Tu coach revisara los datos y ajustara el plan si es necesario.</p>
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
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900">Check-in Semana 1</h1>
          <p className="text-sm text-gray-500">Cada domingo — 5 minutos para ajustar tu plan</p>
        </div>

        {/* ——— Seccion 1: Tu cuerpo ——— */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide">Tu cuerpo esta semana</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Peso */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <Scale size={13} />
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder={String(mockMetrics.weightKg)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>

            {/* FC reposo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <Heart size={13} />
                FC reposo (bpm)
              </label>
              <input
                type="number"
                value={hrResting}
                onChange={(e) => setHrResting(e.target.value)}
                placeholder={String(mockMetrics.hrResting)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Sleep hours slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <Moon size={13} />
                Horas de sueno promedio
              </label>
              <span className="text-sm font-bold text-[#1e3a5f]">{sleepHours}h</span>
            </div>
            <input
              type="range"
              min={4}
              max={10}
              step={0.5}
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1e3a5f] [&::-webkit-slider-thumb]:shadow-md"
              style={{
                background: `linear-gradient(to right, #1e3a5f 0%, #1e3a5f ${((sleepHours - 4) / 6) * 100}%, #e5e7eb ${((sleepHours - 4) / 6) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between">
              <span className="text-[10px] text-gray-400">4h</span>
              <span className="text-[10px] text-gray-400">7h</span>
              <span className="text-[10px] text-gray-400">10h</span>
            </div>
          </div>

          {/* Sleep score */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">
              Sleep score (0-100) — Garmin / wearable
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={sleepScore}
              onChange={(e) => setSleepScore(e.target.value)}
              placeholder="Opcional"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>
        </section>

        {/* ——— Seccion 2: Entrenamiento ——— */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">
          <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide">Tu entrenamiento</h2>

          {/* RPE sesion mas dura */}
          <RpeSlider
            value={hardestRpe}
            onChange={setHardestRpe}
            label="Sesion mas dura de la semana — RPE"
          />

          {/* Adherencia */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <Zap size={13} />
                Adherencia al plan
              </label>
              <span className="text-sm font-bold text-[#1e3a5f]">{adherencePct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={adherencePct}
              onChange={(e) => setAdherencePct(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:shadow-md"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #eab308 40%, #22c55e 80%, #22c55e 100%) 0 0 / ${adherencePct}% 100% no-repeat, #e5e7eb`,
              }}
            />
            <div className="flex justify-between">
              <span className="text-[10px] text-gray-400">Ninguna</span>
              <span className="text-[10px] text-gray-400">Mitad</span>
              <span className="text-[10px] text-gray-400">Perfecta</span>
            </div>
          </div>

          {/* Molestia o dolor */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Tuviste alguna molestia o dolor?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setHasPain(false)}
                className={`py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                  hasPain === false
                    ? 'bg-[#22c55e] border-[#22c55e] text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#22c55e]/40'
                }`}
              >
                No
              </button>
              <button
                onClick={() => setHasPain(true)}
                className={`py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                  hasPain === true
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                }`}
              >
                Si
              </button>
            </div>
            {hasPain && (
              <textarea
                value={painDescription}
                onChange={(e) => setPainDescription(e.target.value)}
                placeholder="Donde y que tipo de molestia? (rodilla derecha, tension muscular, etc.)"
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
              />
            )}
          </div>
        </section>

        {/* ——— Seccion 3: Energia ——— */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide">Tu energia</h2>

          {/* Cards energia */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Energia general esta semana</p>
            <div className="grid grid-cols-5 gap-1.5">
              {ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setEnergyLevel(opt.value)}
                  className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2 transition-all ${
                    energyLevel === opt.value
                      ? 'border-[#f97316] bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className={`text-[9px] font-semibold text-center leading-tight ${
                    energyLevel === opt.value ? 'text-[#f97316]' : 'text-gray-500'
                  }`}>
                    {opt.label}
                  </span>
                  <span className={`text-[8px] ${
                    energyLevel === opt.value ? 'text-[#f97316]/70' : 'text-gray-400'
                  }`}>
                    {opt.sublabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notas libres */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText size={14} />
              Algo que tu coach deba saber?
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Viaje, estres laboral, cambio de dieta, lesion vieja..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>
        </section>

        {/* Boton guardar */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-[#f97316] hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-sm"
        >
          {saving ? 'Guardando...' : 'Guardar check-in'}
        </button>
      </div>

      {/* ——— Modal de alertas ——— */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            {/* Banner amarillo */}
            <div className="bg-yellow-50 border-b border-yellow-200 px-5 py-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-yellow-800">Atenciones detectadas</p>
                <p className="text-xs text-yellow-700 mt-0.5">Revisa estos puntos antes de guardar</p>
              </div>
            </div>

            {/* Lista de alertas */}
            <div className="px-5 py-4 space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-yellow-50 rounded-xl px-3 py-2.5">
                  <span className="text-base shrink-0">⚠️</span>
                  <p className="text-sm text-yellow-900">{alert}</p>
                </div>
              ))}
            </div>

            {/* Botones */}
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAlertModal(false)}
                className="py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Revisar datos
              </button>
              <button
                onClick={() => doSave()}
                disabled={saving}
                className="py-3 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Entendido, guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
