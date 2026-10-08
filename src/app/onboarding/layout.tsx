import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true, role: true },
  })

  if (!user) redirect('/login')
  if (user.role !== 'ATHLETE') redirect('/dashboard')
  if (user.onboardingCompleted) redirect('/dashboard')

  return <>{children}</>
}
