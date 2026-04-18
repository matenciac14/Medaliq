'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/coach/dashboard', label: 'Mis atletas', icon: '👥' },
  { href: '/coach/invite',    label: 'Invitar atleta', icon: '➕' },
  { href: '/coach/settings',  label: 'Configuración', icon: '⚙️' },
]

type Props = { coachName: string }

export default function CoachSidebarClient({ coachName }: Props) {
  const pathname = usePathname()
  const initials = coachName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      {/* Sidebar — desktop */}
      <aside
        className="hidden md:flex md:flex-col w-64 fixed inset-y-0 left-0 z-10 shadow-lg"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/coach/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: '#f97316' }}>M</div>
            <span className="text-white font-bold text-lg tracking-tight">Medaliq</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navLinks.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== '/coach/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')}>
                <span className="text-base">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 pb-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white text-sm py-2 px-3 rounded-lg hover:bg-white/10 transition-colors">
            <span>←</span><span>Mi dashboard</span>
          </Link>
        </div>

        <div className="px-4 pb-6 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: '#f97316' }}>{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-tight truncate">{coachName}</p>
              <p className="text-white/50 text-xs">Coach</p>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-white/50 hover:text-white transition-colors text-xs" title="Cerrar sesión">✕</button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#1e3a5f' }}>
        <Link href="/coach/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#f97316' }}>M</div>
          <span className="text-white font-bold text-base">Medaliq Coach</span>
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#f97316' }}>{initials}</button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-10">
        {navLinks.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/coach/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={cn('flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors', isActive ? 'text-[#f97316]' : 'text-gray-500')}>
              <span className="text-lg leading-none">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
