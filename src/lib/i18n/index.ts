import { es } from './translations/es'
import { en } from './translations/en'
import { pt } from './translations/pt'
import type { Locale, Translations } from './types'

export const LOCALES: Locale[] = ['es', 'en', 'pt']
export const DEFAULT_LOCALE: Locale = 'es'

export const allTranslations: Record<Locale, Translations> = { es, en, pt }

export type { Locale, Translations }
