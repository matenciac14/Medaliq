import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

type GymDay = {
  label: string
  exercises: unknown[]
}

type Props = {
  dashboardMode: 'TRAINING' | 'RECOVERY' | 'FREE' | 'GYM'
  isCurrentWeek: boolean
  hasGymToday: boolean
  gymDoneToday?: boolean
  todayGymDay: GymDay | null
  weekSessionCount?: number
  weekSessionTarget?: number
}

export default function DailySessionCard({
  dashboardMode, isCurrentWeek,
  hasGymToday, gymDoneToday = false, todayGymDay,
  weekSessionCount = 0, weekSessionTarget = 4,
}: Props) {
  return (
    <>
      {/* Gym hoy sin sesión de sport */}
      {isCurrentWeek && hasGymToday && todayGymDay && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>💪</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{todayGymDay.label}</p>
              <p className="text-xs text-gray-500">{todayGymDay.exercises.length} ejercicios</p>
            </div>
          </div>
          {gymDoneToday ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={13} /> Completada
            </span>
          ) : (
            <Link href="/gym/session" className="text-xs font-semibold bg-[#ea580c] text-white px-3 py-1.5 rounded-lg">
              Empezar
            </Link>
          )}
        </div>
      )}

      {/* GYM: día de descanso cuando no hay sesión programada hoy */}
      {dashboardMode === 'GYM' && isCurrentWeek && !hasGymToday && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
          <span>😴</span>
          <span>Día de descanso según tu rutina</span>
        </div>
      )}

      {/* GYM footer: consistencia semanal */}
      {dashboardMode === 'GYM' && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: weekSessionTarget }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${i < weekSessionCount ? 'bg-[#ea580c]' : 'bg-gray-200'}`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">
              {weekSessionCount}/{weekSessionTarget} días esta semana
            </span>
          </div>
          <Link href="/gym" className="text-xs text-gray-400 hover:text-[#1e3a5f]">
            Ver rutina →
          </Link>
        </div>
      )}

      {/* RECOVERY footer */}
      {dashboardMode === 'RECOVERY' && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Movilidad, caminatas o descanso activo. Sin intensidad.</p>
          <Link href="/log/run" className="text-xs font-semibold text-gray-400 hover:text-[#1e3a5f] whitespace-nowrap">
            Registrar →
          </Link>
        </div>
      )}
    </>
  )
}
