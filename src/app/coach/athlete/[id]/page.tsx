'use client'

import { useState } from 'react'
import Link from 'next/link'
import { mockAthletes, mockAthleteCheckIns } from '@/lib/mock/coach-data'
import AthleteFeatureToggles from './_components/AthleteFeatureToggles'

const TABS = ['Resumen', 'Plan', 'Progreso', 'Nutrición']

const mockWeekPlan = [
  {
    week: 1,
    label: 'Fase base — semana 1',
    sessions: [
      { day: 'Lunes', type: 'Carrera suave', detail: '5km a ritmo conversacional (Z2)', coachNote: '' },
      { day: 'Miércoles', type: 'Fuerza general', detail: '45min — squat, hip hinge, core', coachNote: '' },
      { day: 'Viernes', type: 'Carrera continua', detail: '7km a ritmo base', coachNote: '' },
      { day: 'Domingo', type: 'Rodaje largo', detail: '10km ritmo fácil', coachNote: '' },
    ],
  },
  {
    week: 2,
    label: 'Fase base — semana 2',
    sessions: [
      { day: 'Lunes', type: 'Carrera suave', detail: '6km Z2', coachNote: '' },
      { day: 'Miércoles', type: 'Fuerza + movilidad', detail: '45min', coachNote: '' },
      { day: 'Viernes', type: 'Tempo corto', detail: '3x10min Z3 con 3min recuperación', coachNote: '' },
      { day: 'Domingo', type: 'Rodaje largo', detail: '12km ritmo fácil', coachNote: '' },
    ],
  },
  {
    week: 3,
    label: 'Fase base — semana 3',
    sessions: [
      { day: 'Lunes', type: 'Carrera suave', detail: '6km Z2', coachNote: '' },
      { day: 'Martes', type: 'Fuerza funcional', detail: '50min', coachNote: '' },
      { day: 'Jueves', type: 'Fartlek', detail: '35min con cambios de ritmo', coachNote: '' },
      { day: 'Sábado', type: 'Rodaje largo', detail: '14km ritmo fácil', coachNote: '' },
    ],
  },
]

export default function AthleteDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('Resumen')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({})

  // Use first athlete as mock for all IDs
  const athlete = mockAthletes[0]
  const checkIns = mockAthleteCheckIns

  const maxWeight = Math.max(...checkIns.map((c) => c.weightKg))
  const minWeight = Math.min(...checkIns.map((c) => c.weightKg))

  function handleNoteChange(key: string, value: string) {
    setNotes((prev) => ({ ...prev, [key]: value }))
    setSavedNotes((prev) => ({ ...prev, [key]: false }))
  }

  function handleSaveNote(key: string) {
    setSavedNotes((prev) => ({ ...prev, [key]: true }))
  }

  // HR zones based on resting HR
  const hrMax = 220 - 35 // estimated for ~35yo
  const zones = [
    { label: 'Z1 — Recuperación', min: Math.round(hrMax * 0.5), max: Math.round(hrMax * 0.6) },
    { label: 'Z2 — Base aeróbica', min: Math.round(hrMax * 0.6), max: Math.round(hrMax * 0.7) },
    { label: 'Z3 — Tempo', min: Math.round(hrMax * 0.7), max: Math.round(hrMax * 0.8) },
    { label: 'Z4 — Umbral', min: Math.round(hrMax * 0.8), max: Math.round(hrMax * 0.9) },
    { label: 'Z5 — VO2max', min: Math.round(hrMax * 0.9), max: hrMax },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/coach/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        ← Volver al panel
      </Link>

      {/* Athlete header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {athlete.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{athlete.name}</h1>
          <p className="text-sm text-gray-500">{athlete.goal}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
            style={
              activeTab === t
                ? { color: '#1e3a5f', borderBottom: '2px solid #1e3a5f', marginBottom: '-1px' }
                : { color: '#6b7280' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {activeTab === 'Resumen' && (
        <div className="space-y-6">
          {/* Perfil */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Perfil del atleta</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Peso actual" value={`${athlete.weightKg} kg`} />
              <Stat label="Peso objetivo" value={`${athlete.weightGoalKg} kg`} />
              <Stat label="FC reposo" value={`${athlete.hrResting} bpm`} />
              <Stat label="Adherencia" value={`${athlete.adherencePct}%`} />
              <Stat label="Semana" value={`${athlete.currentWeek}/${athlete.totalWeeks}`} />
              <Stat label="Fase" value={athlete.phase} />
              <Stat label="Último check-in" value={`Hace ${athlete.lastCheckInDaysAgo} días`} />
              <Stat label="Email" value={athlete.email} />
            </div>
          </div>

          {/* Zonas FC */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Zonas de frecuencia cardíaca</h2>
            <div className="space-y-2">
              {zones.map((z, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: ['#93c5fd', '#4ade80', '#facc15', '#fb923c', '#f87171'][i] }}
                  />
                  <span className="text-gray-700 w-44">{z.label}</span>
                  <span className="text-gray-500 font-mono text-xs">
                    {z.min} – {z.max} bpm
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          {athlete.alerts.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5">
              <h2 className="font-semibold text-red-800 mb-3">Alertas activas</h2>
              <ul className="space-y-2">
                {athlete.alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <span>⚠</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acceso del atleta */}
          <AthleteFeatureToggles
            athleteId={params.id}
            initialFeatures={{ plan: true, checkin: true, nutrition: false, progress: false }}
          />

          {/* Últimos check-ins tabla */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
            <h2 className="font-semibold text-gray-900 mb-4">Últimos check-ins</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Semana</th>
                  <th className="pb-2 font-medium">Peso</th>
                  <th className="pb-2 font-medium">FC reposo</th>
                  <th className="pb-2 font-medium">Sueño</th>
                  <th className="pb-2 font-medium">Energía</th>
                  <th className="pb-2 font-medium">Adherencia</th>
                  <th className="pb-2 font-medium">Dolor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {checkIns.map((c) => (
                  <tr key={c.week}>
                    <td className="py-2.5 font-medium text-gray-700">S{c.week}</td>
                    <td className="py-2.5 text-gray-600">{c.weightKg} kg</td>
                    <td className="py-2.5 text-gray-600">{c.hrResting} bpm</td>
                    <td className="py-2.5 text-gray-600">{c.sleepScore}/100</td>
                    <td className="py-2.5 text-gray-600">{c.energyLevel}/10</td>
                    <td className="py-2.5 text-gray-600">{c.adherencePct}%</td>
                    <td className="py-2.5">
                      {c.painFlag ? (
                        <span className="text-red-600 font-medium">Sí</span>
                      ) : (
                        <span className="text-green-600">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Plan */}
      {activeTab === 'Plan' && (
        <div className="space-y-6">
          {/* Review CTA */}
          <div className="flex justify-end">
            <Link
              href={`/coach/plan/${params.id}/review`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Revisar y aprobar →
            </Link>
          </div>

          {mockWeekPlan.map((week) => (
            <div key={week.week} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold mb-4" style={{ color: '#1e3a5f' }}>
                {week.label}
              </h2>
              <div className="space-y-4">
                {week.sessions.map((session, si) => {
                  const noteKey = `${week.week}-${si}`
                  return (
                    <div key={si} className="border-l-2 pl-4" style={{ borderColor: '#f97316' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-400 uppercase">{session.day}</span>
                        <span className="text-sm font-medium text-gray-900">{session.type}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{session.detail}</p>
                      <div className="flex gap-2 items-start">
                        <textarea
                          rows={2}
                          placeholder="Nota del coach..."
                          value={notes[noteKey] ?? session.coachNote}
                          onChange={(e) => handleNoteChange(noteKey, e.target.value)}
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 text-gray-700 placeholder-gray-300"
                        />
                        <button
                          onClick={() => handleSaveNote(noteKey)}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: savedNotes[noteKey] ? '#16a34a' : '#1e3a5f' }}
                        >
                          {savedNotes[noteKey] ? '✓ Guardado' : 'Guardar nota'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Progreso */}
      {activeTab === 'Progreso' && (
        <div className="space-y-6">
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
                  <th className="pb-2 font-medium">Adherencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {checkIns.map((c) => (
                  <tr key={c.week}>
                    <td className="py-2.5 font-medium text-gray-700">S{c.week}</td>
                    <td className="py-2.5 text-gray-600">{c.weightKg}</td>
                    <td className="py-2.5 text-gray-600">{c.hrResting}</td>
                    <td className="py-2.5 text-gray-600">{c.sleepScore}</td>
                    <td className="py-2.5 text-gray-600">{c.energyLevel}</td>
                    <td className="py-2.5 text-gray-600">{c.adherencePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Curva de peso */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-5">Curva de peso</h2>
            <div className="flex items-end gap-4 h-28">
              {checkIns.map((c) => {
                const range = maxWeight - minWeight || 1
                const heightPct = ((c.weightKg - minWeight) / range) * 70 + 30
                return (
                  <div key={c.week} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs text-gray-500 font-mono">{c.weightKg}</span>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: '#1e3a5f',
                        opacity: 0.7 + (checkIns.indexOf(c) / checkIns.length) * 0.3,
                      }}
                    />
                    <span className="text-xs text-gray-400">S{c.week}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Adherencia */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-5">Adherencia semanal</h2>
            <div className="space-y-3">
              {checkIns.map((c) => (
                <div key={c.week} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-6">S{c.week}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.adherencePct}%`,
                        backgroundColor: c.adherencePct >= 70 ? '#16a34a' : c.adherencePct >= 40 ? '#d97706' : '#dc2626',
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-9 text-right">
                    {c.adherencePct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Nutrición */}
      {activeTab === 'Nutrición' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-4xl mb-4">🥗</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Plan nutricional</h2>
          <p className="text-gray-400 text-sm">Próximamente — en desarrollo</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}
