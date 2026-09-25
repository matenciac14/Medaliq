import NextAuth from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { DEFAULT_USER_CONFIG } from '@/lib/config/user_config'
import { rateLimitAsync } from '@/lib/rate_limit'
import { mapUserToToken, mapTokenToSession } from '@/lib/auth/session_mappers'

// Shape de columnas de User que se leen en auth
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  role: true,
  status: true,
  password: true,
  emailVerified: true,
  featurePlan: true,
  featureCheckin: true,
  featureNutrition: true,
  featureProgress: true,
  featureLog: true,
  featureCoach: true,
  featureGym: true,
  onboardingCompleted: true,
  needsRoleSelection: true,
  identification: true,
  phoneWa: true,
} as const

function buildFeaturesFromUser(u: {
  featurePlan: boolean; featureCheckin: boolean; featureNutrition: boolean;
  featureProgress: boolean; featureLog: boolean; featureCoach: boolean; featureGym: boolean;
}) {
  return {
    plan:      u.featurePlan,
    checkin:   u.featureCheckin,
    nutrition: u.featureNutrition,
    progress:  u.featureProgress,
    log:       u.featureLog,
    coach:     u.featureCoach,
    gym:       u.featureGym,
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    newUser: '/onboarding',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Brute-force protection: 10 intentos/min por email
        const email = (credentials.email as string).toLowerCase().trim()
        const { allowed } = await rateLimitAsync(`login-${email}`, { limit: 10, windowMs: 60_000 })
        if (!allowed) return null

        const user = await prisma.user.findUnique({
          where: { email },
          select: USER_SELECT,
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!isValid) return null

        // GAP-03: gate de verificación de email — activo solo cuando EMAIL_GATE_ENABLED=true
        if (process.env.EMAIL_GATE_ENABLED === 'true' && !user.emailVerified) return null

        const features = buildFeaturesFromUser(user)

        const coachRelation = await prisma.coachAthlete.findFirst({
          where: { athleteId: user.id, status: 'ACTIVE' },
          select: { id: true },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          onboardingCompleted: user.onboardingCompleted,
          activated: user.featurePlan,
          isB2B: !!coachRelation,
          userPlan: 'PRO' as const,
          features,
          needsRoleSelection: user.needsRoleSelection,
          profileComplete: !!(user.identification && user.phoneWa),
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, account }) {
      // Invalidación masiva sin rotar el secret.
      // Para invalidar JWTs emitidos antes de una fecha: setear AUTH_MIN_ISSUED_AT
      // en Vercel con el timestamp Unix del corte (date +%s) → Redeploy.
      const minIat = parseInt(process.env.AUTH_MIN_ISSUED_AT ?? '0')
      if (!user && minIat > 0 && typeof token.iat === 'number' && token.iat < minIat) {
        return { ...token, exp: 0 }
      }

      // Login — mapear user al token (shared mapper)
      if (user) mapUserToToken(token, user)

      // Google OAuth — siempre leer desde DB (PrismaAdapter no llama authorize())
      const t = token as JWT
      if (account?.provider === 'google' && t.id) {
        try {
          const [dbUser, coachRelation] = await Promise.all([
            prisma.user.findUnique({ where: { id: t.id }, select: USER_SELECT }),
            prisma.coachAthlete.findFirst({ where: { athleteId: t.id, status: 'ACTIVE' }, select: { id: true } }),
          ])
          if (dbUser) {
            if (dbUser.needsRoleSelection) {
              token.needsRoleSelection = true
              token.status = 'ACTIVE'
              token.onboardingCompleted = false
              token.activated = false
              token.isB2B = false
              token.userPlan = 'FREE'
              token.features = DEFAULT_USER_CONFIG.features
              token.profileComplete = false
            } else {
              const features = buildFeaturesFromUser(dbUser)
              token.role = dbUser.role
              token.status = dbUser.status
              token.needsRoleSelection = false
              token.onboardingCompleted = dbUser.onboardingCompleted
              token.activated = dbUser.featurePlan
              token.isB2B = !!coachRelation
              token.userPlan = 'PRO'
              token.features = features
              token.profileComplete = !!(dbUser.identification && dbUser.phoneWa)
            }
          }
        } catch {
          // silently fail
        }
      }

      // Validar que el user sigue existiendo en la DB (protege contra DB switch o borrado de user)
      // Corre max 1 vez cada 5 min para no sobrecargar la DB
      if (!user && trigger !== 'update' && t.id) {
        const now = Math.floor(Date.now() / 1000)
        const lastCheck = (t.userExistsCheckedAt as number) ?? 0
        if (now - lastCheck > 300) {
          const exists = await prisma.user.findUnique({ where: { id: t.id }, select: { id: true } })
          if (!exists) {
            token.userInvalid = true
            token.id = undefined
          } else {
            token.userExistsCheckedAt = now
          }
        }
      }

      // Refresh desde DB al actualizar sesión (post set-role o onboarding)
      if (trigger === 'update' && t.id) {
        try {
          const [dbUser, coachRelation] = await Promise.all([
            prisma.user.findUnique({ where: { id: t.id }, select: USER_SELECT }),
            prisma.coachAthlete.findFirst({ where: { athleteId: t.id, status: 'ACTIVE' }, select: { id: true } }),
          ])
          if (dbUser) {
            const features = buildFeaturesFromUser(dbUser)
            token.role = dbUser.role
            token.status = dbUser.status
            token.activated = dbUser.featurePlan
            token.isB2B = !!coachRelation
            token.onboardingCompleted = dbUser.onboardingCompleted
            token.userPlan = 'PRO'
            token.features = features
            token.needsRoleSelection = false
            token.profileComplete = !!(dbUser.identification && dbUser.phoneWa)
          }
        } catch {
          // silently fail — token retains last known value
        }
      }

      return token
    },
    async session({ session, token }) {
      return mapTokenToSession(session, token)
    },
  },
})
