/**
 * NUT-F-02 — Vista semanal de comidas planificadas.
 * Muestra los 7 días de la semana con su tipo de día
 * derivado de la intensidad del plan.
 */

type WeekDay = {
  label: string        // "Lun", "Mar"...
  date: string         // "14 jul"
  dayType: 'hard' | 'easy' | 'rest' | null
  sessionLabel: string | null  // "Fuerza", "Pre-entreno", etc.
  isToday: boolean
  hasSession: boolean
}

type Props = {
  days: WeekDay[]
}

const DAY_TYPE_CONFIG = {
  hard: { fallback: 'Intenso', text: 'text-orange-600' },
  easy: { fallback: 'Ligero',  text: 'text-green-600'  },
  rest: { fallback: 'Descanso',text: 'text-blue-500'   },
}

export default function WeeklyMenuStrip({ days }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          Menu semanal
        </p>

        {/* Day strip */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {days.map((day, i) => {
            const cfg = day.dayType ? DAY_TYPE_CONFIG[day.dayType] : null
            const typeLabel = day.sessionLabel ?? cfg?.fallback ?? null
            return (
              <div
                key={i}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl min-w-[70px] transition-colors
                  ${day.isToday
                    ? 'bg-[#1e3a5f]'
                    : 'bg-gray-50'
                  }`}
              >
                <p className={`text-xs font-semibold ${day.isToday ? 'text-white' : 'text-gray-700'}`}>
                  {day.label}
                </p>
                {typeLabel && (
                  <p className={`text-[10px] font-medium leading-tight text-center ${day.isToday ? 'text-blue-200' : cfg?.text ?? 'text-gray-400'}`}>
                    {typeLabel}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
