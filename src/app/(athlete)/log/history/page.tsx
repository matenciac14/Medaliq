import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { ChevronLeft, CheckCircle2, Dumbbell, Clock, Zap, MapPin } from 'lucide-react'
import { EditRunButton } from './_components/EditRunButton'

// ─── Tipos de corrida ─────────────────────────────────────────────────────────

const RUN_META: Record<string, { label: string; icon: string }> = {
  RODAJE_Z2:    { label: 'Rodaje Z2',    icon: '🟢' },
  FARTLEK:      { label: 'Fartlek',      icon: '🟡' },
  TEMPO:        { label: 'Tempo',        icon: '🟠' },
  INTERVALOS:   { label: 'Intervalos',   icon: '🔴' },
  TIRADA_LARGA: { label: 'Tirada larga', icon: '🔵' },
  OTRO:         { label: 'Sesión libre', icon: '⚪' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date) {
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function rpeColor(rpe: number | null) {
  if (!rpe) return 'bg-gray-100 text-gray-500'
  if (rpe <= 4) return 'bg-blue-100 text-blue-700'
  if (rpe <= 6) return 'bg-yellow-100 text-yellow-700'
  if (rpe <= 8) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

// ─── Tipos del feed unificado ─────────────────────────────────────────────────

type GymEntry = {
  kind: 'gym'
  date: Date
  data: Awaited<ReturnType<typeof fetchGymSessions>>[number]
}

type RunEntry = {
  kind: 'run'
  date: Date
  data: Awaited<ReturnType<typeof fetchRunSessions>>[number]
}

type FeedEntry = GymEntry | RunEntry

// ─── Fetches ──────────────────────────────────────────────────────────────────

async function fetchGymSessions(athleteId: string) {
  return prisma.gymSession.findMany({
    where: { athleteId },
    orderBy: { date: 'desc' },
    take: 50,
    include: {
      setLogs: {
        include: {
          workoutExercise: {
            include: {
              exercise: { select: { name: true } },
            },
          },
        },
        orderBy: [{ workoutExercise: { order: 'asc' } }, { setNumber: 'asc' }],
      },
      assignedWorkout: {
        include: {
          template: { select: { name: true } },
        },
      },
    },
  })
}

async function fetchRunSessions(userId: string) {
  return prisma.sessionLog.findMany({
    where: {
      userId,
      plannedSessionId: null,
      freeSessionType: { not: null },
    },
    orderBy: { completedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      completedAt: true,
      freeSessionType: true,
      durationMin: true,
      distanceKm: true,
      rpe: true,
      notes: true,
    },
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActivityHistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const [gymSessions, runSessions] = await Promise.all([
    fetchGymSessions(userId),
    fetchRunSessions(userId),
  ])

  // Mezclar en feed unificado ordenado por fecha desc
  const feed: FeedEntry[] = [
    ...gymSessions.map((gs): GymEntry => ({ kind: 'gym', date: gs.date, data: gs })),
    ...runSessions
      .filter((rs) => rs.completedAt !== null)
      .map((rs): RunEntry => ({ kind: 'run', date: rs.completedAt!, data: rs })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 60)

  const totalActivities = feed.length
  const totalGym = gymSessions.length
  const totalRun = runSessions.length

  return (
    <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#ea580c] transition-colors"
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-[#1e3a5f]">Historial de actividad</h1>
      </div>

      {/* Estado vacío */}
      {feed.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <Zap size={28} className="text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-700">Sin actividad registrada</p>
            <p className="text-sm text-gray-500 mt-1">
              Tus sesiones de gym y corridas aparecerán aquí una vez que las registres
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <Link
              href="/gym/session"
              className="inline-flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              <Dumbbell size={14} />
              Sesión de gym
            </Link>
            <Link
              href="/log/run"
              className="inline-flex items-center gap-2 bg-[#ea580c] hover:bg-[#ea6c0a] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              Registrar corrida
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/15 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-[#1e3a5f]">{totalActivities}</p>
              <p className="text-xs text-gray-500 mt-0.5">Actividades</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#1e3a5f]">{totalGym}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ejercicios</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#ea580c]">{totalRun}</p>
              <p className="text-xs text-gray-500 mt-0.5">Corridas</p>
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-4">
            {feed.map((entry) =>
              entry.kind === 'gym' ? (
                <GymCard key={`gym-${entry.data.id}`} gs={entry.data} />
              ) : (
                <RunCard key={`run-${entry.data.id}`} rs={entry.data} />
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── GymCard ──────────────────────────────────────────────────────────────────

type GymSessionData = Awaited<ReturnType<typeof fetchGymSessions>>[number]

function GymCard({ gs }: { gs: GymSessionData }) {
  // Agrupar setLogs por ejercicio
  const exerciseGroups: Record<string, { name: string; sets: typeof gs.setLogs }> = {}

  for (const sl of gs.setLogs) {
    const exName = sl.workoutExercise?.exercise.name ?? sl.exerciseName ?? 'Ejercicio'
    const exId = sl.workoutExerciseId ?? sl.exerciseName ?? 'unknown'
    if (!exerciseGroups[exId]) {
      exerciseGroups[exId] = { name: exName, sets: [] }
    }
    exerciseGroups[exId].sets.push(sl)
  }

  const exerciseList = Object.values(exerciseGroups)
  const completedSets = gs.setLogs.filter((sl) => sl.completed).length
  const prCount = gs.setLogs.filter((sl) => sl.isPR).length
  const sessionVolume = gs.setLogs
    .filter((sl) => sl.completed)
    .reduce((acc, sl) => acc + (sl.weightKg ?? 0) * (sl.repsCompleted ?? 0), 0)

  const title = gs.assignedWorkout?.template.name ?? 'Sesión de gym'

  return (
    <details className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
      <summary className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors list-none">
        {/* Icono */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          gs.completed ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          {gs.completed
            ? <CheckCircle2 size={18} className="text-green-600" />
            : <Dumbbell size={18} className="text-gray-400" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">💪</span>
            <p className="font-semibold text-sm text-gray-900 truncate">{title}</p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{formatDate(gs.date)}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {gs.durationMin != null && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              {gs.durationMin}min
            </span>
          )}
          {gs.rpe != null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rpeColor(gs.rpe)}`}>
              RPE {gs.rpe}
            </span>
          )}
          <span className="text-xs text-gray-400">{exerciseList.length} ejercicios</span>
          {sessionVolume > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[#ea580c]">
              <Zap size={11} />
              {Math.round(sessionVolume).toLocaleString()}kg
            </span>
          )}
          {prCount > 0 && (
            <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none tracking-wide">
              🏆 {prCount} PR
            </span>
          )}
          <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </summary>

      {/* Detalle expandido */}
      <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
        {gs.notes && (
          <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 italic">{gs.notes}</p>
        )}
        {exerciseList.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">Sin series registradas</p>
        ) : (
          exerciseList.map((ex) => (
            <div key={ex.name}>
              <p className="text-sm font-semibold text-[#1e3a5f] mb-2 flex items-center gap-2">
                <Dumbbell size={13} />
                {ex.name}
              </p>
              <div className="space-y-1.5">
                {ex.sets.map((sl) => (
                  <div
                    key={sl.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${
                      sl.completed ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0 ${
                      sl.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {sl.setNumber}
                    </span>
                    {sl.weightKg != null ? (
                      <span className="font-semibold text-gray-800">{sl.weightKg} kg</span>
                    ) : (
                      <span className="text-gray-400">— kg</span>
                    )}
                    <span className="text-gray-400">×</span>
                    {sl.repsCompleted != null ? (
                      <span className="font-semibold text-gray-800">{sl.repsCompleted} reps</span>
                    ) : (
                      <span className="text-gray-400">— reps</span>
                    )}
                    <span className="ml-auto flex items-center gap-1.5">
                      {sl.isPR && (
                        <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none tracking-wide">
                          🏆 PR
                        </span>
                      )}
                      {sl.completed && !sl.isPR && (
                        <CheckCircle2 size={13} className="text-green-500" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div className="pt-1">
          <span className="text-xs text-gray-400">{completedSets} series completadas</span>
        </div>
      </div>
    </details>
  )
}

// ─── RunCard ──────────────────────────────────────────────────────────────────

type RunSessionData = Awaited<ReturnType<typeof fetchRunSessions>>[number]

function RunCard({ rs }: { rs: RunSessionData }) {
  const meta = rs.freeSessionType ? (RUN_META[rs.freeSessionType] ?? { label: 'Sesión libre', icon: '⚪' }) : { label: 'Sesión libre', icon: '⚪' }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4">
        {/* Icono */}
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <CheckCircle2 size={18} className="text-green-600" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{meta.icon}</span>
            <p className="font-semibold text-sm text-gray-900 truncate">{meta.label}</p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">
            {rs.completedAt ? formatDate(rs.completedAt) : ''}
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {rs.durationMin != null && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              {rs.durationMin}min
            </span>
          )}
          {rs.distanceKm != null && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={12} />
              {Number(rs.distanceKm).toFixed(1)} km
            </span>
          )}
          {rs.rpe != null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rpeColor(rs.rpe)}`}>
              RPE {rs.rpe}
            </span>
          )}
        </div>
      </div>

      {/* Notas */}
      {rs.notes && (
        <div className="border-t border-gray-100 px-4 pb-3 pt-2">
          <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 italic">{rs.notes}</p>
        </div>
      )}
      <EditRunButton
        logId={rs.id}
        initDurationMin={rs.durationMin}
        initDistanceKm={rs.distanceKm != null ? Number(rs.distanceKm) : null}
        initRpe={rs.rpe}
        initNotes={rs.notes}
      />
    </div>
  )
}
