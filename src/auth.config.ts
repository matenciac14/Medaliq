import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { mapUserToToken, mapTokenToSession } from '@/lib/auth/session_mappers'

// Config sin Prisma — compatible con Edge Runtime (middleware)
// Los mapeos JWT↔Session vienen de session_mappers.ts (single source of truth)
export const authConfig: NextAuthConfig = {
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
    // Credentials sin authorize — la lógica real está en auth.ts (Node runtime)
    Credentials({}),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) mapUserToToken(token, user)
      return token
    },
    async session({ session, token }) {
      return mapTokenToSession(session, token)
    },
  },
}
