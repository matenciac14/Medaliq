'use client'

import Link from 'next/link'

type GymAssignedDay = {
  id: string; dayOfWeek: number; label: string
  muscleGroups: string[]; isRestDay: boolean
  exercises: { id: string; sets: number; repsScheme: string; exercise: { id: string; name: string; muscleGroups: string[] } }[]
}

type GymAssignedData = {
  assignment: {
    id: string; startDate: string; endDate: string | null; notes: string | null
    template: { id: string; name: string; goal: string | null; level: string | null; daysPerWeek: number; days: GymAssignedDay[] }
  } | null
  recentSessions: { id: string; date: string; dayOfWeek: number; durationMin: number | null; rpe: number | null; overridesCount: number; source: 'assignment' | 'plan'; label: string | null }[]
  runningSessions: Record<number, { type: string; durationMin: number | null; intensity: string }>
}

const DOW_LABELS: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' }
const HARD_SESSIONS = new Set(['TEMPO', 'INTERVALOS', 'TIRADA_LARGA', 'FARTLEK', 'TEST', 'SIMULACRO'])

interface EjerciciosTabProps {
  athleteId: string
  gymAssignedLoading: boolean
  gymAssigned: GymAssignedData
}

export default function EjerciciosTab({ athleteId, gymAssignedLoading, gymAssigned }: EjerciciosTabProps) {
  return (
    <div className="space-y-5">
      {/* Banner → Plan Builder */}
      <div className="rounded-xl border border-purple-200/50 p-4 flex items-center justify-between gap-4" style={{ backgroundColor: '#7c3aed08' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#7c3aed' }}>
            Las rutinas de gym ahora se visualizan en el Plan Builder
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Cada día del plan muestra la rutina asignada junto al entrenamiento y la nutrición.
          </p>
        </div>
        <Link
          href={`/coach/athletes/${athleteId}/plan/build`}
          className="shrink-0 text-xs font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#7c3aed' }}
        >
          Ir al Plan Builder →
        </Link>
      </div>

      {gymAssignedLoading && (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando rutina...</div>
      )}

      {!gymAssignedLoading && !gymAssigned.assignment && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">🏋️</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin rutina asignada</h2>
          <p className="text-gray-400 text-sm mb-4">El atleta no tiene una rutina activa</p>
          <a
            href="/coach/gym"
            className="inline-block px-5 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Ir a mis rutinas
          </a>
        </div>
      )}

      {!gymAssignedLoading && gymAssigned.assignment && (() => {
        const { assignment, recentSessions, runningSessions } = gymAssigned
        const { template } = assignment
        return (
          <>
            {/* Template card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Rutina activa</p>
                  <h2 className="text-lg font-bold text-gray-900">{template.name}</h2>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {template.goal && (
                      <span className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium">{template.goal}</span>
                    )}
                    {template.level && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{template.level}</span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{template.daysPerWeek}d/semana</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={`/coach/gym/routines/${template.id}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
                  >
                    Modificar
                  </a>
                  <a
                    href="/coach/gym"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    Asignar otra
                  </a>
                </div>
              </div>

              {/* Days overview */}
              <div className="space-y-2">
                {template.days.map(day => {
                  const runSession = runningSessions[day.dayOfWeek]
                  const hasConflict = !day.isRestDay && runSession && HARD_SESSIONS.has(runSession.type)
                  return (
                    <div key={day.id} className={`flex items-start gap-3 py-2 border-t first:border-t-0 ${hasConflict ? 'border-orange-100 bg-orange-50/40 rounded-lg px-2 -mx-2' : 'border-gray-50'}`}>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                        style={day.isRestDay
                          ? { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                          : { backgroundColor: '#1e3a5f', color: 'white' }}
                      >
                        {DOW_LABELS[day.dayOfWeek] ?? day.dayOfWeek}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-800">{day.label}</p>
                          {hasConflict && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                              ! Doble carga
                            </span>
                          )}
                        </div>
                        {day.isRestDay ? (
                          <p className="text-xs text-gray-400">Descanso gym</p>
                        ) : (
                          <p className="text-xs text-gray-500 truncate">
                            {day.exercises.map(e => e.exercise.name).join(' · ')}
                          </p>
                        )}
                        {runSession && (
                          <p className={`text-xs mt-0.5 font-medium ${hasConflict ? 'text-orange-600' : 'text-blue-500'}`}>
                            Running: {runSession.type.replace(/_/g, ' ')} {runSession.durationMin}min
                          </p>
                        )}
                        {!runSession && !day.isRestDay && (
                          <p className="text-xs text-green-600 mt-0.5">Sin running este dia</p>
                        )}
                      </div>
                      {!day.isRestDay && (
                        <span className="text-xs text-gray-400 shrink-0">{day.exercises.length} ejerc.</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {assignment.notes && (
                <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">{assignment.notes}</p>
              )}
            </div>

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700">Últimas sesiones</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentSessions.map(s => (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: '#1e3a5f', color: 'white' }}
                        >
                          {DOW_LABELS[s.dayOfWeek] ?? s.dayOfWeek}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-800">{s.date}</p>
                            {s.source === 'plan' && (
                              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                Plan
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {s.label ?? (s.durationMin != null ? `${s.durationMin} min` : null)}
                            {s.label && s.durationMin != null && ` · ${s.durationMin} min`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.overridesCount > 0 && (
                          <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            {s.overridesCount} cambio{s.overridesCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {s.rpe != null && (
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: s.rpe >= 8 ? '#fef2f2' : s.rpe >= 6 ? '#fff7ed' : '#f0fdf4',
                              color: s.rpe >= 8 ? '#dc2626' : s.rpe >= 6 ? '#ea580c' : '#16a34a',
                            }}
                          >
                            RPE {s.rpe}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentSessions.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
                <p className="text-sm text-gray-400">El atleta aún no ha completado sesiones de gym</p>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
