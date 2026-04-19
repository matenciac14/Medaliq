import Link from 'next/link'
import { CheckCircle2, ChevronRight, Clock, Target, Scale, Heart, Moon, Zap, AlertCircle } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import AICoachChat from '../_components/AICoachChat'

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
  ESPECIFICO: 'bg-orange-100 text-orange-800',
  AFINAMIENTO: 'bg-green-100 text-green-800',
}

function phaseLabel(phase: string) {
  if (phase === 'ESPECIFICO') return 'ESPECÍFICO'
  return phase
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// Lunes=0 … Domingo=6 (semana laboral LatAm)
const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
// JS: 0=Dom,1=Lun…6=Sáb → convertir a índice Lun-Dom
function jsToWeekIdx(jsDay: number) {
  return jsDay === 0 ? 6 : jsDay - 1
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  // ── Fetch completo ─────────────────────────────────────────────────────────
  const [dbUser, activePlanRaw, coachRelationRaw] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        checkIns: { orderBy: { recordedAt: 'desc' }, take: 1 },
        dailyLogs: { orderBy: { date: 'desc' }, take: 1 },
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: { sessions: { orderBy: { dayOfWeek: 'asc' }, include: { log: true } } },
        },
      },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId: userId },
      include: { coach: { select: { name: true, coachProfile: { select: { slug: true, specialties: true, headline: true } } } } },
    }),
  ])

  if (!dbUser) redirect('/login')

  const firstName = (dbUser.name ?? dbUser.email ?? 'Atleta').split(' ')[0]
  const activePlan = activePlanRaw ?? null
  const profile = dbUser.profile
  const lastCheckIn = dbUser.checkIns[0] ?? null
  const lastDailyLog = dbUser.dailyLogs[0] ?? null
  const coachRelation = coachRelationRaw ?? null

  // ── Plan y semana actual ───────────────────────────────────────────────────
  let planData = { name: 'Sin plan', totalWeeks: 0, currentWeek: 0, phase: 'BASE' }
  let todaySession: { type: string; durationMin: number; zoneTarget: string; detailText: string; completed: boolean } | null = null
  let weekSessionMap: Record<number, { type: string; label: string; done: boolean }> = {}

  if (activePlan) {
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - new Date(activePlan.startDate).getTime()) / 86400000)
    const currentWeek = Math.max(1, Math.min(activePlan.totalWeeks, Math.floor(diffDays / 7) + 1))
    const currentPlanWeek = activePlan.weeks.find(w => w.weekNumber === currentWeek)

    planData = {
      name: activePlan.name,
      totalWeeks: activePlan.totalWeeks,
      currentWeek,
      phase: currentPlanWeek?.phase ?? 'BASE',
    }

    // Sesión de hoy
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const todayPlanned = await prisma.plannedSession.findFirst({
      where: { week: { planId: activePlan.id }, date: { gte: todayStart, lte: todayEnd } },
      include: { log: true },
    })
    if (todayPlanned) {
      todaySession = {
        type: todayPlanned.type,
        durationMin: todayPlanned.durationMin,
        zoneTarget: todayPlanned.zoneTarget ?? 'Z2',
        detailText: todayPlanned.detailText ?? '',
        completed: !!todayPlanned.log,
      }
    }

    // Mapa de sesiones por día de la semana (0=Lun…6=Dom)
    if (currentPlanWeek) {
      for (const s of currentPlanWeek.sessions) {
        const idx = jsToWeekIdx(s.dayOfWeek)
        weekSessionMap[idx] = {
          type: s.type,
          label: (s.detailText ?? s.type).slice(0, 28),
          done: !!s.log,
        }
      }
    }
  }

  // ── Métricas reales ────────────────────────────────────────────────────────
  const weightKg = lastDailyLog?.weightKg ?? lastCheckIn?.weightKg ?? profile?.weightKg ?? null
  const hrResting = lastDailyLog?.hrResting ?? lastCheckIn?.hrResting ?? profile?.hrResting ?? null
  const sleepHours = lastDailyLog?.sleepHours ?? lastCheckIn?.sleepHours ?? profile?.sleepHoursAvg ?? null
  const hasMetrics = !!(weightKg || hrResting || sleepHours)

  // ── Día actual ────────────────────────────────────────────────────────────
  const todayWeekIdx = jsToWeekIdx(new Date().getDay())
  const completedCount = Object.values(weekSessionMap).filter(s => s.done).length
  const totalTraining = Object.keys(weekSessionMap).length

  // ── Check-in semanal pendiente ─────────────────────────────────────────────
  const weekOfYear = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000)
  const thisWeekCheckIn = await prisma.weeklyCheckIn.findUnique({
    where: { userId_weekNumber: { userId, weekNumber: weekOfYear } },
  })
  const checkinPending = !thisWeekCheckIn

  const phaseDisplay = phaseLabel(planData.phase)

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{formatDate()}</p>
        </div>
        {activePlan && (
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${PHASE_COLORS[planData.phase] ?? 'bg-gray-100 text-gray-700'}`}>
            Fase {phaseDisplay} · Semana {planData.currentWeek}/{planData.totalWeeks}
          </span>
        )}
      </div>

      {/* Sesión de hoy */}
      {todaySession ? (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Sesión de hoy</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-[#1e3a5f] px-5 py-4 flex items-center gap-3">
              <span className="text-3xl">{SESSION_ICONS[todaySession.type] ?? '🏅'}</span>
              <div className="flex-1">
                <p className="text-white font-semibold text-lg leading-tight">
                  {todaySession.durationMin} min · Zona {todaySession.zoneTarget}
                </p>
                <p className="text-white/70 text-sm capitalize">{todaySession.type.toLowerCase().replace(/_/g, ' ')}</p>
              </div>
              {todaySession.completed && (
                <span className="flex items-center gap-1 bg-[#22c55e] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle2 size={12} /> Completada
                </span>
              )}
            </div>
            <div className="px-5 py-4">
              <p className="text-gray-700 text-sm leading-relaxed">{todaySession.detailText}</p>
              <div className="flex gap-3 mt-4 flex-wrap">
                <Link href="/log" className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 bg-[#f97316] hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
                  <Clock size={15} /> Registrar sesión
                </Link>
                <Link href="/plan" className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  Ver plan completo <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : activePlan ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">😴</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Día de descanso</p>
            <p className="text-xs text-gray-500">No hay sesión planificada para hoy. Recupera bien.</p>
          </div>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4">
          <p className="text-sm font-semibold text-orange-800">No tienes un plan activo</p>
          <p className="text-xs text-orange-600 mt-0.5">Completa tu perfil o únete a un coach para generar tu plan.</p>
        </div>
      )}

      {/* Esta semana — siempre 7 días */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Esta semana</h2>
          <span className="text-xs text-gray-500">{completedCount}/{totalTraining} sesiones</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          {totalTraining > 0 && (
            <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-[#22c55e] rounded-full transition-all" style={{ width: `${(completedCount / totalTraining) * 100}%` }} />
            </div>
          )}
          <div className="grid grid-cols-7 gap-1">
            {WEEK_DAYS.map((day, idx) => {
              const isToday = idx === todayWeekIdx
              const session = weekSessionMap[idx]
              return (
                <div
                  key={day}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl ${isToday ? 'bg-[#1e3a5f]/8 ring-2 ring-[#1e3a5f]/25' : ''}`}
                >
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-[#1e3a5f]' : 'text-gray-400'}`}>{day}</span>
                  <span className="text-base leading-none">
                    {session ? (session.done ? '✅' : SESSION_ICONS[session.type] ?? '🏅') : '○'}
                  </span>
                  <span className={`text-[8px] text-center leading-tight hidden sm:block ${isToday ? 'text-[#1e3a5f] font-medium' : 'text-gray-400'}`}>
                    {session ? session.label.slice(0, 12) : 'descanso'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Métricas clave */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Métricas clave</h2>
          <Link href="/profile" className="text-xs text-[#f97316] font-medium hover:underline">
            {hasMetrics ? 'Actualizar' : 'Registrar →'}
          </Link>
        </div>
        {!hasMetrics ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">Sin métricas registradas</p>
              <p className="text-xs text-orange-600 mt-0.5">Registra peso, FC reposo y sueño para que el AI coach te dé recomendaciones precisas.</p>
            </div>
            <Link href="/profile" className="text-xs font-semibold bg-[#f97316] text-white px-3 py-1.5 rounded-lg shrink-0">
              Ir a perfil
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {weightKg && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Scale size={16} className="text-[#f97316]" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Peso</span>
                </div>
                <p className="text-base font-bold text-gray-900">{weightKg} kg</p>
                {profile?.weightGoalKg && (
                  <p className="text-xs text-gray-500 mt-0.5">objetivo: {profile.weightGoalKg} kg</p>
                )}
              </div>
            )}
            {hrResting && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={16} className="text-red-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">FC Reposo</span>
                </div>
                <p className="text-base font-bold text-gray-900">{hrResting} bpm</p>
                <p className="text-xs text-[#22c55e] font-medium mt-0.5">
                  {hrResting < 60 ? '✓ Excelente' : hrResting < 70 ? '✓ Normal' : '⚠ Alta'}
                </p>
              </div>
            )}
            {sleepHours && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Moon size={16} className="text-indigo-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sueño</span>
                </div>
                <p className="text-base font-bold text-gray-900">{sleepHours}h</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {Number(sleepHours) >= 8 ? 'Óptimo' : Number(sleepHours) >= 7 ? 'Suficiente' : 'Insuficiente'}
                </p>
              </div>
            )}
            {activePlan && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-[#f97316]" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adherencia</span>
                </div>
                <p className="text-base font-bold text-gray-900">
                  {totalTraining > 0 ? `${completedCount}/${totalTraining}` : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">sesiones esta semana</p>
              </div>
            )}
          </div>
        )}
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
              {checkinPending && <span className="text-[10px] font-bold bg-[#f97316] text-white px-2 py-0.5 rounded-full">Pendiente</span>}
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
              <p className="text-xs text-gray-500 mt-0.5">{planData.name}</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-[#f97316] transition-colors" />
          </Link>
        </div>
      </section>

      {/* AI Coach — con gate de perfil */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Tu AI Coach</h2>
        {!profile ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle size={20} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Completa tu perfil antes de usar el AI Coach</p>
              <p className="text-xs text-orange-600 mt-1">El AI necesita tus datos de salud para darte recomendaciones seguras y personalizadas.</p>
              <Link href="/profile" className="inline-block mt-3 text-xs font-semibold bg-[#f97316] text-white px-3 py-1.5 rounded-lg">
                Completar perfil →
              </Link>
            </div>
          </div>
        ) : (
          <AICoachChat />
        )}
      </section>

      {/* Card coach real — solo si tiene coach asignado */}
      {coachRelation && (
        <section>
          <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold shrink-0">
              {(coachRelation.coach.name ?? 'C').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{coachRelation.coach.name ?? 'Tu coach'}</p>
              <p className="text-xs text-gray-500 truncate">
                {coachRelation.coach.coachProfile?.headline ?? coachRelation.coach.coachProfile?.specialties?.[0] ?? 'Coach deportivo'}
              </p>
            </div>
            {coachRelation.coach.coachProfile?.slug && (
              <Link
                href={`/p/${coachRelation.coach.coachProfile.slug}`}
                className="text-xs font-semibold text-[#1e3a5f] hover:text-[#f97316] transition-colors shrink-0"
              >
                Ver perfil →
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
