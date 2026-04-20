'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { allTranslations } from '@/lib/i18n'
import type { Locale, Translations } from '@/lib/i18n/types'

type LanguageContextType = {
  locale: Locale
  t: Translations
  setLocale: (locale: Locale) => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

function getClientLocale(): Locale {
  if (typeof document === 'undefined') return 'es'
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
  const val = match?.[1]
  return (['es', 'en', 'pt'] as Locale[]).includes(val as Locale) ? (val as Locale) : 'es'
}

export function LanguageProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const router = useRouter()

  useEffect(() => {
    const clientLocale = getClientLocale()
    if (clientLocale !== locale) setLocaleState(clientLocale)
  }, []) // eslint-disable-line

  const setLocale = useCallback((newLocale: Locale) => {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`
    setLocaleState(newLocale)
    router.refresh()
  }, [router])

  return (
    <LanguageContext.Provider value={{ locale, t: allTranslations[locale], setLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
