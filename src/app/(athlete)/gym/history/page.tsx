import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { DAY_LABELS } from '@/lib/constants/sessions'
import { translateMuscleGroup } from '@/lib/gym/labels'
import { ChevronLeft, CheckCircle2, Dumbbell, Clock, Zap } from 'lucide-react'

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

export default async function GymHistoryPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { s: selectedSessionId } = await searchParams

  if (!session.user.features?.gym) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <span className="text-5xl">🏋️</span>
        <h2 className="text-xl font-bold text-[#1e3a5f]">Historial de gym disponible en Pro</h2>
        <p className="text-gray-500 text-sm max-w-xs">Accede a tu historial completo de sesiones con el plan Pro.</p>
        <a href="/upgrade" className="mt-2 inline-block rounded-xl bg-[#ea580c] text-white px-6 py-3 text-sm font-semibold hover:bg-[#ea6c0a] transition-colors">Ver planes → Pro $9.99/mes</a>
      </div>
    )
  }

  const athleteId = session.user.id

  const sessions = await prisma.gymSession.findMany({
    where: { athleteId },
    orderBy: { date: 'desc' },
    take: 50,
    include: {
      setLogs: {
        include: {
          workoutExercise: {
            include: {
              // BUG-039: exercise puede ser null si el WorkoutTemplate fue eliminado
              exercise: { select: { name: true, nameEs: true } },
            },
          },
        },
        // BUG-039: ordenar solo por setNumber cuando workoutExercise puede ser null
        orderBy: [{ setNumber: 'asc' }],
      },
      assignedWorkout: {
        include: {
          template: {
            include: {
              days: {
                select: { dayOfWeek: true, label: true, muscleGroups: true },
              },
            },
          },
        },
      },
    },
  })

  return (
    <div className="px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/gym"
          className="text-xs font-medium text-[#ea580c] hover:underline"
        >
          Entreno
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-[#1e3a5f]">Historial</h1>
      </div>

      {/* Stats summary — arriba, full width */}
      {sessions.length > 0 && (() => {
        const totalVolume = sessions.reduce((acc, s) =>
          acc + s.setLogs
            .filter((sl) => sl.completed)
            .reduce((a, sl) => a + (sl.weightKg ?? 0) * (sl.repsCompleted ?? 0), 0),
        0)
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Total sesiones</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{sessions.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Completadas</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mt-1">
                {sessions.filter((s) => s.completed).length}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Series totales</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mt-1">
                {sessions.reduce((acc, s) => acc + s.setLogs.filter((sl) => sl.completed).length, 0)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Volumen total</p>
              <p className="text-2xl font-bold text-[#ea580c] mt-1">
                {totalVolume > 1000
                  ? `${(totalVolume / 1000).toFixed(1)}t`
                  : `${Math.round(totalVolume).toLocaleString()} kg`}
              </p>
            </div>
          </div>
        )
      })()}

      {sessions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <Dumbbell size={28} className="text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-700">Sin sesiones registradas</p>
            <p className="text-sm text-gray-500 mt-1">Tus sesiones aparecerán aquí una vez que las completes</p>
          </div>
          <Link
            href="/gym/session"
            className="mt-2 inline-flex items-center gap-2 bg-[#ea580c] hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Comenzar sesión de hoy
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* ── MAIN: Lista de sesiones ─────────────────────────── */}
          <div className="space-y-3">
            {sessions.map((gs) => {
              const workoutDay = gs.assignedWorkout?.template.days.find(
                (d) => d.dayOfWeek === gs.dayOfWeek
              )

              const completedSets = gs.setLogs.filter((sl) => sl.completed).length
              const prCount = gs.setLogs.filter((sl) => sl.isPR).length
              const sessionVolume = gs.setLogs
                .filter((sl) => sl.completed)
                .reduce((acc, sl) => acc + (sl.weightKg ?? 0) * (sl.repsCompleted ?? 0), 0)

              return (
                <Link
                  key={gs.id}
                  href={`/gym/history?s=${gs.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full shrink-0 ${gs.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {workoutDay?.label ?? `${DAY_LABELS[gs.dayOfWeek]} — Sesión`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{formatDate(gs.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {gs.durationMin && (
                      <span className="text-xs text-gray-500">{gs.durationMin}m</span>
                    )}
                    {gs.rpe != null && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rpeColor(gs.rpe)}`}>
                        RPE {gs.rpe}
                      </span>
                    )}
                    {sessionVolume > 0 && (
                      <span className="text-xs font-semibold text-[#ea580c]">
                        {Math.round(sessionVolume).toLocaleString()}kg
                      </span>
                    )}
                    {prCount > 0 && (
                      <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                        {prCount} PR
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{completedSets}/{gs.setLogs.length}</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* ── SIDEBAR: Detalle sesión seleccionada ────────────── */}
          <aside className="hidden lg:block">
            {(() => {
              const selected = selectedSessionId ? sessions.find(s => s.id === selectedSessionId) : sessions[0]
              if (!selected) return null

              const workoutDay = selected.assignedWorkout?.template.days.find(
                (d) => d.dayOfWeek === selected.dayOfWeek
              )

              const exerciseGroups: Record<string, { name: string; sets: typeof selected.setLogs }> = {}
              for (const sl of selected.setLogs) {
                const exName = sl.exerciseName ?? sl.workoutExercise?.exercise?.nameEs ?? sl.workoutExercise?.exercise?.name ?? 'Ejercicio eliminado'
                const exId = sl.workoutExerciseId ?? sl.exerciseName ?? 'unknown'
                if (!exerciseGroups[exId]) exerciseGroups[exId] = { name: exName, sets: [] }
                exerciseGroups[exId].sets.push(sl)
              }
              const exerciseList = Object.values(exerciseGroups)

              const sessionVolume = selected.setLogs
                .filter(sl => sl.completed)
                .reduce((acc, sl) => acc + (sl.weightKg ?? 0) * (sl.repsCompleted ?? 0), 0)

              return (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-6">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <p className="font-bold text-[#1e3a5f] text-lg capitalize">{formatDate(selected.date)}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {workoutDay?.label ?? `${DAY_LABELS[selected.dayOfWeek]} — Sesión`}
                    </p>
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {selected.durationMin && (
                        <div className="text-center">
                          <p className="text-sm font-bold text-[#1e3a5f]">{selected.durationMin}</p>
                          <p className="text-[10px] text-gray-400">min</p>
                        </div>
                      )}
                      {selected.rpe != null && (
                        <div className="text-center">
                          <p className="text-sm font-bold text-[#1e3a5f]">{selected.rpe}/10</p>
                          <p className="text-[10px] text-gray-400">RPE</p>
                        </div>
                      )}
                      {sessionVolume > 0 && (
                        <div className="text-center">
                          <p className="text-sm font-bold text-[#ea580c]">{Math.round(sessionVolume).toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">kg</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#1e3a5f]">{selected.setLogs.filter(sl => sl.completed).length}/{selected.setLogs.length}</p>
                        <p className="text-[10px] text-gray-400">series</p>
                      </div>
                    </div>
                  </div>

                  {selected.notes && (
                    <div className="px-5 py-2 border-b border-gray-100 bg-gray-50">
                      <p className="text-xs text-gray-600 italic">{selected.notes}</p>
                    </div>
                  )}

                  <div className="px-5 py-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ejercicios</p>
                    <div className="space-y-4">
                      {exerciseList.map((ex) => (
                        <div key={ex.name}>
                          <p className="text-sm font-semibold text-[#1e3a5f] mb-1.5 flex items-center gap-2">
                            {ex.name}
                            {ex.sets.some(sl => sl.isPR) && (
                              <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">PR</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ex.sets.filter(sl => sl.completed).map(sl =>
                              sl.weightKg != null ? `${sl.weightKg}kg×${sl.repsCompleted}` : `${sl.repsCompleted} reps`
                            ).join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {workoutDay?.muscleGroups && workoutDay.muscleGroups.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                      {workoutDay.muscleGroups.map((mg) => (
                        <span key={mg} className="text-xs bg-[#1e3a5f]/8 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium">
                          {translateMuscleGroup(mg)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </aside>
        </div>
      )}
    </div>
  )
}
