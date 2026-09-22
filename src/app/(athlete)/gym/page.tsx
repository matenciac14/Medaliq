import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { getWeekMonday, formatWeekRange, todayDowInTz } from '@/lib/core/date_utils'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { DAY_LABELS } from '@/lib/constants/sessions'
import { translateMuscleGroup } from '@/lib/gym/labels'
import { prisma } from '@/lib/db/prisma'
import { ChevronRight, Dumbbell, Calendar, Clock, CheckCircle2, History } from 'lucide-react'
import { resolveExerciseGifUrl } from '@/lib/gym/gif_url'
import PublicTemplates from './_components/PublicTemplates'
import FeaturedExercisesGrid from './_components/FeaturedExercisesGrid'
import WeekNavBar from '../_components/WeekNavBar'
import MuscleMapWeb from '@/components/MuscleMapWeb'
import type { MuscleData } from '@/components/MuscleMapWeb'

function formatDate(date: Date) {
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}


export default async function GymPage({ searchParams }: { searchParams: Promise<{ completed?: string; weekOffset?: string; selectedDow?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const athleteId = session.user.id
  const { completed: completedParam, weekOffset: weekOffsetParam, selectedDow: selectedDowParam } = await searchParams
  const justCompleted = completedParam === '1'
  const weekOffset = parseInt(weekOffsetParam ?? '0') || 0
  const isCurrentWeek = weekOffset === 0
  const selectedDow = parseInt(selectedDowParam ?? '0') || 0

  // Si viene de completar sesión, cargar resumen de la última sesión
  const lastSession = justCompleted
    ? await prisma.gymSession.findFirst({
        where: { athleteId, completed: true },
        orderBy: { date: 'desc' },
        select: {
          rpe: true,
          durationMin: true,
          setLogs: {
            where: { completed: true },
            select: { weightKg: true, repsCompleted: true },
          },
        },
      })
    : null

  // Timezone del usuario — necesario para calcular "hoy" correctamente
  const userTz = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  }).then(u => u?.timezone ?? undefined)

  // Check today's planned session usando dayOfWeek + semana actual del plan
  // (PlannedSession no tiene campo date — usa dayOfWeek 1=Lun…7=Dom)
  const todayDowForBanner = todayDowInTz(userTz)
  const activePlanForBanner = await prisma.trainingPlan.findFirst({
    where: { userId: athleteId, status: 'ACTIVE' },
    select: { id: true, startDate: true, totalWeeks: true },
  })
  const currentWeekForBanner = activePlanForBanner
    ? getPlanWeekNumber(new Date(activePlanForBanner.startDate), activePlanForBanner.totalWeeks)
    : null

  const plannedToday = activePlanForBanner && currentWeekForBanner
    ? await prisma.plannedSession.findFirst({
        where: {
          dayOfWeek: todayDowForBanner,
          week: { planId: activePlanForBanner.id, weekNumber: currentWeekForBanner },
        },
        select: { type: true, durationMin: true, detailText: true },
      })
    : null

  const assigned = await prisma.assignedWorkout.findFirst({
    where: { athleteId, isActive: true },
    include: {
      template: {
        include: {
          days: {
            include: {
              exercises: {
                include: {
                  exercise: { select: { name: true, bodyPart: true, target: true } },
                },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
      coach: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!assigned) {
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const [coachRelation, publicTemplates, healthProfile, featuredExercises, rawMuscleSets] = await Promise.all([
      prisma.coachAthlete.findFirst({
        where: { athleteId, status: 'ACTIVE' },
        select: { id: true },
      }),
      prisma.workoutTemplate.findMany({
        where: { isPublic: true, isActive: true },
        include: { days: { select: { isRestDay: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.healthProfile.findUnique({
        where: { userId: athleteId },
        select: { sport: true },
      }),
      prisma.exercise.findMany({
        where: { coachId: null, OR: [{ gifUrl: { not: null } }, { gifStoredUrl: { not: null } }] },
        select: {
          id: true, name: true, nameEs: true, bodyPart: true, target: true,
          gifUrl: true, gifStoredUrl: true,
        },
        orderBy: [
          { gifStoredUrl: { sort: 'asc', nulls: 'last' } },
          { popularityRank: { sort: 'asc', nulls: 'last' } },
        ],
        take: 6,
      }),
      prisma.setLog.findMany({
        where: { session: { athleteId, completed: true, date: { gte: sevenDaysAgo } }, completed: true },
        select: {
          weightKg: true,
          repsCompleted: true,
          session: { select: { date: true } },
          workoutExercise: {
            select: { exercise: { select: { bodyPart: true, target: true, secondaryMuscles: true } } },
          },
        },
      }),
    ])

    // Aggregate muscle fatigue — last 7 days
    type MuscleStatEntry = { volume: number; sets: number; lastTrainedAt: Date }
    const statMap = new Map<string, MuscleStatEntry>()
    for (const sl of rawMuscleSets) {
      const ex = sl.workoutExercise?.exercise
      if (!ex) continue
      const vol = (sl.weightKg ?? 0) * (sl.repsCompleted ?? 1)
      const date = sl.session.date
      const upsert = (k: string) => {
        const prev = statMap.get(k) ?? { volume: 0, sets: 0, lastTrainedAt: date }
        statMap.set(k, { volume: prev.volume + vol, sets: prev.sets + 1, lastTrainedAt: date > prev.lastTrainedAt ? date : prev.lastTrainedAt })
      }
      if (ex.bodyPart) upsert(ex.bodyPart)
      if (ex.target) upsert(ex.target)
      for (const sm of ex.secondaryMuscles ?? []) { if (sm) upsert(sm) }
    }
    const now = new Date()
    const gymMuscleData: MuscleData = {}
    for (const [key, stats] of statMap) {
      const hrs = (now.getTime() - stats.lastTrainedAt.getTime()) / 3_600_000
      gymMuscleData[key] = {
        fatigueLevel: (hrs > 48 ? 0 : hrs > 24 ? 1 : hrs > 12 ? 2 : 3) as 0|1|2|3,
        volume: Math.round(stats.volume),
        sets: stats.sets,
        lastTrainedAt: stats.lastTrainedAt.toISOString(),
      }
    }

    const isRunner = healthProfile?.sport === 'RUNNING'

    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto space-y-6">

        {/* ── HEADER ───────────────────────────────────────────── */}
        {coachRelation ? (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl mt-0.5">🏋️</span>
            <div>
              <p className="font-semibold text-blue-800 text-sm">Tu coach aún no te asignó una rutina</p>
              <p className="text-blue-600 text-xs mt-1">
                Mientras tanto, entrena con una plantilla o registra una sesión libre.
              </p>
              <Link href="/gym/session" className="inline-block mt-2 text-xs font-semibold text-[#ea580c] hover:underline">
                Registrar sesión libre →
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-[#1e3a5f]">Entreno</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Elige una plantilla o crea tu propia rutina.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/gym/exercises"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Dumbbell size={14} />
                Ejercicios
              </Link>
              <Link
                href="/gym/builder"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                + Crear mi rutina
              </Link>
            </div>
          </div>
        )}

        {/* ── RUNNER TIP ───────────────────────────────────────── */}
        {isRunner && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl mt-0.5">🏃</span>
            <div>
              <p className="font-semibold text-green-800 text-sm">Fuerza complementaria para runners</p>
              <p className="text-green-700 text-xs mt-1 leading-relaxed">
                2 sesiones por semana de fuerza mejoran tu economía de carrera y previenen lesiones — prioriza <strong>Full Body</strong> o <strong>Upper/Lower</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ── 2-COL LAYOUT ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* ── MAIN: Plantillas ──────────────────────────────── */}
          <div className="space-y-6">
            <section>
              <div className="mb-3">
                <h2 className="text-base font-bold text-[#1e3a5f]">Plantillas</h2>
                <p className="text-xs text-gray-400 mt-0.5">Empieza hoy — sin coach, sin configuración.</p>
              </div>
              <PublicTemplates templates={publicTemplates} />
            </section>
          </div>

          {/* ── SIDEBAR ───────────────────────────────────────── */}
          <aside className="space-y-6">
            {/* Mapa Muscular */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="mb-3">
                <h2 className="text-base font-bold text-[#1e3a5f]">Mapa Muscular</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fatiga semanal</p>
              </div>
              <MuscleMapWeb data={gymMuscleData} mode="fatigue" />
            </section>

            {/* Ejercicios Destacados */}
            {featuredExercises.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Ejercicios destacados</h2>
                  <Link
                    href="/gym/exercises"
                    className="text-xs font-semibold text-[#ea580c] hover:underline shrink-0"
                  >
                    Ver todos →
                  </Link>
                </div>
                <FeaturedExercisesGrid
                  exercises={featuredExercises.map(ex => ({
                    ...ex,
                    gif: resolveExerciseGifUrl(ex.id, ex.gifStoredUrl, ex.gifUrl),
                  }))}
                />
              </section>
            )}

            {/* Coach Tip */}
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5">
              <span className="text-base mt-0.5">👤</span>
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-semibold text-gray-700">¿Tienes un entrenador?</span>{' '}
                Tu coach puede asignarte una rutina personalizada desde su panel.{' '}
                <Link href="/find-coach" className="text-[#ea580c] font-semibold hover:underline">
                  Buscar coach →
                </Link>
              </p>
            </div>
          </aside>
        </div>

      </div>
    )
  }

  const todayDow = todayDowInTz(userTz)
  const todayWorkoutDay = assigned.template.days.find((d) => d.dayOfWeek === todayDow) ?? null

  // Weekly adherence: sessions logged for the selected week
  const monday = getWeekMonday(weekOffset, userTz)
  const sunday = new Date(monday.getTime() + 7 * 86_400_000 - 1)
  const weekRangeLabel = formatWeekRange(monday)
  // Build DOW→dateNumber map (1=Mon … 7=Sun)
  const weekDates: Record<number, number> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    weekDates[i + 1] = d.getDate()
  }

  const weekSessions = await prisma.gymSession.findMany({
    where: {
      athleteId,
      assignedWorkoutId: assigned.id,
      date: { gte: monday, lte: sunday },
    },
    select: { dayOfWeek: true, completed: true },
  })

  const completedDows = new Set(weekSessions.filter((s) => s.completed).map((s) => s.dayOfWeek))

  // Detalle de la sesión seleccionada (SetLog reales)
  let selectedSession: {
    id: string
    durationMin: number | null
    rpe: number | null
    notes: string | null
    completed: boolean
    setLogs: {
      setNumber: number
      weightKg: number | null
      repsCompleted: number | null
      completed: boolean
      workoutExercise: {
        id: string
        sets: number
        repsScheme: string
        order: number
        exercise: { name: string }
      } | null
      exerciseName: string | null
    }[]
  } | null = null

  if (selectedDow >= 1 && selectedDow <= 7) {
    const selDayStart = new Date(monday)
    selDayStart.setDate(monday.getDate() + (selectedDow - 1))
    selDayStart.setHours(0, 0, 0, 0)
    const selDayEnd = new Date(selDayStart)
    selDayEnd.setDate(selDayStart.getDate() + 1)

    selectedSession = await prisma.gymSession.findFirst({
      where: {
        athleteId,
        assignedWorkoutId: assigned.id,
        dayOfWeek: selectedDow,
        date: { gte: selDayStart, lt: selDayEnd },
      },
      include: {
        setLogs: {
          include: {
            workoutExercise: {
              include: {
                exercise: { select: { name: true } },
              },
            },
          },
          orderBy: [{ workoutExerciseId: 'asc' }, { setNumber: 'asc' }],
        },
      },
    })
  }

  // Agrupar SetLogs por ejercicio para el panel de detalle
  type ExerciseDetail = {
    name: string
    sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean }[]
  }
  const selectedExerciseDetail: ExerciseDetail[] = []
  if (selectedSession?.setLogs.length) {
    const map = new Map<string, ExerciseDetail>()
    for (const log of selectedSession.setLogs) {
      const key = log.workoutExercise?.id ?? log.exerciseName ?? 'unknown'
      if (!map.has(key)) {
        map.set(key, { name: log.workoutExercise?.exercise.name ?? log.exerciseName ?? 'Ejercicio', sets: [] })
      }
      map.get(key)!.sets.push({
        setNumber: log.setNumber,
        weightKg: log.weightKg,
        repsCompleted: log.repsCompleted,
        completed: log.completed,
      })
    }
    selectedExerciseDetail.push(...map.values())
  }

  // Calcular resumen de la última sesión
  const lastSessionVolume = lastSession
    ? lastSession.setLogs.reduce((acc, sl) => {
        const kg = sl.weightKg ?? 0
        const reps = sl.repsCompleted ?? 0
        return acc + kg * reps
      }, 0)
    : 0

  // Muscle data for today's session preview (session mode)
  const todayMuscleData: MuscleData = {}
  if (todayWorkoutDay && !todayWorkoutDay.isRestDay) {
    const muscleKeys = [
      ...todayWorkoutDay.muscleGroups,
      ...todayWorkoutDay.exercises.map(e => e.exercise.target).filter(Boolean),
    ]
    for (const key of muscleKeys) {
      if (key) todayMuscleData[key.toLowerCase()] = { fatigueLevel: 3 }
    }
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto space-y-6">

      {/* Banner post-sesión — full width */}
      {justCompleted && lastSession && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-600" />
            <p className="font-bold text-green-800 text-sm">¡Sesión completada!</p>
          </div>
          {lastSession.durationMin && (
            <span className="text-sm text-gray-600"><Clock size={13} className="inline mr-1" />{lastSession.durationMin} min</span>
          )}
          <span className="text-sm text-gray-600">{lastSession.setLogs.length} series</span>
          {lastSessionVolume > 0 && (
            <span className="text-sm font-semibold text-[#ea580c]">{Math.round(lastSessionVolume).toLocaleString()} kg</span>
          )}
          {lastSession.rpe != null && (
            <span className="text-sm text-gray-600">RPE {lastSession.rpe}</span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Tu rutina</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {assigned.coach ? `Coach: ${assigned.coach.name ?? 'Tu coach'} · ` : ''}desde {formatDate(assigned.startDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/gym/exercises"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#ea580c] transition-colors"
          >
            <Dumbbell size={16} />
            Ejercicios
          </Link>
          <Link
            href="/gym/history"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#ea580c] transition-colors"
          >
            <History size={16} />
            Historial
          </Link>
        </div>
      </div>

      {/* Plan context banner — full width */}
      {plannedToday?.type === 'FUERZA' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-center gap-3 flex-wrap">
          <span className="text-lg">🏋️</span>
          <p className="font-semibold text-orange-800">
            Hoy es día de FUERZA — {todayWorkoutDay?.label ?? 'Sesión de fuerza'} ({todayWorkoutDay?.muscleGroups?.map(mg => translateMuscleGroup(mg)).join(', ')})
          </p>
        </div>
      )}
      {plannedToday?.type === 'DESCANSO' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center gap-2">
          <span className="text-lg">😴</span>
          <p className="font-medium text-blue-800">Tu plan dice descanso hoy — recupérate bien</p>
        </div>
      )}

      {/* Template info — full width */}
      <div className="bg-brand-hero text-white rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-md uppercase tracking-wider">Plan activo</span>
            <div>
              <h2 className="text-xl font-bold">{assigned.template.name}</h2>
              <p className="text-sm text-white/70 mt-0.5">
                {[assigned.template.goal, assigned.template.level, `${assigned.template.daysPerWeek} días/sem`].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <Link
            href="/gym/builder"
            className="text-xs font-semibold text-white/60 hover:text-white transition-colors underline underline-offset-2 shrink-0"
          >
            Cambiar rutina
          </Link>
        </div>
      </div>

      {/* ── 2-COL LAYOUT ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* ── MAIN: Sesión de hoy ─────────────────────────────── */}
        <div className="space-y-6">
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
                <div className="bg-[#ea580c]/10 border-b border-[#ea580c]/20 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold bg-[#ea580c] text-white px-2 py-1 rounded-md uppercase">Hoy</span>
                      <div>
                        <p className="font-bold text-[#1e3a5f] text-lg leading-tight">{todayWorkoutDay.label}</p>
                        {todayWorkoutDay.muscleGroups.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {todayWorkoutDay.muscleGroups.map((mg) => (
                              <span key={mg} className="text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full">
                                {translateMuscleGroup(mg)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 shrink-0">
                      <Dumbbell size={15} />
                      <span>{todayWorkoutDay.exercises.length} ejercicios</span>
                    </div>
                  </div>
                </div>
                {/* Exercise list with prev weight */}
                <div className="divide-y divide-gray-50">
                  {todayWorkoutDay.exercises.map((ex, i) => (
                    <div key={ex.id} className="px-5 py-3 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <p className="text-sm font-medium text-gray-800 flex-1">{ex.exercise.name}</p>
                      <p className="text-xs text-gray-400 shrink-0">{ex.sets}s × {ex.repsScheme}</p>
                    </div>
                  ))}
                </div>
                {Object.keys(todayMuscleData).length > 0 && (
                  <div className="px-5 py-4 border-t border-[#ea580c]/10 flex justify-center">
                    <MuscleMapWeb data={todayMuscleData} mode="session" compact={true} />
                  </div>
                )}
                <div className="px-5 py-4 border-t border-gray-100">
                  {completedDows.has(todayDow) ? (
                    <div className="inline-flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 font-semibold text-sm px-4 py-3 rounded-lg w-full">
                      <CheckCircle2 size={16} />
                      Sesión completada hoy
                    </div>
                  ) : (
                    <Link
                      href="/gym/session"
                      className="block text-center bg-brand-cta hover:opacity-90 active:opacity-80 text-white font-semibold text-sm px-4 py-3.5 rounded-lg transition-opacity w-full"
                    >
                      Comenzar sesión de hoy
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside className="space-y-6">
          {/* Adherencia Semanal */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#1e3a5f]">Adherencia Semanal</h2>
                <p className="text-xs text-gray-400 mt-0.5">{weekRangeLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <WeekNavBar
                  weekLabel={weekRangeLabel}
                  weekOffset={weekOffset}
                  canGoPrev={true}
                  canGoNext={true}
                />
                <span className="text-2xl font-black text-[#ea580c]">{completedDows.size}/{assigned.template.days.filter(d => !d.isRestDay).length}</span>
              </div>
            </div>
            {/* Progress bar */}
            {(() => {
              const total = assigned.template.days.filter(d => !d.isRestDay).length
              const done = completedDows.size
              return (
                <div className="h-1 bg-gray-100">
                  <div className="h-full bg-green-400 transition-all duration-500" style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }} />
                </div>
              )
            })()}
            {/* CalendarStrip */}
            <div className="grid grid-cols-7 divide-x divide-gray-50">
              {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
                const workoutDay = assigned.template.days.find((d) => d.dayOfWeek === dow)
                const isToday = isCurrentWeek && dow === todayDow
                const isCompleted = completedDows.has(dow)
                const isSelected = selectedDow === dow
                const isRest = workoutDay?.isRestDay ?? !workoutDay
                const hasSession = !!workoutDay && !isRest

                const params = new URLSearchParams()
                if (weekOffset !== 0) params.set('weekOffset', String(weekOffset))
                if (!isSelected) params.set('selectedDow', String(dow))
                const cellHref = `/gym${params.toString() ? `?${params.toString()}` : ''}`

                const cellBg = isSelected
                  ? 'bg-[#1e3a5f]'
                  : isCompleted && !isRest
                  ? 'bg-green-50/60'
                  : isToday
                  ? 'bg-orange-50'
                  : 'bg-white'

                return (
                  <Link
                    key={dow}
                    href={cellHref}
                    className={`relative flex flex-col items-center py-3 px-1 text-center transition-colors ${cellBg}`}
                  >
                    {isToday && !isSelected && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#ea580c]" />}
                    <span className={`text-[10px] font-semibold mb-0.5 ${
                      isSelected ? 'text-white/70' : isToday ? 'text-[#ea580c] font-bold' : 'text-gray-400'
                    }`}>
                      {DAY_LABELS[dow]}
                    </span>
                    <span className={`text-lg font-black leading-none mb-1 ${
                      isSelected ? 'text-white' : isToday ? 'text-[#ea580c]' : isRest ? 'text-gray-300' : isCompleted ? 'text-green-600' : 'text-gray-800'
                    }`}>
                      {weekDates[dow]}
                    </span>
                    <span className="text-sm">
                      {isCompleted && !isRest
                        ? <CheckCircle2 size={16} className={isSelected ? 'text-white mx-auto' : 'text-green-500 mx-auto'} />
                        : isRest ? '😴' : hasSession ? '💪' : '—'}
                    </span>
                  </Link>
                )
              })}
            </div>

            {/* Detalle del día seleccionado */}
            {selectedDow >= 1 && selectedDow <= 7 && (() => {
              const workoutDay = assigned.template.days.find(d => d.dayOfWeek === selectedDow)
              const isRest = workoutDay?.isRestDay ?? !workoutDay
              const dayDateNum = weekDates[selectedDow]
              const dayLabel = `${DAY_LABELS[selectedDow]} ${dayDateNum} · ${workoutDay?.label ?? 'Sin sesión'}`

              if (isRest) {
                return (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
                    <span className="text-lg">😴</span>
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">{DAY_LABELS[selectedDow]} {dayDateNum} — Descanso</p>
                      <p className="text-xs text-gray-400">Sin sesión planificada</p>
                    </div>
                  </div>
                )
              }

              if (selectedSession?.completed && selectedExerciseDetail.length > 0) {
                return (
                  <div className="border-t border-gray-100">
                    <div className="px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#1e3a5f] text-sm">{dayLabel}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Completada</p>
                      </div>
                      <div className="flex items-center gap-3 text-right shrink-0">
                        {selectedSession.durationMin && (
                          <div>
                            <p className="text-base font-black text-[#1e3a5f]">{selectedSession.durationMin}</p>
                            <p className="text-[10px] text-gray-400">min</p>
                          </div>
                        )}
                        {selectedSession.rpe && (
                          <div>
                            <p className="text-base font-black text-[#ea580c]">{selectedSession.rpe}<span className="text-xs font-normal text-gray-400">/10</span></p>
                            <p className="text-[10px] text-gray-400">RPE</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selectedExerciseDetail.map((ex, i) => (
                        <div key={i} className="px-4 py-2.5">
                          <p className="text-sm font-semibold text-gray-900 mb-1.5">{ex.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ex.sets.map((s) => (
                              <div key={s.setNumber} className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                s.completed ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-400'
                              }`}>
                                {s.weightKg != null && s.repsCompleted != null
                                  ? `${s.weightKg}kg × ${s.repsCompleted}`
                                  : s.repsCompleted != null
                                  ? `${s.repsCompleted} reps`
                                  : `Serie ${s.setNumber}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedSession.notes && (
                      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500 italic">{selectedSession.notes}</p>
                      </div>
                    )}
                  </div>
                )
              }

              if (workoutDay && !workoutDay.isRestDay) {
                const isSelectedToday = isCurrentWeek && selectedDow === todayDow
                return (
                  <div className="border-t border-gray-100">
                    <div className="px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#1e3a5f] text-sm">{dayLabel}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                          {selectedSession && !selectedSession.completed ? 'No completada' : 'Planificado'}
                        </p>
                      </div>
                      {isSelectedToday && !completedDows.has(todayDow) && (
                        <Link
                          href="/gym/session"
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: '#ea580c' }}
                        >
                          Iniciar
                        </Link>
                      )}
                    </div>
                    <div className="px-4 pb-3 text-xs text-gray-500">
                      {workoutDay.exercises.length} ejercicios · {workoutDay.muscleGroups.map(mg => translateMuscleGroup(mg)).join(', ')}
                    </div>
                  </div>
                )
              }

              return null
            })()}
          </section>

          {/* Plan Semanal */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Plan semanal</h2>
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
                const workoutDay = assigned.template.days.find((d) => d.dayOfWeek === dow)
                const isToday = isCurrentWeek && dow === todayDow
                const isCompleted = completedDows.has(dow)

                return (
                  <div
                    key={dow}
                    className={`flex items-center gap-3 px-4 py-3 ${isToday ? 'bg-[#1e3a5f]/3' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex flex-col items-center justify-center shrink-0 leading-none ${
                      isToday ? 'bg-[#ea580c] text-white' : isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isCompleted ? <CheckCircle2 size={14} /> : <span className="text-[9px] font-semibold">{DAY_LABELS[dow]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isToday ? 'text-[#1e3a5f] font-semibold' : 'text-gray-800'}`}>
                        {DAY_LABELS[dow]}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {workoutDay ? workoutDay.label : 'Sin sesión'}
                        {workoutDay && !workoutDay.isRestDay && workoutDay.exercises.length > 0 && ` · ${workoutDay.exercises.length} ej.`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
