'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Apple,
  TrendingUp,
  ClipboardCheck,
  Users,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { mockUser } from '@/lib/mock/dashboard-data'
import { FULL_ATHLETE_CONFIG } from '@/lib/config/user-config'

// TODO: reemplazar por config real del usuario autenticado (DB)
const userConfig = FULL_ATHLETE_CONFIG

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const { features } = userConfig
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { href: '/plan',      label: 'Mi Plan',    icon: CalendarDays,    show: features.plan },
    { href: '/checkin',   label: 'Check-in',   icon: ClipboardCheck,  show: features.checkin },
    { href: '/nutrition', label: 'Nutrición',  icon: Apple,           show: features.nutrition },
    { href: '/progress',  label: 'Progreso',   icon: TrendingUp,      show: features.progress },
    { href: '/coach',     label: 'Panel Coach',icon: Users,           show: features.coach },
  ].filter((l) => l.show)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — oculto en mobile, visible desde md */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-[#1e3a5f] text-white shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#f97316] flex items-center justify-center font-bold text-white text-sm">
              M
            </div>
            <span className="text-xl font-bold tracking-tight">Medaliq</span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
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
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Usuario + logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {mockUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{mockUser.name}</p>
              <p className="text-xs text-white/50 capitalize">{mockUser.role.toLowerCase()}</p>
            </div>
            <button
              className="text-white/50 hover:text-white transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#1e3a5f] text-white">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#f97316] flex items-center justify-center font-bold text-white text-xs">
              M
            </div>
            <span className="text-lg font-bold">Medaliq</span>
          </Link>
          <div className="w-7 h-7 rounded-full bg-[#f97316] flex items-center justify-center text-white text-sm font-bold">
            {mockUser.name.charAt(0)}
          </div>
        </header>

        {/* Mobile bottom nav */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-10">
          {navLinks.slice(0, 5).map(({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-[#f97316]' : 'text-gray-500'
                )}
              >
                <Icon size={20} />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
