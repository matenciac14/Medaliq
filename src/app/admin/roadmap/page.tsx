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
      { title: 'Panel coach — detalle de atleta (5 tabs)', done: true, note: 'Resumen, plan, progreso, nutrición, gym' },
      { title: 'Tab Gym en panel atleta del coach', done: true, note: 'Gráfica de progresión por ejercicio + detalle última sesión' },
      { title: 'Coach: revisar y aprobar plan generado por AI', done: false, note: 'UI lista — API no persiste aprobación en DB (stub)' },
      { title: 'Tabs Resumen/Plan/Progreso/Nutrición → datos reales de DB', done: true, note: 'Promise.all: HealthProfile, TrainingPlan+weeks+sessions, WeeklyCheckIn x8, NutritionPlan. Verificación coach-atleta.' },
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
      { title: 'UI mobile armonizada (admin + coach + atleta)', done: true, note: 'Fixed header, bottom nav con lucide icons, colores consistentes #1e3a5f' },
      { title: 'Navegación bottom nav: lucide icons en todos los paneles', done: true, note: 'Admin: 5 items, Coach: center FAB, Atleta: gym priorizado' },
    ],
  },
  {
    id: 'deploy',
    label: 'Fase 6 — Deploy & Infraestructura',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Variables de entorno en producción', done: true, note: 'NEXTAUTH_SECRET, DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_URL configuradas' },
      { title: 'PostgreSQL en Neon (serverless)', done: true, note: '4 migraciones aplicadas + seed con 39 ejercicios' },
      { title: 'Deploy en Vercel', done: true, note: 'Integrado con GitHub main branch — auto-deploy en cada push' },
      { title: 'Dominio medaliq.com → Vercel', done: true, note: 'DNS en Route 53: A record 76.76.21.21 + CNAME cname.vercel-dns.com — INSYNC' },
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
  {
    id: 'athlete-ux',
    label: 'Fase 9 — UX Atleta v2',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Dashboard: 7 días siempre visibles (Lun-Dom), hoy resaltado', done: true, note: 'Sin importar qué días tenga sesiones el plan' },
      { title: 'Métricas reales en dashboard (DailyLog > CheckIn > HealthProfile)', done: true, note: 'Empty state honesto con CTA a /profile' },
      { title: 'Card coach real con nombre y headline', done: true, note: 'Link a perfil público /p/[slug] — sin fake "último mensaje"' },
      { title: 'Check-in badge "Pendiente" solo si no se ha hecho esta semana', done: true, note: 'Verifica weekNumber actual en DB' },
      { title: 'AI Coach gateado por perfil completo', done: true, note: 'Si no hay HealthProfile → banner con CTA a /profile' },
      { title: 'AI system prompt con restricciones dinámicas por lesión/condición', done: true, note: 'Rodilla, espalda, cardíaco, diabetes, asma → instrucciones específicas' },
      { title: 'Schema DailyLog — métricas diarias (peso, FC, sueño, energía)', done: true, note: 'Migración aplicada. Upsert por userId+date' },
      { title: 'Página /profile atleta: ver y editar datos de salud', done: true, note: 'Edad, peso, talla, FC, lesiones, condiciones' },
      { title: 'Fecha de nacimiento → calcula edad + FC máx estimada (Tanaka)', done: true, note: 'IMC calculado automáticamente de peso + talla' },
      { title: 'Formulario de métricas diarias en /profile', done: true, note: 'Peso, FC reposo, horas sueño, energía 1-5, notas — historial 14 días' },
      { title: 'Páginas de ayuda por perfil (atleta, coach, admin)', done: true, note: '/help, /coach/help, /admin/help — FAQ por sección, flujos de uso' },
      { title: 'Landing page con animaciones y más interacción', done: true, note: 'RevealOnScroll, fadeUp hero, float mockup, pulse CTA, hover lift cards' },
      { title: 'Internacionalización ES / EN / PT con selector de banderas', done: true, note: 'Cookie-based, server + client, LanguageSwitcher 🇪🇸🇺🇸🇧🇷 en navbar y sidebars' },
      { title: 'Sidebar con link Ayuda (HelpCircle) en todos los paneles', done: true, note: 'Atleta, coach y admin' },
    ],
  },
  {
    id: 'pre-launch',
    label: 'Fase 10 — Pre-lanzamiento',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Tabs coach Resumen/Plan/Progreso/Nutrición → DB real', done: true, note: 'Promise.all con HealthProfile, TrainingPlan+weeks+sessions, WeeklyCheckIn x8, NutritionPlan. Verificación coach-atleta.' },
      { title: 'Notas del coach por sesión del plan (persistidas en DB)', done: true, note: 'coachNote en PlannedSession. API PATCH /api/coach/sessions/[id]/note con auth.' },
      { title: 'Rate limiting en APIs críticas', done: true, note: 'register 5/min, onboarding 3/min, ai/chat 20/min por usuario' },
      { title: 'Páginas de error custom (404, 500)', done: true, note: 'not-found.tsx + error.tsx con diseño Medaliq y botones de recuperación' },
      { title: 'Control de alta manual desde admin + desactivación', done: true, note: '/admin/activaciones — secciones Pendientes y Activos. Activar Pro/Coach, Desactivar. API PATCH /api/admin/users/[id]/plan' },
      { title: 'Beta cerrada — acceso bloqueado hasta activación manual', done: true, note: 'Onboarding no habilita features. JWT campo activated. Middleware redirige a /pending. Polling automático cada 10s.' },
      { title: 'Google OAuth con dominio real', done: false, note: 'Google Cloud Console → Client ID + Secret → GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel. Código ya implementado.' },
      { title: 'Botón "Continuar con Google" en /login', done: false, note: 'UI pendiente. La lógica en auth.ts ya está lista.' },
      { title: 'SEO: meta tags + sitemap para páginas públicas', done: false, note: '/coaches, /p/[slug], /p/ai-coach deben ser indexables con og:image, description' },
      { title: 'Hardening: validación de inputs en todas las APIs (Zod)', done: false, note: 'Zod schemas en rutas POST/PATCH — actualmente confía demasiado en el cliente' },
      { title: 'Sentry para monitoreo de errores en producción', done: false, note: 'Alertas automáticas cuando algo falla. Gratis hasta 5k errores/mes.' },
      { title: 'Uptime Robot para alertas de disponibilidad', done: false, note: 'Ping cada 5 min — email/SMS si la app cae.' },
    ],
  },
  {
    id: 'qa-registro-onboarding',
    label: 'Fase QA — Registro & Onboarding',
    period: 'Urgente — ahora',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    items: [
      { title: 'Verificar StepSportDetails para path BODY (sin deporte seleccionado)', done: true, note: 'Confirmado: sport=null en BODY → cae al bloque mainGoal===BODY → muestra peso objetivo + fecha meta.' },
      { title: 'StepHRFitness no muestra FC para BODY ni STRENGTH', done: true, note: 'Confirmado: showHR = mainGoal===SPORT && sport!==STRENGTH → BODY y STRENGTH solo muestran experienceLevel.' },
      { title: 'B2B post-onboarding: redirect directo a /pending', done: true, note: 'API ahora devuelve isB2B en la respuesta. handleGenerate pushea a /pending si isB2B, /dashboard si B2C.' },
      { title: 'Google OAuth: definir comportamiento para registro de COACH', done: false, note: 'Hoy Google OAuth siempre registra como ATHLETE. Decidir si se permite coach vía Google o se bloquea con mensaje.' },
      { title: 'Test E2E: registro ATHLETE B2C → onboarding RUNNING → plan → dashboard', done: false, note: 'Flujo completo. Verificar: plan no vacío, trial activo, JWT actualizado, dashboard carga.' },
      { title: 'Test E2E: onboarding todos los deportes (6 + BODY)', done: false, note: 'RUNNING, CYCLING, SWIMMING, TRIATHLON, FOOTBALL, STRENGTH, BODY. Verificar sport-details por deporte.' },
      { title: 'Test E2E: registro COACH → dashboard coach directo (sin onboarding)', done: false, note: 'Verificar callbackUrl y middleware guard funcionan. Coach no puede acceder a /onboarding.' },
      { title: 'Test E2E: flujo B2B completo (coach crea atleta → onboarding → /pending → activación → plan)', done: false, note: 'Verificar CoachAthlete detectado, generatedBy=COACH, features.plan=false, /pending state, activación desde panel coach.' },
      { title: 'Verificar plan no queda vacío post-generación (semanas y sesiones creadas)', done: false, note: 'Query en DB: TrainingPlan con PlanWeeks.length > 0 y PlannedSessions.length > 0.' },
    ],
  },
  {
    id: 'ai-protection',
    label: 'Fase 11 — Protección AI & Trial',
    period: 'Próximo',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    items: [
      { title: 'Cambiar AI chat de Sonnet → Haiku', done: false, note: '10x más barato. Sonnet solo para análisis complejos de coach. Protege el margen.' },
      { title: 'Límite de 100 mensajes AI/mes por usuario Pro', done: false, note: 'Campo aiMessagesMonth + aiMessagesResetAt en UserConfig. Free = 0 mensajes.' },
      { title: 'Contador de mensajes en UI del chat', done: false, note: '"47 / 100 mensajes usados este mes". Al llegar al límite: mensaje claro con fecha de renovación.' },
      { title: 'Trial de 30 días con fecha de expiración', done: false, note: 'Campo trialEndsAt en User. Al completar onboarding → trialEndsAt = now + 30 días. Features habilitadas durante el trial.' },
      { title: 'Middleware detecta trial expirado → /upgrade', done: false, note: 'Cuando trialEndsAt < now y no es Pro → redirigir a página de upgrade.' },
      { title: 'Página /upgrade con opciones de plan', done: false, note: 'Pro $15/mes, seguir en Free (limitado), elegir coach. Diseño Medaliq con comparativa de features.' },
      { title: 'Feature gating inline para Free post-trial', done: false, note: 'Cuando Free intenta AI chat o nutrición → banner "Actualiza a Pro" en lugar de error.' },
      { title: 'Email: trial expira en 3 días (Resend.com)', done: false, note: 'Primer email transaccional. Resend gratis hasta 3k emails/mes.' },
    ],
  },
  {
    id: 'pwa',
    label: 'Fase 12 — PWA & Mobile Web',
    period: 'Próximo',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      { title: 'manifest.json con iconos y theme_color (#1e3a5f)', done: false, note: 'Permite "Agregar a pantalla de inicio" en iOS y Android desde el browser.' },
      { title: 'Service worker — caché básico de assets', done: false, note: 'App carga aunque no haya internet. Mejora tiempo de carga en mobile.' },
      { title: 'Meta tags apple-mobile-web-app para iOS', done: false, note: 'status-bar-style, title, icon — necesario para experiencia nativa en Safari.' },
      { title: 'Offline support para gym session tracker', done: false, note: 'Guardar sets localmente (IndexedDB) y sincronizar al reconectar. Feature más crítica para mobile.' },
      { title: 'Responsive audit completo en móvil real', done: false, note: 'Probar cada pantalla en iPhone SE, iPhone 14, Samsung Galaxy. Fix de padding/overflow.' },
      { title: 'Banner de instalación PWA en dashboard', done: false, note: '"Instala Medaliq en tu celular" — aparece si no está instalada y el browser lo soporta.' },
    ],
  },
  {
    id: 'payments',
    label: 'Fase 13 — Pasarela de Pagos',
    period: 'Post-lanzamiento',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      { title: 'Modelo Subscription en DB', done: false, note: 'status, plan, wompiId/stripeId, currentPeriodStart, currentPeriodEnd, canceledAt.' },
      { title: 'Integrar Wompi (Colombia) para suscripción atleta', done: false, note: '$15/mes. Wompi primero por ser mercado principal. Stripe después para internacional.' },
      { title: 'Webhook Wompi: pago exitoso → activa Pro, fallo → Free', done: false, note: 'Mismo mecanismo que activación manual de admin — solo cambia el trigger.' },
      { title: 'Página de gestión de suscripción del atleta', done: false, note: 'Ver plan actual, próximo cobro, cancelar, cambiar método de pago.' },
      { title: 'Campo source en CoachAthlete (MARKETPLACE | DIRECT)', done: false, note: 'Determina qué atletas del coach generan fee a Medaliq.' },
      { title: 'Facturación mensual al coach por asesorados directos', done: false, note: '1-50: $6/atleta, 51-100: $5/atleta, +100: $3/atleta. Calculado automáticamente.' },
      { title: 'Email transaccional completo (Resend)', done: false, note: 'Bienvenida, plan generado, activación, cobro exitoso, fallo de pago, trial expirando.' },
      { title: 'Stripe para usuarios internacionales', done: false, note: 'Después de validar el mercado colombiano con Wompi.' },
    ],
  },
  {
    id: 'admin-metrics',
    label: 'Fase 14 — Admin Métricas de Negocio',
    period: 'Post-lanzamiento',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      { title: 'MRR (Monthly Recurring Revenue) en tiempo real', done: false, note: 'Suma de suscripciones activas + fees de coaches. Gráfica histórica.' },
      { title: 'Churn mensual (quién canceló y cuándo)', done: false, note: 'Lista de bajas con tier y duración de la suscripción.' },
      { title: 'Distribución por países', done: false, note: 'Campo country en registro o IP geolocation. Heatmap de usuarios activos.' },
      { title: 'Usuarios en trial vs Free vs Pro (funnel de conversión)', done: false, note: 'Cuántos entran al trial, cuántos convierten a Pro, cuántos quedan en Free.' },
      { title: 'Coaches activos + asesorados directos + fee generado', done: false, note: 'Ranking de coaches por ingresos generados a la plataforma.' },
      { title: 'LTV promedio por tier', done: false, note: 'Lifetime Value: ingreso total promedio antes de churnar.' },
      { title: 'Alertas de negocio (churn alto, trial sin convertir)', done: false, note: 'Notificación al admin si >20% de trials expiran sin convertir.' },
    ],
  },
  {
    id: 'coach-ai',
    label: 'Fase 15 — Coach AI Assistant',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: 'Chat AI en panel coach con contexto del asesorado', done: false, note: 'Coach pregunta sobre un atleta específico. AI tiene acceso a HealthProfile, plan, check-ins, logs.' },
      { title: 'Sugerencia de rutina gym según perfil del atleta', done: false, note: '"¿Qué rutina le recomiendas?" → AI analiza lesiones, objetivos, nivel + WorkoutTemplates del coach.' },
      { title: 'Análisis de progreso del asesorado con IA', done: false, note: '"¿Cómo va Juan este mes?" → AI resume tendencias de peso, FC, adherencia, RPE.' },
      { title: 'Ajuste de plan sugerido por AI al coach', done: false, note: 'Si check-in muestra señales de sobreentrenamiento → AI sugiere modificar semana siguiente.' },
      { title: 'Disponible gratis para coaches con 50+ asesorados directos', done: false, note: 'Incentivo de volumen. Coaches más pequeños lo pagan como add-on.' },
    ],
  },
  {
    id: 'native-app',
    label: 'Fase 16 — App Nativa iOS & Android',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: 'Expo + React Native — scaffold inicial', done: false, note: 'Consume los mismos API routes REST del backend. Sin reescribir lógica de negocio.' },
      { title: 'Auth con JWT en AsyncStorage (no cookies)', done: false, note: 'Login nativo con email/password y Google OAuth. Token guardado de forma segura.' },
      { title: 'Gym session tracker offline-first', done: false, note: 'Feature más crítica para mobile. Guarda localmente, sincroniza al reconectar.' },
      { title: 'Push notifications nativas', done: false, note: 'Check-in semanal, sesión de hoy, activación de cuenta, renovación próxima.' },
      { title: 'Dashboard y plan en mobile', done: false, note: 'Adaptar las pantallas principales a UX mobile nativo (gestos, scroll, navegación por tabs).' },
      { title: 'Publicar en App Store (iOS)', done: false, note: 'Cuenta de Apple Developer ($99/año). Review de Apple puede tomar 1-2 semanas.' },
      { title: 'Publicar en Google Play (Android)', done: false, note: 'Cuenta Google Play ($25 único). Review más rápido que Apple.' },
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
