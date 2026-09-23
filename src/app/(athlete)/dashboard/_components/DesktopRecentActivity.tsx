import Link from 'next/link'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'

type Activity = {
  type: string
  completedAt: string
  durationMin: number | null
  rpe: number | null
}

type Props = {
  recentActivity: Activity[]
  hasEverLogged: boolean
  streakDays: number
}

export default function DesktopRecentActivity({ recentActivity, hasEverLogged, streakDays }: Props) {
  if (!hasEverLogged || recentActivity.length === 0) return null

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex justify-between items-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Actividad reciente</p>
          {streakDays > 0 && (
            <span className="text-xs font-semibold text-[#ea580c]">{streakDays} dias de racha</span>
          )}
        </div>
        <div className="relative">
          <div className="max-h-[220px] overflow-y-auto scrollbar-thin">
            {recentActivity.slice(0, 6).map((a, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <span className="text-xl">{SESSION_ICONS[a.type] ?? '🏅'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{SESSION_NAMES[a.type] ?? a.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {a.durationMin ? ` · ${a.durationMin} min` : ''}
                  </p>
                </div>
                {a.rpe != null && (
                  <span className="text-xs font-semibold text-[#1e3a5f] bg-gray-100 rounded-lg px-2 py-1">RPE {a.rpe}</span>
                )}
                <Link href="/progress" className="text-xs font-semibold text-[#ea580c]">Ver →</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
