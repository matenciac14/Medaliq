'use client'

import { useState } from 'react'

const DISCIPLINE_LABEL: Record<string, string> = {
  RUNNING: '🏃 Running',
  STRENGTH: '🏋️ Fuerza',
  CYCLING: '🚴 Ciclismo',
  SWIMMING: '🏊 Natación',
  OTHER: '⚡ Actividad',
  FUERZA: '🏋️ Fuerza',
}

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60)
  const sec = secPerKm % 60
  return `${min}:${String(sec).padStart(2, '0')} min/km`
}

type RunningLog = {
  id: string
  date: string
  discipline: string
  durationMin: number | null
  distanceKm: number | null
  avgPaceSecPerKm: number | null
  hrAvg: number | null
  hrMax: number | null
  rpe: number | null
  notes: string | null
  sessionLabel: string | null
  intensity: string | null
}

type GymExerciseLog = {
  exerciseId: string
  name: string
  bodyPart: string
  muscleGroups: string[]
  logs: {
    date: string
    sets: {
      setNumber: number
      weightKg: number | null
      repsCompleted: number | null
      isPR: boolean
      setLogType: string
    }[]
  }[]
}

type GymPR = {
  exerciseName: string
  bodyPart: string
  weightKg: number
  repsCompleted: number
  estimated1RM: number
  achievedAt: string
}

/** Brzycki 1RM estimado — solo válido para sets WORK con reps < 37 */
function estimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || reps >= 37 || weightKg <= 0) return weightKg
  return Math.round((weightKg * 36) / (37 - reps) * 10) / 10
}

interface SesionesTabProps {
  athleteId: string
  gymLoading: boolean
  gymLoaded: boolean
  gymLogs: GymExerciseLog[]
  gymPRsLoading: boolean
  gymPRsLoaded: boolean
  gymPRs: GymPR[]
  runningLogs: RunningLog[]
  runningLogsLoading: boolean
  runningLogsLoaded: boolean
}

export default function SesionesTab({
  athleteId,
  gymLoading, gymLoaded, gymLogs,
  gymPRsLoading, gymPRsLoaded, gymPRs,
  runningLogs, runningLogsLoading, runningLogsLoaded,
}: SesionesTabProps) {
  const hasAnyData = gymLogs.length > 0 || runningLogs.length > 0
  const isLoading = gymLoading || runningLogsLoading
  const [celebratingPr, setCelebratingPr] = useState<string | null>(null)
  const [celebratedPrs, setCelebratedPrs] = useState<Set<string>>(new Set())

  async function handleCelebratePr(exerciseName: string, weightKg: number) {
    if (celebratingPr || celebratedPrs.has(exerciseName)) return
    setCelebratingPr(exerciseName)
    try {
      await fetch(`/api/coach/athletes/${athleteId}/celebrate-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName, weightKg }),
      })
      setCelebratedPrs(prev => new Set([...prev, exerciseName]))
    } finally {
      setCelebratingPr(null)
    }
  }

  return (
    <div className="space-y-5">
      {isLoading && (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando sesiones...</div>
      )}

      {!isLoading && !hasAnyData && gymLoaded && runningLogsLoaded && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin sesiones registradas</h2>
          <p className="text-gray-400 text-sm">El atleta aún no ha completado sesiones</p>
        </div>
      )}

      {/* Sesiones de running y cardio */}
      {!runningLogsLoading && runningLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Sesiones de actividad — últimas {runningLogs.length}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {runningLogs.map((log) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">{log.date}</span>
                      <span className="text-xs font-semibold text-[#1e3a5f] bg-[#1e3a5f]/10 px-2 py-0.5 rounded-full">
                        {DISCIPLINE_LABEL[log.discipline] ?? log.discipline}
                      </span>
                      {log.intensity && (
                        <span className="text-xs text-gray-400">{log.intensity}</span>
                      )}
                    </div>
                    {log.sessionLabel && (
                      <p className="text-xs text-gray-600 font-medium mb-1">{log.sessionLabel}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {log.durationMin && <span>⏱ {log.durationMin} min</span>}
                      {log.distanceKm && <span>📍 {log.distanceKm.toFixed(1)} km</span>}
                      {log.avgPaceSecPerKm && <span>🏃 {formatPace(log.avgPaceSecPerKm)}</span>}
                      {log.hrAvg && <span>❤️ {log.hrAvg} bpm avg</span>}
                      {log.hrMax && <span className="text-red-400">⬆ {log.hrMax} bpm máx</span>}
                    </div>
                    {log.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">"{log.notes}"</p>
                    )}
                  </div>
                  {log.rpe && (
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-gray-400">RPE</span>
                      <p className="text-lg font-bold text-[#ea580c]">{log.rpe}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!gymLoading && gymLogs.map((ex) => {
        const maxGymWeight = Math.max(1, ...ex.logs.flatMap((l) => l.sets.map((s) => s.weightKg ?? 0)))
        return (
          <div key={ex.exerciseId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{ex.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ex.muscleGroups.slice(0, 3).map((mg) => (
                    <span key={mg} className="text-[10px] font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] px-1.5 py-0.5 rounded-full">
                      {mg}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {ex.logs.length} sesión{ex.logs.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {/* Mini bar chart */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Peso máximo por sesión (kg)</p>
              <div className="flex items-end gap-1.5 h-16">
                {ex.logs.map((log, li) => {
                  const sessionMax = Math.max(0, ...log.sets.map((s) => s.weightKg ?? 0))
                  const heightPct = maxGymWeight > 0 ? (sessionMax / maxGymWeight) * 100 : 0
                  return (
                    <div key={li} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                      <span className="text-[10px] text-gray-400 font-mono truncate w-full text-center">
                        {sessionMax > 0 ? `${sessionMax}` : '—'}
                      </span>
                      <div
                        className="w-full rounded-t-sm transition-all"
                        style={{
                          height: `${Math.max(heightPct, 4)}%`,
                          backgroundColor: '#ea580c',
                          opacity: 0.5 + (li / ex.logs.length) * 0.5,
                        }}
                      />
                      <span className="text-[10px] text-gray-300 truncate w-full text-center">
                        {log.date.slice(5)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Last session detail */}
            {ex.logs.length > 0 && (() => {
              const last = ex.logs[ex.logs.length - 1]
              return (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Última sesión — {last.date}</p>
                  <div className="flex flex-wrap gap-2">
                    {last.sets.map((s) => (
                      <div key={s.setNumber} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
                        <span className="font-bold text-[#1e3a5f] w-4 text-center">{s.setNumber}</span>
                        <span className="text-gray-500">
                          {s.weightKg != null ? `${s.weightKg} kg` : '—'} × {s.repsCompleted ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )
      })}

      {/* PRs del atleta */}
      {gymPRsLoading && (
        <div className="text-center py-8 text-gray-400 text-sm">Cargando récords...</div>
      )}
      {!gymPRsLoading && gymPRsLoaded && gymPRs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">🏆 Récords Personales</span>
            <span className="text-xs text-gray-400">{gymPRs.length} ejercicio{gymPRs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {gymPRs.map((pr) => (
              <div key={pr.exerciseName} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{pr.exerciseName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pr.achievedAt} · {pr.bodyPart}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#ea580c]">{pr.weightKg} kg × {pr.repsCompleted}</p>
                    <p className="text-xs text-gray-400">1RM est. {pr.estimated1RM} kg</p>
                  </div>
                  <span className="text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">PR</span>
                  <button
                    onClick={() => handleCelebratePr(pr.exerciseName, pr.weightKg)}
                    disabled={!!celebratingPr || celebratedPrs.has(pr.exerciseName)}
                    title={celebratedPrs.has(pr.exerciseName) ? 'Celebrado' : 'Celebrar PR del atleta'}
                    className={`text-lg transition-transform active:scale-90 ${celebratedPrs.has(pr.exerciseName) ? 'opacity-40 cursor-default' : 'hover:scale-110 cursor-pointer'}`}
                  >
                    {celebratingPr === pr.exerciseName ? '...' : celebratedPrs.has(pr.exerciseName) ? '✅' : '🏆'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Curva de fuerza 1RM (Brzycki) */}
      {gymLoaded && gymLogs.length > 0 && (() => {
        const withHistory = gymLogs
          .map(ex => {
            const points = ex.logs
              .map(log => {
                const workSets = log.sets.filter(s => s.setLogType === 'WORK' || !s.setLogType)
                const maxEst = workSets.reduce((best, s) => {
                  if (!s.weightKg || !s.repsCompleted) return best
                  const est = estimated1RM(s.weightKg, s.repsCompleted)
                  return est > best ? est : best
                }, 0)
                return maxEst > 0 ? { date: log.date, est1RM: maxEst } : null
              })
              .filter((p): p is { date: string; est1RM: number } => p !== null)
            return { name: ex.name, points }
          })
          .filter(ex => ex.points.length >= 2)
          .slice(0, 4)

        if (withHistory.length === 0) return null

        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">📈 Curva de fuerza (1RM estimado — Brzycki)</p>
            <div className="space-y-5">
              {withHistory.map(ex => {
                const maxVal = Math.max(...ex.points.map(p => p.est1RM))
                const minVal = Math.min(...ex.points.map(p => p.est1RM))
                const range = maxVal - minVal || 1
                const trend = ex.points.length >= 2
                  ? ex.points[ex.points.length - 1].est1RM - ex.points[0].est1RM
                  : 0
                return (
                  <div key={ex.name}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">{ex.name}</p>
                      <span className={`text-xs font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {trend >= 0 ? '+' : ''}{Math.round(trend * 10) / 10} kg
                      </span>
                    </div>
                    <div className="flex items-end gap-1 h-12">
                      {ex.points.map((p, i) => {
                        const heightPct = ((p.est1RM - minVal) / range) * 75 + 25
                        const isLast = i === ex.points.length - 1
                        return (
                          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0" title={`${p.date}: ${p.est1RM} kg`}>
                            <div
                              className="w-full rounded-t-sm"
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: isLast ? '#ea580c' : '#1e3a5f',
                                opacity: isLast ? 1 : 0.4 + (i / ex.points.length) * 0.4,
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-300">{ex.points[0].date.slice(5)}</span>
                      <span className="text-[10px] font-bold text-[#ea580c]">{ex.points[ex.points.length - 1].est1RM} kg</span>
                      <span className="text-[10px] text-gray-300">{ex.points[ex.points.length - 1].date.slice(5)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
