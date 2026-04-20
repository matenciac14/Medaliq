'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Users, Dumbbell, Globe, Settings, LogOut, Plus, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/app/_components/LanguageContext'
import LanguageSwitcher from '@/app/_components/LanguageSwitcher'

type Props = { coachName: string }

export default function CoachSidebarClient({ coachName }: Props) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const s = t.app.sidebar
  const initials = coachName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const navLinks = [
    { href: '/coach/dashboard', label: s.myAthletes,     icon: Users      },
    { href: '/coach/gym',       label: s.gym,            icon: Dumbbell   },
    { href: '/coach/profile',   label: s.myProfile,      icon: Globe      },
    { href: '/coach/settings',  label: s.settings,       icon: Settings   },
    { href: '/coach/help',      label: s.help,           icon: HelpCircle },
  ]

  function isActive(href: string) {
    return href === '/coach/dashboard' ? pathname === '/coach/dashboard' : pathname.startsWith(href)
  }

  return (
    <>
      {/* Sidebar — desktop */}
      <aside
        className="hidden lg:flex lg:flex-col w-64 fixed inset-y-0 left-0 z-10 shadow-lg"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/coach/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: '#f97316' }}>M</div>
            <span className="text-white font-bold text-lg tracking-tight">Medaliq</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(href) ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
          <Link
            href="/coach/clients/new"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === '/coach/clients/new' ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            <Plus size={18} />
            <span>{s.createAthlete}</span>
          </Link>
        </nav>

        <div className="px-4 pb-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white text-sm py-2 px-3 rounded-lg hover:bg-white/10 transition-colors">
            <span>←</span><span>Mi dashboard</span>
          </Link>
        </div>

        <div className="px-4 pb-6 border-t border-white/10 pt-4">
          <div className="px-3 py-2 mb-3">
            <LanguageSwitcher variant="dark" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: '#f97316' }}>{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-tight truncate">{coachName}</p>
              <p className="text-white/50 text-xs">Coach</p>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-white/50 hover:text-white transition-colors" title={s.logout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#1e3a5f' }}>
        <Link href="/coach/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#f97316' }}>M</div>
          <span className="text-white font-bold text-base">Medaliq Coach</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="dark" />
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors">
            <LogOut size={16} />
            <span>{s.logout}</span>
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-end z-20">
        <Link href="/coach/dashboard" className={cn('flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors', isActive('/coach/dashboard') ? 'text-[#f97316]' : 'text-gray-500')}>
          <Users size={20} />
          {s.myAthletes}
        </Link>
        <Link href="/coach/gym" className={cn('flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors', isActive('/coach/gym') ? 'text-[#f97316]' : 'text-gray-500')}>
          <Dumbbell size={20} />
          {s.gym}
        </Link>
        {/* Center action — Crear asesorado */}
        <Link href="/coach/clients/new" className="flex-1 flex flex-col items-center pb-2">
          <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-md -mt-5 text-white" style={{ backgroundColor: '#f97316' }}>
            <Plus size={22} />
          </div>
          <span className="text-[10px] font-medium text-gray-500 mt-0.5">{s.newAthlete}</span>
        </Link>
        <Link href="/coach/profile" className={cn('flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors', isActive('/coach/profile') ? 'text-[#f97316]' : 'text-gray-500')}>
          <Globe size={20} />
          {s.myProfile}
        </Link>
        <Link href="/coach/settings" className={cn('flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors', isActive('/coach/settings') ? 'text-[#f97316]' : 'text-gray-500')}>
          <Settings size={20} />
          {s.settings}
        </Link>
      </nav>
    </>
  )
}
