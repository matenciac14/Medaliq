import Link from 'next/link'
import { ChevronRight, LayoutDashboard, Users, UserCheck, CreditCard, Settings, AlertTriangle } from 'lucide-react'

const SECTIONS = [
  {
    icon: LayoutDashboard,
    title: 'Overview — KPIs',
    href: '/admin',
    color: '#1e3a5f',
    items: [
      { q: '¿Qué métricas muestra el Overview?', a: 'Usuarios totales, atletas activos, coaches registrados, nuevos esta semana, nuevos este mes y onboardings completados. Todos son datos en tiempo real de la DB.' },
      { q: '¿Con qué frecuencia se actualiza?', a: 'Cada vez que cargas la página — no hay polling automático. Refresca para ver datos actualizados.' },
    ],
  },
  {
    icon: Users,
    title: 'Gestión de usuarios',
    href: '/admin/users',
    color: '#7c3aed',
    items: [
      { q: '¿Qué puedo hacer con un usuario?', a: 'Ver su rol actual, email, fecha de creación y estado de onboarding. Puedes cambiar su rol (ATHLETE → COACH, por ejemplo) directamente desde la tabla.' },
      { q: '¿Cómo promuevo un usuario a Coach?', a: 'En la tabla de usuarios → fila del usuario → menú de rol → selecciona COACH. El cambio es inmediato. El usuario debe volver a iniciar sesión para que el JWT se actualice.' },
      { q: '¿Puedo eliminar usuarios?', a: 'Actualmente no hay acción de eliminar desde el admin para evitar pérdidas accidentales. Para eliminar, hacerlo directamente en la DB o en Neon.' },
    ],
  },
  {
    icon: UserCheck,
    title: 'Coaches',
    href: '/admin/coaches',
    color: '#059669',
    items: [
      { q: '¿Qué información veo de cada coach?', a: 'Nombre, email, cantidad de atletas asignados, si tiene perfil público activo y fecha de registro.' },
      { q: '¿Cómo veo los atletas de un coach?', a: 'En la fila del coach hay un botón para expandir y ver sus atletas actuales vinculados.' },
    ],
  },
  {
    icon: CreditCard,
    title: 'Suscripciones',
    href: '/admin/subscriptions',
    color: '#f97316',
    items: [
      { q: '¿Cómo se determina el plan de cada usuario?', a: 'Por ahora se infiere del campo config.features en la DB. Un usuario con todas las features activas es "Pro". Un usuario con solo features básicas es "Free". No hay Stripe todavía.' },
      { q: '¿Cuándo se integra Stripe?', a: 'Fase 7 del roadmap — post-lanzamiento. El webhook de Stripe actualizará automáticamente el config del usuario al confirmar el pago.' },
    ],
  },
  {
    icon: Settings,
    title: 'Ajustes',
    href: '/admin/settings',
    color: '#6b7280',
    items: [
      { q: '¿Qué hay en Ajustes?', a: 'Estado del stack técnico (Next.js, Prisma, Neon, Claude API), integraciones pendientes y configuración de la plataforma.' },
      { q: '¿Cómo veo el roadmap del producto?', a: 'En Ajustes → sección Roadmap, o directamente en /admin/roadmap. El roadmap está hardcodeado en el código y se actualiza manualmente con cada feature completada.' },
      { q: '¿Cómo agrego un nuevo admin?', a: 'Crea o encuentra al usuario en /admin/users y cambia su rol a ADMIN.' },
    ],
  },
]

export default function AdminHelpPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de ayuda — Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Guía de operaciones de la plataforma Medaliq.</p>
      </div>

      {/* Credenciales de prueba */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Usuarios de prueba en producción</p>
          <div className="text-xs text-amber-700 mt-1 space-y-0.5 font-mono">
            <p>admin@medaliq.com / admin123!</p>
            <p>coach@medaliq.com / coach123</p>
            <p>miguel@medaliq.com / atleta123 (con plan + coach)</p>
            <p>ana@medaliq.com / atleta123 (B2C sin coach)</p>
          </div>
        </div>
      </div>

      {/* Stack rápido */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Stack técnico</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['Framework', 'Next.js 16 App Router'],
            ['DB', 'PostgreSQL — Neon (serverless)'],
            ['ORM', 'Prisma 7'],
            ['Auth', 'Auth.js v5 (JWT)'],
            ['AI', 'Claude Sonnet 4.6 (Anthropic)'],
            ['Deploy', 'Vercel — auto-deploy desde main'],
            ['Dominio', 'medaliq.com → Route 53 → Vercel'],
            ['Repo', 'github.com/matenciac14/Medaliq'],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-gray-400">{k}: </span>
              <span className="font-medium text-gray-700">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Secciones */}
      <div className="space-y-4">
        {SECTIONS.map(({ icon: Icon, title, href, color, items }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <h2 className="text-sm font-bold text-gray-900">{title}</h2>
              </div>
              <Link href={href} className="flex items-center gap-1 text-xs font-medium" style={{ color }}>
                Ir <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(({ q, a }) => (
                <div key={q} className="px-5 py-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{q}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
