import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { ChevronRight, Dumbbell, Calendar, Clock, CheckCircle2, History } from 'lucide-react'

// 0 = Sunday in JS Date.getDay(), but we use 1=Mon..7=Sun
function jsToOurDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

function formatDate(date: Date) {
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Returns the start of this week (Monday) and end (Sunday)
function getWeekBounds() {
  const now = new Date()
  const dow = now.getDay() // 0=Sun
  const diffToMon = (dow === 0 ? -6 : 1 - dow)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMon)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

const DOW_LABELS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default async function GymPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const athleteId = session.user.id

  // Check today's planned session type
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const plannedToday = await prisma.plannedSession.findFirst({
    where: {
      date: { gte: todayStart, lt: tomorrowStart },
      week: {
        plan: {
          userId: athleteId,
          status: 'ACTIVE',
        },
      },
    },
    select: { type: true, durationMin: true, detailText: true },
  })

  const assigned = await prisma.assignedWorkout.findFirst({
    where: { athleteId, isActive: true },
    include: {
      template: {
        include: {
          days: {
            include: {
              exercises: true,
            },
          },
        },
      },
      coach: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!assigned) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1e3a5f] mb-6">Rutina gym</h1>
        <div className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Dumbbell size={32} className="text-gray-400" />
          </div>
          <div>
            <p className="text-gray-700 font-medium text-lg">Sin rutina asignada</p>
            <p className="text-gray-500 text-sm mt-1">Tu coach aún no te ha asignado una rutina</p>
          </div>
        </div>
      </div>
    )
  }

  const todayDow = jsToOurDow(new Date().getDay())
  const todayWorkoutDay = assigned.template.days.find((d) => d.dayOfWeek === todayDow) ?? null

  // Weekly adherence: sessions logged this week
  const { monday, sunday } = getWeekBounds()
  const weekSessions = await prisma.gymSession.findMany({
    where: {
      athleteId,
      assignedWorkoutId: assigned.id,
      date: { gte: monday, lte: sunday },
    },
    select: { dayOfWeek: true, completed: true },
  })

  const completedDows = new Set(weekSessions.filter((s) => s.completed).map((s) => s.dayOfWeek))

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Rutina gym</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Coach: {assigned.coach.name ?? 'Tu coach'} · desde {formatDate(assigned.startDate)}
          </p>
        </div>
        <Link
          href="/gym/history"
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#f97316] transition-colors"
        >
          <History size={16} />
          Historial
        </Link>
      </div>

      {/* Plan context banner */}
      {plannedToday?.type === 'FUERZA' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏋️</span>
            <p className="font-semibold text-orange-800">
              Sesión de fuerza programada · {plannedToday.durationMin} min
            </p>
          </div>
          {plannedToday.detailText && (
            <p className="text-sm text-orange-700 pl-7">{plannedToday.detailText}</p>
          )}
          {todayWorkoutDay && !todayWorkoutDay.isRestDay && (
            <div className="pl-7">
              <Link
                href="/gym/session"
                className="inline-flex items-center gap-2 bg-[#f97316] hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
              >
                <Clock size={15} />
                Iniciar sesión →
              </Link>
            </div>
          )}
        </div>
      )}
      {plannedToday?.type === 'DESCANSO' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center gap-2">
          <span className="text-lg">😴</span>
          <p className="font-medium text-blue-800">Tu plan dice descanso hoy — recupérate bien</p>
        </div>
      )}

      {/* Template info */}
      <div className="bg-[#1e3a5f] text-white rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Plan activo</p>
            <h2 className="text-xl font-bold">{assigned.template.name}</h2>
            {assigned.template.goal && (
              <p className="text-sm text-white/70 mt-1">Objetivo: {assigned.template.goal}</p>
            )}
            {assigned.template.level && (
              <p className="text-sm text-white/70">Nivel: {assigned.template.level}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1.5 text-white/70 text-sm">
              <Calendar size={14} />
              <span>{assigned.template.daysPerWeek} días/sem</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's workout */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Sesión de hoy</h2>
        {!todayWorkoutDay ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-500 text-sm">No hay sesión programada para hoy</p>
          </div>
        ) : todayWorkoutDay.isRestDay ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-2xl mb-2">😴</p>
            <p className="font-semibold text-gray-800">{todayWorkoutDay.label}</p>
            <p className="text-sm text-gray-500 mt-1">Día de descanso — recupérate bien</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#f97316]/10 border-b border-[#f97316]/20 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#1e3a5f] text-lg leading-tight">{todayWorkoutDay.label}</p>
                  {todayWorkoutDay.muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {todayWorkoutDay.muscleGroups.map((mg) => (
                        <span key={mg} className="text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full">
                          {mg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600 shrink-0">
                  <Dumbbell size={15} />
                  <span>{todayWorkoutDay.exercises.length} ejercicios</span>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-col sm:flex-row gap-3">
              <Link
                href="/gym/session"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#f97316] hover:bg-orange-600 text-white font-semibold text-sm px-4 py-3 rounded-lg transition-colors"
              >
                <Clock size={16} />
                Comenzar sesión de hoy
              </Link>
              <Link
                href="/gym/history"
                className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-3 rounded-lg transition-colors"
              >
                Ver historial
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Weekly adherence */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Esta semana</h2>
          <span className="text-xs text-gray-500">{completedDows.size}/{assigned.template.days.filter(d => !d.isRestDay).length} sesiones</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
            {(() => {
              const total = assigned.template.days.filter(d => !d.isRestDay).length
              const done = completedDows.size
              return (
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
                />
              )
            })()}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
              const workoutDay = assigned.template.days.find((d) => d.dayOfWeek === dow)
              const isToday = dow === todayDow
              const isCompleted = completedDows.has(dow)
              const isRest = workoutDay?.isRestDay ?? true
              const hasSession = !!workoutDay && !isRest

              return (
                <div
                  key={dow}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl ${
                    isToday ? 'bg-[#1e3a5f]/5 ring-2 ring-[#1e3a5f]/20' : ''
                  }`}
                >
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-[#1e3a5f]' : 'text-gray-400'}`}>
                    {DOW_LABELS[dow]}
                  </span>
                  <span className="text-lg leading-none">
                    {isCompleted ? '✅' : isRest ? '😴' : hasSession ? '💪' : '—'}
                  </span>
                  <span className={`text-[9px] text-center leading-tight ${isToday ? 'text-[#1e3a5f] font-medium' : 'text-gray-400'}`}>
                    {isRest ? 'Descanso' : workoutDay?.muscleGroups?.[0] ?? ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Full weekly plan */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Plan semanal</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
            const workoutDay = assigned.template.days.find((d) => d.dayOfWeek === dow)
            const isToday = dow === todayDow
            const isCompleted = completedDows.has(dow)

            return (
              <div
                key={dow}
                className={`flex items-center gap-3 px-4 py-3.5 ${isToday ? 'bg-[#1e3a5f]/3' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  isToday ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {DOW_LABELS[dow]}
                </div>
                <div className="flex-1 min-w-0">
                  {workoutDay ? (
                    <>
                      <p className={`text-sm font-medium truncate ${isToday ? 'text-[#1e3a5f]' : 'text-gray-800'}`}>
                        {workoutDay.label}
                      </p>
                      {!workoutDay.isRestDay && workoutDay.exercises.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">{workoutDay.exercises.length} ejercicios</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Sin sesión</p>
                  )}
                </div>
                {isCompleted && (
                  <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                )}
                {isToday && !isCompleted && workoutDay && !workoutDay.isRestDay && (
                  <Link
                    href="/gym/session"
                    className="text-xs font-semibold text-[#f97316] shrink-0"
                  >
                    Iniciar →
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
