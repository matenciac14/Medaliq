import { cookies } from 'next/headers'
import { LOCALES, DEFAULT_LOCALE, allTranslations } from './index'
import type { Locale, Translations } from './types'

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('locale')?.value
  return (LOCALES.includes(raw as Locale) ? raw : DEFAULT_LOCALE) as Locale
}

export async function getT(): Promise<Translations> {
  const locale = await getServerLocale()
  return allTranslations[locale]
}
