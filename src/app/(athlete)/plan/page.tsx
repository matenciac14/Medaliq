'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mockPlan, mockWeeks } from '@/lib/mock/dashboard-data'

type Phase = 'TODAS' | 'BASE' | 'DESARROLLO' | 'ESPECÍFICO' | 'AFINAMIENTO'

const PHASES: Phase[] = ['TODAS', 'BASE', 'DESARROLLO', 'ESPECÍFICO', 'AFINAMIENTO']

const PHASE_COLORS: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-700 border-blue-200',
  DESARROLLO: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'ESPECÍFICO': 'bg-orange-100 text-orange-700 border-orange-200',
  AFINAMIENTO: 'bg-green-100 text-green-700 border-green-200',
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

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2',
  FARTLEK: 'Fartlek',
  TIRADA_LARGA: 'Tirada larga',
  CICLA: 'Cicla',
  NATACION: 'Natación',
  FUERZA: 'Fuerza',
  DESCANSO: 'Descanso activo',
}

// Calcula la fecha de inicio de cada semana (plan empieza 2026-05-01)
function getWeekStartDate(weekNumber: number): string {
  const start = new Date('2026-05-01')
  start.setDate(start.getDate() + (weekNumber - 1) * 7)
  return start.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function getWeekEndDate(weekNumber: number): string {
  const end = new Date('2026-05-01')
  end.setDate(end.getDate() + (weekNumber - 1) * 7 + 6)
  return end.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export default function PlanPage() {
  const [activePhase, setActivePhase] = useState<Phase>('TODAS')
  const [expandedWeek, setExpandedWeek] = useState<number | null>(mockPlan.currentWeek)

  const filteredWeeks =
    activePhase === 'TODAS'
      ? mockWeeks
      : mockWeeks.filter((w) => w.phase === activePhase)

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeek(expandedWeek === weekNumber ? null : weekNumber)
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">

      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <span>←</span> Volver al inicio
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{mockPlan.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
          <span>01 may 2026 — 06 sep 2026</span>
          <span className="hidden sm:inline">·</span>
          <span className="font-medium text-[#1e3a5f]">
            Semana {mockPlan.currentWeek} de {mockPlan.totalWeeks}
          </span>
        </div>
        {/* Barra progreso general */}
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden max-w-md">
          <div
            className="h-full bg-[#f97316] rounded-full"
            style={{ width: `${((mockPlan.currentWeek - 1) / mockPlan.totalWeeks) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {mockPlan.currentWeek - 1} semanas completadas
        </p>
      </div>

      {/* Tabs fases */}
      <div className="flex gap-2 flex-wrap mb-6">
        {PHASES.map((phase) => (
          <button
            key={phase}
            onClick={() => setActivePhase(phase)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
              activePhase === phase
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f]/30 hover:text-[#1e3a5f]'
            )}
          >
            {phase.charAt(0) + phase.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Grid de semanas */}
      <div className="space-y-3">
        {filteredWeeks.map((week) => {
          const isCurrentWeek = week.weekNumber === mockPlan.currentWeek
          const isPast = week.weekNumber < mockPlan.currentWeek
          const isExpanded = expandedWeek === week.weekNumber

          return (
            <div
              key={week.weekNumber}
              className={cn(
                'bg-white rounded-2xl border shadow-sm overflow-hidden transition-all',
                isCurrentWeek ? 'border-[#f97316] shadow-orange-100' : 'border-gray-200',
                isPast && !isCurrentWeek ? 'opacity-60' : ''
              )}
            >
              {/* Card header */}
              <button
                onClick={() => toggleWeek(week.weekNumber)}
                className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-gray-50/50 transition-colors"
              >
                {/* Número de semana */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                    isCurrentWeek
                      ? 'bg-[#f97316] text-white'
                      : isPast
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                  )}
                >
                  {week.weekNumber}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {getWeekStartDate(week.weekNumber)} – {getWeekEndDate(week.weekNumber)}
                    </p>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                        PHASE_COLORS[week.phase]
                      )}
                    >
                      {week.phase}
                    </span>
                    {week.isRecoveryWeek && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Descarga
                      </span>
                    )}
                    {week.hasTest && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-[#f97316] border border-orange-200">
                        TEST
                      </span>
                    )}
                    {isCurrentWeek && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f97316] text-white">
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{week.focusDescription}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900">{week.volumeKm} km</p>
                    <p className="text-xs text-gray-400">volumen</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={18} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400" />
                  )}
                </div>
              </button>

              {/* Semana expandida */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <div className="divide-y divide-gray-50">
                    {week.sessions.map((session, idx) => {
                      const isToday = isCurrentWeek && idx === 1 // martes = today (mock)
                      return (
                        <div
                          key={`${week.weekNumber}-${session.day}`}
                          className={cn(
                            'flex items-center gap-3 px-5 py-3',
                            isToday ? 'bg-orange-50/50' : ''
                          )}
                        >
                          <span className="w-7 text-xs font-semibold text-gray-500">{session.day}</span>
                          <span className="text-xl w-7 text-center">{SESSION_ICONS[session.type] ?? '🏅'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', isToday ? 'text-[#1e3a5f]' : 'text-gray-900')}>
                              {session.label}
                            </p>
                            <p className="text-xs text-gray-500">{SESSION_LABELS[session.type] ?? session.type}</p>
                          </div>
                          {isToday && (
                            <span className="text-[10px] font-semibold bg-[#f97316] text-white px-2 py-0.5 rounded-full shrink-0">
                              Hoy
                            </span>
                          )}
                          {session.done ? (
                            <CheckCircle2 size={18} className="text-[#22c55e] shrink-0" />
                          ) : (isCurrentWeek || isPast) && session.type !== 'DESCANSO' ? (
                            <button className="flex items-center gap-1 text-[11px] font-medium text-[#f97316] hover:text-orange-700 transition-colors shrink-0">
                              <Clock size={13} />
                              Registrar
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                  {/* Volumen mobile */}
                  <div className="sm:hidden px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Volumen total: <span className="font-semibold text-gray-900">{week.volumeKm} km</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Leyenda</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sesiones</p>
            <div className="space-y-1.5">
              {Object.entries(SESSION_ICONS).map(([key, icon]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="text-xs text-gray-600">{SESSION_LABELS[key]}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fases</p>
            <div className="space-y-1.5">
              {Object.entries(PHASE_COLORS).map(([phase, cls]) => (
                <span
                  key={phase}
                  className={cn('inline-block text-xs font-semibold px-2 py-0.5 rounded-full border mr-1 mb-1', cls)}
                >
                  {phase}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Indicadores</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Descarga</span>
                <span className="text-xs text-gray-600">Semana de recuperación</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-[#f97316] border border-orange-200">TEST</span>
                <span className="text-xs text-gray-600">Benchmark de rendimiento</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estado</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#22c55e]" />
                <span className="text-xs text-gray-600">Sesión completada</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#f97316]" />
                <span className="text-xs text-gray-600">Pendiente de registrar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
