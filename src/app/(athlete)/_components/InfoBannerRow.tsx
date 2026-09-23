import Link from 'next/link'

type CoachInfo = {
  name: string
  headline: string | null
  initial: string
}

type Props = {
  coach: CoachInfo | null
  checkinPending: boolean
  hasActivePlan: boolean
}

export default function InfoBannerRow({ coach, checkinPending, hasActivePlan }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
      {/* Coach */}
      {coach ? (
        <Link href="/messages" className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#ea580c] flex items-center justify-center text-white font-bold text-xs shrink-0">
            {coach.initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">Coach {coach.name.split(' ')[0]}</p>
            <p className="text-[10px] text-gray-500 truncate">{coach.headline || 'Entrenador personal'}</p>
          </div>
          <span className="text-xs font-semibold text-[#1e3a5f] shrink-0">💬 →</span>
        </Link>
      ) : (
        <Link href="/find-coach" className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#ea580c] flex items-center justify-center shrink-0">
            <span className="text-white text-sm">⭐</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900">Conecta con un coach</p>
            <p className="text-[10px] text-gray-400">Lleva tu plan al siguiente nivel</p>
          </div>
          <span className="text-xs font-semibold text-[#ea580c] shrink-0 whitespace-nowrap">Buscar coach →</span>
        </Link>
      )}

      {/* Check-in */}
      <Link href="/checkin" className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <span className="text-sm">🔔</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900">
            Check-in semanal {checkinPending && 'pendiente'}
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">
            {hasActivePlan
              ? 'Tu plan se ajusta según cómo te sientas'
              : 'Registra cómo te sientes esta semana'}
          </p>
        </div>
        {checkinPending && (
          <span className="text-xs font-semibold text-[#ea580c] shrink-0 whitespace-nowrap">Hacer check-in →</span>
        )}
      </Link>
    </div>
  )
}
