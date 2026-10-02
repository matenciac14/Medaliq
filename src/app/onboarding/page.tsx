'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { WizardData, OnboardingGoal } from './_types'
import { isStepValid } from './_types'

const GOAL_OPTIONS: { value: OnboardingGoal; emoji: string; label: string; desc: string }[] = [
  { value: 'LOSE_FAT', emoji: '🔥', label: 'Perder grasa', desc: 'Déficit calórico para bajar de peso' },
  { value: 'GAIN_MUSCLE', emoji: '💪', label: 'Ganar músculo', desc: 'Superávit calórico' },
  { value: 'STAY_HEALTHY', emoji: '⚡', label: 'Mantenerme saludable', desc: 'Comer bien' },
]

const GENDER_OPTIONS = [
  { value: 'male' as const, label: 'Masculino' },
  { value: 'female' as const, label: 'Femenino' },
  { value: 'other' as const, label: 'Otro' },
]

const DAYS_OPTIONS = [2, 3, 4, 5, 6, 7]

/* ── Shared input classes ──────────────────────────────────────────────── */
const INPUT_CLS = 'w-full border border-[#d9d9de] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea580c]/40 focus:border-[#ea580c]'
const LABEL_CLS = 'text-[13px] font-semibold text-[#1a2744] block mb-1.5'

export default function OnboardingPage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<WizardData>({
    dateOfBirth: null,
    heightCm: null,
    weightKg: null,
    gender: null,
    goal: null,
    weightGoalKg: null,
    daysPerWeek: 4,
  })

  const update = (partial: Partial<WizardData>) => setData(prev => ({ ...prev, ...partial }))
  const valid = isStepValid('profile', data)

  async function handleSubmit() {
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/athlete/onboarding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Error al configurar tu cuenta.')
        setSubmitting(false)
        return
      }
      const result = await res.json()
      window.location.href = result.isB2B ? '/pending' : '/dashboard'
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  /* ── Loading state ───────────────────────────────────────────────────── */
  if (submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f7f9] px-4">
        <div className="w-10 h-10 rounded-full bg-[#1e3a5f] mb-4 animate-pulse" />
        <p className="text-lg font-semibold text-[#1e3a5f]">Calculando tus metas nutricionales...</p>
        <p className="text-sm text-[#6b7380] mt-1">Esto toma unos segundos</p>
      </div>
    )
  }

  /* ── Form sections (shared between mobile & desktop) ─────────────────── */
  const physicalDataSection = (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">✏️</span>
        <h3 className="text-sm font-bold text-[#1a2744]">Datos físicos</h3>
      </div>

      {/* Date of Birth */}
      <div>
        <label className={LABEL_CLS}>Fecha de nacimiento</label>
        <input
          type="date"
          value={data.dateOfBirth ?? ''}
          onChange={e => update({ dateOfBirth: e.target.value || null })}
          max={new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          min={new Date(Date.now() - 80 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          className={INPUT_CLS}
        />
      </div>

      {/* Height + Weight */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>Altura (cm)</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="175"
            value={data.heightCm ?? ''}
            onChange={e => update({ heightCm: e.target.value ? Number(e.target.value) : null })}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Peso (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="75"
            value={data.weightKg ?? ''}
            onChange={e => update({ weightKg: e.target.value ? Number(e.target.value) : null })}
            className={INPUT_CLS}
          />
        </div>
      </div>

      {/* Weight goal — conditional */}
      {data.goal === 'LOSE_FAT' && (
        <div>
          <label className={LABEL_CLS}>Peso objetivo (opc.)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="299"
            placeholder="65"
            value={data.weightGoalKg ?? ''}
            onChange={e => update({ weightGoalKg: e.target.value ? Number(e.target.value) : null })}
            className={INPUT_CLS}
          />
        </div>
      )}

      {/* Gender */}
      <div>
        <label className={LABEL_CLS}>Sexo</label>
        <div className="grid grid-cols-3 gap-2">
          {GENDER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ gender: opt.value })}
              className={`py-2.5 rounded-xl border-[1.5px] text-[13px] font-semibold transition-colors ${
                data.gender === opt.value
                  ? 'border-[#ea580c] bg-[#ea580c]/5 text-[#ea580c]'
                  : 'border-[#d9d9de] text-[#6b7380] hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const goalSection = (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🎯</span>
        <h3 className="text-sm font-bold text-[#1a2744]">Tu objetivo</h3>
      </div>

      {/* Goal cards */}
      <div className="space-y-2">
        {GOAL_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update({
              goal: opt.value,
              weightGoalKg: opt.value !== 'LOSE_FAT' ? null : data.weightGoalKg,
            })}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-[1.5px] text-left transition-colors ${
              data.goal === opt.value
                ? 'border-[#ea580c] bg-[#ea580c] text-white'
                : 'border-[#d9d9de] hover:border-gray-400'
            }`}
          >
            <span className="text-xl">{opt.emoji}</span>
            <div>
              <p className={`text-sm font-semibold ${data.goal === opt.value ? 'text-white' : 'text-[#1a2744]'}`}>{opt.label}</p>
              <p className={`text-xs ${data.goal === opt.value ? 'text-white/80' : 'text-[#8c8c94]'}`}>{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Days per week */}
      <div>
        <label className={LABEL_CLS}>Días por semana</label>
        <div className="flex gap-2">
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => update({ daysPerWeek: d })}
              className={`flex-1 py-2.5 rounded-xl border-[1.5px] text-sm font-bold transition-colors ${
                data.daysPerWeek === d
                  ? 'border-[#1a2744] bg-[#1a2744] text-white'
                  : 'border-[#d9d9de] text-[#6b7380] hover:border-gray-400'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f7f7f9] flex flex-col">
      {/* ── Navy header bar ─────────────────────────────────────────────── */}
      <header className="bg-[#1a2744] px-4 sm:px-8 py-3 flex items-center justify-between shrink-0">
        <span className="text-white text-lg font-bold tracking-tight">Medaliq</span>
        <span className="bg-white/15 text-white text-[13px] font-medium px-3 py-1 rounded-full hidden sm:inline">
          Paso único — Tu perfil
        </span>
        <span className="bg-white/15 text-white text-[13px] font-medium px-3 py-1 rounded-full sm:hidden">
          Paso único
        </span>
        <a href="/api/auth/signout" className="text-white/70 text-sm hover:text-white transition-colors hidden sm:inline">
          Salir
        </a>
      </header>

      {/* ── Orange progress bar (full) ──────────────────────────────────── */}
      <div className="h-1 bg-[#ea580c] shrink-0" />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-8 py-6 sm:py-10 overflow-y-auto">
        {/* Title */}
        <div className="w-full max-w-3xl mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#1a2744]">Cuéntanos sobre ti</h1>
          <p className="text-sm text-[#8c8c94] mt-1">Con esto calculamos tus calorías, macros y personalizamos tu experiencia.</p>
        </div>

        {/* ── Desktop: 2-column layout ─────────────────────────────────── */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-6 w-full max-w-3xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {physicalDataSection}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {goalSection}
          </div>
        </div>

        {/* ── Mobile: single column ────────────────────────────────────── */}
        <div className="sm:hidden w-full space-y-4">
          {/* Mobile: Title sub-header */}
          <div>
            <h2 className="text-xl font-bold text-[#1a2744]">Tu perfil</h2>
            <p className="text-sm text-[#8c8c94] mt-0.5">Con esto calculamos tus calorías y macros.</p>
          </div>

          {/* Form fields — flat on mobile (no card wrapper) */}
          <div className="space-y-5">
            {/* Date of Birth */}
            <div>
              <label className={LABEL_CLS}>Fecha de nacimiento</label>
              <input
                type="date"
                value={data.dateOfBirth ?? ''}
                onChange={e => update({ dateOfBirth: e.target.value || null })}
                max={new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                min={new Date(Date.now() - 80 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className={INPUT_CLS}
              />
            </div>

            {/* Gender */}
            <div>
              <label className={LABEL_CLS}>Género</label>
              <div className="grid grid-cols-3 gap-2">
                {GENDER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ gender: opt.value })}
                    className={`py-2.5 rounded-xl border-[1.5px] text-[13px] font-semibold transition-colors ${
                      data.gender === opt.value
                        ? 'border-[#1a2744] bg-[#1a2744]/5 text-[#1a2744]'
                        : 'border-[#d9d9de] text-[#6b7380] hover:border-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Height + Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Altura (cm)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="175"
                  value={data.heightCm ?? ''}
                  onChange={e => update({ heightCm: e.target.value ? Number(e.target.value) : null })}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Peso (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="75"
                  value={data.weightKg ?? ''}
                  onChange={e => update({ weightKg: e.target.value ? Number(e.target.value) : null })}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Goal cards */}
            <div>
              <label className={LABEL_CLS}>¿Cuál es tu objetivo?</label>
              <div className="space-y-2 mt-1">
                {GOAL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({
                      goal: opt.value,
                      weightGoalKg: opt.value !== 'LOSE_FAT' ? null : data.weightGoalKg,
                    })}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-[1.5px] text-left transition-colors ${
                      data.goal === opt.value
                        ? 'border-[#ea580c] bg-[#ea580c] text-white'
                        : 'border-[#d9d9de] hover:border-gray-400'
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <div>
                      <p className={`text-sm font-semibold ${data.goal === opt.value ? 'text-white' : 'text-[#1a2744]'}`}>{opt.label}</p>
                      <p className={`text-xs ${data.goal === opt.value ? 'text-white/80' : 'text-[#8c8c94]'}`}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Days per week */}
            <div>
              <label className={LABEL_CLS}>Días por semana</label>
              <div className="flex gap-2">
                {DAYS_OPTIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update({ daysPerWeek: d })}
                    className={`flex-1 py-2.5 rounded-xl border-[1.5px] text-sm font-bold transition-colors ${
                      data.daysPerWeek === d
                        ? 'border-[#1a2744] bg-[#1a2744] text-white'
                        : 'border-[#d9d9de] text-[#6b7380] hover:border-gray-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full max-w-3xl mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── CTA button ───────────────────────────────────────────────── */}
        <div className="w-full max-w-3xl sm:max-w-md mt-8">
          <button
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: '#ea580c' }}
          >
            <span className="hidden sm:inline">Guardar y entrar →</span>
            <span className="sm:hidden">Empezar →</span>
          </button>
        </div>
      </div>
    </div>
  )
}
