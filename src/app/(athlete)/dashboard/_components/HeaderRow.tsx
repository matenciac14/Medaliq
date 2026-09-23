import Link from 'next/link'
import WeekNavBar from '../../_components/WeekNavBar'
import PageTopBar from '../../_components/PageTopBar'
import { getGreeting, formatDate } from '../_lib/dashboard_helpers'

type HeaderRowProps = {
  firstName: string
  timezone: string
  weekLabel: string
  weekOffset: number
  canGoPrev: boolean
  canGoNext: boolean
  streakDays: number
}

export function MobileHeader({ firstName, timezone, weekLabel, weekOffset, canGoPrev, canGoNext, streakDays }: HeaderRowProps) {
  return (
    <div className="sm:hidden bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] px-5 pt-[max(env(safe-area-inset-top,0px),40px)] pb-1.5">
      {/* TopGroup */}
      <div className="space-y-1">
        {/* GreetingRow: greeting + icons */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-black text-white tracking-tight leading-tight flex-1 truncate">
            {getGreeting(timezone)}!
          </h1>
          <div className="flex items-center gap-2.5 shrink-0">
            {streakDays >= 2 ? (
              <span className="inline-flex items-center gap-[3px] px-[7px] py-[3px] rounded-[10px] border border-[#ea580c]/50 text-xs font-bold">
                <span className="text-xs">🔥</span>
                <span className="text-sm text-[#f97316] font-bold">{streakDays}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-[3px] px-[7px] py-[3px] rounded-[10px] border border-white/20 text-xs font-bold">
                <span className="text-xs opacity-50">🔥</span>
                <span className="text-sm text-white/30 font-bold">{streakDays}</span>
              </span>
            )}
            <Link href="/notifications" className="relative flex items-center justify-center w-6 h-6">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            </Link>
          </div>
        </div>
        {/* UserName */}
        <p className="text-base font-semibold text-white/80">{firstName}</p>
      </div>
      {/* DateLabel — centered */}
      <p className="text-xs text-white/60 text-center mt-1.5">{formatDate()}</p>
      {/* WeekNav */}
      <div className="mt-1.5">
        <WeekNavBar
          weekLabel={weekLabel}
          weekOffset={weekOffset}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          variant="dark"
        />
      </div>
    </div>
  )
}

function StreakBadge({ streakDays }: { streakDays: number }) {
  const isActive = streakDays >= 2
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
      isActive
        ? 'bg-orange-50 border border-orange-200/60 text-[#ea580c]'
        : 'bg-gray-100 border border-gray-200 text-gray-400'
    }`}>
      <span className={isActive ? '' : 'grayscale opacity-50'}>🔥</span>
      {streakDays} {streakDays === 1 ? 'día' : 'días'} · {isActive ? 'racha activa' : 'sin racha'}
    </span>
  )
}

export function DesktopHeader({ firstName, timezone, streakDays, weekLabel, weekOffset, canGoPrev, canGoNext }: HeaderRowProps) {
  return (
    <PageTopBar
      title={`${getGreeting(timezone)}, ${firstName}`}
      subtitle={formatDate()}
      center={
        <WeekNavBar
          weekLabel={weekLabel}
          weekOffset={weekOffset}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
        />
      }
      right={<StreakBadge streakDays={streakDays} />}
    />
  )
}
