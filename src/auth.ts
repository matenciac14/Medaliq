import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { parseUserConfig } from '@/lib/config/user-config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) return null

        const config = parseUserConfig(user.config)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          onboardingCompleted: config.onboarding.completed,
          activated: config.features.plan,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.onboardingCompleted = (user as any).onboardingCompleted ?? false
        token.activated = (user as any).activated ?? false
      }
      // Refresh activated status from DB on session update (e.g. after admin activates)
      if (trigger === 'update' && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { config: true },
          })
          if (dbUser) {
            const config = parseUserConfig(dbUser.config)
            token.activated = config.features.plan
            token.onboardingCompleted = config.onboarding.completed
          }
        } catch {
          // silently fail — token retains last known value
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
        session.user.activated = token.activated as boolean
      }
      return session
    },
  },
})
