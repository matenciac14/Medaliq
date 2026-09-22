// NUT-DASH-01 — Sesion del dia visible en pantalla de nutricion
// Muestra tipo, duracion y kcal estimadas quemadas cuando el atleta tiene sesion planificada o de gym hoy.

import { Dumbbell } from 'lucide-react'

type Props = {
  sessionType: string | null   // PlannedSession.type (e.g. RODAJE_Z2, FUERZA)
  intensity: string | null     // PlannedSession.intensity (HIGH/MODERATE/LOW/REST)
  durationMin: number | null
  isGymDay: boolean
  zoneTarget: string | null
  weekNumber: number | null
}

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2:    'Rodaje Z2',
  FARTLEK:      'Fartlek',
  TEMPO:        'Tempo',
  INTERVALOS:   'Intervalos',
  TIRADA_LARGA: 'Tirada larga',
  FUERZA:       'Entrenamiento de fuerza',
  CICLA:        'Entrenamiento en bici',
  NATACION:     'Natacion',
  TEST:         'Test de rendimiento',
  SIMULACRO:    'Simulacro de carrera',
  OTRO:         'Sesion de entrenamiento',
}

const INTENSITY_LABELS: Record<string, string> = {
  HIGH:     'Intensidad alta',
  MODERATE: 'Intensidad moderada',
  LOW:      'Intensidad baja',
}

const INTENSITY_KCAL: Record<string, number> = {
  HIGH:     520,
  MODERATE: 360,
  LOW:      200,
}

export default function ActivityCard({ sessionType, intensity, durationMin, isGymDay, zoneTarget, weekNumber }: Props) {
  const label = sessionType ? (SESSION_LABELS[sessionType] ?? 'Sesion de entrenamiento') : (isGymDay ? 'Entrenamiento de fuerza' : null)

  if (!label) return null

  const estKcal = intensity ? (INTENSITY_KCAL[intensity] ?? null) : (isGymDay ? 360 : null)
  const intensityLabel = intensity ? (INTENSITY_LABELS[intensity] ?? null) : null

  const details = [
    durationMin && durationMin > 0 ? `${durationMin} min` : null,
    intensityLabel,
    estKcal ? `+${estKcal} kcal` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="rounded-[16px] border border-[#f0f2f5] bg-white px-4 py-3 space-y-1.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sesion de hoy</p>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-[12px] bg-[#f2f7ff] flex items-center justify-center shrink-0">
          <Dumbbell size={22} className="text-[#1f3b5e]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[#ea580c] uppercase tracking-wide">Dia de entrenamiento</p>
          <p className="text-[13px] font-semibold text-[#1f1f24] truncate">{label}</p>
          <p className="text-[10px] text-[#8c99a6] mt-0.5">{details || 'Dia de entrenamiento'}</p>
        </div>
        {estKcal && (
          <div className="shrink-0 bg-[#fff2e5] rounded-[12px] h-7 px-3 flex items-center justify-center">
            <span className="text-[11px] font-bold text-[#eb590d]">~{estKcal} kcal</span>
          </div>
        )}
      </div>
    </div>
  )
}
