# Medaliq

## Regla crítica para agentes
**NUNCA romper código existente.** Antes de modificar cualquier archivo:
1. Leerlo completo para entender el contexto
2. Solo tocar las líneas estrictamente necesarias
3. No refactorizar, no renombrar, no reorganizar lo que ya funciona
4. Si el cambio afecta una función compartida, verificar todos sus callers antes de modificar su firma

**NO pushear a producción sin autorización explícita de Miguel.**

## Qué es
SaaS de coaching deportivo con AI para LatAm. Cubre recomposición corporal, metas de carrera (cualquier deporte) y entrenadores con atletas. El "cerebro" es un AI coach que hace intake personalizado por deporte, genera planes periodizados y los ajusta según datos reales.

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
- JWT contiene: `id`, `role`, `onboardingCompleted`, `trialEndsAt`, `userPlan`

## UserConfig — patrón central
Cada `User` tiene un campo `config Json` en DB que controla toda su experiencia.
Tipo en `src/lib/config/user-config.ts`:
```ts
type UserConfig = {
  features: { plan, checkin, nutrition, progress, log, coach, gym }  // booleanos
  sport: { type, goal }
  plan: { activePlanId, currentWeek, totalWeeks, phase }
  onboarding: { completed, completedAt }
  trial: { plan: 'TRIAL' | 'FREE' | 'PRO', endsAt: string | null }
  ai: { monthlyLimit, messagesThisMonth, messagesResetAt }
  preferences: { language, units, notifications }
}
```
- Al completar onboarding B2C: `trial.plan = 'TRIAL'`, `trial.endsAt = +30 días`, `monthlyLimit = 999999`
- Al expirar trial: middleware redirige a `/upgrade`
- Post-upgrade Free: features.plan/checkin/nutrition = false
- `parseUserConfig(raw)` — helper con merge de defaults

## Middleware — protección de rutas
- Sin auth → `/login`
- Onboarding incompleto + NO api → `/onboarding`
- Trial expirado (ATHLETE + TRIAL) → `/upgrade`
- ADMIN → siempre `/admin`
- COACH → `/dashboard` redirige a `/coach/dashboard`
- `/coaches`, `/p/*`, `/join/*` → públicas
- `/admin/*` → solo ADMIN
- `/coach/*` → solo COACH

## Onboarding — flujo multi-deporte
Archivo principal: `src/app/onboarding/page.tsx` (self-contained, sin imports de _steps/)
Tipos: `src/app/onboarding/_types.ts` — WizardData, INITIAL_DATA, getSteps(), StepId

### Flujo de pasos (dinámico según selección):
```
SPORT path:
  main-goal → sport-select → sport-details → physical → hr-fitness → schedule → health → generating

BODY path:
  main-goal → body-goal → sport-details → physical → hr-fitness → schedule → health → generating
```

### Detalles por deporte (sport-details):
| Deporte | Campos requeridos | Campos opcionales |
|---------|-------------------|-------------------|
| RUNNING | raceDistance | raceDate, targetTime, recentBestTime |
| CYCLING | cyclingModality | hasPowerMeter, ftp, raceDate |
| SWIMMING | swimStroke | recentSwimTime, raceDate |
| TRIATHLON | triathlonDistance + weakestSegment | raceDate |
| FOOTBALL | footballPosition + competitionLevel | seasonPhase |
| STRENGTH | strengthStyle | — |
| BODY | — (todo opcional) | weightGoalKg, targetDate |

### FC (step hr-fitness):
- Deportes aeróbicos (RUNNING, CYCLING, SWIMMING, TRIATHLON): pide hrSource (known/estimated) + hrMax
- STRENGTH y BODY: solo pide experienceLevel, sin FC

### Regla crítica isLastDataStep:
```js
const isLastDataStep = steps[stepIndex + 1] === 'generating'
// NO usar: stepIndex === steps.length - 2 (BUG — steps array crece dinámicamente)
```

## Cerebro AI — cómo genera planes

### Templates disponibles (`src/lib/plan/templates.ts`):
| Template | GoalType | Semanas | Fases |
|----------|----------|---------|-------|
| HALF_MARATHON_18W | RACE_HALF_MARATHON, RACE_MARATHON*, RACE_CYCLING*, RACE_TRIATHLON* | 18 | BASE→DESARROLLO→ESPECÍFICO→AFINAMIENTO |
| TEN_K_12W | RACE_10K | 12 | BASE→DESARROLLO→AFINAMIENTO |
| FIVE_K_8W | RACE_5K | 8 | BASE→ESPECÍFICO |
| BODY_RECOMPOSITION_16W | BODY_RECOMPOSITION | 16 | BASE→DESARROLLO→ESPECÍFICO→AFINAMIENTO |

*Fallback temporal hasta tener templates propios para maratón, ciclismo y triatlón.

### Flujo de generación (`src/lib/plan/generator.ts`):
1. Selecciona template por goalType
2. Calcula hrMax real o estimado (211 - 0.64 × edad)
3. Calcula zonas FC por Karvonen
4. Calcula TDEE (Mifflin-St Jeor) y macros
5. **Solo B2C**: llama Claude Haiku para 3 recomendaciones personalizadas usando AIProfile del admin
6. Crea en DB: TrainingPlan + PlanWeeks + PlannedSessions (via `createMany`, timeout 30s)
7. Upsert NutritionPlan
8. Actualiza User.config: features activos, trial 30d, sport.type, plan.activePlanId

### AIProfile (admin configura en `/admin/ai`):
- Almacenado en `SystemConfig.aiProfile` (singleton en DB)
- Campos: `coachingPhilosophy`, `periodizationPrinciples`, `injuryProtocol`, `nutritionGuidelines`, `goalNotes`
- Se usa como system prompt base tanto en generación de planes como en chat del atleta
- Editable por admin sin deploy

### Chat AI (`/api/ai/chat`):
- System prompt = `buildChatSystemPrompt(aiProfile)` + `buildAthleteContext(user)`
- Contexto del atleta: perfil, plan activo, objetivo, último check-in, restricciones médicas
- Límite por rate limiting: 20 msgs/min por usuario, límite mensual configurable
- Modelo: configurable via `getAIConfig()` (default Sonnet)

## Feature gating por tier

| Feature | FREE | TRIAL (30d) | PRO |
|---------|------|-------------|-----|
| Dashboard | ✅ | ✅ | ✅ |
| Log manual | ✅ | ✅ | ✅ |
| Profile | ✅ | ✅ | ✅ |
| Plan adaptativo | ❌ paywall | ✅ | ✅ |
| Check-in semanal | ❌ paywall | ✅ | ✅ |
| Nutrición | ❌ paywall | ✅ | ✅ |
| Progreso | ❌ paywall | ✅ | ✅ |
| Gym tracker | ❌ paywall | ✅ | ✅ |
| AI Coach chat | ❌ bloqueado (limit=0) | ✅ ilimitado (999999) | ✅ 100 msgs/mes |

- Paywalls implementados a nivel de página en todas las rutas Pro
- Sidebar oculta links según `features.*` (primera capa de defensa)
- Downgrade route desactiva: plan, checkin, nutrition, progress, gym, coach

## Flujos de usuario — críticos

### Atleta B2C (sin coach)
1. Registro → onboarding multi-deporte (8 pasos reales) → AI genera plan → JWT refresh → `/dashboard`
2. Trial 30 días automático al completar onboarding
3. Al expirar: middleware → `/upgrade` (Free o Pro $15)

### Atleta B2B (del coach)
1. Coach crea atleta desde `/coach/clients/new` → atleta recibe credenciales
2. Atleta hace onboarding para recolectar perfil — el generate route detecta que es B2B y **no genera plan**
   - Pendiente: implementar detección B2B en onboarding (hoy todos generan plan)
3. Atleta queda en `/pending` esperando activación
4. Coach activa cuenta desde tab Resumen (`PATCH /api/coach/athlete/[id]/activate`)
5. Coach crea plan desde tab Plan (`POST /api/coach/athlete/[id]/plan`) — sin llamada AI
6. Medaliq cobra al coach $6/asesorado activo/mes

### Generador de planes
- `generatedBy: 'AI'` (default) → llama Haiku para recomendaciones (B2C), activa trial 30d, pone features.plan=true
- `generatedBy: 'COACH'` → salta AI, plan puro desde template. NO activa trial, NO activa features.plan — el coach los activa manualmente
- `isB2C = input.generatedBy !== 'COACH'` — ramificación en generator.ts línea 294
- Upsert de HealthProfile con sport, experienceLevel, sportDetails JSON, dataSources JSON

### Post-onboarding redirect
- `handleGenerate()` siempre hace `router.push('/dashboard')` al terminar
- Para B2B: el middleware intercepta y redirige a `/pending` (features.plan=false → activated=false)
- Para B2C: va al dashboard directamente (features activadas, JWT refreshed via `refreshSession`)
- API devuelve `isB2B` en la respuesta → `handleGenerate` pushea a `/pending` si B2B, `/dashboard` si B2C

## HealthProfile — campos deportivos
Migración `add_sport_fields_to_health_profile` aplicada:
- `sport String?` — deporte principal (RUNNING | CYCLING | SWIMMING | TRIATHLON | FOOTBALL | STRENGTH)
- `experienceLevel String?` — BEGINNER | INTERMEDIATE | ADVANCED
- `ftp Int?` — Functional Threshold Power (ciclismo/triatlón)
- `sportDetails Json` — campos específicos del deporte (raceDistance, cyclingModality, swimStroke, etc.)
- `dataSources Json` — origen de cada dato: `{ hrMax: { source: 'manual'|'estimated', updatedAt: '' } }`

## Estructura de rutas
```
src/app/
  (athlete)/
    dashboard/page.tsx
    plan/page.tsx           ← paywall si userPlan === 'FREE'
    checkin/page.tsx
    nutrition/page.tsx      ← paywall si userPlan === 'FREE'
    progress/page.tsx
    log/page.tsx
    gym/page.tsx
    gym/session/page.tsx
    gym/history/page.tsx
  coach/
    dashboard/page.tsx
    athlete/[id]/page.tsx   ← 5 tabs: Resumen, Plan, Progreso, Nutrición, Gym
    gym/page.tsx + exercises + routines/new + routines/[id]/assign
    profile/page.tsx
    clients/new/page.tsx
    plan/[id]/review/page.tsx
    invite/page.tsx
    settings/page.tsx
  admin/
    page.tsx (KPIs)
    users/page.tsx
    activaciones/page.tsx
    ai/page.tsx             ← editor AIProfile (filosofía, restricciones)
    coaches/page.tsx
    subscriptions/page.tsx
    roadmap/page.tsx
    settings/page.tsx
  upgrade/page.tsx          ← cuando trial expira
  coaches/page.tsx          ← directorio público
  p/[slug]/page.tsx         ← perfil coach público
  p/ai-coach/page.tsx       ← perfil AI Coach público
  onboarding/page.tsx       ← wizard multi-deporte (self-contained)
  onboarding/_types.ts      ← WizardData, INITIAL_DATA, getSteps()
  api/
    auth/[...nextauth]/
    auth/register/
    onboarding/generate/    ← POST: upsert HealthProfile + generatePlan
    checkin/
    log/session/
    ai/chat/                ← POST stream: AIProfile + AthleteContext
    admin/ai-profile/       ← GET/PATCH: SystemConfig.aiProfile
    admin/users/[id]/plan/  ← PATCH: activación manual
    upgrade/downgrade/      ← GET: downgrade a Free
    coach/invite/
    coach/join/
    coach/plan/[id]/approve/
    coach/profile/
    coach/programs/
    coach/posts/
    coach/clients/create/
    coach/athlete/[id]/activate/  ← PATCH: activa atleta B2B
    coach/athlete/[id]/plan/      ← POST: genera plan sin AI (B2B)
    coach/gym/exercises/
    coach/gym/routines/
    coach/gym/routines/[id]/assign/
    coach/gym/athlete/[id]/logs/
    gym/session/today/
    gym/session/complete/
    gym/session/[id]/
```

## Base de datos — Neon (producción)
- `DATABASE_URL` — pooler URL para runtime/queries
- `DIRECT_URL` — direct URL para migraciones
- Migraciones aplicadas: `init`, `add_user_config`, `gym_feature`, `marketplace`, `add_coach_note_to_planned_session`, `add_system_config`, `add_sport_fields_to_health_profile`
- Seed: `pnpm prisma db seed` → 39 ejercicios globales + usuarios de prueba
- Usuarios seed:
  - `admin@medaliq.com` / `admin123!` — ADMIN
  - `coach@medaliq.com` / `coach123` — COACH
  - `miguel@medaliq.com` / `atleta123` — ATHLETE con plan + coach
  - `ana@medaliq.com` / `atleta123` — ATHLETE B2C sin coach

## Estado actual

### Completado ✅
- Fase 1: Auth, onboarding, generador plan AI, dashboard atleta, check-in, nutrición, progreso
- Fase 2: Coach B2B — dashboard, panel atleta 5 tabs, notas coach, vinculación por código
- Fase 3: Gym Coach — librería ejercicios, constructor rutinas, tracker sesión, progresión cargas
- Fase 4: Marketplace — directorio público, perfiles coach, programas, posts
- Fase 5: Admin — KPIs, gestión usuarios/coaches, activaciones manuales, roadmap
- Fase 6: Pre-lanzamiento — rate limiting, páginas error, i18n ES/EN/PT, animaciones landing
- Trial 30 días — middleware, página /upgrade, downgrade a Free
- Feature gating — paywalls inline en /plan y /nutrition para usuarios Free
- AI Profile centralizado — admin edita filosofía en /admin/ai, conectado a plan generation y chat
- Onboarding multi-deporte — 6 deportes + recomposición corporal con campos específicos por deporte
- HealthProfile extendido — sport, experienceLevel, sportDetails JSON, dataSources JSON
- Templates fallback — MARATHON/CYCLING/TRIATHLON usan base aeróbica hasta templates propios

### Pendiente inmediato

#### Bloque QA — Registro & Onboarding (URGENTE — antes de cualquier otra cosa)
- [x] Verificar StepSportDetails para BODY path — muestra peso objetivo + fecha meta ✅
- [x] Verificar StepHRFitness para BODY y STRENGTH — solo experienceLevel, sin FC ✅
- [x] B2B post-onboarding: API devuelve isB2B → redirect a `/pending` directamente ✅
- [x] Gating completo FREE vs TRIAL/PRO: paywalls en /checkin, /progress, /gym, /gym/history, /gym/session ✅
- [x] AICoachChat: monthlyLimit=0 bloquea (FREE), 999999=ilimitado (Trial), >0=Pro con límite ✅
- [x] Downgrade route: desactiva plan, checkin, nutrition, progress, gym, coach features ✅
- [ ] Definir comportamiento Google OAuth para registro de COACH (¿permitir o bloquear?)
- [ ] Test E2E: registro ATHLETE B2C → onboarding RUNNING → plan generado → dashboard
- [ ] Test E2E: onboarding todos los deportes (6 deportes + BODY)
- [ ] Test E2E: registro COACH → coach/dashboard sin pasar por onboarding
- [ ] Test E2E: flujo B2B completo (coach crea atleta → /pending → activación → plan visible)
- [ ] Verificar plan no queda vacío (PlanWeeks + PlannedSessions creadas en DB)

#### Bloque B — AI Brain (mejoras)
- [ ] Templates específicos: MARATHON (20-24s), CYCLING (16s), TRIATHLON (24s), SWIMMING (12s)
- [ ] `goalNotes` del AIProfile cubrir los nuevos deportes (natación, fútbol, fuerza, ciclismo, triatlón)
- [ ] Contador de mensajes AI en UI del chat ("X / ∞ mensajes usados este mes")

#### Bloque C — Coach experience
- [ ] Coach AI Assistant: chat en panel coach con contexto del asesorado
- [ ] Notificación al coach cuando atleta completa onboarding y queda en /pending
- [ ] Coach puede editar plan de atleta (sesiones individuales) desde tab Plan

#### Bloque D — Deploy producción
- [ ] Conectar repo GitHub `matenciac14/Medaliq` en Vercel
- [ ] Variables de entorno en Vercel (DATABASE_URL, DIRECT_URL, ANTHROPIC_API_KEY, AUTH_SECRET, etc.)
- [ ] Google OAuth: credenciales en Google Cloud Console + env vars
- [ ] Dominio medaliq.com → Vercel (CNAME en Route 53)
- [ ] Sentry para monitoreo de errores
- [ ] Uptime Robot para alertas de disponibilidad

#### Bloque E — Monetización (post-lanzamiento)
- [ ] Wompi Colombia: suscripción atleta $15/mes
- [ ] Webhook pago: activa Pro, fallo → Free
- [ ] Campo `source` en CoachAthlete ('MARKETPLACE' | 'DIRECT')
- [ ] Facturación mensual coach por asesorados directos
- [ ] Página gestión de suscripción para el atleta

#### Bloque F — PWA
- [ ] manifest.json + service worker (offline básico)
- [ ] Meta tags instalación iOS
- [ ] Push notifications

## Modelo de negocio — definitivo

### Atletas
| Tier | Precio | Qué incluye |
|------|--------|-------------|
| Trial | $0 — 30 días | Todo completo (plan AI, check-in, nutrición, AI chat, gym) |
| Free | $0 post-trial | Dashboard básico, log manual, sin AI, sin plan adaptativo |
| Pro | $15/mes | Plan adaptativo + check-in + nutrición + AI chat (100 msgs/mes) + gym |

### Coaches
| Asesorados directos | Fee a Medaliq |
|---------------------|---------------|
| 1 a 50 | $6/asesorado activo/mes |
| 51 a 100 | $5/asesorado activo/mes + AI assistant gratis |
| +100 | $3/asesorado activo/mes + AI assistant gratis |

## Lógica de negocio
- `src/lib/plan/formulas.ts` — Karvonen HR zones, Mifflin-St Jeor TDEE, Riegel race time
- `src/lib/plan/templates.ts` — 4 templates base, índice con fallbacks para deportes sin template
- `src/lib/plan/generator.ts` — selecciona template, llama Haiku (solo B2C), guarda en DB
- `src/lib/ai/profile.ts` — AIProfile type, defaults, buildPlanSystemPrompt, buildChatSystemPrompt
- `src/lib/config/user-config.ts` — UserConfig type, parseUserConfig, helpers por rol

## Reglas del producto
- AI NO puede medicar ni diagnosticar — solo coaching deportivo
- Banderas rojas médicas → escalar, no continuar el flujo
- Multi-tenant: siempre `where: { userId }` o `where: { athleteId }`
- Planes son vivos (se ajustan por check-in), no PDFs estáticos
- `dataSources` JSON en HealthProfile rastrea origen de datos para futuras integraciones (Strava, Garmin)

## Ver reglas globales
~/.claude/CLAUDE.md
