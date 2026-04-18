// No DB queries — estado del producto hardcoded y actualizable manualmente

const PHASES = [
  {
    id: 'foundation',
    label: 'Fase 1 — Fundación',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Auth completa (login, registro, JWT)', done: true, note: 'Email + Google OAuth placeholder' },
      { title: 'Onboarding wizard guiado (9 pasos)', done: true, note: 'Sin chat — UI con selecciones' },
      { title: 'Generador de plan AI (Haiku + templates)', done: true, note: '4 templates: media maratón, 10k, 5k, recomposición' },
      { title: 'Dashboard atleta con datos reales de DB', done: true, note: 'Fallback a mock si DB vacía' },
      { title: 'Calendario de plan (18 semanas, fases)', done: true, note: 'BASE → DESARROLLO → ESPECÍFICO → AFINAMIENTO' },
      { title: 'Registro de sesión (log de entreno)', done: true, note: 'Guarda en DB con RPE, FC, distancia' },
      { title: 'Check-in semanal + motor de alertas', done: true, note: 'Reglas deterministas + Claude Haiku para recomendación' },
      { title: 'Plan nutricional con AI', done: true, note: 'TDEE + macros + Haiku personaliza notas' },
      { title: 'Gráficas de progreso', done: true, note: 'Peso, FC reposo, km semana, adherencia, benchmarks' },
      { title: 'UserConfig JSON por usuario', done: true, note: 'Sidebar dinámico según features activas' },
    ],
  },
  {
    id: 'coach',
    label: 'Fase 2 — Coach B2B',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Dashboard coach — vista de atletas', done: true, note: 'Adherencia, alertas, resumen por atleta' },
      { title: 'Panel coach — detalle de atleta (4 tabs)', done: true, note: 'Resumen, plan, progreso, nutrición' },
      { title: 'Coach: revisar y aprobar plan generado por AI', done: false, note: 'UI lista — API no persiste aprobación en DB (stub)' },
      { title: 'Vinculación coach-atleta por código invitación', done: true, note: '/join/[code]' },
      { title: 'Coach puede editar features del atleta', done: true, note: 'Toggles en panel de atleta' },
    ],
  },
  {
    id: 'gym',
    label: 'Fase 3 — Gym Coach',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Schema DB: Exercise, WorkoutTemplate, AssignedWorkout, GymSession, SetLog', done: true, note: 'Migración aplicada' },
      { title: '39 ejercicios globales en seed', done: true, note: 'Todos los grupos musculares' },
      { title: 'Biblioteca de ejercicios (coach)', done: true, note: 'Global + personalizados, filtros por músculo/equipo' },
      { title: 'Constructor de rutinas wizard (4 pasos)', done: true, note: 'Info → días → ejercicios → revisar' },
      { title: 'Asignación de rutina a atleta', done: true, note: 'Con fecha inicio, duración y notas' },
      { title: 'Dashboard gym atleta (rutina activa + adherencia)', done: true, note: 'Grid semanal de completitud' },
      { title: 'Tracker de sesión en tiempo real', done: true, note: 'Sets/pesos, timer descanso, referencia sesión anterior' },
      { title: 'Historial de sesiones gym', done: true, note: 'Expandible con pesos por serie' },
      { title: 'Progresión de cargas sugerida por AI', done: true, note: 'Si completó todos los reps objetivo → badge +2.5kg en sesión' },
      { title: 'Coach ve logs y progresión del atleta en gym', done: true, note: 'Tab Gym en panel atleta: gráfica de peso por ejercicio + detalle última sesión' },
    ],
  },
  {
    id: 'marketplace',
    label: 'Fase 4 — Marketplace de Coaches',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Schema DB: CoachProfile, CoachProgram, CoachPost', done: true, note: 'Migración marketplace aplicada' },
      { title: 'Directorio público de coaches (/coaches)', done: true, note: 'Grid con filtros por deporte + AI Coach card destacada' },
      { title: 'Perfil público del coach (/p/[slug])', done: true, note: 'Bio, programas, posts, CTA unirse' },
      { title: 'Perfil AI Coach (/p/ai-coach)', done: true, note: 'Coach inteligente como opción del marketplace' },
      { title: 'Coach edita su perfil público', done: true, note: 'Slug, bio, especialidades, programas, publicaciones' },
      { title: 'Coach publica contenido (tips, rutinas, logros)', done: true, note: 'Feed visible en perfil público' },
      { title: 'Coach crea asesorado directamente', done: true, note: 'Sin código invitación — genera credenciales temporales' },
      { title: 'Atleta se une a coach desde marketplace', done: true, note: 'POST /api/coach/join desde /p/[slug]' },
      { title: 'Reviews y ratings de coaches', done: false, note: 'Futuro — post-lanzamiento' },
      { title: 'Stripe split Medaliq/coach', done: false, note: 'Futuro — cuando haya volumen' },
    ],
  },
  {
    id: 'admin',
    label: 'Fase 5 — Admin & Operaciones',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Panel admin: Overview con KPIs de negocio', done: true, note: 'Usuarios, coaches, onboardings, nuevos esta semana' },
      { title: 'Panel admin: Gestión de usuarios (roles)', done: true, note: 'Cambio de rol en tiempo real' },
      { title: 'Panel admin: Gestión de coaches y atletas', done: true, note: 'Vista de relaciones coach ↔ atleta' },
      { title: 'Panel admin: Suscripciones (tiers por config)', done: true, note: 'Free / Pro / Coach inferido del config' },
      { title: 'Panel admin: Configuración de plataforma', done: true, note: 'Stack técnico e integraciones pendientes' },
      { title: 'Panel admin: Roadmap del producto', done: true, note: 'Esta página' },
      { title: 'Middleware: protección completa de rutas', done: true, note: 'Admin→/admin, Coach→/coach, sin auth→/login' },
      { title: 'Landing page con hero, pricing, cómo funciona', done: true, note: 'Sin sección de comparación' },
    ],
  },
  {
    id: 'deploy',
    label: 'Fase 6 — Deploy & Infraestructura',
    period: 'Próximo',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    items: [
      { title: 'Variables de entorno en producción', done: true, note: 'NEXTAUTH_SECRET, DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_URL configuradas' },
      { title: 'PostgreSQL en Neon (serverless)', done: true, note: '4 migraciones aplicadas + seed con 39 ejercicios' },
      { title: 'Deploy en Vercel', done: false, note: 'Conectar repo GitHub, configurar env vars, dominio medaliq.com' },
      { title: 'Dominio medaliq.com → Vercel', done: false, note: 'DNS en Route 53 → CNAME a cname.vercel-dns.com' },
      { title: 'Prisma connection pooling (PgBouncer/Neon)', done: false, note: 'Requiere ?pgbouncer=true en DATABASE_URL' },
      { title: 'Rate limiting en APIs críticas', done: false, note: '/api/auth/register, /api/onboarding/generate, /api/ai/chat' },
      { title: 'Error pages personalizadas (404, 500)', done: false, note: 'src/app/not-found.tsx + error.tsx' },
      { title: 'Google OAuth con dominio real', done: false, note: 'Google Cloud Console → credenciales con medaliq.com' },
      { title: 'Agregar /coaches a sitemap y SEO meta tags', done: false, note: 'Páginas públicas del marketplace deben ser indexables' },
    ],
  },
  {
    id: 'monetization',
    label: 'Fase 7 — Monetización',
    period: 'Post-lanzamiento',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      { title: 'Integración Stripe (pagos)', done: false, note: 'Free / Pro $15 / Coach $49 — suscripciones mensuales' },
      { title: 'Modelo Subscription en DB', done: false, note: 'Stripe webhook → actualiza User.config.features' },
      { title: 'Email transaccional AWS SES', done: false, note: 'Bienvenida, invitación coach, recuperación de contraseña' },
      { title: 'Página de upgrade (Free → Pro)', done: false, note: 'Mostrar cuando atleta intenta acceder a feature Pro' },
      { title: 'Trial de 14 días gratis', done: false, note: 'Sin tarjeta, todas las features activas' },
    ],
  },
  {
    id: 'integrations',
    label: 'Fase 8 — Integraciones fitness',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: 'Strava OAuth + webhook de actividades', done: false, note: 'Auto-completa SessionLog cuando termina actividad' },
      { title: 'Garmin Connect API', done: false, note: 'Datos ricos: HRV, sueño, zonas FC reales, training load' },
      { title: 'Polar Flow API', done: false, note: 'Popular en LatAm, FC y recovery score' },
      { title: 'Google Health Connect (Android)', done: false, note: 'Pasos, FC, sueño desde cualquier wearable Android' },
      { title: 'Apple HealthKit (iOS nativa)', done: false, note: 'Requiere app en App Store — fase muy futura' },
      { title: 'Whoop / Oura Ring', done: false, note: 'APIs privadas, requiere partnership — largo plazo' },
    ],
  },
]

function progress(items: { done: boolean }[]) {
  const done = items.filter((i) => i.done).length
  return { done, total: items.length, pct: Math.round((done / items.length) * 100) }
}

const STATUS_COLOR: Record<string, string> = {
  'Completado':       'bg-green-100 text-green-700',
  'En construcción':  'bg-orange-100 text-orange-700',
  'Próximo':          'bg-purple-100 text-purple-700',
  'Post-lanzamiento': 'bg-cyan-100 text-cyan-700',
  'Futuro':           'bg-gray-100 text-gray-500',
}

export default function AdminRoadmapPage() {
  const totalItems = PHASES.flatMap((p) => p.items)
  const totalDone = totalItems.filter((i) => i.done).length
  const totalPct = Math.round((totalDone / totalItems.length) * 100)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Roadmap del producto</h1>
        <p className="text-sm text-gray-500 mt-1">Estado de desarrollo de Medaliq — actualiza este archivo cuando completes una tarea</p>
      </div>

      {/* Progreso general */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-600">Progreso total del producto</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">
              {totalDone} <span className="text-lg font-medium text-gray-400">/ {totalItems.length} tareas</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-extrabold" style={{ color: '#1e3a5f' }}>{totalPct}%</p>
            <p className="text-xs text-gray-400 mt-1">completado</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all"
            style={{ width: `${totalPct}%`, backgroundColor: '#f97316' }}
          />
        </div>

        {/* Mini resumen por fase */}
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mt-6">
          {PHASES.map((phase) => {
            const { done, total, pct } = progress(phase.items)
            return (
              <div key={phase.id} className="text-center">
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: phase.color }} />
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">{phase.label.split('—')[1]?.trim()}</p>
                <p className="text-xs font-bold text-gray-700">{done}/{total}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Fases */}
      <div className="space-y-6">
        {PHASES.map((phase) => {
          const { done, total, pct } = progress(phase.items)
          return (
            <div
              key={phase.id}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: phase.borderColor, backgroundColor: phase.bgColor }}
            >
              {/* Phase header */}
              <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: phase.borderColor }}>
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-gray-900">{phase.label}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[phase.period]}`}>
                    {phase.period}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-white/60 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: phase.color }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: phase.color }}>{done}/{total}</span>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y" style={{ borderColor: phase.borderColor }}>
                {phase.items.map((item, idx) => (
                  <div key={idx} className="px-6 py-3 flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {item.done ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#16a34a' }}>
                          ✓
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${item.done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                        {item.title}
                      </p>
                      {item.note && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center">
        Medaliq Roadmap · Actualizar en <code className="bg-gray-100 px-1 rounded">src/app/admin/roadmap/page.tsx</code>
      </p>
    </div>
  )
}
