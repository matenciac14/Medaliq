'use client'

import type { LastWeekSummary } from './checkin.types'
import { TRIGGER_LABELS } from './checkin.types'

interface Props {
  lastWeekSummary: LastWeekSummary | null
  onForce: () => void
  onBack: () => void
}

function getNextFriday(): string {
  const now = new Date()
  const day = now.getDay()
  const daysUntil = day <= 5 ? 5 - day : 6
  const next = new Date(now)
  next.setDate(now.getDate() + (daysUntil === 0 && day === 5 ? 7 : daysUntil))
  const raw = next.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function EarlyCheckInScreen({ lastWeekSummary, onForce, onBack }: Props) {
  const nextFriday = getNextFriday()

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 pt-10">
      <div className="w-full max-w-md space-y-4">
        <div className="bg-[#1e3a5f] rounded-2xl p-5 text-white space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(255,255,255,0.6)]">Check-in semanal</p>
          <p className="text-sm font-bold">Se activa el viernes</p>
          <p className="text-sm text-[rgba(255,255,255,0.75)]">
            Espera al final de la semana para tener datos completos. Tu próximo check-in es el{' '}
            <span className="font-semibold text-white">{nextFriday}</span>.
          </p>
        </div>

        {lastWeekSummary ? (
          <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#0f1e30]">Semana pasada</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Peso corporal', value: lastWeekSummary.weightKg != null     ? `${lastWeekSummary.weightKg} kg`     : null },
                { label: 'Horas de sueño', value: lastWeekSummary.sleepHours != null  ? `${lastWeekSummary.sleepHours} h`    : null },
                { label: 'Energía',        value: lastWeekSummary.energyLevel != null ? `${lastWeekSummary.energyLevel}/10`  : null },
                { label: 'Estrés',         value: lastWeekSummary.stressLevel != null ? `${lastWeekSummary.stressLevel}/10`  : null },
                { label: 'Motivación',     value: lastWeekSummary.motivationLevel != null ? `${lastWeekSummary.motivationLevel}/10` : null },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-[#4d4d4d]">{r.label}</span>
                  <span className="font-semibold text-[#0f1e30]">{r.value}</span>
                </div>
              ))}
            </div>

            {lastWeekSummary.adjustmentsTriggered.length > 0 && (
              <div className="border-t border-gray-100 pt-3 space-y-1">
                <p className="text-xs font-semibold text-[#808080] uppercase tracking-wide">Ajustes aplicados</p>
                {lastWeekSummary.adjustmentsTriggered.map(t => (
                  <p key={t} className="text-xs text-[#4d4d4d]">{TRIGGER_LABELS[t] ?? t}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] p-5 text-center">
            <p className="text-sm text-[#808080]">Sin datos de la semana pasada aún.</p>
          </div>
        )}

        <div className="space-y-2 pb-8">
          <button type="button" onClick={onBack} className="w-full bg-[#ea580c] hover:opacity-90 text-white font-bold py-4 rounded-2xl text-base transition-opacity">
            Volver al dashboard
          </button>
          <button type="button" onClick={onForce} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">
            Abrir check-in de todas formas
          </button>
        </div>
      </div>
    </div>
  )
}
