import { NextResponse } from 'next/server'
import type { UserConfig } from '@/lib/config/user_config'

type FeatureKey = keyof UserConfig['features']

/**
 * Returns a 402 response if the feature is not active.
 * Usage: const guard = requireFeature(mobile.features, 'nutrition')
 *        if (guard) return guard
 */
export function requireFeature(
  features: UserConfig['features'] | undefined,
  feature: FeatureKey
): NextResponse | null {
  if (!features?.[feature]) {
    return NextResponse.json(
      { error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' },
      { status: 402 }
    )
  }
  return null
}
