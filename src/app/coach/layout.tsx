'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mockCoach } from '@/lib/mock/coach-data'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/coach/dashboard', label: 'Mis atletas', icon: '👥' },
  { href: '/coach/invite', label: 'Invitar atleta', icon: '➕' },
  { href: '/coach/settings', label: 'Configuración', icon: '⚙️' },
]

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      {/* Sidebar — desktop */}
      <aside
        className="hidden md:flex md:flex-col w-64 fixed inset-y-0 left-0 z-10 shadow-lg"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/coach/dashboard" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: '#f97316' }}
            >
              M
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Medaliq</span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navLinks.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== '/coach/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <span className="text-base">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Back to athlete dashboard */}
        <div className="px-4 pb-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm py-2 px-3 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span>←</span>
            <span>Mi dashboard</span>
          </Link>
        </div>

        {/* Coach avatar */}
        <div className="px-4 pb-6 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: '#f97316' }}
            >
              {mockCoach.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="text-white text-sm font-medium leading-tight">{mockCoach.name}</p>
              <p className="text-white/50 text-xs">Coach</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#1e3a5f' }}>
        <Link href="/coach/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#f97316' }}>M</div>
          <span className="text-white font-bold text-base">Medaliq Coach</span>
        </Link>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#f97316' }}>
          {mockCoach.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-10">
        {navLinks.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/coach/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-[#f97316]' : 'text-gray-500'
              )}
            >
              <span className="text-lg leading-none">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
