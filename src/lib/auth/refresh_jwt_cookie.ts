/**
 * Server-side JWT cookie refresh.
 *
 * After any API route changes User state that the middleware reads
 * (onboardingCompleted, role, needsRoleSelection, activated, isB2B, etc.),
 * call this to encode an updated JWT and set it directly in the response.
 *
 * This avoids the race condition where useSession().update() doesn't
 * propagate the Set-Cookie before the next navigation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getToken, encode } from 'next-auth/jwt'
import { prisma } from '@/lib/db/prisma'
import { getUserPlan } from '@/lib/config/user_config'

const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
const IS_SECURE = (process.env.NEXTAUTH_URL ?? '').startsWith('https://') || process.env.NODE_ENV === 'production'
const COOKIE_NAME = IS_SECURE ? '__Secure-authjs.session-token' : 'authjs.session-token'

const USER_SELECT_FOR_JWT = {
  role: true, status: true, onboardingCompleted: true, needsRoleSelection: true,
  featurePlan: true, featureCheckin: true, featureNutrition: true,
  featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
  identification: true, phoneWa: true,
} as const

export async function setFreshJwtCookie(req: NextRequest, response: NextResponse, userId: string): Promise<void> {
  const currentToken = await getToken({ req, secret: AUTH_SECRET })
  if (!currentToken) return

  const [dbUser, coachRel, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT_FOR_JWT }),
    prisma.coachAthlete.findFirst({ where: { athleteId: userId, status: 'ACTIVE' }, select: { id: true } }),
    prisma.userSubscription.findUnique({ where: { userId }, select: { tier: true, trialEndsAt: true } }),
  ])

  if (!dbUser) return

  const features = {
    plan: dbUser.featurePlan, checkin: dbUser.featureCheckin, nutrition: dbUser.featureNutrition,
    progress: dbUser.featureProgress, log: dbUser.featureLog, coach: dbUser.featureCoach, gym: dbUser.featureGym,
  }
  const isB2B = !!coachRel
  const trialDaysLeft = subscription?.tier === 'TRIAL' && subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const updatedToken = {
    ...currentToken,
    role: dbUser.role,
    status: dbUser.status,
    onboardingCompleted: dbUser.onboardingCompleted,
    activated: dbUser.featurePlan,
    isB2B,
    userPlan: getUserPlan(features, subscription?.tier, isB2B, subscription?.trialEndsAt),
    trialDaysLeft,
    features,
    needsRoleSelection: dbUser.needsRoleSelection,
    profileComplete: !!(dbUser.identification && dbUser.phoneWa),
    userExistsCheckedAt: Math.floor(Date.now() / 1000),
  }

  const jwt = await encode({ token: updatedToken, secret: AUTH_SECRET, salt: COOKIE_NAME })
  response.cookies.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: IS_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
}
