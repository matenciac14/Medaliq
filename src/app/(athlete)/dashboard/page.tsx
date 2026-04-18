import Link from 'next/link'
import { CheckCircle2, ChevronRight, Clock, Target, Scale, Heart, Moon, Zap } from 'lucide-react'
import {
  mockUser,
  mockPlan,
  mockTodaySession,
  mockWeekSessions,
  mockMetrics,
  mockBenchmarks,
  mockCoach,
} from '@/lib/mock/dashboard-data'

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃',
  FARTLEK: '🏃',
  TIRADA_LARGA: '🏃',
  CICLA: '🚴',
  NATACION: '🏊',
  FUERZA: '💪',
  DESCANSO: '😴',
}

const PHASE_COLORS: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-800',
  DESARROLLO: 'bg-yellow-100 text-yellow-800',
  'ESPECÍFICO': 'bg-orange-100 text-orange-800',
  AFINAMIENTO: 'bg-green-100 text-green-800',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Simula el día actual (martes = índice 1)
const TODAY_INDEX = 1

export default function DashboardPage() {
  const completedSessions = mockWeekSessions.filter((s) => s.done).length
  const firstName = mockUser.name.split(' ')[0]

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{formatDate()}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${PHASE_COLORS[mockPlan.phase]}`}>
          Fase {mockPlan.phase} · Semana {mockPlan.currentWeek}/{mockPlan.totalWeeks}
        </span>
      </div>

      {/* Sesión de hoy */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Sesión de hoy</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#1e3a5f] px-5 py-4 flex items-center gap-3">
            <span className="text-3xl">{SESSION_ICONS[mockTodaySession.type] ?? '🏅'}</span>
            <div className="flex-1">
              <p className="text-white font-semibold text-lg leading-tight">
                {mockTodaySession.durationMin} min · Zona {mockTodaySession.zoneTarget}
              </p>
              <p className="text-white/70 text-sm">Rodaje aeróbico base</p>
            </div>
            {mockTodaySession.completed && (
              <span className="flex items-center gap-1 bg-[#22c55e] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                <CheckCircle2 size={12} /> Completada
              </span>
            )}
          </div>
          <div className="px-5 py-4">
            <p className="text-gray-700 text-sm leading-relaxed">{mockTodaySession.detailText}</p>
            <div className="flex gap-3 mt-4 flex-wrap">
              <Link
                href="/log"
                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 bg-[#f97316] hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                <Clock size={15} />
                Registrar sesión
              </Link>
              <Link
                href="/plan"
                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                Ver plan completo
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Semana actual */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Esta semana</h2>
          <span className="text-xs text-gray-500">{completedSessions}/7 sesiones</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          {/* Barra de progreso */}
          <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-[#22c55e] rounded-full transition-all"
              style={{ width: `${(completedSessions / 7) * 100}%` }}
            />
          </div>
          {/* Días */}
          <div className="grid grid-cols-7 gap-1">
            {mockWeekSessions.map((session, idx) => {
              const isToday = idx === TODAY_INDEX
              return (
                <div
                  key={session.day}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl ${
                    isToday ? 'bg-[#1e3a5f]/5 ring-2 ring-[#1e3a5f]/20' : ''
                  }`}
                >
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-[#1e3a5f]' : 'text-gray-500'}`}>
                    {session.day}
                  </span>
                  <span className="text-lg leading-none">
                    {session.done ? '✅' : SESSION_ICONS[session.type] ?? '🏅'}
                  </span>
                  <span className={`text-[9px] text-center leading-tight ${isToday ? 'text-[#1e3a5f] font-medium' : 'text-gray-400'}`}>
                    {session.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Métricas clave</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Peso */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale size={16} className="text-[#f97316]" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Peso</span>
            </div>
            <p className="text-base font-bold text-gray-900">
              {mockMetrics.weightKg} kg → {mockMetrics.weightGoalKg} kg
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              -{mockMetrics.weightKg - mockMetrics.weightGoalKg} kg objetivo
            </p>
          </div>

          {/* FC reposo */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={16} className="text-red-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">FC Reposo</span>
            </div>
            <p className="text-base font-bold text-gray-900">{mockMetrics.hrResting} bpm</p>
            <p className="text-xs text-[#22c55e] font-medium mt-0.5">✓ Excelente</p>
          </div>

          {/* Sleep */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Moon size={16} className="text-indigo-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sueño</span>
            </div>
            <p className="text-base font-bold text-gray-900">{mockMetrics.sleepScore}</p>
            <p className="text-xs text-gray-500 mt-0.5">Normal</p>
          </div>

          {/* Km semana */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-[#f97316]" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Km semana</span>
            </div>
            <p className="text-base font-bold text-gray-900">
              {mockMetrics.weeklyKm}/{mockPlan.currentWeek === 1 ? 25 : 28} km
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{mockMetrics.adherencePct}% adherencia</p>
          </div>
        </div>
      </section>

      {/* Próximos benchmarks */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Próximos benchmarks</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {mockBenchmarks.map((b) => (
            <div key={b.label} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Target size={16} className="text-[#f97316]" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.label}</p>
                  <p className="text-xs text-gray-500">Semana {b.week}</p>
                </div>
              </div>
              {b.status === 'PROXIMO' ? (
                <span className="text-xs font-semibold px-2.5 py-1 bg-orange-50 text-[#f97316] rounded-full border border-orange-200">
                  Próximo
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-[#22c55e] rounded-full border border-green-200">
                  ✓ Completado
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Acceso rápido */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Acceso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/checkin"
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between hover:border-[#f97316]/40 transition-colors group"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">Check-in semanal</p>
              <p className="text-xs text-gray-500 mt-0.5">Registrar métricas de la semana</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold bg-[#f97316] text-white px-2 py-0.5 rounded-full">Pendiente</span>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-[#f97316] transition-colors" />
            </div>
          </Link>

          <Link
            href="/nutrition"
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between hover:border-[#f97316]/40 transition-colors group"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">Nutrición de hoy</p>
              <p className="text-xs text-gray-500 mt-0.5">Ver plan y macros del día</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-[#f97316] transition-colors" />
          </Link>

          <Link
            href="/plan"
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between hover:border-[#f97316]/40 transition-colors group"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">Mi plan completo</p>
              <p className="text-xs text-gray-500 mt-0.5">{mockPlan.name}</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-[#f97316] transition-colors" />
          </Link>
        </div>
      </section>

      {/* Card coach (solo si tiene coach) */}
      {mockCoach && (
        <section>
          <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold shrink-0">
              C
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Tu coach</p>
              <p className="text-xs text-gray-500">Último mensaje hace 2 horas</p>
            </div>
            <Link
              href="/messages"
              className="text-xs font-semibold text-[#1e3a5f] hover:text-[#f97316] transition-colors"
            >
              Ver mensaje
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
