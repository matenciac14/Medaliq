'use client'

import { useLanguage } from './LanguageContext'
import type { Locale } from '@/lib/i18n/types'

const FLAGS: Record<Locale, { flag: string; label: string }> = {
  es: { flag: '🇪🇸', label: 'ES' },
  en: { flag: '🇺🇸', label: 'EN' },
  pt: { flag: '🇧🇷', label: 'PT' },
}

type Props = {
  variant?: 'dark' | 'light'
}

export default function LanguageSwitcher({ variant = 'dark' }: Props) {
  const { locale, setLocale } = useLanguage()

  return (
    <div className="flex items-center gap-1">
      {(Object.entries(FLAGS) as [Locale, { flag: string; label: string }][]).map(([loc, { flag, label }]) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          title={label}
          className={[
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-all',
            locale === loc
              ? variant === 'dark'
                ? 'bg-white/20 text-white'
                : 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
              : variant === 'dark'
                ? 'text-white/40 hover:text-white/70'
                : 'text-gray-400 hover:text-gray-600',
          ].join(' ')}
        >
          <span>{flag}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
