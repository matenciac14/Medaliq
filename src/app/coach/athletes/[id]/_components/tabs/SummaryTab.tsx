'use client'

import { Fragment } from 'react'
import { getInitialWeekIdx } from '@/lib/core/week_number'
import type { AthleteData, HealthProfileData, ActivePlanData, CheckInData, PaymentData, PRRecord, GymRoutineData } from '../AthleteDetailClient'

type DailyLogEntry = { date: string; weightKg: number | null; energyLevel: number | null; hrResting: number | null; sleepHours: number | null }

const PHASE_LABEL: Record<string, string> = {
  BASE: 'BASE', DESARROLLO: 'DESARROLLO',
  ESPECIFICO: 'ESPECÍFICO', AFINAMIENTO: 'AFINAMIENTO',
}

const ZONE_COLORS = ['#93c5fd', '#4ade80', '#facc15', '#fb923c', '#f87171']

const GOAL_LABEL: Record<string, string> = {
  HYPERTROPHY: 'Hipertrofía',
  STRENGTH: 'Fuerza',
  TONING: 'Tonificación',
  FUNCTIONAL: 'Funcional',
}

function timeAgoFromDate(date: Date): string {
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  if (days < 7) return `hace ${days} días`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return 'hace 1 sem'
  return `hace ${weeks} sem`
}

interface ResumenTabProps {
  athleteId: string
  athlete: AthleteData
  healthProfile: HealthProfileData
  activePlan: ActivePlanData
  latestCheckIn: CheckInData | null
  checkInsSorted: CheckInData[]
  lastCheckInDaysAgo: number | null
  alerts: string[]
  dailyLogs: DailyLogEntry[]
  zones: { label: string; min: number; max: number }[]
  coachGoal: string
  setCoachGoal: (v: string) => void
  privateNotes: string
  setPrivateNotes: (v: string) => void
  savingCoachNotes: boolean
  coachNotesSaved: boolean
  handleSaveCoachNotes: () => void
  latestPayment: PaymentData
  prRecords: PRRecord[]
  gymRoutine: GymRoutineData
  volumeTotalKg: number
}

export default function ResumenTab({
  athlete,
  healthProfile,
  activePlan,
  latestCheckIn,
  checkInsSorted,
  lastCheckInDaysAgo,
  alerts,
  dailyLogs,
  zones,
  coachGoal,
  setCoachGoal,
  privateNotes,
  setPrivateNotes,
  savingCoachNotes,
  coachNotesSaved,
  handleSaveCoachNotes,
  latestPayment,
  prRecords,
  gymRoutine,
  volumeTotalKg,
}: ResumenTabProps) {
  const currentWeekIdx = activePlan ? getInitialWeekIdx(activePlan) : -1
  const currentWeekNum = currentWeekIdx >= 0 ? (activePlan!.weeks[currentWeekIdx]?.weekNumber ?? 0) : 0
  const currentPhase = currentWeekIdx >= 0 ? (activePlan!.weeks[currentWeekIdx]?.phase ?? null) : null
  const isRunning = healthProfile?.sport === 'RUNNING'
  const injuryCount = (healthProfile?.injuries.length ?? 0) + (healthProfile?.conditions.length ?? 0)

  const classifiedAlerts = alerts
    .map(text => ({
      level: (text.includes('dolor') || text.includes('FC reposo')) ? 'critical' as const : 'attention' as const,
      text,
    }))
    .sort((a, b) => (a.level === 'critical' ? -1 : 1) - (b.level === 'critical' ? -1 : 1))

  // Trend computation
  const weights = dailyLogs.filter(l => l.weightKg != null).map(l => l.weightKg!)
  const energies = dailyLogs.filter(l => l.energyLevel != null).map(l => l.energyLevel!)
  const hrs = dailyLogs.filter(l => l.hrResting != null).map(l => l.hrResting!)
  const sleeps = dailyLogs.filter(l => l.sleepHours != null).map(l => l.sleepHours!)
  const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null
  const trend = (arr: number[]) => {
    if (arr.length < 2) return null
    const diff = arr[arr.length - 1] - arr[0]
    return diff > 0.2 ? 'up' as const : diff < -0.2 ? 'down' as const : 'stable' as const
  }

  const adherencePct = latestCheckIn?.dietAdherencePct ?? null

  return (
    <div className="space-y-5">
      {/* Alert Banner */}
      {classifiedAlerts.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <span className="text-amber-500 text-lg">&#9888;</span>
          <div className="flex-1 flex items-center gap-2 flex-wrap text-sm">
            {classifiedAlerts.map((alert, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="text-amber-300 mx-1">·</span>}
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: alert.level === 'critical' ? '#ef4444' : '#f97316' }}
                >
                  {alert.level === 'critical' ? 'Crítico' : 'Atención'}
                </span>
                <span className="text-gray-700 text-sm">{alert.text}</span>
              </Fragment>
            ))}
          </div>
          <span className="text-sm font-medium shrink-0 cursor-pointer" style={{ color: '#1e3a5f' }}>
            {classifiedAlerts.some(a => a.level === 'critical') ? 'Resolver →' : 'Ver detalles →'}
          </span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="PESO ACTUAL"
          value={healthProfile?.weightKg != null ? `${healthProfile.weightKg}` : '—'}
          unit="kg"
          sub={healthProfile?.weightGoalKg ? `Objetivo: ${healthProfile.weightGoalKg} kg` : '—'}
          dotColor="#22c55e"
        />
        <KpiCard
          label="FC REPOSO"
          value={healthProfile?.hrResting != null ? `${healthProfile.hrResting}` : '—'}
          unit="bpm"
          sub="Karvonen activo"
          dotColor="#22c55e"
        />
        <KpiCard
          label="ADHERENCIA"
          value={adherencePct != null ? `${adherencePct}%` : '—'}
          sub="Último check-in"
          dotColor={adherencePct != null ? (adherencePct >= 80 ? '#22c55e' : adherencePct >= 50 ? '#f97316' : '#ef4444') : '#9ca3af'}
        />
        <KpiCard
          label="ÚLTIMO CHECK-IN"
          value={lastCheckInDaysAgo != null ? `${lastCheckInDaysAgo} días` : '—'}
          sub={activePlan ? `Semana ${currentWeekNum}/${activePlan.totalWeeks}` : '—'}
          dotColor={lastCheckInDaysAgo != null ? (lastCheckInDaysAgo <= 3 ? '#22c55e' : lastCheckInDaysAgo <= 7 ? '#f97316' : '#ef4444') : '#9ca3af'}
        />
      </div>

      {/* Perfil + Seguimiento (2 columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Perfil del atleta */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-semibold text-gray-900">Perfil del atleta</h2>
            {injuryCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                &#9650; {injuryCount} {injuryCount === 1 ? 'lesión activa' : 'lesiones activas'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-y-5 gap-x-6">
            {/* Row 1: Plan/Rutina info */}
            <ProfileStat
              label={isRunning ? 'Plan' : 'Rutina'}
              value={isRunning
                ? (activePlan ? activePlan.name : 'Sin plan activo')
                : (gymRoutine ? gymRoutine.name : activePlan ? activePlan.name : 'Sin rutina')}
            />
            <ProfileStat
              label={isRunning ? 'Semanas' : 'Semana'}
              value={activePlan ? `${currentWeekNum}/${activePlan.totalWeeks}` : '—'}
            />
            <ProfileStat
              label="Fase"
              value={currentPhase ? (PHASE_LABEL[currentPhase] ?? currentPhase) : '—'}
            />

            {/* Row 2: Physical */}
            <ProfileStat label="Estatura" value={healthProfile?.heightCm ? `${healthProfile.heightCm} cm` : '—'} />
            <ProfileStat label="Edad" value={healthProfile?.age ? `${healthProfile.age} años` : '—'} />
            <ProfileStat
              label="Deporte"
              value={healthProfile?.sport === 'RUNNING' ? 'Running' : healthProfile?.sport === 'STRENGTH' ? 'Fuerza' : healthProfile?.sport ?? '—'}
            />

            {/* Row 3: Check-in metrics */}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Estrés (últ.)</p>
              <p className={`text-sm font-bold ${latestCheckIn?.stressLevel != null && latestCheckIn.stressLevel >= 7 ? 'text-red-600' : 'text-gray-800'}`}>
                {latestCheckIn?.stressLevel != null ? `${latestCheckIn.stressLevel}/10` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Motivación (últ.)</p>
              <p className={`text-sm font-bold ${latestCheckIn?.motivationLevel != null && latestCheckIn.motivationLevel <= 3 ? 'text-red-600' : latestCheckIn?.motivationLevel != null && latestCheckIn.motivationLevel >= 8 ? 'text-orange-500' : 'text-gray-800'}`}>
                {latestCheckIn?.motivationLevel != null ? `${latestCheckIn.motivationLevel}/10` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Dolor (últ.)</p>
              <p className={`text-sm font-bold ${latestCheckIn?.painLevel != null && latestCheckIn.painLevel >= 5 ? 'text-red-600' : 'text-gray-800'}`}>
                {latestCheckIn?.painLevel != null ? `${latestCheckIn.painLevel}/10` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Seguimiento del coach */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <h2 className="font-semibold text-gray-900 mb-4">Seguimiento del coach</h2>
          <div className="space-y-3 flex-1">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Meta pactada</label>
              <div className="relative">
                <input
                  type="text"
                  value={coachGoal}
                  onChange={(e) => setCoachGoal(e.target.value)}
                  placeholder="ej. Bajar a 85kg en 3 meses"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                />
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11.5 1.5l3 3M1 15l1-4L12.5 0.5l3 3L5 14z" /><path d="M10 3l3 3" /></svg>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                🔒 Notas privadas (el atleta no las ve)
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Tendencia a sobreentrenar — monitorear RPE"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                />
                <svg className="absolute right-2.5 top-3 w-3.5 h-3.5 text-gray-300" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11.5 1.5l3 3M1 15l1-4L12.5 0.5l3 3L5 14z" /><path d="M10 3l3 3" /></svg>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleSaveCoachNotes}
              disabled={savingCoachNotes}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              {savingCoachNotes ? 'Guardando...' : 'Guardar'}
            </button>
            {coachNotesSaved && <span className="text-sm text-green-600">✓ Guardado</span>}
          </div>
        </div>
      </div>

      {/* Últimos check-ins */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-4">Últimos check-ins</h2>
        {checkInsSorted.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Sin check-ins registrados aún.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100 uppercase tracking-wide">
                  {['Sem', 'Peso', 'FC', 'Sueño', 'Energía', 'Estrés', 'Motiv.', 'RPE', 'Dolor', 'Ajustes'].map(h => (
                    <th key={h} className="pb-2 pr-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {checkInsSorted.map((c) => {
                  const triggers = c.adjustmentsTriggered
                  const hasHighRpe = c.hardestSessionRpe != null && c.hardestSessionRpe >= 7
                  return (
                    <tr key={c.id} className={triggers.length > 0 ? 'bg-orange-50/30' : ''}>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium text-gray-700">S{c.weekNumber}</span>
                        {triggers.length > 0 && (
                          <div className="mt-0.5">
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                              {triggers[0]}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600">{c.weightKg != null ? c.weightKg : '—'}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{c.hrResting != null ? c.hrResting : '—'}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{c.sleepScore != null ? `${Math.round(c.sleepScore / 100 * 8)}h` : '—'}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{c.energyLevel != null ? `${c.energyLevel}/5` : '—'}</td>
                      <td className="py-2.5 pr-3">
                        <span className={c.stressLevel != null && c.stressLevel >= 7 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {c.stressLevel ?? '—'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={c.motivationLevel != null && c.motivationLevel <= 3 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {c.motivationLevel ?? '—'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={hasHighRpe ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {c.hardestSessionRpe != null ? c.hardestSessionRpe : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={c.painLevel != null && c.painLevel >= 5 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {c.painLevel ?? '—'}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {triggers.length > 0 ? (
                          <span className="text-green-600 font-medium text-xs">✓ {triggers.length}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="text-right mt-3">
              <span className="text-xs font-medium cursor-pointer" style={{ color: '#808c99' }}>
                Ver historial completo →
              </span>
            </div>
          </>
        )}
      </div>

      {/* Bottom: Lesiones/Zonas + Pago/Rutina/Tendencia */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Left column — UNA card unificada */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
          {/* Lesiones */}
          {healthProfile && healthProfile.injuries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-600 mb-2">Lesiones</h3>
              <ul className="space-y-1">
                {healthProfile.injuries.map((injury, i) => (
                  <li key={i} className="text-sm text-gray-700">• {injury}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Condiciones médicas */}
          {healthProfile && healthProfile.conditions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-600 mb-2">Condiciones médicas</h3>
              <ul className="space-y-1">
                {healthProfile.conditions.map((cond, i) => (
                  <li key={i} className="text-sm text-gray-700">• {cond}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Zonas FC (Running) / PRs recientes (Gym) */}
          {isRunning ? (
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Zonas FC</h3>
                <span className="text-xs text-gray-400">
                  · Objetivo: Z2 · Karvonen (FC rep. {healthProfile?.hrResting ?? '—'})
                </span>
              </div>
              <div className="flex gap-0.5 h-5 rounded overflow-hidden mb-3">
                {zones.map((z, i) => {
                  const range = z.max - z.min
                  return (
                    <div
                      key={i}
                      className="h-full"
                      style={{ backgroundColor: ZONE_COLORS[i], flex: range }}
                    />
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {zones.map((z, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ZONE_COLORS[i] }} />
                    <span className="font-medium" style={{ color: i === 1 ? '#16a34a' : undefined }}>
                      Z{i + 1} {i === 0 ? `<${z.max}` : i === 4 ? `>${z.min}` : `${z.min}-${z.max}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">PRs recientes</h3>
              {prRecords.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin PRs registrados aún</p>
              ) : (
                <ul className="space-y-2.5">
                  {prRecords.map((pr, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏋️</span>
                        <span className="text-sm text-gray-700 font-medium">{pr.exerciseName}</span>
                        <span className="text-sm font-bold text-orange-500">{pr.weightKg} kg</span>
                      </div>
                      <span className="text-xs text-gray-400">· {timeAgoFromDate(new Date(pr.date))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Right column — UNA card unificada */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          {/* Estado de pago */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900">Estado de pago</h3>
              {latestPayment ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={
                    latestPayment.status === 'PAID'
                      ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
                      : { backgroundColor: '#fef2f2', color: '#dc2626' }
                  }
                >
                  {latestPayment.status === 'PAID' ? '✓ Al día' : 'Pendiente'}
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
                  Sin pagos
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {latestPayment?.paidAt
                ? `Último: $${latestPayment.amount.toLocaleString()} ${latestPayment.currency} · ${new Date(latestPayment.paidAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : latestPayment
                  ? `Pendiente: $${latestPayment.amount.toLocaleString()} ${latestPayment.currency}`
                  : 'Sin pagos registrados'}
            </p>
          </div>

          <div className="border-t border-gray-100" />

          {/* Rutina asignada */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Rutina asignada</h3>
            {!isRunning && gymRoutine ? (
              <>
                <p className="text-sm font-bold text-gray-900">
                  {gymRoutine.name} — {GOAL_LABEL[gymRoutine.goal ?? ''] ?? gymRoutine.goal ?? 'General'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {gymRoutine.daysPerWeek} días/semana
                  {gymRoutine.lastSessionDate && ` · Última sesión: ${timeAgoFromDate(new Date(gymRoutine.lastSessionDate))}`}
                </p>
              </>
            ) : activePlan ? (
              <>
                <p className="text-sm font-bold text-gray-900">{activePlan.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activePlan.totalWeeks} semanas · Semana {currentWeekNum}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400">Sin plan asignado</p>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Tendencia 7 días — siempre visible */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Tendencia 7 días</h3>
            <div className="grid grid-cols-4 gap-2">
              <TrendItem
                label="Peso"
                value={dailyLogs.length > 0 && weights.length >= 2 ? `${weights[0]}→${weights[weights.length - 1]} kg` : dailyLogs.length > 0 && weights.length === 1 ? `${weights[0]} kg` : null}
                t={dailyLogs.length > 0 ? trend(weights) : null}
                upIsGood={false}
              />
              <TrendItem
                label="Energía"
                value={dailyLogs.length > 0 && avg(energies) != null ? `${avg(energies)!.toFixed(1)} avg` : null}
                t={dailyLogs.length > 0 ? trend(energies) : null}
                upIsGood={true}
              />
              <TrendItem
                label={isRunning ? 'FC rep.' : 'Vol. total'}
                value={
                  isRunning
                    ? (dailyLogs.length > 0 && avg(hrs) != null ? `${Math.round(avg(hrs)!)} avg` : null)
                    : (volumeTotalKg > 0 ? `${volumeTotalKg.toLocaleString()} kg` : null)
                }
                t={isRunning ? (dailyLogs.length > 0 ? trend(hrs) : null) : (volumeTotalKg > 0 ? 'up' : null)}
                upIsGood={!isRunning}
              />
              <TrendItem
                label="Sueño"
                value={dailyLogs.length > 0 && avg(sleeps) != null ? `${avg(sleeps)!.toFixed(1)}h avg` : null}
                t={dailyLogs.length > 0 ? trend(sleeps) : null}
                upIsGood={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Local components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, unit, sub, dotColor }: {
  label: string; value: string; unit?: string; sub: string; dotColor: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 relative top-[-1px]" style={{ backgroundColor: dotColor }} />
        <span className="text-3xl font-bold text-gray-900 leading-none">{value}</span>
        {unit && <span className="text-sm text-gray-500 font-medium">{unit}</span>}
      </div>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value}</p>
    </div>
  )
}

function TrendItem({ label, value, t, upIsGood }: {
  label: string; value: string | null; t: 'up' | 'down' | 'stable' | null; upIsGood: boolean
}) {
  const arrow = t === 'up' ? '↑' : t === 'down' ? '↓' : '→'
  const color = !t || t === 'stable'
    ? '#6b7280'
    : (t === 'up') === upIsGood ? '#16a34a' : '#ef4444'

  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {value ? (
        <p className="text-sm font-bold" style={{ color }}>
          {value} {arrow}
        </p>
      ) : (
        <p className="text-sm text-gray-300">—</p>
      )}
    </div>
  )
}
