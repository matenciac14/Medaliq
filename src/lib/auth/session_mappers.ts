/**
 * Funciones compartidas de mapeo User→JWT y JWT→Session.
 * Usadas por auth.ts (Node runtime) y auth.config.ts (Edge runtime).
 * SINGLE SOURCE OF TRUTH — no duplicar estos mapeos en ningún otro archivo.
 */

import type { JWT } from 'next-auth/jwt'
import type { Session, User } from 'next-auth'
import { DEFAULT_USER_CONFIG } from '@/lib/config/user_config'

/** Mapea los campos de User al JWT token (callback jwt, solo cuando hay user = login) */
export function mapUserToToken(token: JWT, user: User): JWT {
  token.id = user.id
  token.role = user.role
  token.status = user.status ?? 'ACTIVE'
  token.onboardingCompleted = user.onboardingCompleted ?? false
  token.activated = user.activated ?? false
  token.isB2B = user.isB2B ?? false
  token.userPlan = user.userPlan ?? 'FREE'
  token.features = user.features ?? DEFAULT_USER_CONFIG.features
  token.needsRoleSelection = user.needsRoleSelection ?? false
  token.profileComplete = user.profileComplete ?? false
  return token
}

/** Mapea los campos del JWT token a la Session (callback session) */
export function mapTokenToSession(session: Session, token: JWT): Session {
  session.user.id = token.id ?? ''
  session.user.role = token.role ?? 'ATHLETE'
  session.user.status = token.status ?? 'ACTIVE'
  session.user.onboardingCompleted = token.onboardingCompleted ?? false
  session.user.activated = token.activated ?? false
  session.user.isB2B = token.isB2B ?? false
  session.user.userPlan = token.userPlan ?? 'FREE'
  session.user.needsRoleSelection = token.needsRoleSelection ?? false
  session.user.features = token.features ?? DEFAULT_USER_CONFIG.features
  session.user.profileComplete = token.profileComplete ?? false
  return session
}

/** Campos que deben existir en Session.user — usado por tests para validar sincronización */
export const SESSION_USER_FIELDS = [
  'id', 'role', 'status', 'onboardingCompleted', 'activated',
  'isB2B', 'userPlan', 'needsRoleSelection', 'features', 'profileComplete',
] as const
