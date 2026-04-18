import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import CoachSidebarClient from './_components/CoachSidebarClient'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.id) redirect('/login')
  if ((session.user as any).role !== 'COACH') redirect('/dashboard')

  const coachName = session.user.name ?? session.user.email ?? 'Coach'

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      <CoachSidebarClient coachName={coachName} />
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
