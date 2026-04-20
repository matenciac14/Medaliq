'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, Users, UserCheck, CreditCard, Settings, LogOut, HelpCircle, UserPlus, Bot, Map } from 'lucide-react'
import { useLanguage } from '@/app/_components/LanguageContext'
import LanguageSwitcher from '@/app/_components/LanguageSwitcher'

export function AdminSidebarClient() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const s = t.app.sidebar

  const NAV_ITEMS = [
    { href: '/admin',               label: s.overview,       icon: LayoutDashboard },
    { href: '/admin/users',         label: s.users,          icon: Users           },
    { href: '/admin/activaciones',  label: s.activations,    icon: UserPlus        },
    { href: '/admin/coaches',       label: s.coaches,        icon: UserCheck       },
    { href: '/admin/subscriptions', label: s.subscriptions,  icon: CreditCard      },
    { href: '/admin/ai',            label: s.ai,             icon: Bot             },
    { href: '/admin/roadmap',       label: s.roadmap,        icon: Map             },
    { href: '/admin/settings',      label: s.settings,       icon: Settings        },
    { href: '/admin/help',          label: s.help,           icon: HelpCircle      },
  ]

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside
        className="hidden lg:flex lg:flex-col w-64 h-screen sticky top-0 overflow-y-auto shrink-0"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#f97316' }}>
              M
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Medaliq <span style={{ color: '#f97316' }}>Admin</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive(href) ? '#f97316' : 'transparent',
                color: isActive(href) ? '#fff' : '#9ca3af',
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1">
          <div className="px-3 py-2 mb-1">
            <LanguageSwitcher variant="dark" />
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Ir a la app</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            <span>{s.logout}</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#1e3a5f' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#f97316' }}>
            M
          </div>
          <span className="text-white font-bold text-base tracking-tight">
            Medaliq <span style={{ color: '#f97316' }}>Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="dark" />
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <LogOut size={16} />
            <span>{s.logout}</span>
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-20">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
            style={{ color: isActive(href) ? '#f97316' : '#6b7280' }}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
