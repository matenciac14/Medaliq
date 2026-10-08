'use client'

import type { CheckInData } from '../AthleteDetailClient'

interface ProgresoTabProps {
  checkInsSorted: CheckInData[]
  weights: number[]
  maxWeight: number
  minWeight: number
}

export default function ProgresoTab({ checkInsSorted, weights, maxWeight, minWeight }: ProgresoTabProps) {
  return (
    <div className="space-y-6">
      {checkInsSorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin datos de progreso</h2>
          <p className="text-gray-400 text-sm">El atleta aún no ha completado check-ins</p>
        </div>
      ) : (
        <>
          {/* Tabla de check-ins */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
            <h2 className="font-semibold text-gray-900 mb-4">Historial de check-ins</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Semana</th>
                  <th className="pb-2 font-medium">Peso (kg)</th>
                  <th className="pb-2 font-medium">FC reposo</th>
                  <th className="pb-2 font-medium">Sueño</th>
                  <th className="pb-2 font-medium">Energía</th>
                  <th className="pb-2 font-medium">Estrés</th>
                  <th className="pb-2 font-medium">Motivación</th>
                  <th className="pb-2 font-medium">Dolor</th>
                  <th className="pb-2 font-medium">Cintura</th>
                  <th className="pb-2 font-medium">Brazos</th>
                  <th className="pb-2 font-medium">Cadera</th>
                  <th className="pb-2 font-medium">Muslos</th>
                  <th className="pb-2 font-medium">Adherencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {checkInsSorted.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 font-medium text-gray-700">S{c.weekNumber}</td>
                    <td className="py-2.5 text-gray-600">{c.weightKg ?? '—'}</td>
                    <td className="py-2.5 text-gray-600">{c.hrResting ?? '—'}</td>
                    <td className="py-2.5 text-gray-600">{c.sleepScore ?? '—'}</td>
                    <td className="py-2.5 text-gray-600">{c.energyLevel ?? '—'}</td>
                    <td className="py-2.5">
                      {c.stressLevel != null ? (
                        <span className={c.stressLevel >= 7 ? 'text-red-600 font-semibold' : c.stressLevel >= 4 ? 'text-amber-600' : 'text-gray-600'}>
                          {c.stressLevel}/10
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5">
                      {c.motivationLevel != null ? (
                        <span className={c.motivationLevel <= 3 ? 'text-red-600 font-semibold' : c.motivationLevel <= 6 ? 'text-amber-600' : 'text-green-600'}>
                          {c.motivationLevel}/10
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5">
                      {c.painLevel != null ? (
                        <span className={c.painLevel >= 5 ? 'text-red-600 font-semibold' : c.painLevel >= 3 ? 'text-amber-600' : 'text-gray-600'}>
                          {c.painLevel}/10
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 text-gray-600">{c.waistCm != null ? `${c.waistCm} cm` : '—'}</td>
                    <td className="py-2.5 text-gray-600">{c.armsCm != null ? `${c.armsCm} cm` : '—'}</td>
                    <td className="py-2.5 text-gray-600">{c.hipsCm != null ? `${c.hipsCm} cm` : '—'}</td>
                    <td className="py-2.5 text-gray-600">{c.thighsCm != null ? `${c.thighsCm} cm` : '—'}</td>
                    <td className="py-2.5 text-gray-600">
                      {c.dietAdherencePct != null ? `${c.dietAdherencePct}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Curva de peso */}
          {weights.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-5">Curva de peso</h2>
              <div className="flex items-end gap-4 h-28">
                {checkInsSorted
                  .filter((c) => c.weightKg !== null)
                  .map((c, idx, arr) => {
                    const range = maxWeight - minWeight || 1
                    const heightPct = (((c.weightKg as number) - minWeight) / range) * 70 + 30
                    return (
                      <div key={c.id} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-xs text-gray-500 font-mono">{c.weightKg}</span>
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: '#1e3a5f',
                            opacity: 0.7 + (idx / arr.length) * 0.3,
                          }}
                        />
                        <span className="text-xs text-gray-400">S{c.weekNumber}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Circunferencias corporales */}
          {checkInsSorted.some((c) => c.waistCm !== null || c.armsCm !== null || c.hipsCm !== null || c.thighsCm !== null) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Circunferencias corporales</h2>
              <div className="space-y-5">
                {([
                  { key: 'waistCm' as const, label: 'Cintura', color: '#6366f1' },
                  { key: 'armsCm'  as const, label: 'Brazos',  color: '#ea580c' },
                  { key: 'hipsCm'  as const, label: 'Cadera',  color: '#ec4899' },
                  { key: 'thighsCm' as const, label: 'Muslos', color: '#14b8a6' },
                ]).map(({ key, label, color }) => {
                  const pts = checkInsSorted.filter(c => c[key] !== null)
                  if (pts.length === 0) return null
                  const latest = pts[pts.length - 1][key] as number
                  const first  = pts[0][key] as number
                  const delta  = +(latest - first).toFixed(1)
                  const maxVal = Math.max(...pts.map(p => p[key] as number))
                  const minVal = Math.min(...pts.map(p => p[key] as number))
                  const range  = maxVal - minVal || 1
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        <div className="flex items-center gap-2">
                          {delta !== 0 && (
                            <span className={`text-xs font-semibold ${delta < 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {delta > 0 ? '+' : ''}{delta} cm
                            </span>
                          )}
                          <span className="text-sm font-bold" style={{ color }}>{latest} cm</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-1" style={{ height: 36 }}>
                        {pts.map((c, idx) => {
                          const heightPct = 25 + ((c[key] as number - minVal) / range) * 75
                          return (
                            <div key={c.id} title={`S${c.weekNumber}: ${c[key]} cm`} className="flex-1 rounded-t-sm transition-all" style={{ height: `${heightPct}%`, backgroundColor: color, opacity: 0.55 + (idx / pts.length) * 0.45 }} />
                          )
                        })}
                      </div>
                      <div className="flex gap-1 mt-0.5">
                        {pts.map(c => (
                          <div key={c.id} className="flex-1 text-center">
                            <span className="text-[10px] text-gray-400">S{c.weekNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Adherencia */}
          {checkInsSorted.some((c) => c.dietAdherencePct !== null) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-5">Adherencia semanal</h2>
              <div className="space-y-3">
                {checkInsSorted
                  .filter((c) => c.dietAdherencePct !== null)
                  .map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-6">S{c.weekNumber}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${c.dietAdherencePct}%`,
                            backgroundColor:
                              (c.dietAdherencePct ?? 0) >= 70
                                ? '#16a34a'
                                : (c.dietAdherencePct ?? 0) >= 40
                                ? '#d97706'
                                : '#dc2626',
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-9 text-right">
                        {c.dietAdherencePct}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
