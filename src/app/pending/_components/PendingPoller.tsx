'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Polls session every 10s. When admin activates the account,
// next-auth update() refreshes the JWT from DB and activated becomes true.
export default function PendingPoller() {
  const { data: session, update } = useSession()
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      await update()
    }, 10_000)

    return () => clearInterval(interval)
  }, [update])

  useEffect(() => {
    if ((session?.user as any)?.activated) {
      router.replace('/dashboard')
    }
  }, [session, router])

  return (
    <p className="text-xs text-gray-400 flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      Verificando estado de tu cuenta…
    </p>
  )
}
