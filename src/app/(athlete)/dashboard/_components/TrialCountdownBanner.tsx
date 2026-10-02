import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default function TrialCountdownBanner({ daysLeft }: { daysLeft: number }) {
  const urgent = daysLeft <= 3

  return (
    <Link href="/upgrade" className="block">
      <div className={`flex rounded-2xl border overflow-hidden ${
        urgent
          ? 'bg-red-50 border-red-200'
          : 'bg-orange-50 border-orange-200/60'
      }`}>
        <div className={`w-1 shrink-0 ${urgent ? 'bg-red-500' : 'bg-[#ea580c]'}`} />
        <div className="flex-1 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${
              urgent ? 'bg-red-100' : 'bg-[#ea580c]/10'
            }`}>
              {urgent ? '\u23F0' : '\u2B50'}
            </div>
            <div>
              <p className={`text-sm font-semibold ${urgent ? 'text-red-900' : 'text-gray-900'}`}>
                {daysLeft === 0
                  ? 'Tu trial termina hoy'
                  : daysLeft === 1
                    ? 'Te queda 1 d\u00EDa de trial'
                    : `Te quedan ${daysLeft} d\u00EDas de trial`}
              </p>
              <p className={`text-xs mt-0.5 ${urgent ? 'text-red-600' : 'text-gray-500'}`}>
                Activa Pro para mantener tus m\u00E9tricas, check-in y planes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-white bg-[#ea580c] px-3 py-1.5 rounded-lg whitespace-nowrap">
              Activar Pro
            </span>
            <ChevronRight size={16} className={urgent ? 'text-red-400' : 'text-orange-400'} />
          </div>
        </div>
      </div>
    </Link>
  )
}
