// NUT-DASH-01 — Sesión del día visible en pantalla de nutrición
// Muestra tipo, duración y kcal estimadas quemadas cuando el atleta tiene sesión planificada o de gym hoy.

import { Dumbbell } from 'lucide-react'

type Props = {
  sessionType: string | null   // PlannedSession.type (e.g. RODAJE_Z2, FUERZA)
  intensity: string | null     // PlannedSession.intensity (HIGH/MODERATE/LOW/REST)
  durationMin: number | null
  isGymDay: boolean
}

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2:    'Rodaje Z2',
  FARTLEK:      'Fartlek',
  TEMPO:        'Tempo',
  INTERVALOS:   'Intervalos',
  TIRADA_LARGA: 'Tirada larga',
  FUERZA:       'Entrenamiento de fuerza',
  CICLA:        'Entrenamiento en bici',
  NATACION:     'Natación',
  TEST:         'Test de rendimiento',
  SIMULACRO:    'Simulacro de carrera',
  OTRO:         'Sesión de entrenamiento',
}

const INTENSITY_KCAL: Record<string, number> = {
  HIGH:     520,
  MODERATE: 360,
  LOW:      200,
}

export default function ActivityCard({ sessionType, intensity, durationMin, isGymDay }: Props) {
  const label = sessionType ? (SESSION_LABELS[sessionType] ?? 'Sesion de entrenamiento') : (isGymDay ? 'Entrenamiento de fuerza' : null)

  if (!label) return null

  const estKcal = intensity ? (INTENSITY_KCAL[intensity] ?? null) : (isGymDay ? 360 : null)

  return (
    <div className="rounded-[14px] border border-[#f0f2f5] bg-white px-3.5 py-2.5 flex items-center gap-2.5 h-14">
      <div className="w-9 h-9 rounded-[10px] bg-[#f2f7ff] flex items-center justify-center shrink-0">
        <Dumbbell size={18} className="text-[#1f3b5e]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[#1f1f24] truncate">{label}</p>
        <p className="text-[9px] font-normal text-[#8c99a6] mt-0.5">
          {durationMin && durationMin > 0 ? `${durationMin} min · ` : ''}Dia de entrenamiento
        </p>
      </div>

      {estKcal && (
        <div className="shrink-0 bg-[#fff2e5] rounded-[12px] h-6 w-[70px] flex items-center justify-center">
          <span className="text-[10px] font-bold text-[#eb590d]">~{estKcal} kcal</span>
        </div>
      )}
    </div>
  )
}
