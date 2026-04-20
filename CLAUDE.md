# Medaliq

## Regla crítica para agentes
**NUNCA romper código existente.** Antes de modificar cualquier archivo:
1. Leerlo completo para entender el contexto
2. Solo tocar las líneas estrictamente necesarias
3. No refactorizar, no renombrar, no reorganizar lo que ya funciona
4. Si el cambio afecta una función compartida, verificar todos sus callers antes de modificar su firma

## Qué es
SaaS de coaching deportivo con AI para LatAm. Cubre recomposición corporal, metas de carrera (cualquier deporte) y entrenadores con atletas. El "cerebro" es un AI coach que hace intake personalizado, genera planes periodizados y los ajusta según datos reales.

## Stack
- Next.js 16 App Router + TypeScript + PostgreSQL + **Prisma 7**
- Tailwind CSS v4 + shadcn/ui
- Auth.js v5 (next-auth@beta) — estrategia JWT
- Claude API (Anthropic) — Haiku para plan, Sonnet para coach chat
- pnpm · bcryptjs
- Neon (PostgreSQL serverless) — pooler para runtime, direct URL para migraciones

## Repositorio
- GitHub: `git@github.com:matenciac14/Medaliq.git`
- Branch principal: `main`

## Prisma 7 — diferencias críticas
- Generator: `prisma-client` (no `prisma-client-js`) con `output = "../src/generated/prisma"`
- Import: `from '../../generated/prisma/client'` (NO `@prisma/client`)
- `url` va en `prisma.config.ts`, `directUrl` va en `schema.prisma` (no en prisma.config.ts)
- Requiere adapter: `new PrismaPg({ connectionString })` de `@prisma/adapter-pg`
- Seed se configura en `prisma.config.ts → migrations.seed`, no en `package.json`

## Auth.js v5 + Edge Runtime
- `src/auth.config.ts` — config SIN Prisma, usada en middleware (Edge-safe)
- `src/auth.ts` — config completa con PrismaAdapter, usada en server components y API routes
- Middleware importa de `auth.config.ts`, nunca de `auth.ts`
- JWT contiene: `id`, `role`, `onboardingCompleted`

## UserConfig — patrón central
Cada `User` tiene un campo `config Json` en DB que controla toda su experiencia.
Tipo en `src/lib/config/user-config.ts`:
```ts
type UserConfig = {
  features: { plan, checkin, nutrition, progress, log, coach, gym }  // booleanos
  sport: { type, goal }
  plan: { activePlanId, currentWeek, totalWeeks, phase }
  onboarding: { completed, completedAt }
  preferences: { language, units, notifications }
}
```
- `DEFAULT_USER_CONFIG` — usuario nuevo, todo en false
- `FULL_ATHLETE_CONFIG` — atleta con plan activo (gym=true)
- `COACH_CONFIG` — solo features.coach = true
- `parseUserConfig(raw)` — helper con merge de defaults

El sidebar se construye filtrando `config.features`. Al completar onboarding se actualiza config via `PATCH /api/user/config`.

## Middleware — protección de rutas
- Sin auth → `/login`
- Onboarding incompleto → `/onboarding`
- ADMIN → siempre `/admin` (nunca dashboard de atleta)
- COACH → `/dashboard` redirige a `/coach/dashboard`
- `/coaches`, `/p/*`, `/join/*` → públicas (sin auth, indexables)
- `/admin/*` → solo ADMIN
- `/coach/*` → solo COACH

## Estructura de rutas
```
src/app/
  (athlete)/              ← route group — sidebar persistente
    layout.tsx
    dashboard/page.tsx
    plan/page.tsx
    checkin/page.tsx
    nutrition/page.tsx
    progress/page.tsx
    log/page.tsx
    gym/page.tsx           ← dashboard gym atleta
    gym/session/page.tsx   ← tracker de sesión en tiempo real
    gym/history/page.tsx   ← historial de sesiones
  coach/
    layout.tsx
    dashboard/page.tsx
    athlete/[id]/page.tsx  ← 5 tabs: Resumen, Plan, Progreso, Nutrición, Gym
    gym/page.tsx
    gym/exercises/page.tsx
    gym/routines/new/page.tsx
    gym/routines/[id]/assign/page.tsx
    profile/page.tsx       ← coach edita perfil público
    clients/new/page.tsx   ← coach crea atleta directamente
    plan/[id]/review/page.tsx
    invite/page.tsx
    settings/page.tsx
  admin/
    page.tsx               ← KPIs de negocio
    users/page.tsx
    activaciones/page.tsx  ← alta manual sin Stripe (FREE → PRO/COACH)
    coaches/page.tsx
    subscriptions/page.tsx
    settings/page.tsx
    roadmap/page.tsx       ← fases del producto, hardcoded, actualizable manualmente
    help/page.tsx
  coaches/page.tsx         ← directorio público de coaches (sin auth)
  p/[slug]/page.tsx        ← perfil público del coach (sin auth)
  p/ai-coach/page.tsx      ← perfil AI Coach (sin auth)
  api/
    auth/[...nextauth]/
    auth/register/
    checkin/
    log/session/
    onboarding/generate/
    coach/invite/
    coach/join/            ← atleta se une a coach desde marketplace
    coach/plan/[id]/approve/
    coach/profile/         ← GET/PATCH perfil público del coach
    coach/programs/        ← GET/POST programas del coach
    coach/posts/           ← GET/POST publicaciones del coach
    coach/clients/create/  ← POST crea atleta directo con credenciales temp
    coach/gym/exercises/
    coach/gym/routines/
    coach/gym/routines/[id]/assign/
    coach/gym/athlete/[id]/logs/  ← GET logs gym del atleta para el coach
    gym/session/today/
    gym/session/complete/
    gym/session/[id]/
  onboarding/page.tsx
  login/page.tsx
  register/page.tsx
  join/[code]/page.tsx
  page.tsx                 ← landing (hero, pricing, coaches destacados)
```

## Base de datos — Neon (producción)
- `DATABASE_URL` — pooler URL (`-pooler` en hostname) para runtime/queries
- `DIRECT_URL` — direct URL (sin pooler) para migraciones
- 5 migraciones aplicadas: `init`, `add_user_config`, `gym_feature`, `marketplace`, `add_coach_note_to_planned_session`
- Seed: `pnpm prisma db seed` → 39 ejercicios globales + usuarios de prueba
- Usuarios seed:
  - `admin@medaliq.com` / `admin123!` — role ADMIN
  - `coach@medaliq.com` / `coach123` — role COACH
  - `miguel@medaliq.com` / `atleta123` — ATHLETE con plan + coach asignado
  - `ana@medaliq.com` / `atleta123` — ATHLETE B2C sin coach

## Mock data
- `src/lib/mock/coach-data.ts` — archivo existente, ya no usado. Todos los datos del panel coach vienen de DB real.
- Todos los tabs del panel atleta (`coach/athlete/[id]`) usan DB real via `Promise.all` en el server component
- Tab Gym del panel atleta usa DB real vía `/api/coach/gym/athlete/[id]/logs`

## Flujos de usuario — críticos

### Atleta B2C (sin coach)
1. Registro → onboarding completo (9 pasos) → AI genera plan → JWT refresh → `/dashboard`
2. Admin activa cuenta desde `/admin/activaciones` (setea `config.features.*` a true)

### Atleta B2B (del coach)
1. Coach crea atleta desde `/coach/clients/new` → atleta recibe credenciales
2. Atleta hace onboarding solo para recolectar perfil (edad, peso, HR, lesiones) — **NO genera plan**
3. Atleta queda en `/pending` esperando activación
4. Coach activa cuenta desde tab Resumen del asesorado (`PATCH /api/coach/athlete/[id]/activate`)
5. Coach crea plan desde tab Plan del asesorado (`POST /api/coach/athlete/[id]/plan`) — sin llamada AI
6. Medaliq cobra al coach $6/asesorado activo/mes

### Generador de planes (`generator.ts`)
- `generatedBy: 'AI'` → llama Haiku para recomendaciones personalizadas (B2C)
- `generatedBy: 'COACH'` → salta llamada AI, plan puro desde template (B2B)
- Timeout de transacción: 30s (18 semanas × n sesiones via `createMany`)

## Lógica de negocio
- `src/lib/plan/formulas.ts` — Karvonen HR zones, Mifflin-St Jeor TDEE, Riegel race time
- `src/lib/plan/templates.ts` — HALF_MARATHON_18W, TEN_K_12W, FIVE_K_8W, BODY_RECOMPOSITION_16W
- `src/lib/plan/generator.ts` — selecciona template, llama Haiku (solo B2C), guarda en DB

## Gym Feature — Modelo de datos

Migración `gym_feature` aplicada en Neon:

- `Exercise` — librería de ejercicios (global isGlobal=true + personalizados por coach)
  - muscleGroups: QUADRICEPS, HAMSTRINGS, GLUTES, CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, ABS, CALVES, FULL_BODY
  - equipment: BARBELL, DUMBBELL, MACHINE, CABLE, SMITH, BODYWEIGHT, KETTLEBELL, BAND, OTHER
  - category: COMPOUND, ISOLATION, CARDIO, FUNCTIONAL, STRETCH

- `WorkoutTemplate` — rutina creada por el coach
- `WorkoutDay` — día dentro de la rutina (dayOfWeek 1=Lun … 7=Dom, isRestDay)
- `WorkoutExercise` — ejercicio dentro de un día (sets, repsScheme, setType, restSeconds)
  - setType: NORMAL, SUPERSET, BISERIE, DROPSET, CIRCUIT
- `AssignedWorkout` — asignación de template a atleta (startDate, isActive)
- `GymSession` — sesión completada (dayOfWeek, date, rpe, durationMin)
- `SetLog` — registro por serie: weightKg, repsCompleted, completed

### Progresión de cargas
- En sesión del atleta: si todos los sets de un ejercicio se completan con `repsCompleted >= targetReps` → badge verde "+2.5kg recomendado para la próxima sesión"
- `targetReps` = primer número del `repsScheme` (ej: "12-15" → 12)

## Marketplace — Modelo de datos

Migración `marketplace` aplicada en Neon:

- `CoachProfile` — perfil público (slug único → /p/[slug], specialties[], isPublic)
- `CoachProgram` — programas del coach (sport, level, priceMonth, includes[])
- `CoachPost` — publicaciones (type: TIP|ROUTINE_SHOWCASE|ACHIEVEMENT|ANNOUNCEMENT)

## Concepto de negocio — Marketplace
Medaliq = marketplace de coaches especializados + AI Coach como opción base

- Coaches se auto-gestionan: perfil, programas, publicaciones
- Atletas descubren coaches por deporte/especialidad en `/coaches`
- AI Coach compite en el marketplace como opción autónoma
- Revenue: Coach $49/mes · Atleta Pro $15/mes · Free con limitaciones

## Estado actual

### Fase 1 — Fundación ✅
Auth, onboarding (9 pasos), generador de plan AI, dashboard atleta, calendario plan, registro sesión, check-in semanal + alertas, plan nutricional, gráficas de progreso, UserConfig JSON.

### Fase 2 — Coach B2B ✅
Dashboard coach, panel atleta (5 tabs con DB real), notas de coach persistidas (`PlannedSession.coachNote`), revisar/aprobar plan, vinculación por código invitación.

### Fase 3 — Gym Coach ✅
Biblioteca de ejercicios (39 globales + custom), constructor de rutinas wizard (4 pasos), asignación a atleta, dashboard gym atleta, tracker de sesión en tiempo real (sets/pesos/timer), historial de sesiones, progresión de cargas (+2.5kg suggestion), tab Gym en panel coach con gráfica de progresión por ejercicio.

### Fase 4 — Marketplace ✅
Directorio público `/coaches`, perfiles `/p/[slug]` y `/p/ai-coach`, coach edita perfil/programas/posts, coach crea asesorado directamente, atleta se une desde marketplace.

### Fase 5 — Admin ✅
KPIs de negocio, gestión usuarios/coaches/suscripciones, roadmap del producto, configuración de plataforma, alta manual sin Stripe (`/admin/activaciones`).

### Fase 6 — Pre-lanzamiento ✅ (completado)
- [x] Rate limiting en APIs críticas (`/api/auth/register`, `/api/onboarding/generate`, `/api/ai/chat`)
- [x] Páginas de error custom (`src/app/not-found.tsx`, `src/app/error.tsx`)
- [x] i18n ES/EN/PT con selector de banderas (cookie-based, sin URL restructuring)
- [x] Páginas de ayuda por perfil (`/help`, `/coach/help`, `/admin/help`)
- [x] Animaciones en landing (RevealOnScroll, keyframes, orbs)
- [x] Alta manual desde admin (`/admin/activaciones` + `PATCH /api/admin/users/[id]/plan`)
- [x] Coach notes persistidas en DB (`PlannedSession.coachNote`)

### Fase 7 — Deploy (pendiente)
- [x] PostgreSQL en Neon — 5 migraciones + seed aplicados
- [x] Variables de entorno configuradas
- [ ] Deploy en Vercel — pendiente (conectar repo GitHub `matenciac14/Medaliq`)
- [ ] Dominio medaliq.com → Vercel (CNAME en Route 53)
- [ ] Google OAuth: credenciales en Google Cloud Console + env vars en Vercel

### Fase 8 — Monetización (post-lanzamiento)
Stripe, email transaccional AWS SES, upgrade page, trial 14 días.

### Fase 9 — Integraciones fitness (futuro)
Strava, Garmin, Polar, Google Health Connect, Apple HealthKit.

## Modelo de negocio — definitivo

### Atletas
| Tier | Precio | Qué incluye |
|------|--------|-------------|
| Trial | $0 — 30 días | Todo completo (plan AI, check-in, nutrición, AI chat, gym) |
| Free | $0 post-trial | Dashboard básico, log manual, sin AI |
| Pro | $15/mes | Plan adaptativo + check-in + nutrición + AI chat (100 msgs/mes) + gym |

### Coaches
| Situación | Fee a Medaliq |
|-----------|---------------|
| Atleta viene del marketplace (ya paga Pro) | $0 al coach |
| Coach trae asesorado directo — 1 a 50 | $6/asesorado activo/mes |
| Coach trae asesorado directo — 51 a 100 | $5/asesorado activo/mes + AI assistant gratis |
| Coach trae asesorado directo — +100 | $3/asesorado activo/mes + AI assistant gratis |

### Decisiones técnicas clave
- **AI Chat**: Haiku (no Sonnet) para chat de atletas — 10x más barato. Límite 100 msgs/mes por usuario Pro.
- **Vector DB**: No se requiere ahora. Neon soporta pgvector si se necesita en futuro (mismo DB, sin nuevo servicio).
- **Mobile**: PWA primero (manifest + service worker), luego Expo/React Native después del PMF. Los API routes ya son REST y sirven a cualquier cliente móvil.
- **Auth mobile**: JWT ya es mobile-friendly. Login nativo usará tokens en AsyncStorage, no cookies.
- **Email**: Resend.com para emails transaccionales (gratuito hasta 3k/mes). Triggers: activación, trial expirando, plan generado.
- **Monitoreo**: Sentry (errores) + Uptime Robot (disponibilidad) antes del lanzamiento público.
- **Caché**: Upstash Redis cuando haya usuarios concurrentes (no bloquea el lanzamiento).
- **CoachAthlete.source**: Campo pendiente — 'MARKETPLACE' | 'DIRECT' para saber qué atletas generan fee al coach.

## Pendiente inmediato — por bloques

### Bloque 1 — Protección AI (prioritario, sin pasarela)
- [ ] Cambiar AI chat de Sonnet → Haiku
- [ ] Campo aiMessagesMonth + aiMessagesResetAt en UserConfig o DB
- [ ] Límite 100 msgs/mes para Pro, 0 para Free
- [ ] UI del chat muestra contador "X / 100 mensajes usados"
- [ ] Al límite: mensaje claro con fecha de renovación

### Bloque 2 — Trial 30 días (sin pasarela)
- [ ] Campo trialEndsAt en User
- [ ] Al completar onboarding: setear trialEndsAt = now + 30 días
- [ ] Middleware detecta trial expirado → /upgrade
- [ ] Página /upgrade con opciones: Pro $15, seguir Free
- [ ] Admin puede ver quién está en trial en /admin/activaciones

### Bloque 3 — Feature gating real
- [ ] Free post-trial: bloquear AI chat, nutrición, plan adaptativo con paywall inline
- [ ] Pro: todo habilitado con límite de msgs
- [ ] Trial: todo habilitado sin límite (30 días)

### Bloque 4 — Pre-lanzamiento pendiente
- [ ] Google OAuth: credenciales en Google Cloud Console + env vars en Vercel
- [ ] Botón "Continuar con Google" en /login
- [ ] SEO: meta tags + sitemap.xml para /coaches, /p/[slug], /p/ai-coach
- [ ] Zod validation en APIs críticas
- [ ] Sentry para monitoreo de errores
- [ ] Uptime Robot para alertas de disponibilidad

### Bloque 5 — PWA Mobile
- [ ] manifest.json con iconos y theme_color
- [ ] Service worker para offline básico
- [ ] Meta tags para instalación en iOS (apple-mobile-web-app)
- [ ] Offline support para gym session tracker (sincroniza al reconectar)
- [ ] Push notifications (Expo Notifications cuando haya app nativa)

### Bloque 6 — Pasarela de pagos (Wompi Colombia primero)
- [ ] Modelo Subscription en DB (status, plan, stripeId/wompiId, currentPeriodEnd)
- [ ] Integrar Wompi para suscripción atleta ($15/mes)
- [ ] Webhook: pago exitoso → activa Pro, fallo → Free
- [ ] Página de gestión de suscripción
- [ ] Campo source en CoachAthlete ('MARKETPLACE' | 'DIRECT')
- [ ] Facturación mensual al coach por asesorados directos

### Bloque 7 — Admin métricas de negocio
- [ ] MRR (Monthly Recurring Revenue)
- [ ] Churn mensual
- [ ] Distribución por países (campo country en registro)
- [ ] Atletas activos por coach + fee generado
- [ ] Usuarios en trial vs Free vs Pro
- [ ] LTV promedio por tier

### Bloque 8 — Coach AI Assistant
- [ ] Chat AI en panel coach con contexto del asesorado seleccionado
- [ ] "¿Qué rutina le recomiendas para este atleta?" → AI analiza HealthProfile + WorkoutTemplates del coach
- [ ] Disponible gratis para coaches con 50+ asesorados directos
- [ ] Usar Haiku para respuestas rápidas, Sonnet solo para análisis complejos

### Bloque 9 — App nativa (post PMF)
- [ ] Expo + React Native (consume mismos API routes)
- [ ] Auth con JWT en AsyncStorage (no cookies)
- [ ] Push notifications nativas (iOS + Android)
- [ ] Gym session tracker offline-first
- [ ] Publicar en App Store + Google Play

## Reglas del producto
- AI NO puede medicar ni diagnosticar — solo coaching deportivo
- Banderas rojas médicas → escalar, no continuar el flujo
- Multi-tenant: atletas B2C + coaches con atletas B2B
- Planes son vivos (se ajustan por check-in), no PDFs estáticos
- Siempre `where: { userId }` o `where: { athleteId }` en queries — nunca exponer datos de otros usuarios

## Ver reglas globales
~/.claude/CLAUDE.md
