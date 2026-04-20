import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      onboardingCompleted: boolean
      activated: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    role?: string
    onboardingCompleted?: boolean
    activated?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    onboardingCompleted?: boolean
    activated?: boolean
  }
}
