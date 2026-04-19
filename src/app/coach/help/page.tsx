import Link from 'next/link'
import { ChevronRight, Users, Dumbbell, Globe, Plus, Settings, AlertTriangle } from 'lucide-react'

const SECTIONS = [
  {
    icon: Users,
    title: 'Mis atletas',
    href: '/coach/dashboard',
    color: '#1e3a5f',
    items: [
      { q: '¿Qué información veo en el panel de atletas?', a: 'Atletas activos, check-ins pendientes de revisar y alertas activas (sobrecarga, dolor reportado, baja adherencia). Puedes filtrar por "Con alertas" o "Sin check-in reciente".' },
      { q: '¿Qué son las alertas de atleta?', a: 'Notificaciones automáticas cuando un atleta reporta dolor, baja energía, adherencia < 60% o variaciones importantes en FC reposo. Requieren tu atención.' },
      { q: '¿Qué veo en el detalle de un atleta?', a: '5 tabs: Resumen (métricas clave), Plan (sesiones semanales), Progreso (gráficas), Nutrición (macros) y Gym (progresión de cargas por ejercicio).' },
      { q: '¿Puedo editar el plan de un atleta?', a: 'Puedes revisar y aprobar el plan generado por AI. Para modificaciones profundas de sesiones individuales, la función completa de edición está en desarrollo.' },
    ],
  },
  {
    icon: Plus,
    title: 'Crear asesorado',
    href: '/coach/clients/new',
    color: '#f97316',
    items: [
      { q: '¿Cómo agrego un nuevo atleta?', a: 'Toca el botón "+" central en la nav de abajo (móvil) o "Crear asesorado" en el sidebar (desktop). Ingresa nombre, email, deporte y una nota inicial.' },
      { q: '¿Qué recibe el atleta cuando lo creo?', a: 'Se crea su cuenta con credenciales temporales. El atleta recibe sus datos de acceso y puede completar su onboarding (9 pasos) para que el AI genere su plan.' },
      { q: '¿Cuál es la diferencia con el código de invitación?', a: 'El código de invitación es para atletas que ya tienen cuenta y quieren unirse a ti. "Crear asesorado" crea la cuenta desde cero — útil para atletas que no conocen la plataforma.' },
    ],
  },
  {
    icon: Dumbbell,
    title: 'Gym — Rutinas',
    href: '/coach/gym',
    color: '#7c3aed',
    items: [
      { q: '¿Cómo creo una rutina de gym?', a: 'Ve a Gym → "Nueva rutina". El wizard tiene 4 pasos: información general, días de entrenamiento, ejercicios por día (con sets, reps y esquema) y revisión final.' },
      { q: '¿Puedo reutilizar ejercicios entre rutinas?', a: 'Sí. La biblioteca tiene 39 ejercicios globales (creados por Medaliq) y puedes crear ejercicios personalizados que quedan asociados a tu cuenta.' },
      { q: '¿Cómo asigno una rutina a un atleta?', a: 'En Gym → selecciona la rutina → "Asignar atleta". Elige el atleta, la fecha de inicio y si reemplaza la rutina actual. El atleta puede empezar a registrar sesiones de inmediato.' },
      { q: '¿Cómo veo el progreso gym del atleta?', a: 'En el detalle del atleta → tab "Gym". Verás una mini gráfica de progresión de peso por ejercicio y el detalle de la última sesión (series, pesos, reps completadas).' },
    ],
  },
  {
    icon: Globe,
    title: 'Mi perfil público',
    href: '/coach/profile',
    color: '#059669',
    items: [
      { q: '¿Para qué sirve mi perfil público?', a: 'Es tu página de presentación en el marketplace de Medaliq (/p/tu-slug). Los atletas pueden encontrarte, ver tus especialidades, programas y publicaciones.' },
      { q: '¿Qué puedo agregar a mi perfil?', a: 'Bio, foto, especialidades deportivas, ciudad, años de experiencia, certificaciones y programas de entrenamiento con precio mensual.' },
      { q: '¿Cómo publico contenido?', a: 'En tu perfil → sección "Publicaciones". Puedes publicar tips, rutinas showcase, logros de atletas o anuncios. Aparecen en tu perfil público.' },
      { q: '¿Cómo aparezco en el directorio /coaches?', a: 'Activa la opción "Perfil público" en tu configuración de perfil. Una vez activo, apareces en el directorio filtrable por deporte.' },
    ],
  },
  {
    icon: Settings,
    title: 'Configuración',
    href: '/coach/settings',
    color: '#6b7280',
    items: [
      { q: '¿Qué puedo configurar?', a: 'Datos de cuenta (nombre, email), código de invitación personal para compartir con atletas, y preferencias de notificaciones.' },
      { q: '¿Cómo obtengo mi código de invitación?', a: 'En Configuración → "Mi código de invitación". Compártelo con atletas que ya tienen cuenta para que se vinculen contigo.' },
    ],
  },
]

export default function CoachHelpPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de ayuda — Coach</h1>
        <p className="text-sm text-gray-500 mt-1">Guía completa para gestionar tus atletas con Medaliq.</p>
      </div>

      {/* Nota */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <AlertTriangle size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Tu rol como coach</p>
          <p className="text-xs text-blue-700 mt-0.5">El AI genera planes y hace el seguimiento automático. Tu valor está en el criterio humano: ajustar, motivar y tomar decisiones que ningún algoritmo puede tomar.</p>
        </div>
      </div>

      {/* Flujo rápido */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Flujo para comenzar con un atleta nuevo</h2>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Crea el asesorado con su nombre y email', href: '/coach/clients/new' },
            { step: '2', text: 'El atleta completa su onboarding (9 pasos)' },
            { step: '3', text: 'El AI genera el plan — tú lo revisas y apruebas' },
            { step: '4', text: 'Si hace gym: crea y asigna una rutina', href: '/coach/gym' },
            { step: '5', text: 'Monitorea semana a semana desde el dashboard', href: '/coach/dashboard' },
          ].map(({ step, text, href }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{step}</div>
              <p className="text-sm text-gray-700 flex-1">{text}</p>
              {href && <Link href={href} className="text-xs text-[#f97316] font-medium shrink-0 flex items-center gap-0.5">Ir <ChevronRight size={12} /></Link>}
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
