import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'
import SidebarClient from './_components/SidebarClient'

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.id) redirect('/login')

  // Leer config fresca desde DB (no JWT — puede cambiar sin re-login)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, role: true, config: true },
  })

  if (!dbUser) redirect('/login')

  const config = parseUserConfig(dbUser.config)

  // Si no completó onboarding, redirigir (también lo maneja el middleware)
  if (!config.onboarding.completed) redirect('/onboarding')

  const user = {
    name: dbUser.name ?? session.user.email ?? 'Usuario',
    role: dbUser.role,
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarClient user={user} config={config} />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
