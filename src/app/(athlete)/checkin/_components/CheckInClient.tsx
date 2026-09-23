'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import MetricSlider from './MetricSlider'
import MetricInput from './MetricInput'
import SubmittedCheckInView from './SubmittedCheckInView'
import EarlyCheckInScreen from './EarlyCheckInScreen'
import CheckInResultScreen, { type CheckInSuggestion } from './CheckInResultScreen'
import type { PrevMetrics, LastWeekSummary, CheckInState } from './checkin.types'
import type { WeekSession } from './SessionsPanel'

export type { PrevMetrics, CheckInState }

interface CheckInClientProps {
  weekSessions: WeekSession[]
  prevMetrics: PrevMetrics
  weekLabel: string
  hasNutrition: boolean
  hasGym: boolean
  weekAdherence: { completed: number; total: number }
  currentWeek: number
  totalWeeks: number | null
  hasAutoData: boolean
  checkInState: CheckInState
  submittedAt: Date | null
  submittedTriggers: string[]
  lastWeekSummary: LastWeekSummary | null
  initialSuggestions?: CheckInSuggestion[]
}

function evaluateAlerts(data: {
  weightKg?: number
  hrResting?: number
  previousWeightKg?: number | null
  previousHrResting?: number | null
}): string[] {
  const alerts: string[] = []
  if (data.hrResting && data.previousHrResting && data.hrResting > data.previousHrResting * 1.10) {
    alerts.push('FC reposo elevada — considera un dia extra de descanso')
  }
  if (data.weightKg && data.previousWeightKg && (data.previousWeightKg - data.weightKg) > 1.2) {
    alerts.push('Bajaste mas de 1.2 kg esta semana — aumenta 200-300 kcal')
  }
  return alerts
}

const PAIN_OPTIONS = [
  { value: 1, label: 'Sin molestias', shortLabel: 'Sin molestias' },
  { value: 4, label: 'Molestia leve', shortLabel: 'Leve' },
  { value: 7, label: 'Dolor moderado', shortLabel: 'Moderada' },
] as const

const ADHERENCE_DAYS = [
  { label: 'Lun', dow: 1 },
  { label: 'Mar', dow: 2 },
  { label: 'Mie', dow: 3 },
  { label: 'Jue', dow: 4 },
  { label: 'Vie', dow: 5 },
  { label: 'Sab', dow: 6 },
  { label: 'Dom', dow: 0 },
] as const

export default function CheckInClient({
  weekSessions,
  prevMetrics,
  weekLabel,
  hasNutrition,
  weekAdherence,
  currentWeek,
  totalWeeks,
  hasAutoData,
  checkInState,
  submittedAt,
  submittedTriggers,
  lastWeekSummary,
  initialSuggestions = [],
}: CheckInClientProps) {
  const router = useRouter()
  const [openForm, setOpenForm] = useState(false)

  const [weightKg, setWeightKg] = useState(prevMetrics.weightKg?.toString() ?? '')
  const [sleepHours, setSleepHours] = useState(prevMetrics.sleepHours ?? 0)
  const [hrResting, setHrResting] = useState(prevMetrics.hrResting?.toString() ?? '')
  const [energyLevel, setEnergyLevel] = useState(0)
  const [hardestRpe, setHardestRpe] = useState(prevMetrics.hardestSessionRpe ?? 0)
  const [stressLevel, setStressLevel] = useState(0)
  const [motivationLevel, setMotivationLevel] = useState(0)
  const [painLevel, setPainLevel] = useState(0)
  const [nutritionAdherence, setNutritionAdherence] = useState(0)
  const [notes, setNotes] = useState('')

  const [alerts, setAlerts] = useState<string[]>([])
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [adjustment, setAdjustment] = useState<{
    severity: 'ok' | 'warning' | 'critical'
    planChanges?: { volumeDeltaPct?: number; zonesAdjusted?: boolean }
    nutritionChanges?: { newKcalHard?: number; newKcalEasy?: number }
    recommendation: string
    adjustments: string[]
    triggers: string[]
  } | null>(null)
  const [suggestions, setSuggestions] = useState<CheckInSuggestion[]>(initialSuggestions)

  function buildBody() {
    return {
      weightKg: weightKg ? Number(weightKg) : undefined,
      hrResting: hrResting ? Number(hrResting) : undefined,
      sleepHours: sleepHours > 0 ? sleepHours : undefined,
      hardestRpe: hardestRpe || 5,
      painLevel: painLevel > 0 ? painLevel : undefined,
      energyLevel: energyLevel || 5,
      stressLevel: stressLevel || undefined,
      motivationLevel: motivationLevel || undefined,
      nutritionAdherencePct: hasNutrition && nutritionAdherence > 0 ? nutritionAdherence * 10 : undefined,
      notes: notes || undefined,
    }
  }

  function handleSubmit() {
    if (saving) return
    if (!energyLevel || !hardestRpe) {
      setFormError('Completa al menos la energia percibida y el RPE de la sesion mas dura.')
      return
    }
    setFormError(null)
    const body = buildBody()
    const found = evaluateAlerts({
      weightKg: body.weightKg,
      hrResting: body.hrResting,
      previousWeightKg: prevMetrics.weightKg,
      previousHrResting: prevMetrics.hrResting,
    })
    if (found.length > 0) {
      setAlerts(found)
      setShowAlertModal(true)
    } else {
      doSave(body)
    }
  }

  async function doSave(body: ReturnType<typeof buildBody>) {
    setSaving(true)
    setSaveError(null)
    setShowAlertModal(false)
    try {
      const res = await fetch('/api/athlete/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err?.error ?? `Error ${res.status} — intenta de nuevo`)
      }
      const json = await res.json() as {
        adjustment?: typeof adjustment
        suggestions?: CheckInSuggestion[]
      }
      if (json.adjustment) setAdjustment(json.adjustment)
      if (json.suggestions) setSuggestions(json.suggestions)
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar. Revisa tu conexion e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function respondToSuggestion(id: string, action: 'accept' | 'reject') {
    await fetch(`/api/athlete/checkin/suggestions/${id}/${action}`, { method: 'POST' })
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  // --- State routing ---
  if (checkInState === 'submitted' && !openForm && !saved) {
    return (
      <SubmittedCheckInView
        prevMetrics={prevMetrics}
        weekLabel={weekLabel}
        submittedAt={submittedAt}
        submittedTriggers={submittedTriggers}
        lastWeekSummary={lastWeekSummary}
        suggestions={suggestions}
        onRespond={respondToSuggestion}
        onUpdate={() => setOpenForm(true)}
        onBack={() => router.push('/dashboard')}
      />
    )
  }
  if (checkInState === 'early' && !openForm && !saved) {
    return (
      <EarlyCheckInScreen
        lastWeekSummary={lastWeekSummary}
        onForce={() => setOpenForm(true)}
        onBack={() => router.push('/dashboard')}
      />
    )
  }
  if (saved) {
    return (
      <CheckInResultScreen
        weekLabel={weekLabel}
        triggers={adjustment?.triggers ?? []}
        adjustments={adjustment?.adjustments ?? []}
        severity={adjustment?.severity ?? 'ok'}
        suggestions={suggestions}
        planChanges={adjustment?.planChanges}
        nutritionChanges={adjustment?.nutritionChanges}
        onBack={() => router.push('/dashboard')}
      />
    )
  }

  // --- Computed ---
  const adherencePct = weekAdherence.total > 0
    ? Math.round((weekAdherence.completed / weekAdherence.total) * 100)
    : null
  const sleepPct = sleepHours > 0 ? Math.min(100, ((sleepHours - 3) / 9) * 100) : 0
  const rpePct = hardestRpe > 0 ? ((hardestRpe - 1) / 9) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== MOBILE HEADER (navy) ===== */}
      <div className="lg:hidden bg-[#1e3a5f] px-4 pt-6 pb-5 text-white">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold">{`Revisi\u00f3n Semanal`}</h1>
          {totalWeeks && (
            <span className="text-xs font-semibold bg-[rgba(34,195,93,0.22)] text-[#22c35d] px-3 py-1 rounded-full uppercase tracking-wide">
              Semana {currentWeek} de {totalWeeks}
            </span>
          )}
        </div>
        <p className="text-sm text-white/70">{`Eval\u00faa tu semana y ajusta el plan`}</p>
        <p className="text-xs text-white/55 mt-0.5">
          {weekLabel} {'\u00b7'} {weekAdherence.completed}/{weekAdherence.total} sesiones completadas
        </p>
        {adherencePct !== null && (
          <div className="mt-3">
            <div className="h-1 bg-white/15 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{ width: `${adherencePct}%`, backgroundColor: '#22c35d' }}
              />
            </div>
            <p className="text-xs text-white/65 mt-1.5">
              {adherencePct}% adherencia {'\u00b7'} {adherencePct >= 80 ? 'sigue bien' : adherencePct >= 50 ? 'puedes mejorar' : 'animo, sigamos'}
            </p>
          </div>
        )}
      </div>

      {/* ===== DESKTOP HEADER ===== */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wider mb-0.5">{`Revisi\u00f3n Semanal`}</p>
            <h1 className="text-2xl font-bold text-[#0f1e30]">{`Revisi\u00f3n Semanal`}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{weekLabel}</p>
          </div>
          <div className="text-right space-y-1.5">
            {totalWeeks && (
              <span className="inline-block text-xs font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-full uppercase tracking-wide">
                Semana {currentWeek} de {totalWeeks}
              </span>
            )}
            {adherencePct !== null && (
              <>
                <div className="h-[5px] bg-gray-200 rounded-full overflow-hidden w-48 ml-auto">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${adherencePct}%`, backgroundColor: adherencePct >= 80 ? '#22c55e' : adherencePct >= 50 ? '#ea580c' : '#ef4444' }}
                  />
                </div>
                <p className="text-xs text-gray-500">{adherencePct}% adherencia esta semana</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-4 pb-8">
        {/* Banner auto-datos */}
        {hasAutoData && (
          <div className="mb-4 bg-[#fff3e0] rounded-xl overflow-hidden flex items-stretch gap-0">
            <div className="w-[3px] bg-[#ea5809] rounded-sm shrink-0 my-3 ml-4" />
            <div className="flex-1 px-3 py-3">
              <p className="text-xs font-semibold text-[#8c4000]">{'\u26a1'}  {`Datos pre-llenados autom\u00e1ticamente`}</p>
              <p className="text-[10px] text-[rgba(140,64,0,0.8)] mt-0.5">
                {[
                  prevMetrics.hardestSessionRpe ? `RPE pico: ${prevMetrics.hardestSessionRpe}` : '',
                  prevMetrics.energyLevel ? `Energ\u00eda: ${prevMetrics.energyLevel}/10 (prom.)` : '',
                  weekAdherence.total > 0 ? `Sesiones: ${weekAdherence.completed}/${weekAdherence.total}` : '',
                ].filter(Boolean).join(' \u00b7 ')}
              </p>
            </div>
            <span className="shrink-0 self-center mr-4 text-[10px] font-semibold bg-[rgba(34,195,93,0.2)] text-[#22c35d] px-2.5 py-1 rounded-full">Auto {'\u2713'}</span>
          </div>
        )}

        {/* ===== FORM LAYOUT ===== */}
        {/* Mobile: single card | Desktop: two-column grid */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden lg:bg-transparent lg:shadow-none lg:rounded-none lg:grid lg:grid-cols-[5fr_6fr] lg:gap-5 lg:overflow-visible">

          {/* LEFT: DATOS AUTOMATICOS */}
          <section className="bg-[#f0fdf4] lg:bg-white lg:rounded-2xl lg:shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] lg:overflow-hidden lg:self-start lg:sticky lg:top-6">
            <div className="px-4 pt-3 lg:px-5 lg:py-4 lg:border-b lg:border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-semibold text-[#106f33] uppercase tracking-[0.3px] lg:text-xs lg:font-bold lg:text-emerald-700 lg:tracking-wider">
                  {`DATOS AUTOM\u00c1TICOS \u2713`}
                </h2>
                <span className="hidden lg:inline text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Del sistema</span>
              </div>
            </div>
            <div className="px-4 py-3 lg:px-5 lg:py-5 space-y-4 lg:space-y-6">
              {/* RPE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#262626]">{`RPE m\u00e1s duro de la semana`}</p>
                    <p className="text-xs text-[#106f33] lg:text-gray-400 mt-0.5">
                      {prevMetrics.hardestSessionRpe
                        ? `\ud83d\udccb Registrado autom\u00e1ticamente`
                        : `Ajusta el RPE de tu sesi\u00f3n m\u00e1s dura`}
                    </p>
                  </div>
                  {/* Mobile: orange rect badge */}
                  <div className="lg:hidden w-8 h-6 rounded-[7px] bg-[#ea5809] text-white flex items-center justify-center text-sm font-bold shrink-0 ml-3">
                    {hardestRpe || '\u2014'}
                  </div>
                  {/* Desktop: navy circle */}
                  <div className="hidden lg:flex w-11 h-11 rounded-full bg-[#1e3a5f] text-white items-center justify-center text-xl font-bold shrink-0 ml-3">
                    {hardestRpe || '\u2014'}
                  </div>
                </div>
                <div className="relative h-[5px] rounded-full bg-[#e5ecf2]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full pointer-events-none transition-all duration-100"
                    style={{ width: hardestRpe > 0 ? `${rpePct}%` : '0%', backgroundColor: '#ea5809' }}
                  />
                  <input
                    type="range" min={1} max={10} value={hardestRpe || 1}
                    onChange={e => setHardestRpe(Number(e.target.value))}
                    className="absolute w-full cursor-pointer opacity-0"
                    style={{ top: '50%', transform: 'translateY(-50%)', height: '22px', margin: 0, padding: 0 }}
                  />
                  {hardestRpe > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-white border-2 border-[#ea5809] shadow-sm pointer-events-none transition-all duration-100"
                      style={{ left: `clamp(0px, calc(${rpePct}% - 5px), calc(100% - 11px))` }}
                    />
                  )}
                </div>
              </div>

              {/* Adherencia al plan */}
              {weekSessions.length > 0 && (
                <div>
                  <div className="h-px bg-[#e5ecf2] mb-3" />
                  <p className="text-xs font-semibold text-[#99a6b2] mb-1">Adherencia al plan</p>
                  <p className="text-[10px] text-[#6f859a] mb-2.5">
                    {weekAdherence.completed} de {weekAdherence.total} sesiones completadas esta semana
                  </p>
                  <div className="flex items-center gap-1.5">
                    {ADHERENCE_DAYS.map(({ label, dow }) => {
                      const session = weekSessions.find(s => s.dayOfWeek === dow)
                      const isRest = session?.type === 'DESCANSO'
                      const hasSession = !!session && !isRest
                      const done = session?.completed
                      return (
                        <div
                          key={label}
                          className={`flex flex-col items-center justify-center w-[38px] h-10 rounded-lg text-center ${
                            !hasSession ? 'bg-[#e5ecf2] text-[#6f859a]'
                            : done ? 'bg-[#22c35d] text-white'
                            : 'bg-[rgba(234,88,9,0.18)] text-[#ea5809]'
                          }`}
                        >
                          <span className="text-[10px] font-semibold leading-none">{label}</span>
                          <span className="text-xs font-bold leading-none mt-0.5">{!hasSession ? '\u2014' : done ? '\u2713' : '\u2717'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Info note — desktop only */}
              <div className="hidden lg:flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2.5">
                <span className="text-blue-500 shrink-0 text-sm">i</span>
                <p className="text-xs text-blue-700 leading-relaxed">
                  {`Estos datos vienen de tus logs de sesi\u00f3n.`}
                </p>
              </div>
            </div>
          </section>

          {/* COMPLETA TU separator — mobile only */}
          <div className="bg-[#f5f7fa] px-4 py-2 lg:hidden">
            <p className="text-[10px] font-semibold text-[#6f859a] uppercase tracking-[0.3px]">{`COMPLETA T\u00da`}</p>
          </div>

          {/* RIGHT: COMPLETA TU */}
          <section className="lg:bg-white lg:rounded-2xl lg:shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] lg:overflow-hidden">
            <div className="hidden lg:block px-5 py-4 border-b border-gray-100">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{`Completa t\u00fa`}</h2>
            </div>
            <div className="px-4 lg:px-5 py-4 lg:py-5 space-y-0 lg:space-y-5">
              {/* Horas de sueno */}
              <div className="space-y-1.5 pb-4 lg:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#262626]">{`Horas de sue\u00f1o`}</span>
                  <span className="text-xs font-semibold text-[#333] bg-[#f5f7fa] rounded-[10px] px-3 py-1 lg:bg-transparent lg:px-0 lg:py-0 lg:text-sm lg:text-[#1e3a5f]">
                    {sleepHours > 0 ? `${sleepHours} hrs` : '\u2014'}
                  </span>
                </div>
                <div className="relative h-[5px] rounded-full bg-[#e5ecf2]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full pointer-events-none transition-all duration-100"
                    style={{ width: sleepHours > 0 ? `${sleepPct}%` : '0%', backgroundColor: 'rgba(30,58,95,0.45)' }}
                  />
                  <input
                    type="range" min={3} max={12} step={0.5} value={sleepHours || 7}
                    onChange={e => setSleepHours(Number(e.target.value))}
                    className="absolute w-full cursor-pointer opacity-0"
                    style={{ top: '50%', transform: 'translateY(-50%)', height: '22px', margin: 0, padding: 0 }}
                  />
                  {sleepHours > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-white border-2 shadow-sm pointer-events-none transition-all duration-100"
                      style={{ left: `clamp(0px, calc(${sleepPct}% - 5px), calc(100% - 11px))`, borderColor: 'rgba(30,58,95,0.45)' }}
                    />
                  )}
                </div>
              </div>
              <div className="h-px bg-[#e5ecf2] lg:hidden" />

              {/* Stress */}
              <div className="pt-4 lg:pt-0">
                <MetricSlider label={`Nivel de estr\u00e9s`} value={stressLevel} onChange={setStressLevel} color="rgba(30,58,95,0.4)" prevValue={prevMetrics.stressLevel} />
              </div>
              <div className="h-px bg-[#e5ecf2] lg:hidden" />

              {/* Motivation */}
              <div className="pt-4 lg:pt-0">
                <MetricSlider label={`Nivel de motivaci\u00f3n`} value={motivationLevel} onChange={setMotivationLevel} color="#ea580c" prevValue={prevMetrics.motivationLevel} />
              </div>
              <div className="h-px bg-[#e5ecf2] lg:hidden" />

              {/* Energy + helper text */}
              <div className="pt-4 lg:pt-0">
                <MetricSlider label={`Energ\u00eda general`} value={energyLevel} onChange={setEnergyLevel} color="#1e3a5f" prevValue={prevMetrics.energyLevel} helperText={`\u00bfC\u00f3mo fue tu energ\u00eda esta semana? (1\u201310)`} />
              </div>
              <div className="h-px bg-[#e5ecf2] lg:hidden" />

              {/* FC reposo + helper */}
              <div className="pt-4 lg:pt-0">
                <MetricInput label="FC reposo (bpm)" value={hrResting} onChange={setHrResting} unit="bpm" placeholder="ej. 60" prevValue={prevMetrics.hrResting} invertDelta helperText={`Frecuencia card\u00edaca al despertar`} />
              </div>
              <div className="h-px bg-[#e5ecf2] lg:hidden" />

              {/* Peso */}
              <div className="pt-4 lg:pt-0">
                <MetricInput label="Peso actual" value={weightKg} onChange={setWeightKg} unit="kg" step="0.1" inputMode="decimal" placeholder="ej. 72.5" prevValue={prevMetrics.weightKg} />
              </div>
              <div className="h-px bg-[#e5ecf2] lg:hidden" />

              {/* Nutrition adherence */}
              {hasNutrition && (
                <>
                  <div className="pt-4 lg:pt-0">
                    <MetricSlider label={`Adherencia nutricional`} value={nutritionAdherence} onChange={setNutritionAdherence} color="#ea580c" prevValue={prevMetrics.prevNutritionAdherence} />
                  </div>
                  <div className="h-px bg-[#e5ecf2] lg:hidden" />
                </>
              )}

              {/* Pain — 3 buttons */}
              <div className="space-y-2 pt-4 lg:pt-0">
                <span className="text-sm font-semibold text-[#1e3a5f]">{`\u00bfAlguna molestia?`}</span>
                <div className="grid grid-cols-3 gap-2">
                  {PAIN_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPainLevel(painLevel === opt.value ? 0 : opt.value)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        painLevel === opt.value
                          ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                          : 'bg-white border-[#1e3a5f] text-[#1e3a5f]'
                      }`}
                    >
                      {opt.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-[#e5ecf2] lg:hidden" />

              {/* Notes */}
              <div className="pt-4 lg:pt-0">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={`\u00bfAlgo que tu coach deba saber? (opcional)`}
                  rows={2}
                  className="w-full text-xs bg-[#f5f7fa] rounded-[10px] px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 text-[#4d4d4d] placeholder:text-[#6f859a]"
                />
              </div>

              {/* Errors + CTA — desktop only */}
              <div className="hidden lg:block space-y-3 pt-2">
                {formError && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{formError}</p>}
                {saveError && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{saveError}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full bg-[#ea580c] hover:opacity-90 active:opacity-80 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-opacity shadow-md"
                >
                  {saving ? 'Guardando...' : `Enviar revisi\u00f3n semanal \u2192`}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors"
                >
                  Saltar por ahora
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* CTA — mobile only, outside the card */}
        <div className="lg:hidden mt-4 space-y-3">
          {formError && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{formError}</p>}
          {saveError && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{saveError}</p>}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-[#ea580c] hover:opacity-90 active:opacity-80 disabled:opacity-50 text-white font-bold py-[14px] rounded-xl text-sm transition-opacity"
          >
            {saving ? 'Guardando...' : `Enviar revisi\u00f3n semanal \u2192`}
          </button>
          <p className="text-center text-xs text-[rgba(111,133,154,0.8)]">
            <button type="button" onClick={() => router.push('/dashboard')} className="hover:underline">
              Saltar por ahora
            </button>
          </p>
        </div>
      </div>

      {/* Alert modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-yellow-50 border-b border-yellow-200 px-5 py-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-yellow-800">Atenciones detectadas</p>
                <p className="text-xs text-yellow-700 mt-0.5">Revisa estos puntos antes de guardar</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-yellow-50 rounded-xl px-3 py-2.5">
                  <span className="text-base shrink-0">!</span>
                  <p className="text-sm text-yellow-900">{alert}</p>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <button onClick={() => setShowAlertModal(false)} className="py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Revisar datos
              </button>
              <button onClick={() => doSave(buildBody())} disabled={saving} className="py-3 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors">
                {saving ? 'Guardando...' : 'Entendido, guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
