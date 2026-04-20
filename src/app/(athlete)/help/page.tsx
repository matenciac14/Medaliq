import Link from 'next/link'
import { ChevronRight, LayoutDashboard, CalendarDays, ClipboardCheck, Apple, TrendingUp, Dumbbell, UserCircle, MessageCircle, AlertTriangle } from 'lucide-react'

const SECTIONS = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    href: '/dashboard',
    color: '#1e3a5f',
    items: [
      { q: '¿Qué veo en el dashboard?', a: 'Tu sesión de entrenamiento de hoy, los 7 días de la semana con sus sesiones, métricas clave (peso, FC reposo, sueño) y acceso rápido a check-in, nutrición y tu plan completo.' },
      { q: '¿Por qué aparece "Sin métricas registradas"?', a: 'Aún no has registrado datos en tu perfil. Ve a Mi perfil y agrega tu peso, FC reposo y horas de sueño.' },
      { q: '¿Qué significa el indicador de hoy en la semana?', a: 'El día actual aparece resaltado con fondo azul. Los círculos ○ son días de descanso, los íconos son el tipo de sesión planificada, y ✅ indica sesión completada.' },
    ],
  },
  {
    icon: CalendarDays,
    title: 'Mi Plan',
    href: '/plan',
    color: '#7c3aed',
    items: [
      { q: '¿Cómo está estructurado mi plan?', a: 'Tu plan está dividido en fases (BASE → DESARROLLO → ESPECÍFICO → AFINAMIENTO) con semanas de carga progresiva y semanas de recuperación intercaladas.' },
      { q: '¿Qué son las zonas de FC (Z1, Z2, Z3...)?', a: 'Son rangos de frecuencia cardíaca calculados con la fórmula Karvonen usando tu FC reposo y FC máxima. Z2 es intensidad aeróbica baja (puedes hablar), Z4-Z5 son alta intensidad.' },
      { q: '¿Puedo cambiar una sesión de día?', a: 'Por ahora el plan es fijo. Si necesitas mover una sesión, coméntaselo a tu coach o al AI Coach para que te oriente.' },
    ],
  },
  {
    icon: ClipboardCheck,
    title: 'Check-in semanal',
    href: '/checkin',
    color: '#059669',
    items: [
      { q: '¿Por qué debo hacer el check-in?', a: 'El check-in alimenta al AI con datos reales de tu semana (peso, sueño, energía, RPE). Sin él, el plan no puede ajustarse a cómo estás respondiendo realmente.' },
      { q: '¿Cuándo debo hacerlo?', a: 'Una vez por semana, idealmente el mismo día (ej: domingo por la noche o lunes en la mañana antes de entrenar).' },
      { q: '¿Qué pasa si tengo dolor o lesión?', a: 'Marca "bandera roja de dolor" en el check-in. El sistema alerta a tu coach y el AI ajusta la carga para la próxima semana.' },
    ],
  },
  {
    icon: Apple,
    title: 'Nutrición',
    href: '/nutrition',
    color: '#16a34a',
    items: [
      { q: '¿Cómo se calcula mi plan nutricional?', a: 'Se calcula con Mifflin-St Jeor para tu TDEE (gasto energético total), ajustado por tu nivel de actividad y objetivo (déficit, mantenimiento o superávit).' },
      { q: '¿Los macros cambian según el día?', a: 'Sí. Los días de sesión de alta intensidad o larga duración tienen más carbohidratos. Los días de descanso tienen menos.' },
      { q: '¿Puedo pedir un plan vegano/sin gluten?', a: 'Cuéntaselo al AI Coach — puede orientarte sobre ajustes dentro de tu plan, aunque para dietas especiales complejas siempre recomendamos un nutricionista.' },
    ],
  },
  {
    icon: TrendingUp,
    title: 'Progreso',
    href: '/progress',
    color: '#0891b2',
    items: [
      { q: '¿Qué métricas se grafican?', a: 'Peso corporal, FC reposo, km por semana y adherencia al plan. Los datos vienen de tus check-ins semanales.' },
      { q: '¿Cada cuánto se actualiza el gráfico?', a: 'Cada vez que completas un check-in semanal se agrega un nuevo punto de datos.' },
      { q: '¿Qué son los benchmarks?', a: 'Son tests de rendimiento programados en tu plan (ej: Test 5km en semana 4). Sirven para medir progreso real y ajustar zonas de FC.' },
    ],
  },
  {
    icon: Dumbbell,
    title: 'Gym / Rutina de fuerza',
    href: '/gym',
    color: '#f97316',
    items: [
      { q: '¿Cómo empiezo una sesión de gym?', a: 'Ve a Gym → selecciona el día de hoy → toca "Iniciar sesión". Registra el peso y repeticiones de cada serie. El timer de descanso se activa automáticamente.' },
      { q: '¿Qué significa el badge "+2.5 kg recomendado"?', a: 'Completaste todos los sets con las repeticiones objetivo — eso indica que el peso ya no es un estímulo suficiente. La próxima sesión sube 2.5 kg en ese ejercicio.' },
      { q: '¿Quién asigna mi rutina de gym?', a: 'Tu coach crea la rutina y te la asigna. Si no tienes coach, puedes pedirle al AI Coach que te oriente sobre rutinas.' },
    ],
  },
  {
    icon: UserCircle,
    title: 'Mi Perfil',
    href: '/profile',
    color: '#1e3a5f',
    items: [
      { q: '¿Qué datos puedo editar en mi perfil?', a: 'Fecha de nacimiento (calcula edad automáticamente), altura, peso actual y objetivo, FC reposo, FC máxima real, lesiones activas y condiciones médicas.' },
      { q: '¿Por qué me pide la fecha de nacimiento y no la edad?', a: 'La fecha de nacimiento permite que la edad se calcule automáticamente y siempre esté actualizada. También se estima la FC máxima con la fórmula Tanaka (208 − 0.7×edad).' },
      { q: '¿Para qué sirven las métricas diarias?', a: 'Puedes registrar peso, FC reposo, sueño y nivel de energía cada día. Estos datos aparecen en tu dashboard y alimentan al AI Coach para darte recomendaciones más precisas.' },
    ],
  },
  {
    icon: MessageCircle,
    title: 'AI Coach',
    href: '/dashboard',
    color: '#7c3aed',
    items: [
      { q: '¿Qué puede hacer el AI Coach?', a: 'Orientarte sobre tu plan de entrenamiento, recuperación, nutrición general, zonas de FC, carga semanal y cualquier duda de rendimiento deportivo.' },
      { q: '¿Qué NO puede hacer el AI Coach?', a: 'No puede diagnosticar enfermedades, recetar medicamentos ni reemplazar a un médico o nutricionista clínico. Si tienes síntomas médicos, consulta a un profesional de salud.' },
      { q: '¿El AI Coach conoce mis datos?', a: 'Sí. Cada conversación carga tu perfil completo: peso, FC, lesiones, condiciones médicas, plan activo y último check-in. Sus recomendaciones respetan tus restricciones de salud.' },
    ],
  },
]

export default function AthleteHelpPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de ayuda</h1>
        <p className="text-sm text-gray-500 mt-1">Todo lo que necesitas saber para sacarle el máximo a Medaliq.</p>
      </div>

      {/* Aviso médico */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Medaliq es coaching deportivo, no medicina</p>
          <p className="text-xs text-amber-700 mt-0.5">Consulta siempre a un médico antes de iniciar un programa de entrenamiento si tienes condiciones de salud preexistentes. El AI Coach no puede diagnosticar ni tratar enfermedades.</p>
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

      <div className="text-center py-4">
        <p className="text-xs text-gray-400">¿Tienes más preguntas? Pregúntale directamente al <Link href="/dashboard" className="text-[#f97316] font-medium underline">AI Coach</Link> en tu dashboard.</p>
      </div>
    </div>
  )
}
