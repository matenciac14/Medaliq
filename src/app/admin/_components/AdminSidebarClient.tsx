'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, Users, UserCheck, CreditCard, Settings, LogOut, HelpCircle, UserPlus, Map, BarChart2, DollarSign, Bell, ClipboardList, Link2, Timer, Dumbbell, Apple, ToggleLeft } from 'lucide-react'
import { useLanguage } from '@/app/_components/LanguageContext'
import LanguageSwitcher from '@/app/_components/LanguageSwitcher'

export function AdminSidebarClient() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const s = t.app.sidebar

  // Todos los items — sidebar desktop
  const NAV_ITEMS = [
    { href: '/admin',               label: s.overview,       icon: LayoutDashboard },
    { href: '/admin/users',         label: s.users,          icon: Users           },
    { href: '/admin/activaciones',  label: s.activations,    icon: UserPlus        },
    { href: '/admin/coaches',       label: s.coaches,        icon: UserCheck       },
    { href: '/admin/subscriptions', label: s.subscriptions,  icon: CreditCard      },
    { href: '/admin/alerts',        label: 'Alertas',        icon: Bell            },
    { href: '/admin/finanzas',      label: 'Finanzas',       icon: DollarSign      },
    { href: '/admin/metrics',       label: 'Métricas',       icon: BarChart2       },
    { href: '/admin/audit',         label: 'Actividad',      icon: ClipboardList   },
    { href: '/admin/invite-codes',  label: 'Invite Codes',   icon: Link2           },
    { href: '/admin/crons',         label: 'Crons',          icon: Timer           },
    { href: '/admin/exercises',     label: 'Entrenamiento',  icon: Dumbbell        },
    { href: '/admin/nutrition/proposals', label: 'Propuestas alim.', icon: Apple },
    { href: '/admin/features',      label: 'Features',       icon: ToggleLeft      },
    { href: '/admin/roadmap',       label: s.roadmap,        icon: Map             },
    { href: '/admin/settings',      label: s.settings,       icon: Settings        },
    { href: '/admin/help',          label: s.help,           icon: HelpCircle      },
  ]

  // Solo los 5 más usados — bottom nav mobile
  const MOBILE_NAV_ITEMS = [
    { href: '/admin',              label: s.overview,    icon: LayoutDashboard },
    { href: '/admin/users',        label: s.users,       icon: Users           },
    { href: '/admin/activaciones', label: s.activations, icon: UserPlus        },
    { href: '/admin/roadmap',      label: s.roadmap,     icon: Map             },
    { href: '/admin/settings',     label: s.settings,    icon: Settings        },
  ]

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside
        className="hidden lg:flex lg:flex-col w-60 h-screen sticky top-0 overflow-y-auto shrink-0"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#ea580c' }}>
              M
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Medaliq <span style={{ color: '#ea580c' }}>Admin</span>
            </span>
          </div>
        </div>

        <div className="px-4 pt-3 pb-1">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="flex-1 text-left">Buscar…</span>
            <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive(href) ? '#ea580c' : 'transparent',
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
            onClick={() => signOut({ callbackUrl: '/login?from=signout' })}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-white/50 hover:text-white transition-colors min-h-[44px]"
          >
            <LogOut size={16} />
            <span>{s.logout}</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#1e3a5f' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#ea580c' }}>
            M
          </div>
          <span className="text-white font-bold text-base tracking-tight">
            Medaliq <span style={{ color: '#ea580c' }}>Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="dark" />
          <button
            onClick={() => signOut({ callbackUrl: '/login?from=signout' })}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <LogOut size={16} />
            <span>{s.logout}</span>
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-20">
        {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
            style={{ color: isActive(href) ? '#ea580c' : '#6b7280' }}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
