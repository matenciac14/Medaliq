'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { mockWeeks } from '@/lib/mock/dashboard-data'

// ─── Mock data ────────────────────────────────────────────────────────────────

const weightCheckins = [
  { week: 1,  kg: 78.0 },
  { week: 2,  kg: 77.6 },
  { week: 3,  kg: 77.2 },
  { week: 4,  kg: 76.9 },
  { week: 5,  kg: 76.5 },
  { week: 6,  kg: 76.1 },
  { week: 7,  kg: 75.8 },
  { week: 8,  kg: 75.4 },
  { week: 9,  kg: 75.1 },
  { week: 10, kg: 74.8 },
  { week: 11, kg: 74.5 },
  { week: 12, kg: 74.1 },
]

const hrCheckins = [
  { week: 1,  bpm: 58 },
  { week: 2,  bpm: 57 },
  { week: 3,  bpm: 58 },
  { week: 4,  bpm: 56 },
  { week: 5,  bpm: 56 },
  { week: 6,  bpm: 55 },
  { week: 7,  bpm: 55 },
  { week: 8,  bpm: 54 },
  { week: 9,  bpm: 54 },
  { week: 10, bpm: 53 },
  { week: 11, bpm: 53 },
  { week: 12, bpm: 52 },
]

const WEIGHT_GOAL = 74.0

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHASE_BAR_COLOR: Record<string, string> = {
  BASE: '#1e3a5f',
  DESARROLLO: '#f97316',
  'ESPECÍFICO': '#dc2626',
  AFINAMIENTO: '#7c3aed',
}

const PHASE_BADGE: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-800',
  DESARROLLO: 'bg-orange-100 text-orange-800',
  'ESPECÍFICO': 'bg-red-100 text-red-800',
  AFINAMIENTO: 'bg-purple-100 text-purple-800',
}

// Adherencia simulada determinística por semana
const ADHERENCE_VALUES = [85, 72, 60, 90, 78, 55, 88, 45, 92, 75, 68, 80, 88, 62, 77, 85, 90, 50]
function weekAdherence(weekNumber: number): number {
  return ADHERENCE_VALUES[(weekNumber - 1) % ADHERENCE_VALUES.length]
}

function adherenceBarColor(pct: number): string {
  if (pct >= 70) return '#16a34a'
  if (pct >= 40) return '#d97706'
  return '#dc2626'
}

function estimate5k(hrResting: number): string {
  const total = 27 + (hrResting - 52) * 0.3
  const mins = Math.floor(total)
  const secs = Math.round((total - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function estimatePaceZ2(hrResting: number): string {
  const totalSecs = 330 + (hrResting - 52) * 4
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')} min/km`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function TrendBadge({
  start,
  end,
  lowerIsBetter = false,
  unit = '',
}: {
  start: number
  end: number
  lowerIsBetter?: boolean
  unit?: string
}) {
  const delta = Math.abs(end - start).toFixed(1)
  const improved = lowerIsBetter ? end < start : end > start
  const worsened = lowerIsBetter ? end > start : end < start

  if (improved)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16a34a]">
        <TrendingDown size={13} /> -{delta}{unit}
      </span>
    )
  if (worsened)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#dc2626]">
        <TrendingUp size={13} /> +{delta}{unit}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400">
      <Minus size={13} /> sin cambio
    </span>
  )
}

// Barras verticales CSS-only con línea de objetivo opcional
function VerticalBarChart<T extends { week: number }>({
  data,
  getValue,
  color,
  unit,
  goalLine,
  minVal,
  maxVal,
}: {
  data: T[]
  getValue: (d: T) => number
  color: string
  unit: string
  goalLine?: number
  minVal: number
  maxVal: number
}) {
  const CHART_H = 120
  const range = maxVal - minVal || 1

  return (
    <div className="relative">
      {/* Línea de objetivo */}
      {goalLine !== undefined && (
        <div
          className="absolute left-0 right-8 flex items-center gap-1 z-10 pointer-events-none"
          style={{ bottom: `${Math.round(((goalLine - minVal) / range) * CHART_H) + 24}px` }}
        >
          <div className="flex-1 border-t-2 border-dashed border-[#16a34a]/70" />
          <span className="text-[9px] font-semibold text-[#16a34a] whitespace-nowrap">
            Meta {goalLine}{unit}
          </span>
        </div>
      )}

      {/* Barras */}
      <div className="flex items-end gap-1 overflow-x-auto" style={{ height: `${CHART_H}px` }}>
        {data.map((d) => {
          const val = getValue(d)
          const barH = Math.max(4, Math.round(((val - minVal) / range) * CHART_H))
          return (
            <div
              key={d.week}
              title={`Sem ${d.week}: ${val}${unit}`}
              className="flex flex-col items-center flex-1 min-w-[22px] group cursor-default"
              style={{ height: `${CHART_H}px`, justifyContent: 'flex-end' }}
            >
              <span className="text-[9px] font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">
                {val}{unit}
              </span>
              <div
                className="w-full rounded-t-sm"
                style={{ height: `${barH}px`, backgroundColor: color, opacity: 0.88 }}
              />
            </div>
          )
        })}
      </div>

      {/* Eje X */}
      <div className="flex gap-1 mt-1 overflow-x-auto">
        {data.map((d) => (
          <div key={d.week} className="flex-1 min-w-[22px] text-center">
            <span className="text-[9px] text-gray-400">S{d.week}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Barras horizontales para km por semana
function HorizontalKmChart({ data }: { data: typeof mockWeeks }) {
  const maxKm = Math.max(...data.map((w) => w.volumeKm))
  return (
    <div className="space-y-2">
      {data.map((w) => {
        const widthPct = Math.round((w.volumeKm / maxKm) * 100)
        const color = PHASE_BAR_COLOR[w.phase] ?? '#1e3a5f'
        return (
          <div key={w.weekNumber} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-5 shrink-0">S{w.weekNumber}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              />
              <span className="absolute right-1.5 top-0 bottom-0 flex items-center text-[10px] font-semibold text-gray-600">
                {w.volumeKm} km
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Barras verticales de adherencia por semana
function AdherenceVerticalChart({ data }: { data: typeof mockWeeks }) {
  const CHART_H = 80
  return (
    <div>
      <div className="flex items-end gap-1 overflow-x-auto" style={{ height: `${CHART_H}px` }}>
        {data.map((w) => {
          const pct = weekAdherence(w.weekNumber)
          const barH = Math.max(4, Math.round((pct / 100) * CHART_H))
          const color = adherenceBarColor(pct)
          return (
            <div
              key={w.weekNumber}
              title={`Sem ${w.weekNumber}: ${pct}%`}
              className="flex flex-col items-center flex-1 min-w-[20px] group cursor-default"
              style={{ height: `${CHART_H}px`, justifyContent: 'flex-end' }}
            >
              <span className="text-[9px] font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">
                {pct}%
              </span>
              <div
                className="w-full rounded-t-sm"
                style={{ height: `${barH}px`, backgroundColor: color, opacity: 0.88 }}
              />
            </div>
          )
        })}
      </div>

      {/* Eje X */}
      <div className="flex gap-1 mt-1 overflow-x-auto">
        {data.map((w) => (
          <div key={w.weekNumber} className="flex-1 min-w-[20px] text-center">
            <span className="text-[9px] text-gray-400">S{w.weekNumber}</span>
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
        {([
          { color: '#16a34a', label: '≥70% Buena' },
          { color: '#d97706', label: '40-69% Regular' },
          { color: '#dc2626', label: '<40% Baja' },
        ] as const).map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '4 sem',  weeks: 4 },
  { label: '8 sem',  weeks: 8 },
  { label: '12 sem', weeks: 12 },
] as const

type Period = 4 | 8 | 12

export default function ProgressPage() {
  const [period, setPeriod] = useState<Period>(12)

  const weightData  = weightCheckins.slice(-period)
  const hrData      = hrCheckins.slice(-period)
  const weekData    = mockWeeks.slice(0, period)

  const weightStart = weightData[0].kg
  const weightEnd   = weightData[weightData.length - 1].kg
  const hrStart     = hrData[0].bpm
  const hrEnd       = hrData[hrData.length - 1].bpm

  const weightMin   = Math.min(...weightData.map((d) => d.kg)) - 0.5
  const weightMax   = Math.max(...weightData.map((d) => d.kg)) + 0.5
  const hrMin       = Math.min(...hrData.map((d) => d.bpm)) - 1
  const hrMax       = Math.max(...hrData.map((d) => d.bpm)) + 1

  const avgAdherence = Math.round(
    weekData.reduce((s, w) => s + weekAdherence(w.weekNumber), 0) / weekData.length
  )

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto space-y-6">

      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <span>←</span> Volver al inicio
      </Link>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mi Progreso</h1>

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map(({ label, weeks }) => (
            <button
              key={weeks}
              onClick={() => setPeriod(weeks)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                period === weeks
                  ? 'bg-[#1e3a5f] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Peso ── */}
      <SectionCard title="Peso (kg)">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-5">
            <div>
              <p className="text-2xl font-bold text-gray-900">{weightEnd} kg</p>
              <p className="text-xs text-gray-500">Actual</p>
            </div>
            <TrendBadge start={weightStart} end={weightEnd} lowerIsBetter unit=" kg" />
            <div>
              <p className="text-sm font-semibold text-[#16a34a]">{WEIGHT_GOAL} kg</p>
              <p className="text-xs text-gray-500">Objetivo</p>
            </div>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {weightEnd > WEIGHT_GOAL
              ? `Faltan ${(weightEnd - WEIGHT_GOAL).toFixed(1)} kg`
              : 'Objetivo alcanzado'}
          </span>
        </div>

        <VerticalBarChart
          data={weightData}
          getValue={(d) => d.kg}
          color="#1e3a5f"
          unit=" kg"
          goalLine={WEIGHT_GOAL}
          minVal={weightMin}
          maxVal={weightMax}
        />
      </SectionCard>

      {/* ── FC Reposo ── */}
      <SectionCard title="FC Reposo (bpm)">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-5">
            <div>
              <p className="text-2xl font-bold text-gray-900">{hrEnd} bpm</p>
              <p className="text-xs text-gray-500">Actual</p>
            </div>
            <TrendBadge start={hrStart} end={hrEnd} lowerIsBetter unit=" bpm" />
            <div>
              <p className="text-sm font-semibold text-gray-600">{hrStart} bpm</p>
              <p className="text-xs text-gray-500">Inicio</p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              hrEnd <= 54
                ? 'bg-green-100 text-[#16a34a]'
                : hrEnd <= 58
                ? 'bg-yellow-100 text-[#d97706]'
                : 'bg-red-100 text-[#dc2626]'
            }`}
          >
            {hrEnd <= 54 ? 'Excelente' : hrEnd <= 58 ? 'Buena' : 'Normal'}
          </span>
        </div>

        <VerticalBarChart
          data={hrData}
          getValue={(d) => d.bpm}
          color="#dc2626"
          unit=" bpm"
          minVal={hrMin}
          maxVal={hrMax}
        />
      </SectionCard>

      {/* ── Km semanales ── */}
      <SectionCard title="Km Semanales por Fase">
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(PHASE_BAR_COLOR).map(([phase, color]) => (
            <div key={phase} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PHASE_BADGE[phase] ?? ''}`}>
                {phase}
              </span>
            </div>
          ))}
        </div>
        <HorizontalKmChart data={weekData} />
      </SectionCard>

      {/* ── Adherencia ── */}
      <SectionCard title={`Adherencia al Plan — Promedio ${avgAdherence}%`}>
        <AdherenceVerticalChart data={weekData} />
      </SectionCard>

      {/* ── Benchmarks ── */}
      <SectionCard title="Benchmarks de Rendimiento">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Métrica', 'Inicio', 'Actual', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 pr-4 last:pr-0 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900">Tiempo 5k estimado</td>
                <td className="py-3 pr-4 text-gray-500">{estimate5k(hrStart)}</td>
                <td className="py-3 pr-4 font-semibold text-gray-900">{estimate5k(hrEnd)}</td>
                <td className="py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-[#16a34a]">
                    Mejorando
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900">Pace Z2</td>
                <td className="py-3 pr-4 text-gray-500">{estimatePaceZ2(hrStart)}</td>
                <td className="py-3 pr-4 font-semibold text-gray-900">{estimatePaceZ2(hrEnd)}</td>
                <td className="py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-[#16a34a]">
                    Mejorando
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900">Peso actual vs objetivo</td>
                <td className="py-3 pr-4 text-gray-500">{weightStart} kg</td>
                <td className="py-3 pr-4 font-semibold text-gray-900">{weightEnd} kg</td>
                <td className="py-3">
                  {weightEnd <= WEIGHT_GOAL ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-[#16a34a]">
                      Logrado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-[#f97316]">
                      Pendiente
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900">FC Reposo</td>
                <td className="py-3 pr-4 text-gray-500">{hrStart} bpm</td>
                <td className="py-3 pr-4 font-semibold text-gray-900">{hrEnd} bpm</td>
                <td className="py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-[#16a34a]">
                    Mejorando
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

    </div>
  )
}
