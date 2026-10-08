'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekNavBarProps {
  weekLabel: string
  canGoPrev: boolean
  canGoNext: boolean
  /** 'light' = blue-gray bg (default, desktop), 'dark' = navy bg for gradient headers */
  variant?: 'light' | 'dark'

  // URL-based navigation (default — used by Dashboard, Gym)
  weekOffset?: number

  // Callback-based navigation (used by PlanClient with local state)
  onPrev?: () => void
  onNext?: () => void
  onToday?: () => void
  showToday?: boolean
}

export default function WeekNavBar({
  weekLabel,
  canGoPrev,
  canGoNext,
  variant = 'light',
  weekOffset,
  onPrev,
  onNext,
  onToday,
  showToday,
}: WeekNavBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isDark = variant === 'dark'
  const isCallbackMode = !!onPrev

  // URL mode: show "Hoy" when not on current week
  // Callback mode: show "Hoy" when explicitly requested via showToday
  const shouldShowToday = isCallbackMode ? !!showToday : (weekOffset ?? 0) !== 0

  function handlePrev() {
    if (isCallbackMode) return onPrev?.()
    const next = (weekOffset ?? 0) - 1
    router.push(next === 0 ? pathname : `${pathname}?weekOffset=${next}`)
  }

  function handleNext() {
    if (isCallbackMode) return onNext?.()
    const next = (weekOffset ?? 0) + 1
    router.push(next === 0 ? pathname : `${pathname}?weekOffset=${next}`)
  }

  function handleToday() {
    if (isCallbackMode) return onToday?.()
    router.push(pathname)
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={
          isDark
            ? 'inline-flex items-center rounded-xl bg-white/10 w-full h-10'
            : 'inline-flex items-center rounded-[10px] border border-gray-200 bg-white h-11 min-w-[260px]'
        }
      >
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={
            isDark
              ? 'w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70 disabled:opacity-30 transition-colors'
              : 'w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors ml-1'
          }
          aria-label="Semana anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span
          className={
            isDark
              ? 'flex-1 text-sm font-semibold text-white whitespace-nowrap text-center'
              : 'flex-1 text-sm font-semibold text-[#1e3a5f] whitespace-nowrap text-center px-4'
          }
        >
          {weekLabel}
        </span>
        {shouldShowToday && isDark && (
          <button
            onClick={handleToday}
            className="text-xs font-bold text-white bg-[#ea580c] px-3 py-1 rounded-full transition-colors hover:bg-[#d14d07]"
          >
            Hoy
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className={
            isDark
              ? 'w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70 disabled:opacity-30 transition-colors'
              : 'w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors mr-1'
          }
          aria-label="Semana siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {shouldShowToday && !isDark && (
        <button
          onClick={handleToday}
          className="text-xs font-bold text-[#ea580c] border border-[#ea580c]/30 px-3 py-1 rounded-full transition-colors hover:bg-orange-50 whitespace-nowrap"
        >
          Hoy
        </button>
      )}
    </div>
  )
}
