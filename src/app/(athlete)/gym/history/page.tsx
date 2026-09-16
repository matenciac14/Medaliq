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

export default async function GymHistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

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
    <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/gym"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#ea580c] transition-colors"
        >
          <ChevronLeft size={16} />
          Entreno
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-[#1e3a5f]">Historial de sesiones</h1>
      </div>

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
        <div className="space-y-4">
          {sessions.map((gs) => {
            const workoutDay = gs.assignedWorkout?.template.days.find(
              (d) => d.dayOfWeek === gs.dayOfWeek
            )

            // Group set logs by exercise
            const exerciseGroups: Record<string, {
              name: string
              sets: typeof gs.setLogs
            }> = {}

            for (const sl of gs.setLogs) {
              // BUG-039: preferir exerciseName (snapshot) sobre el join, por si el template fue eliminado
              const exName = sl.exerciseName ?? sl.workoutExercise?.exercise?.nameEs ?? sl.workoutExercise?.exercise?.name ?? 'Ejercicio eliminado'
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

            return (
              <details key={gs.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
                <summary className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                  {/* Status icon */}
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
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {workoutDay?.label ?? `${DAY_LABELS[gs.dayOfWeek]} — Sesión`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{formatDate(gs.date)}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {gs.durationMin && (
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
                    {sessionVolume > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#ea580c]">
                        <Zap size={11} />
                        {Math.round(sessionVolume).toLocaleString()}kg
                      </span>
                    )}
                    {prCount > 0 && (
                      <span className="bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none tracking-wide">
                        🏆 {prCount} PR
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{completedSets} series</span>
                    <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </summary>

                {/* Expanded: exercise breakdown */}
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
                                <span className="font-semibold text-gray-800">
                                  {sl.weightKg} kg
                                </span>
                              ) : (
                                <span className="text-gray-400">— kg</span>
                              )}
                              <span className="text-gray-400">×</span>
                              {sl.repsCompleted != null ? (
                                <span className="font-semibold text-gray-800">
                                  {sl.repsCompleted} reps
                                </span>
                              ) : (
                                <span className="text-gray-400">— reps</span>
                              )}
                              <span className="ml-auto flex items-center gap-1.5">
                                {sl.isPR && (
                                  <span className="bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none tracking-wide">
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

                  {/* Muscle groups */}
                  {workoutDay?.muscleGroups && workoutDay.muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {workoutDay.muscleGroups.map((mg) => (
                        <span key={mg} className="text-xs bg-[#1e3a5f]/8 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium">
                          {translateMuscleGroup(mg)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}

      {/* Stats summary */}
      {sessions.length > 0 && (() => {
        const totalVolume = sessions.reduce((acc, s) =>
          acc + s.setLogs
            .filter((sl) => sl.completed)
            .reduce((a, sl) => a + (sl.weightKg ?? 0) * (sl.repsCompleted ?? 0), 0),
        0)
        return (
          <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/15 rounded-xl p-4 grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-[#1e3a5f]">{sessions.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Sesiones</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#1e3a5f]">
                {sessions.filter((s) => s.completed).length}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Completadas</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#1e3a5f]">
                {sessions.reduce((acc, s) => acc + s.setLogs.filter((sl) => sl.completed).length, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Series totales</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#ea580c]">
                {totalVolume > 1000
                  ? `${(totalVolume / 1000).toFixed(1)}t`
                  : Math.round(totalVolume).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Volumen total</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
