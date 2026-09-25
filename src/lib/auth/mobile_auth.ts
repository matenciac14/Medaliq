import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import type { UserConfig } from '@/lib/config/user_config'

export type MobileTokenPayload = {
  id: string
  email: string
  name: string
  role: string
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'DELETED'
  onboardingCompleted: boolean
  activated: boolean
  isB2B: boolean
  userPlan: 'FREE' | 'PRO'
  profileComplete: boolean
  needsRoleSelection: boolean
  features: UserConfig['features']
  sport?: string
}

/** Campos de User que se necesitan para construir un MobileTokenPayload */
export const MOBILE_USER_SELECT = {
  id: true, email: true, name: true, role: true, status: true,
  featurePlan: true, featureCheckin: true, featureNutrition: true,
  featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
  onboardingCompleted: true, needsRoleSelection: true,
  identification: true, phoneWa: true,
} as const

type MobileDbUser = {
  id: string
  email: string
  name: string | null
  role: string
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'DELETED'
  featurePlan: boolean
  featureCheckin: boolean
  featureNutrition: boolean
  featureProgress: boolean
  featureLog: boolean
  featureCoach: boolean
  featureGym: boolean
  onboardingCompleted: boolean
  needsRoleSelection: boolean
  identification: string | null
  phoneWa: string | null
}

/** Construye un MobileTokenPayload desde un user de DB + contexto */
export function buildMobileTokenPayload(
  user: MobileDbUser,
  opts: { isB2B: boolean; sport?: string },
): MobileTokenPayload {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    role: user.role,
    status: user.status,
    onboardingCompleted: user.onboardingCompleted,
    activated: user.featurePlan,
    isB2B: opts.isB2B,
    userPlan: 'PRO',
    profileComplete: !!(user.identification && user.phoneWa),
    needsRoleSelection: user.needsRoleSelection,
    features: {
      plan:      user.featurePlan,
      checkin:   user.featureCheckin,
      nutrition: user.featureNutrition,
      progress:  user.featureProgress,
      log:       user.featureLog,
      coach:     user.featureCoach,
      gym:       user.featureGym,
    },
    ...(opts.sport ? { sport: opts.sport } : {}),
  }
}

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET not set')
  return new TextEncoder().encode(secret)
}

export async function signMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as MobileTokenPayload
}

export async function getMobileUser(req: NextRequest): Promise<MobileTokenPayload | null> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    return await verifyMobileToken(token)
  } catch (err) {
    console.error('[mobile-auth] Token verification failed:', err)
    return null
  }
}
