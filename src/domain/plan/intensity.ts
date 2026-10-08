import { SESSION_INTENSITY_MAP } from '@/domain/discipline/discipline.types'

export function getSessionIntensity(type: string): 'HIGH' | 'MODERATE' | 'LOW' | 'REST' {
  return SESSION_INTENSITY_MAP[type] ?? 'MODERATE'
}
