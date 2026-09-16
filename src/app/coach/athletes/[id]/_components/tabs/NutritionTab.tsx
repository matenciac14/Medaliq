'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { NutritionPlanData, ActivePlanData } from '../AthleteDetailClient'
import { FoodLogsSection, type FoodLogEntry } from '../FoodLogsSection'
import NutritionAdherenceCard, { type DayAdherence } from '../NutritionAdherenceCard'
import { KCAL_ADJUSTMENT_OPTIONS } from '@/domain/plan/formulas'

type FoodProfileData = {
  availableFoods: string[]
  availableFoodIds: string[]
  restrictions: string[]
  mealsPerDay: number
  weighsFood: boolean
  notes: string | null
} | null

interface NutricionTabProps {
  athleteId: string
  nutritionPlan: NutritionPlanData
  activePlan: ActivePlanData
  foodProfile: FoodProfileData | null
  foodLogs: FoodLogEntry[]
  nutritionExtLoaded: boolean
  adherenceData: DayAdherence[]
  selfReportedAdherencePct: number | null
}

export default function NutricionTab({
  athleteId,
  nutritionPlan,
  activePlan,
  foodProfile,
  foodLogs,
  nutritionExtLoaded,
  adherenceData,
  selfReportedAdherencePct,
}: NutricionTabProps) {
  // ─── Compute KPI metrics from last 7 days ───────────────────────────────────
  const last7Adherence = [...adherenceData].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).reverse()
  const validAdherenceDays = last7Adherence.filter(d => d.adherencePct != null)
  const avgAdherencePct = validAdherenceDays.length > 0
    ? Math.round(validAdherenceDays.reduce((s, d) => s + (d.adherencePct ?? 0), 0) / validAdherenceDays.length)
    : null

  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const last7FoodLogs = foodLogs.filter(fl => new Date(fl.date) >= sevenDaysAgo)
  const last7Days = new Set(last7FoodLogs.map(fl => fl.date))
  const dailyProtein = [...last7Days].map(date => {
    const dayLogs = last7FoodLogs.filter(fl => fl.date === date)
    return dayLogs.reduce((s, fl) => s + (fl.proteinLogged ?? 0), 0)
  })
  const avgProtein = dailyProtein.length > 0
    ? Math.round(dailyProtein.reduce((s, p) => s + p, 0) / dailyProtein.length)
    : null

  const dailyKcal = [...last7Days].map(date => {
    const dayLogs = last7FoodLogs.filter(fl => fl.date === date)
    return dayLogs.reduce((s, fl) => s + (fl.kcalLogged ?? 0), 0)
  })
  const avgKcal = dailyKcal.length > 0
    ? Math.round(dailyKcal.reduce((s, k) => s + k, 0) / dailyKcal.length)
    : null

  const totalProtein = last7FoodLogs.reduce((s, fl) => s + (fl.proteinLogged ?? 0), 0)
  const totalCarbs   = last7FoodLogs.reduce((s, fl) => s + (fl.carbsLogged   ?? 0), 0)
  const totalFat     = last7FoodLogs.reduce((s, fl) => s + (fl.fatLogged     ?? 0), 0)
  const totalMacroG  = totalProtein + totalCarbs + totalFat
  const macroPcts    = totalMacroG > 0
    ? { p: Math.round((totalProtein / totalMacroG) * 100), c: Math.round((totalCarbs / totalMacroG) * 100), f: Math.round((totalFat / totalMacroG) * 100) }
    : null

  const adherenceColor = avgAdherencePct == null ? '#9ca3af' : avgAdherencePct >= 80 ? '#16a34a' : avgAdherencePct >= 60 ? '#ea580c' : '#dc2626'

  return (
    <div className="space-y-6">

      {/* ── COACH-NUT-UI-01: KPI band ── */}
      {nutritionExtLoaded && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Adherencia 7d</p>
            <p className="text-2xl font-black" style={{ color: adherenceColor }}>
              {avgAdherencePct != null ? `${avgAdherencePct}%` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">TDEE base</p>
            <p className="text-2xl font-black text-gray-900">
              {nutritionPlan?.tdee ?? '—'}<span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Proteína media</p>
            <p className="text-2xl font-black text-gray-900">
              {avgProtein != null ? avgProtein : '—'}<span className="text-sm font-normal text-gray-400 ml-1">g/día</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Kcal media 7d</p>
            <p className="text-2xl font-black text-gray-900">
              {avgKcal != null ? avgKcal : '—'}<span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
            </p>
          </div>
        </div>
      )}

      {/* ── COACH-NUT-UI-02: 7-day kcal bar chart ── */}
      {nutritionExtLoaded && last7Adherence.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Kcal consumidas vs objetivo (7 días)</h2>
          <div className="flex items-end gap-2 h-28">
            {last7Adherence.map((day) => {
              const maxKcal = Math.max(...last7Adherence.map(d => Math.max(d.kcalLogged, d.targetKcal ?? 0)), 1)
              const loggedH = Math.round((day.kcalLogged / maxKcal) * 96)
              const targetH = Math.round(((day.targetKcal ?? 0) / maxKcal) * 96)
              const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short' })
              const color = day.adherencePct == null ? '#d1d5db' : day.adherencePct >= 80 ? '#22c55e' : day.adherencePct >= 60 ? '#f97316' : '#ef4444'
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-0.5" style={{ height: 96 }}>
                    {targetH > 0 && (
                      <div className="flex-1 rounded-t-sm opacity-20" style={{ height: targetH, backgroundColor: '#1e3a5f' }} />
                    )}
                    <div className="flex-1 rounded-t-sm" style={{ height: loggedH || 2, backgroundColor: color }} />
                  </div>
                  <span className="text-[10px] text-gray-400 capitalize">{dateLabel}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm opacity-20" style={{ backgroundColor: '#1e3a5f' }} />Objetivo</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-500" />Consumido</span>
          </div>
        </div>
      )}

      {/* ── COACH-NUT-UI-03: macro donut ── */}
      {nutritionExtLoaded && macroPcts != null && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Distribución de macros (7 días)</h2>
          <div className="flex items-center gap-6">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              {(() => {
                const segments = [
                  { pct: macroPcts.p, color: '#3b82f6', label: 'Proteína' },
                  { pct: macroPcts.c, color: '#f97316', label: 'Carbos' },
                  { pct: macroPcts.f, color: '#eab308', label: 'Grasas' },
                ]
                let offset = 0
                return segments.map(seg => {
                  const dash = (seg.pct / 100) * 100
                  const el = (
                    <circle key={seg.label} r="15.9" cx="18" cy="18" fill="none" stroke={seg.color}
                      strokeWidth="3.5" strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={-offset} />
                  )
                  offset += dash
                  return el
                })
              })()}
            </svg>
            <div className="space-y-2">
              {[
                { label: 'Proteína', pct: macroPcts.p, color: '#3b82f6', g: Math.round(totalProtein / Math.max(last7Days.size, 1)) },
                { label: 'Carbos',   pct: macroPcts.c, color: '#f97316', g: Math.round(totalCarbs   / Math.max(last7Days.size, 1)) },
                { label: 'Grasas',   pct: macroPcts.f, color: '#eab308', g: Math.round(totalFat     / Math.max(last7Days.size, 1)) },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-sm text-gray-700 w-16">{m.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{m.pct}%</span>
                  <span className="text-xs text-gray-400">~{m.g}g/día</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Estrategia calórica ── */}
      {nutritionPlan && <KcalStrategySelector athleteId={athleteId} currentAdjustment={nutritionPlan.kcalAdjustment} />}

      {/* Banner → Plan Builder */}
      <div className="rounded-xl border border-[#1e3a5f]/15 p-4 flex items-center justify-between gap-4" style={{ backgroundColor: '#1e3a5f08' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>
            La planificación nutricional ahora vive en el Plan Builder
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Targets, templates y comidas se gestionan junto al plan de entrenamiento para mantener todo sincronizado.
          </p>
        </div>
        <Link
          href={`/coach/athletes/${athleteId}/plan/build`}
          className="shrink-0 text-xs font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          Ir al Plan Builder →
        </Link>
      </div>

      {!nutritionPlan ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-400">El atleta aún no tiene targets calóricos generados. Completa el onboarding para calcular TDEE y macros.</p>
        </div>
      ) : (
        <>
          {/* Food Profile */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Perfil alimenticio</h2>
            {!nutritionExtLoaded ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : !foodProfile ? (
              <p className="text-sm text-gray-400">El atleta aún no ha configurado sus preferencias alimenticias.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-32 shrink-0">Comidas/día</span>
                  <span className="font-medium text-gray-900">{foodProfile.mealsPerDay}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-32 shrink-0">Pesa alimentos</span>
                  <span className="font-medium text-gray-900">{foodProfile.weighsFood ? 'Sí' : 'No'}</span>
                </div>
                {foodProfile.availableFoods.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-32 shrink-0">Alimentos</span>
                    <div className="flex flex-wrap gap-1">
                      {foodProfile.availableFoods.map(f => (
                        <span key={f} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-700">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
                {foodProfile.restrictions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-32 shrink-0">Restricciones</span>
                    <div className="flex flex-wrap gap-1">
                      {foodProfile.restrictions.map(r => (
                        <span key={r} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
                {foodProfile.notes && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-32 shrink-0">Notas</span>
                    <span className="text-gray-700">{foodProfile.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Adherencia nutricional */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Adherencia nutricional</h2>
            <NutritionAdherenceCard data={adherenceData} loaded={nutritionExtLoaded} selfReportedPct={selfReportedAdherencePct} />
          </div>

          {/* Logs de alimentos */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Registro alimenticio — últimos 7 días</h2>
            <FoodLogsSection
              foodLogs={foodLogs}
              nutritionPlan={nutritionPlan}
              loaded={nutritionExtLoaded}
              athleteId={athleteId}
            />
          </div>

          {!nutritionExtLoaded && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-400">Cargando plan de comidas...</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KcalStrategySelector({ athleteId, currentAdjustment }: { athleteId: string; currentAdjustment: number }) {
  const [selected, setSelected] = useState(currentAdjustment)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const changed = selected !== currentAdjustment

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/nutrition/targets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kcalAdjustment: selected }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Estrategia calórica</h2>
        {saved && <span className="text-xs text-green-600 font-medium">Guardado</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KCAL_ADJUSTMENT_OPTIONS.map(opt => {
          const isActive = selected === opt.value
          const isDeficit = opt.value < 0
          const isSurplus = opt.value > 0
          return (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`rounded-lg border p-3 text-left transition-all ${
                isActive
                  ? isDeficit ? 'border-blue-500 bg-blue-50' : isSurplus ? 'border-orange-500 bg-orange-50' : 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <p className={`text-sm font-semibold ${isActive ? (isDeficit ? 'text-blue-700' : isSurplus ? 'text-orange-700' : 'text-[#1e3a5f]') : 'text-gray-700'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          )
        })}
      </div>
      {changed && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {saving ? 'Guardando...' : 'Aplicar estrategia'}
        </button>
      )}
    </div>
  )
}
