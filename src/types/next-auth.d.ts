import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      onboardingCompleted: boolean
      activated: boolean
      trialEndsAt: string | null
      userPlan: 'TRIAL' | 'FREE' | 'PRO'
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    role?: string
    onboardingCompleted?: boolean
    activated?: boolean
    trialEndsAt?: string | null
    userPlan?: 'TRIAL' | 'FREE' | 'PRO'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    onboardingCompleted?: boolean
    activated?: boolean
    trialEndsAt?: string | null
    userPlan?: 'TRIAL' | 'FREE' | 'PRO'
  }
}
