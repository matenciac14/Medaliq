// Fuente canónica del roadmap — editar aquí para registrar bugs, features y estados
// Al terminar una tarea: marcar done: true y actualizar la note
// Al resolver un bug en la fase `bugs`: marcarlo done: true (desaparece de la UI automáticamente)

export interface RoadmapItem {
  title: string
  done: boolean
  note: string
  priority?: 'P0' | 'P1' | 'P2' | 'P3'
}

export interface RoadmapSubPhase {
  id: string
  label: string
  period: string
  items: RoadmapItem[]
}

export interface RoadmapGroup {
  id: string
  label: string
  color: string
  bgColor: string
  borderColor: string
  // Grupo simple — sin sub-fases
  period?: string
  items?: RoadmapItem[]
  // Grupo con sub-fases internas
  phases?: RoadmapSubPhase[]
  // true = solo muestra items done: false (lista viva — bugs)
  liveList?: boolean
}

export function getAllItems(group: RoadmapGroup): RoadmapItem[] {
  if (group.items) return group.items
  return group.phases?.flatMap((p) => p.items) ?? []
}

export const GROUPS: RoadmapGroup[] = [

  // ─── AUTH & ONBOARDING ───────────────────────────────────────────────────────

  {
    id: 'auth',
    label: 'Auth & Onboarding',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Auth completa: login, registro, JWT — email + Google OAuth placeholder', done: true, note: 'Auth.js v5 estrategia JWT. Payload: id, role, onboardingCompleted, activated, isB2B, userPlan, features, needsRoleSelection.' },
      { title: 'Verificación de email al registrarse (token 24h, Resend)', done: true, note: 'Endpoint /api/auth/verify-email. Email enviado via Resend al registrar.' },
      { title: 'Forgot password web (flujo completo: forgot-password + set-password)', done: true, note: 'Email de reset con link temporal. Verificado en producción.' },
      { title: 'Rate limiting brute-force en login web + mobile (10 intentos/min por cuenta)', done: true, note: 'rateLimitAsync con Upstash Redis.' },
      { title: 'Google OAuth: needsRoleSelection → /select-role → columnas DB por rol', done: true, note: 'POST /api/auth/set-role setea columnas individuales COACH/ATHLETE. session.update() recarga JWT.' },
      { title: 'Onboarding wizard: objetivo salud → ¿deporte? → físico → condición → generando', done: true, note: 'Rediseñado: web 2 pasos + generating (goal con sub-goals running/gym, perfil unificado dos columnas). Mobile 3 pasos + generating. Campos nuevos: runningGoal, sessionMinutes, injuries, conditions. Bug fix: mobile payload mapper (mainGoal→activityType). sportDetails en HealthProfile.sportDetails Json.' },
      { title: 'Onboarding B2C mobile: UX nativa — progress indicator, contexto por campo, sensación de rapidez', done: true, priority: 'P2', note: 'Reestructurado a 3 pasos (goal+profile1+profile2) + generating. Mismos campos que web. Payload ahora envía WizardData directamente. API route tiene mapper retrocompatible para payload legacy.' },
      { title: 'Feature flags como columnas Boolean en User (sin JSON blob)', done: true, note: 'featurePlan|featureCheckin|featureNutrition|featureProgress|featureLog|featureCoach|featureGym. Sin User.config JSON.' },
      { title: 'Beta cerrada — acceso bloqueado hasta activación manual del admin', done: true, note: 'JWT campo activated. Middleware → /pending. Polling automático 10s.' },
      { title: 'COACH solo se crea desde admin — /register hardcodea role=ATHLETE', done: true, note: 'Sin selector de rol COACH en /register público.' },
      { title: 'Flujo email-first en /coach/clients/new (check → link → create unificado)', done: true, note: 'GET /api/coach/clients/check. POST /api/coach/clients/link. Un solo punto de entrada.' },
      { title: 'tempPassword eliminada del JSON — link de reset firmado (JWT 1h)', done: true, note: '/api/coach/clients/create y /api/coach/athletes/[id]/reset-password. Contraseña nunca en texto plano.' },
      { title: 'Validación Zod en todos los endpoints de auth', done: true, note: 'emailSchema, passwordSchema, nameSchema, roleSchema + parseBody(). Register, forgot-password, set-password, set-role, mobile/auth/login.' },
      { title: 'Auth alignment web↔mobile: shared mappers + middleware cookie cleanup + Docker PostgreSQL local', done: true, priority: 'P1', note: 'session_mappers.ts: mapUserToToken/mapTokenToSession usados por auth.ts y auth.config.ts (campos sincronizados: isB2B, profileComplete, needsRoleSelection). mobile_auth.ts: buildMobileTokenPayload + MOBILE_USER_SELECT como SSOT para 6 endpoints mobile. Middleware: cookie cleanup v5 (authjs.*/Secure-authjs.*), user-exists-check con throttle 5min, excluye /api/. Docker PostgreSQL local para dev (Neon solo prod). 44 tests: session_mappers(25), middleware_cookies(12), mobile_auth(7).' },
      { title: 'BUG-NUT-01 — Web dashboard calorías siempre mostraba targetKcalHard (ignoraba intensidad del día)', done: true, priority: 'P1', note: 'NutritionProgressCard.CardVariant usaba targetKcalHard ?? data.kcal — siempre mostraba el valor "día duro" (ej. 2900) ignorando la sesión de hoy. Mobile mostraba data.kcal correctamente (ej. 2500 para MODERATE). Fix: (1) get_dashboard_data.ts pasa currentWeekFullSessions con intensity/durationMin reales a getDashboardSummary en vez de nulls, (2) NutritionProgressCard usa data.kcal siempre, eliminado targetKcalHard prop.' },
    ],
  },

  // ─── INFRAESTRUCTURA ─────────────────────────────────────────────────────────

  {
    id: 'infra',
    label: 'Infraestructura, Deploy & Performance',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'PostgreSQL en Neon (serverless) — migraciones aplicadas + seed con atletas y planes de ejemplo', done: true, note: '39 ejercicios globales. Atletas con planes, check-ins históricos y sesiones.' },
      { title: 'Seed unificado (prod+dev) con 7 usuarios y data histórica para todos los flujos', done: true, note: 'Consolidados 6 seeds en 1. Limpieza DB prod (42 usuarios eliminados). 7 usuarios: admin, 2 coaches, miguel(B2B+plan activo+gym+nutrition), ana(B2C free empty), pro(B2C pro autónomo+data), pending(B2B sin activar). Idempotente, 40 ejercicios, 4 rutinas, alimentos LatAm.' },
      { title: 'Deploy en Vercel + dominio medaliq.com (DNS en Route53)', done: true, note: 'Auto-deploy en cada push a main. A record + CNAME cname.vercel-dns.com.' },
      { title: 'Prisma 7 con PrismaPg adapter + pool max: 10', done: true, note: 'DATABASE_URL → pooler Neon. DIRECT_URL → migraciones. Output: src/generated/prisma.' },
      { title: 'vercel.json: maxDuration 60s en rutas de generación de plan', done: true, note: 'Sin esto Vercel corta planes de 18 semanas a los 10s. Rutas: /api/onboarding/generate, /api/plan/new, /api/coach/athletes/[id]/plan.' },
      { title: 'Rate limiting global (rateLimitAsync + Upstash Redis) en web + mobile', done: true, note: 'Web: register, onboarding/generate, ai/chat, nutrition/scan. Mobile: 11 endpoints — GET 300/min, POST 100/min por usuario.' },
      { title: 'Generator: 36 awaits secuenciales → 2 batches paralelos (Promise.all)', done: true, note: 'De 15-30s a 2-4s. Sin riesgo de timeout en Vercel para planes de 18 semanas.' },
      { title: 'Dashboard: consolidar queries (4 round-trips → 2 en Promise.all)', done: true, note: 'findFirst(COMPLETED) y findUnique(weeklyCheckIn) dentro del Promise.all inicial.' },
      { title: 'Check-in: 3 fases — reads → evaluación pura → $transaction atómica', done: true, note: 'processCheckIn use case. Check-in + ajuste sesiones + sync peso en una transacción. Rollback completo si falla.' },
      { title: 'Índices DB: WeeklyCheckIn(userId), PlannedSession(weekId), PlanWeek(planId)', done: true, note: 'De O(n) a O(log n). Constraints únicos: TrainingPlan(userId, ACTIVE), GymSession(athleteId, date, workoutId), FoodLog(userId, foodId, date, mealType).' },
      { title: 'Cache SystemConfig con unstable_cache TTL 1h', done: true, note: '3 queries eliminadas por request en check-in y dashboard.' },
      { title: 'Middleware fix: atletas FREE no redirigen a /pending en loop', done: true, note: '!activated && userPlan === "INACTIVE" — solo B2B sin activar van a /pending.' },
      { title: 'Helpers centralizados: responses.ts, feature-gate.ts, week-number.ts, calendar.ts', done: true, note: 'ok/badRequest/unauthorized/notFound. requireFeature(). getISOWeekNumber(). jsToOurDow(). Fuentes canónicas únicas.' },
      { title: 'Arquitectura hexagonal: domain/ports/infrastructure separados', done: true, note: 'domain/checkin, domain/plan, domain/onboarding + ports. infrastructure/db repositories. domain no importa Prisma ni Next.js.' },
      { title: 'Localización: User.timezone + User.locale detectados y persistidos', done: true, note: 'Web: PATCH /api/me. Mobile: PATCH /api/mobile/auth/me con expo-localization. Usado en dashboard, plan, check-in, gym.' },
      { title: 'Scope Running + Strength: CICLA/NATACION eliminados de templates y selectores UI', done: true, note: 'Schema DB intacto para compatibilidad histórica. intensity.ts conserva CICLA/NATACION → MODERATE.' },
      { title: 'Docker PostgreSQL local para desarrollo — Neon solo en producción', done: true, note: 'postgres:16-alpine en Docker. DATABASE_URL local apunta a localhost:5432/medaliq. Neon URLs comentadas en .env para dev. Elimina consumo de compute units durante desarrollo.' },
      { title: 'Error pages personalizadas (404, 500) con diseño Medaliq', done: true, note: 'src/app/not-found.tsx + error.tsx.' },
      { title: 'DB — Índices faltantes: SessionLog.completedAt, CoachProfile.isPublic, WorkoutTemplate(isPublic, isActive)', done: true, priority: 'P2', note: 'Fix: migración 20260630000001_fix_invitecode_fk_and_db_indices. Agregados: SessionLog(completedAt), CoachProfile(isPublic), WorkoutTemplate(isPublic,isActive), InviteCode(coachId), InviteCode(expiresAt), CoachAthlete(athleteId).' },
      { title: 'DB — Payment.amount Float → Int o Decimal(12,2) para valores monetarios', done: true, priority: 'P2', note: 'Fix: migración 20260701000001 → Decimal @db.Decimal(12,2). Number() en todos los sitios de aritmética: coach/finanzas, admin/finanzas, cron/payment-overdue, email/resend.' },
      { title: 'DB — TrainingPlan.goalType String? → GoalType enum para constraint a nivel DB', done: true, priority: 'P3', note: 'Fix: migración 20260701000001 → goalType GoalType?. Cast a nivel infra en plan.repository.ts (domain mantiene string para evitar importar enum de Prisma en domain/).' },
      { title: 'DB — SessionLog.freeSessionType String? → SessionType enum', done: true, priority: 'P3', note: 'Fix: migración 20260701000001 → freeSessionType SessionType?. Cast en /api/mobile/log/session/route.ts.' },
      { title: 'DB — CoachAthlete sin updatedAt — sin auditoría de cuándo cambió el status', done: true, priority: 'P3', note: 'Fix: updatedAt DateTime @updatedAt agregado a CoachAthlete en schema.prisma + migración 20260630000001. DEFAULT NOW() para filas existentes.' },
      { title: 'PERF-01 — GET /api/nutrition/foods carga toda la librería sin límite ni búsqueda', done: true, priority: 'P2', note: 'Fix: ?q= search param con where: { name: { contains: q, mode: "insensitive" } } + take: 50. Aplicado en api/nutrition/foods/route.ts (NextRequest) y api/mobile/nutrition/foods/route.ts. Tests en route.test.ts.' },
      { title: 'PERF-02 — cron/session-reminder carga TODOS los weeks de TODOS los planes activos en memoria', done: true, priority: 'P2', note: 'Fix: fase 1 carga solo planes (id, startDate, totalWeeks, user). Fase 2 computa weekNumber por plan y lanza una sola query PlannedSession con OR de filtros {planId, weekNumber}. Elimina la carga de 12,600 filas innecesarias. Tests en route.test.ts.' },

      // ── DEUDA DBA — identificada en auditoría de módulos (2026-07) ────────────
      { title: 'DBA-P0 — FoodLog sin snapshot de macros: histórico nutricional mutable si Food se actualiza', done: true, priority: 'P0', note: 'Fix (migración 20260702000001): kcalLogged/proteinLogged/carbsLogged/fatLogged Float? en FoodLog. Routes POST web+mobile calculan snapshot con calcMacros() al crear. buildFoodLogResponse() usa snapshot si presente, Food.* como fallback backward-compat. pnpm prisma generate + tsc sin errores.' },
      { title: 'DBA-P0 — FoodLog.mealType String sin enum: duplicados silenciosos por case mismatch', done: true, priority: 'P0', note: 'Fix (migración 20260702000001): UPDATE UPPER() + CREATE TYPE "MealType" + ALTER COLUMN TYPE. Schema: mealType MealType. Domain: VALID_MEAL_TYPES + MealType type + validación en parseFoodLogPost con mensaje de error claro.' },
      { title: 'DBA-P0 — GymSession sin CHECK constraint: assignedWorkoutId y plannedSessionId pueden estar poblados simultáneamente', done: true, priority: 'P0', note: 'Fix (migración 20260702000001): ALTER TABLE "GymSession" ADD CONSTRAINT "gym_session_exclusive_fk" CHECK ("assignedWorkoutId" IS NULL OR "plannedSessionId" IS NULL). Aplicado en producción.' },
      { title: 'DBA-P0 — Partial indexes de WeeklyCheckIn y TrainingPlan(ACTIVE) fuera del schema Prisma: se pierden con migrate reset', done: true, priority: 'P0', note: 'Verificado: los partial indexes SÍ persisten en migrate reset porque están en archivos SQL de migración (20260628000001 y 20260623000002). El riesgo real es prisma db push. Fix: comentario en migración 20260702000001 + regla en CLAUDE.md: NUNCA usar prisma db push en producción, solo migrate deploy.' },
      { title: 'DBA-P1 — SessionLog sin sessionDate: completedAt mezcla fecha de sesión y fecha de registro', done: true, priority: 'P1', note: 'Fix (migración 20260702000002): sessionDate DateTime? @db.Date en SessionLog. Schema + migración. LogSessionSchema web + mobile: sessionDate z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(). SessionDate persistida en ambos paths (log vinculado + log libre). Registros históricos tienen null, usan completedAt como fallback.' },
      { title: 'DBA-P1 — Message onDelete: Cascade: coach pierde historial de conversación si atleta elimina su cuenta', done: true, priority: 'P1', note: 'Fix (migración 20260702000002): fromId String? + toId String? nullable. FK recreadas con onDelete: SetNull. admin/coaches/page.tsx: .filter((id): id is string => id !== null). Mensajes con emisor/receptor eliminado preservados en DB con fromId/toId = null. UI puede mostrar "[Usuario eliminado]" si fromId es null.' },
      { title: 'DBA-P1 — Goal model zombie: ningún flow crea un Goal en producción', done: true, priority: 'P1', note: 'Decisión: mantener modelo Goal. TrainingPlan.goalType y HealthProfile.sportGoal ya capturan el goalType. El modelo Goal se reserva para la futura feature de metas explícitas (raceDate, targetTimeSecs) que se integrará cuando el coach pueda asignar objetivos con fecha. No eliminar — riesgo de migración vs beneficio bajo.' },
      { title: 'DBA-P1 — PerformanceBenchmark.sport y .metric son String sin enum: benchmark puede guardarse invisible', done: true, priority: 'P1', note: 'Fix (migración 20260702000002): los valores usan 5K_TIME y 1RM_SQUAT (empiezan con número) — no son válidos como identifiers Prisma enum. Alternativa adoptada: CHECK constraints en DB (benchmark_sport_valid + benchmark_metric_valid) + normalización UPPER() de existentes + validación en benchmarks/route.ts POST con lista VALID_SPORTS/VALID_METRICS + toUpperCase() antes de persistir.' },
      { title: 'DBA-P2 — SetLog sin índice para PR detection por exerciseName: table scan en atletas con 1000+ sets', done: true, priority: 'P2', note: 'Fix (migración 20260702000003): @@index([exerciseName, completed]) en SetLog. Cubre isPRByName() que busca max weight WHERE exerciseName = X AND completed = true. No se desnormalizó athleteId — el índice en exerciseName+completed es suficiente para el caso de uso.' },
      { title: 'DBA-P2 — CoachAthlete sin @@index([coachId, status]): conteo de atletas activos lento con coaches grandes', done: true, priority: 'P2', note: 'Fix (migración 20260702000003): @@index([coachId, status]) en CoachAthlete. Cubre COUNT WHERE coachId = X AND status = "ACTIVE" de getCoachLimits(). El @@unique([coachId, athleteId]) existente no servía para filtrar por status.' },
      { title: 'DBA-P3 — WeeklyCheckIn sin @@index([userId, weekNumber]): lookup de semana actual ineficiente', done: true, priority: 'P3', note: 'Fix (migración 20260702000003): @@index([userId, weekNumber]) en WeeklyCheckIn. findFirst({ where: { userId, weekNumber } }) ahora usa índice compuesto en lugar de filtrar weekNumber en memoria sobre @@index([userId]).' },
      { title: 'DBA-P3 — SessionLog sin @@index([userId, completedAt]): historial cronológico del atleta necesita sort adicional', done: true, priority: 'P3', note: 'Fix (migración 20260702000003): @@index([userId, completedAt(sort: Desc)]) en SessionLog. Queries de historial con orderBy: { completedAt: "desc" } ahora usan índice compuesto — elimina el sort adicional en memoria.' },

      // ── INTEGRIDAD DE DATOS — auditoría julio 2026 ────────────────────────────
      { title: 'INT-P0 — User creation no garantiza registros dependientes: UserSubscription y CoachProfile pueden no existir', done: true, priority: 'P0', note: 'Fix en bugfix/43-module-hardening: /api/auth/register crea UserSubscription atómicamente tras User.create. /api/coach/clients/create crea UserSubscription dentro del $transaction existente. Backfill: scripts/backfill-integrity.ts corrigió 18 users sin subscription + 2 coaches sin CoachProfile en DB prod.' },
      { title: 'INT-P0 — Auditoría exhaustiva DB + código: identificar todas las invariantes sin enforce en create use cases', done: true, priority: 'P0', note: 'Completado en bugfix/43-module-hardening: scripts/check-db-integrity.ts (15 checks) + scripts/backfill-integrity.ts (5 pasos idempotentes). DB prod: 15/15 OK, 0 violaciones. Fixes Tanda 1: gym/today null guard, plan route early 400 sin profile. Fixes Tanda 2: upsertNutrition dentro de $transaction en completeOnboardingUseCase, map-athlete.ts goal/phase/weightKg nullable.' },

      // ── AUDITORÍA FK + PARIDAD WEB/MOBILE — julio 2026 ───────────────────────
      { title: 'DBI-01 — InviteCode race condition: dos atletas pueden canjear el mismo código simultáneamente', done: true, priority: 'P0', note: 'Fix: updateMany WHERE usedBy IS NULL + expiresAt > now() — atómico, sin $transaction extra. Si count===0 → 400. Después fetch coachId y upsert CoachAthlete. src/app/api/invite/[code]/route.ts.' },
      { title: 'DBI-02 — AssignedWorkout.templateId sin onDelete: borrar WorkoutTemplate activo → P2003', done: true, priority: 'P0', note: 'DONE: Agregado onDelete: Cascade en prisma/schema.prisma + migración SQL 20260703100000_add_assigned_workout_cascade. Ahora borrar un WorkoutTemplate elimina en cascada sus AssignedWorkout.' },
      { title: 'DBI-03 — WorkoutExercise.exerciseId sin onDelete: borrar Exercise usado en rutinas → P2003', done: true, priority: 'P0', note: 'FIXED: admin/exercises/[id]/route.ts DELETE ahora verifica workoutExercise.count() y retorna 409 si el ejercicio está en uso en rutinas.' },
      { title: 'DBI-04 — AssignedNutritionPlan.templateId sin onDelete: borrar NutritionTemplate activa → P2003', done: true, priority: 'P0', note: 'VERIFIED: ya implementado — coach/nutrition/templates/[templateId]/route.ts ya tiene guard assignedNutritionPlan.count() → 409. Falso positivo del audit.' },
      { title: 'DBI-05 — PlannedSession.workoutDayId sin onDelete: SetNull: borrar WorkoutDay deja FK huérfana', done: true, priority: 'P1', note: 'Fix: onDelete: SetNull añadido a relación workoutDay en PlannedSession. Migración 20260702050350_add_setnull_nullable_fks. prisma/schema.prisma L344.' },
      { title: 'DBI-06 — SessionLog.plannedSessionId sin onDelete: SetNull: borrar PlannedSession deja FK huérfana', done: true, priority: 'P1', note: 'Fix: onDelete: SetNull añadido a relación plannedSession en SessionLog. SessionLog queda como log libre cuando PlannedSession se borra. Migración 20260702050350. prisma/schema.prisma L392.' },
      { title: 'DBI-07 — Mobile PATCH /log/session/[logId] no actualiza distanceKm: inconsistencia web vs mobile', done: true, priority: 'P1', note: 'Fix: añadido bloque if (typeof body.distanceKm === "number" && body.distanceKm > 0) data.distanceKm = body.distanceKm. Paridad con web. src/app/api/mobile/log/session/[logId]/route.ts L30.' },
      { title: 'DBI-08 — TrainingPlan sin PlanWeeks si goalType sin template: plan vacío en dashboard atleta', done: true, priority: 'P1', note: 'FIXED: generate-plan.use-case.ts lanza error antes del $transaction si getTemplate() retorna null. Eliminado fallback ?? 18 y rama else. Plan vacío imposible ahora.' },
      { title: 'DBI-09 — CoachAthlete link sin filtro status=ACTIVE: atleta puede vincularse a coach PAUSED', done: true, priority: 'P2', note: 'FIXED: coach/clients/link/route.ts findFirst ahora incluye status: "ACTIVE" en where. Atletas con coach inactivo histórico pueden vincularse a nuevo coach.' },
      { title: 'DBI-10 — progress/page.tsx: weightKg/hrResting cast a number sin null check → NaN en gráficas', done: true, priority: 'P2', note: 'Fix: type guard en filter — .filter((c): c is typeof c & { weightKg: number } => c.weightKg !== null) elimina el cast as number. TypeScript narra el narrowing correctamente. Mismo patrón para hrResting. src/app/(athlete)/progress/page.tsx.' },
      { title: 'DBI-11 — Nutrition foods mobile sin micronutrientes: select 8 campos vs 12 en web', done: true, priority: 'P2', note: 'FIXED: mobile/nutrition/foods/route.ts select ahora incluye fiberPer100g, calciumMg, ironMg, potassiumMg, vitaminCMg, magnesiumMg — paridad completa con web.' },
      { title: 'DBI-12 — CoachProfile no se crea en registro: coach sin CoachProfile hasta primer PATCH', done: true, priority: 'P3', note: 'FIXED: register/route.ts ahora crea CoachProfile skeleton (coachId, slug) en $transaction junto a UserSubscription. Slug: {name-slug}-{id[-6:]}. CoachProfile siempre existe al registrar un coach.' },
      { title: 'DBI-13 — Goal model nunca se popula: TrainingPlan.goalId siempre null', done: true, priority: 'P3', note: 'ELIMINADO. Modelo Goal quitado del schema (migración aplicada en producción). GoalType enum se mantiene como campo directo en TrainingPlan.goalType. seed.ts limpio: sin GoalStatus import, sin goals: blocks. /new-goal eliminado (ARCH-01, chore/cleanup-goal-dead-code).' },
      { title: 'SCHEMA-DOC — Eliminar GoalStatus de CLAUDE-SCHEMA.md (Goal model eliminado en DBI-13)', done: true, priority: 'P3', note: 'GoalStatus enum (ACTIVE | COMPLETED | ABANDONED) eliminado de CLAUDE-SCHEMA.md §Enums. Goal no existe en schema.prisma ni en código. Solo quedaba la entrada stale en la documentación.' },

      // ── HALLAZGOS AGENTES — auditoría completa julio 2026 ────────────────────
      { title: 'DBI-14 — Mobile JWT stale 30d: coach activa features pero atleta necesita re-login', done: true, priority: 'P1', note: 'FIXED: creado POST /api/mobile/auth/refresh. Verifica JWT existente, lee features frescas de DB, emite nuevo token. Mobile debe llamar este endpoint tras notificación de activación de features.' },
      { title: 'DBI-15 — Payment cascade: eliminar atleta borra todos sus registros de pago al coach', done: true, priority: 'P1', note: 'FIXED: Payment.athleteId → String? + athlete User? + onDelete: SetNull. Migración 20260702060000_payment_athlete_setnull. Pagos preservados con athleteId=null cuando atleta es eliminado.' },
      { title: 'DBI-16 — Web API endpoints sin rate limiting: mensajes, nutrition, log vulnerables a DoS', done: true, priority: 'P2', note: 'FIXED: rateLimitAsync añadido a /api/messages (GET 300/min, POST 100/min), /api/nutrition/log (GET 300/min, POST 100/min), /api/log/session (POST 100/min).' },
      { title: 'DBI-17 — PerformanceBenchmark sin @@unique: permite múltiples del mismo (sport, metric)', done: true, priority: 'P2', note: 'BY DESIGN: múltiples benchmarks del mismo (sport, metric) son intencionales — permiten tracking histórico de evolución (5K_TIME de hace 3 meses vs hoy). @@unique no aplica. No requiere fix.' },
      { title: 'DBI-18 — Payment delete: ownership check fuera de $transaction puede crear AuditLog orphan', done: true, priority: 'P2', note: 'FIXED: payments/[paymentId]/route.ts DELETE ahora usa $transaction interactiva — findFirst ownership check dentro del tx antes de auditLog.create + payment.delete.' },
      { title: 'DBI-19 — gym/session/[id]/route.ts mezcla auth web y mobile: getMobileUser ?? auth() en mismo endpoint', done: true, priority: 'P3', note: 'FIXED: mobile no usa este endpoint (usa /api/mobile/gym/*). Eliminado getMobileUser() — route usa solo auth(). src/app/api/gym/session/[id]/route.ts.' },
      { title: 'DBI-20 — Payment.paidAt sin CHECK en DB: status=PAID puede persistir sin paidAt', done: true, priority: 'P3', note: 'FIXED: migración 20260702070000_payment_paidat_check — CHECK constraint payment_paid_status_requires_paid_at: status != PAID OR paidAt IS NOT NULL. La validación en app layer (PATCH route L35) ya asigna paidAt si status=PAID.' },

      // ── AUDITORÍA COMPLETA CAPAS 1–6 — agosto 2026 ──────────────────────────
      { title: 'SEC-L1 — IDOR audit: 35 endpoints con [id] dinámico — ownership verificado', done: true, priority: 'P0', note: 'Auditados todos los endpoints con parámetros dinámicos. 0 vulnerabilidades IDOR encontradas. Fix menor: gym/routines/[id]/copy retornaba 403 cuando debía retornar 404 — unificado.' },
      { title: 'SEC-L1 — Cron endpoints: 9 crons protegidos con CRON_SECRET via Authorization header', done: true, priority: 'P0', note: 'Todos los crons verifican `Bearer ${CRON_SECRET}`. Admin trigger manual usa mismo secret en self-call.' },
      { title: 'PERF-L2 — GET /api/mobile/plan sin rate limiting', done: true, priority: 'P2', note: 'FIXED: añadido rateLimitAsync limit:60/min (antes sin rate limit — podía ser hammered).' },
      { title: 'PERF-L2 — GET /api/mobile/checkin: existing + pendingSuggestions queries secuenciales', done: true, priority: 'P3', note: 'FIXED: ambas queries ahora en Promise.all — elimina latencia innecesaria (~50ms en promedio).' },
      { title: 'VAL-L6 — parseFoodLogPost: grams sin límite superior', done: true, priority: 'P1', note: 'FIXED: grams > 5000 → 400 "grams no puede superar 5000g por registro". Previene datos de nutrición inválidos en DB.' },
      { title: 'VAL-L6 — parseFoodLogPost: date param sin validación de formato', done: true, priority: 'P1', note: 'FIXED: date debe pasar regex /^\\d{4}-\\d{2}-\\d{2}$/ — retorna 400 si malformado.' },
      { title: 'VAL-L6 — GET /api/mobile/nutrition/log: dateParam sin validación antes de construir Date', done: true, priority: 'P1', note: 'FIXED: validación /^\\d{4}-\\d{2}-\\d{2}$/ con 400 si formato inválido. Previene Invalid Date llegar a Prisma.' },
      { title: 'VAL-L6 — gym/session/complete: sets[] y exerciseOverrides[] sin max length', done: true, priority: 'P1', note: 'FIXED: sets z.array().max(300), exerciseOverrides z.array().max(50). Previene transaction timeout con arrays masivos.' },
      { title: 'VAL-L6 — coach/athlete/[id]/plan: goalType sin validación de enum', done: true, priority: 'P1', note: 'FIXED: validado contra PLAN_TEMPLATES keys. daysPerWeek validado [3,4,5,6]. hoursPerSession validado [0.5–3]. Prisma ya no puede recibir goalType inválido.' },
      { title: 'DEAD-L5 — coachFeeRate() y feeLabel() @deprecated en finanzas.ts', done: true, priority: 'P3', note: 'FIXED: eliminadas ambas funciones. Sin referencias en código activo (solo mencionadas en roadmap-data.ts como texto de nota). Tests de finanzas siguen pasando.' },

      // ── CODE QUALITY — auditoría agosto 2026 ─────────────────────────────────
      // P1
      { title: 'CQ-01 — planStatus: \'SIN PLAN\' — string en español en lógica de negocio', done: true, priority: 'P1', note: 'DONE: planStatus ?? null en mapper + compara === null en dashboard coach.' },
      { title: 'CQ-02 — map-athlete.ts importado desde API route — violación de capas', done: true, priority: 'P1', note: 'DONE: CoachAthleteRow + mapCoachAthleteRelation en infrastructure/db/coach_athlete.mapper.ts. _lib/map_athlete.ts es re-export shim.' },
      { title: 'CQ-03 — ESPECIFICO vs ESPECÍFICO — inconsistencia código/DB', done: true, priority: 'P1', note: 'DONE: Phase enum DB solo acepta ESPECIFICO (sin tilde). Eliminada key defensiva de FUERZA_CORREDOR_DAY, case en session-builder y duplicate key en AthleteDetailClient. PlanBuilderClient usa ESPECIFICO como valor de DB, PHASE_LABELS para display. PATCH week route valida Phase enum. Tests actualizados.' },
      { title: 'CQ-04 — Tests faltantes: exercise-sync, create-wearable-session, complete-onboarding use cases', done: true, priority: 'P1', note: 'DONE: 22 tests escritos — exercise-sync (4), create-wearable-session (5), complete-onboarding (13). Suite sube a 79 archivos / 1087 tests.' },
      // P2
      { title: 'CQ-05 — AthleteDetailClient.tsx — 2907 líneas en un solo componente', done: true, priority: 'P2', note: 'DONE: Extraídos 9 tabs (ResumenTab, PlanTab, ProgresoTab, NutricionTab, SesionesTab, AdherenciaTab, BenchmarksTab, EjerciciosTab, MensajesTab) + Stat.tsx compartido. AthleteDetailClient queda ~600 líneas de estado puro + handlers. Estado centralizado en parent, cada tab recibe props.' },
      { title: 'CQ-06 — weekLabel() retorna string UI desde dominio puro', done: true, priority: 'P2', note: 'DONE: weekLabel() eliminada de wau.ts. WeekBucket ahora expone weekNumber: number. metrics/page.tsx formatea como `Sem ${weekNumber}`. Tests actualizados.' },
      { title: 'CQ-07 — fmt() duplicada en coach/finanzas y admin/finanzas', done: true, priority: 'P2', note: 'DONE: extraída a src/lib/utils/format_currency.ts → formatCurrency(). Ambas pages importan con alias `as fmt` sin cambios en el resto del código.' },
      { title: 'CQ-08 — integrations/page.tsx importa wearableRepository directo de infrastructure', done: true, priority: 'P2', note: 'DONE: page usa prisma.wearableConnection.findMany directamente en lugar de importar el repositorio. Simple select, 3 campos.' },
      // P3
      { title: 'CQ-09 — TAKE = 20 — constante de paginación mezclada con mapper', done: true, priority: 'P3', note: 'DONE: TAKE definida como const local en athletes/page.tsx. Eliminada del shim _lib/map_athlete.ts.' },
      { title: 'CQ-10 — type InputRow — nombre ambiguo en map-athlete.ts', done: true, priority: 'P3', note: 'DONE: InputRow no tenía consumers externos. Alias eliminado del shim. Tipo canónico es CoachAthleteRow en infrastructure/db/coach_athlete.mapper.ts.' },
      { title: 'CQ-11 — UserPlan TRIAL — dead type en user-config.ts', done: true, priority: 'P3', note: 'DONE: UserPlan = \'FREE\' | \'PRO\'. TRIAL eliminado de UserPlan y SubscriptionSnapshot.tier en billing.types.ts. Tests actualizados.' },

      // ── STANDBY — activar con primeros usuarios reales ───────────────────────
      { title: 'Google OAuth: activar con dominio real en producción', done: false, note: '[STANDBY] Google Cloud Console → Client ID + Secret → GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET en Vercel. Código implementado.' },
      { title: 'Sentry: monitoreo de errores en producción', done: false, note: '[STANDBY] Pospuesto hasta tener usuarios reales activos. @sentry/nextjs. Gratis hasta 5k errores/mes.' },
      { title: 'Uptime Robot: alertas de disponibilidad (ping cada 5 min)', done: false, note: 'Email/SMS si la app cae. Gratis hasta 50 monitores.' },
    ],
  },

  // ─── ATLETA ──────────────────────────────────────────────────────────────────

  {
    id: 'atleta',
    label: 'Atleta',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#ddd6fe',
    phases: [
      {
        id: 'atleta-core',
        label: 'Core — Plan, Check-in, Nutrición, Gym & Progreso',
        period: 'Completado',
        items: [
          { title: 'Generador de plan determinista (4 templates: 5K, 10K, HM, Recomposición)', done: true, note: 'Sin AI. 100% determinista. generator.ts + templates.ts.' },
          { title: 'Calendario de plan (18 semanas, fases BASE→DESARROLLO→ESPECÍFICO→AFINAMIENTO)', done: true, note: 'Vista semanal en /plan.' },
          { title: 'Eliminar RACE_HALF_MARATHON y RACE_MARATHON de selectores UI (/new-goal + coach plan builder)', done: true, priority: 'P1', note: 'Eliminados de NewGoalClient.tsx, coach/clients/new/page.tsx y AthleteDetailClient.tsx (TEMPLATE_PREVIEW + select + estado inicial). GoalType enum y templates en DB intactos.' },
          { title: 'Recortar templates BODY_RECOMPOSITION y STRENGTH_TRAINING de 16 a 12 semanas', done: true, priority: 'P1', note: 'DONE (PR #45): templates.ts — BODY_RECOMPOSITION_16W y STRENGTH_TRAINING_16W recortados a 12 semanas (semanas 13-16 eliminadas). totalWeeks: 12. Semana 12 termina en ESPECIFICO. Tests actualizados.' },
          { title: 'SessionIntensity enum (HIGH|MODERATE|LOW|REST) + getDailyNutritionTarget()', done: true, note: 'HIGH→targetKcalHard, MODERATE→easy, LOW→easy×0.88, REST→targetKcalRest. Fuente canónica: daily-target.ts.' },
          { title: 'Registro de sesión (log): RPE, FC, distancia, notas', done: true, note: 'POST /api/log/session. SessionLog con plannedSessionId.' },
          { title: 'Check-in semanal + motor de alertas deterministas', done: true, note: 'evaluateRules() puro. Triggers: fc_alta, sueno_bajo, rpe_excesivo, dolor_activo, estres_alto, motivacion_baja, energia_baja, perdida_peso_rap.' },
          { title: 'applyPlanAdjustments: omite sesiones con edición manual del coach', done: true, note: 'Sesiones con coachNotes sin "[AUTO]" se saltan. Nunca sobrescribe ediciones intencionales.' },
          { title: 'FC baseline dinámica en check-in (vs hrResting propio del atleta)', done: true, note: 'fcBaseline = hrRestingBaseline ?? 62. Comparación contra datos propios.' },
          { title: 'Plan nutricional (TDEE Mifflin-St Jeor + macros + buildStaticMealPlan)', done: true, note: 'buildStaticMealPlan() determinista. parseMealPlanData() valida antes de NutritionContent.' },
          { title: 'Dashboard: card "Hoy" con sesión + kcal + macros del día', done: true, note: '"Día duro — 2.850 kcal — Carbos: 340g".' },
          { title: 'Quick log desde dashboard (1 clic para registrar sesión de hoy)', done: true, note: 'QuickLog.tsx. POST /api/log/session. router.refresh() al completar.' },
          { title: 'Streak de días activos (badge si >= 2 días consecutivos)', done: true, note: 'Calculado en dashboard/page.tsx.' },
          { title: 'Adherencia en dashboard: % últimas 4 semanas (badge verde/amber/rojo)', done: true, note: 'Cero queries adicionales — usa activePlan.weeks ya cargadas.' },
          { title: 'Gym tracker: sets/pesos, timer descanso, referencia sesión anterior, supersets', done: true, note: 'Web + mobile. Supersets: border-l coloreado + badge pill.' },
          { title: 'isPR detection (SetLog.isPR) al completar set', done: true, note: 'Comparación vs máximo histórico. Celebration banner web. Icono trofeo mobile.' },
          { title: 'Progresión de cargas persistida (suggestedNextWeightKg en WorkoutExercise)', done: true, note: 'max(weightKg)+2.5 al completar todos los sets objetivo.' },
        ],
      },
      {
        id: 'atleta-ux',
        label: 'UX — Dashboard, Perfil, Métricas & PWA',
        period: 'En construcción',
        items: [
          { title: 'Dashboard: 7 días Lun-Dom siempre visibles, hoy resaltado', done: true, note: 'Sin importar qué días tenga sesiones el plan.' },
          { title: 'Check-in badge "Pendiente" solo si no se ha hecho esta semana', done: true, note: 'Verifica weekNumber actual en DB.' },
          { title: '/profile atleta: ver y editar datos de salud', done: true, note: 'Peso, talla, FC, lesiones, condiciones. IMC y hrMax calculados automáticamente.' },
          { title: 'Formulario de métricas diarias en /profile (peso, FC, sueño, energía, notas)', done: true, note: 'Historial 14 días. Upsert por userId+date.' },
          { title: 'Gráficas SVG en /progress: peso, FC reposo, adherencia, km, bienestar', done: true, note: 'LineChart, HorizontalKmChart, AdherenceVerticalChart, WellbeingChart. Sin dependencias externas.' },
          { title: 'Export PDF del plan semanal', done: true, note: 'GET /api/plan/week-print?week=N → HTML + print CSS + auto-print. Sin react-pdf ni puppeteer.' },
          { title: 'PWA: manifest.json, service worker, meta tags iOS, banner instalación', done: true, note: 'Cache-first assets. Offline fallback. BeforeInstallPrompt Android + instrucciones iOS.' },
          { title: 'Internacionalización ES / EN con selector de banderas', done: true, note: 'Cookie-based, server + client. LanguageSwitcher en navbar y sidebars.' },
          { title: 'Páginas de ayuda por perfil (/help, /coach/help, /admin/help)', done: true, note: 'FAQ por sección, flujos de uso.' },
          { title: 'Resumen de semana determinista en dashboard (sin IA)', done: true, note: 'TRAINING: buildWeeklySummary() → "Llevas X de Y sesiones. Volumen: Z km." FREE/RECOVERY: buildFreeModeSummary() → "X de Y sesiones esta semana. Hoy: Gym/Salida a correr." Ambos usando datos ya cargados en dashboard/page.tsx.' },
          { title: 'Récords personales visibles en /progress', done: true, note: 'Fix: progress/page.tsx consulta setLog.findMany({ where: { isPR:true, session:{athleteId} }, take:20 }). GymPR type exportado a ProgressClient. Sección "Récords Personales Gym" con ejercicio, weightKg, reps, fecha + badge PR. Tests TS pasan.' },
          { title: 'Responsive audit completo en móvil real (iPhone SE, iPhone 14, Samsung Galaxy)', done: false, note: 'Fix de padding/overflow por pantalla.' },
          { title: 'DASH-RACE-01 — Nombre personalizado de carrera en dashboard ("tu 10K" → "Mi Media Maratón Bogotá")', done: false, priority: 'P3', note: 'Figma muestra nombre personalizado. Hoy se usa "tu carrera" genérico. sportDetails (JSON en HealthProfile) puede almacenar raceName sin migración. Requiere: (1) campo raceName en onboarding o settings, (2) buildSportDetails() guardarlo, (3) getDashboardSummary() exponerlo, (4) web MobileCardsSection + mobile ProMetricsCard renderizarlo.' },
          { title: 'Dashboard FREE — pantalla de bienvenida dedicada para atleta sin plan', done: true, priority: 'P1', note: 'buildFreeModeSummary() ya existía. Implementado: banner FREE con "Busca un entrenador" (→ /coaches) + "Entrena libre" (→ /log). Elimina CTA /new-goal. worktree at-01-athlete-ux item 1.' },
          { title: 'Pantalla de celebración al completar plan + elección de siguiente paso', done: true, priority: 'P1', note: 'PlanCompletionCard.tsx — componente server con stats (nombre plan, semanas, sesiones, adherencia %). B2B → info box "Tu coach preparará tu siguiente plan". B2C → CTAs "Busca un entrenador" + "Seguir entrenando". Aparece en dashboard cuando dashboardMode=RECOVERY. worktree at-01-athlete-ux item 8.' },
          { title: 'UX-ONBOARDING-01 — Texto de promesa en onboarding inflado para atleta B2C Free', done: true, priority: 'P2', note: 'Fix: onboarding/page.tsx:317 subtexto cambiado a "Configurando tu perfil y calculando tus objetivos iniciales" — preciso para Free, sin prometer plan adaptativo. Originalmente: "Calculando calorías, macros y preparando tu espacio" — implica generación de plan adaptativo. El atleta B2C Free recibe tracking básico (log + nutrición + gym), sin plan ni ajustes automáticos. La promesa choca con la realidad en el día 1 → drop-off. Fix: cambiar subtexto a "Configurando tu perfil y calculando tus objetivos iniciales" (preciso para Free). En FreeDashboard, agregar card "Lo que puedes hacer hoy" con 3 acciones concretas: registrar sesión, registrar comida, ver historial. Archivos: src/app/onboarding/page.tsx:317, src/app/(athlete)/dashboard/ (FreeDashboard component).' },
          { title: 'UX-PROGRESS-01 — /progress: paywall duro bloquea toda la pantalla sin preview para atleta Free', done: true, priority: 'P2', note: 'progress/page.tsx:20-34: si !features?.progress → bloqueo total de la página. Atleta Free no ve ningún dato histórico propio. Fix: mostrar gráfico de peso (datos de HealthProfile — ya disponibles) como preview gratuito. Extraer query de peso/check-ins de peso fuera del bloque condicional del paywall. Sobre cada sección Pro (adherencia, benchmarks, gym PRs, check-in analytics) → icono de candado con "Disponible en Pro". El atleta Free siempre ve su historial de peso — nunca pantalla completamente bloqueada. NO cambiar features?.progress ni la lógica de tier. Solo cambiar qué renderiza cuando features?.progress = false. Archivo: src/app/(athlete)/progress/page.tsx.' },
          { title: 'UX-01 — /find-coach: ruta de descubrimiento de coaches dentro del app (con sidebar)', done: true, priority: 'P1', note: 'DONE — Creado find-coach/page.tsx + 5 CTAs actualizados. Nota original: todos los CTAs internos "Buscar entrenador" apuntan a /coaches (página pública con nav de marketing). Atleta logueado pierde el contexto del app. Solución: crear src/app/(athlete)/find-coach/page.tsx — misma lógica de búsqueda/filtro que /coaches pero dentro del athlete layout. Mantener /coaches para SEO y usuarios no logueados. Actualizar CTAs internos: FreeDashboard.tsx, plan/page.tsx, gym/page.tsx (footer) → href="/find-coach".' },
          { title: 'UX-02 — Exercise picker en sesión libre: reemplazar input texto por búsqueda WorkoutX', done: true, priority: 'P1', note: 'DONE (2026-07-21) — implementado como GYM-WEB-01. gym/session/page.tsx: PickerExercise type, showPicker/pickerQuery/pickerResults/pickerLoading state, useEffect debounced 300ms → /api/gym/exercises/search (nuevo endpoint, nameEs??name, take 20 por popularityRank), selectPickerExercise agrega al free list. UI: botón "+" borde dashed abre modal portal con input autofocus + lista con thumbnails GIF. Reemplaza el input de texto libre.' },
          { title: 'UX-11 (Mobile) — Nav tabs adaptativos por deporte del atleta', done: true, priority: 'P2', note: 'DONE (2026-07-17). Implementado: sport derivado de healthProfile.sportGoal en /api/mobile/auth/login (STRENGTH_TRAINING→STRENGTH, BODY_RECOMPOSITION→BOTH, resto→RUNNING). Incluido en JWT (MobileTokenPayload.sport) y en SessionUser. _layout.tsx: useAuthStore para leer sport, tab Plan oculto (href:null) cuando sport===STRENGTH.' },
          { title: 'UX-ONBOARD-01 — Post-onboarding B2C sin coach: pantalla de orientación "¿por dónde empezar?"', done: true, priority: 'P2', note: 'DONE (2026-07-17). hasEverLogged añadido a /api/mobile/dashboard + DashboardData. dashboard.tsx mobile: card de orientación con 3 CTAs (Plan, Gym, Nutrición) cuando !hasEverLogged && user.onboardingCompleted. Desaparece tras primer log.' },
          { title: 'Auditoría UX atleta B2C sin coach — Sprint 1-3 implementado', done: true, priority: 'P1', note: 'DONE (2026-07-10). Sprint 1: UX-07 weekLabel default "Registra tu semana" (vs "5 min para ajustar tu plan" cuando no hay plan). UX-NEW-02 RPE label genérico (quitado "(running)"). Sprint 2: UX-04 CTA "Crear mi rutina →" en /plan vacío. UX-05 Hero cards mostradas para FREE users (ya tenían datos: peso actual 100kg, meta 85kg, form status). Sprint 3: UX-06 separador "Guía de alimentos" en /nutrition. UX-08 Notificaciones movidas a icono bell en sidebar header (desktop) y top bar (mobile). UX-03 /progress estado vacío mejorado con 6 preview cards de métricas futuras. Sprint 4: UX-NEW-03 tag "Strength" → "Fuerza" en perfil. UX-10 fecha literal eliminada del header dashboard.' },
          { title: 'DASH-FIGMA-01 — Alineación completa dashboard web + mobile web con Figma (5 frames desktop + 5 mobile)', done: true, priority: 'P1', note: 'DONE (2026-08-25). 13 fixes: (1) /routine/edit→/gym link roto, (2) pill "Entreno"→"Gym", (3) badge "PRO"→"✓ datos de tu log", (4) card derecha "Carga Semanal"→"Sesiones Semana"+delta, (5) dedup TRAINING session detail (DailySessionCard vs SelectedDayDetail), (6) COACH badge en SelectedDayDetail, (7) isB2B prop chain, (8) nutrición no-data format, (9) nutrición "de X objetivo", (10) weight card mode-aware FREE vs Pro/B2B, (11) mobile QuickSessionFeedback FREE, (12) mobile "INSIGHTS PRO" upsell, (13) mobile Pro/B2B split "Cómo llegas hoy" + "ÚLTIMO CHECK-IN". Frames: 2779:46, 2671:46, 2796:46, 2796:217, 2854:217 (desktop) + 2946:46, 3404:46, 3042:46, 2950:424, 2950:698 (mobile).' },
          { title: 'DASH-FIGMA-02 — Conectar flujos interactivos del dashboard: feedback post-sesión, Ver resumen, gym done', done: true, priority: 'P1', note: 'DONE (2026-08-25). (1) QuickSessionFeedback.tsx client component con 3 botones (Cansado→EXHAUSTED, Regular→NORMAL, Fuerte→ENERGIZED) → PATCH /api/log/session/[logId] o /api/gym/session/[id]. energyState agregado a PATCH de SessionLog. PATCH nuevo en /api/gym/session/[id]. (2) "Ver resumen →" CTA en HOY card mobile: running→/progress, gym→/gym/history. Gym done: botón "Empezar" reemplazado por "Ver resumen →" → /gym/history. (3) TodayLogCard ya existía implementado — verificado en ambas secciones mobile (FREE + Pro/B2B).' },
          { title: 'GYM-BUG-01 — Comenzar sesion visible aunque la sesion del dia ya este completada', done: true, priority: 'P1', note: 'gym/page.tsx: el boton "Comenzar sesion de hoy" y el panel de detalle del dia no verifican si el dia ya tiene GymSession.completed=true. completedDows se calcula (linea 282) pero no se usa en esos botones. Fix: ocultar boton e indicador "Iniciar sesion" cuando completedDows.has(todayDow). Reemplazar con indicador "Sesion completada". Archivos: src/app/(athlete)/gym/page.tsx.' },
          { title: 'PLAN-BUG-01 — /plan muestra estado vacio aunque atleta tenga rutina de gym asignada', done: true, priority: 'P1', note: '/plan/page.tsx: check de gymRoutine para redirigir a /gym esta dentro del bloque if (!features?.plan). Como onboarding setea featurePlan=true para todos, la redireccion nunca dispara. Fix: mover el check assignedWorkout FUERA del bloque de features.plan. Archivos: src/app/(athlete)/plan/page.tsx.' },
          { title: 'UX-GYM-01 — /gym sin selectedDow: llegada sin contexto del dia activo', done: true, priority: 'P2', note: 'Cuando el atleta hace click en "Ver rutina" o "Comenzar sesion" desde el dashboard, llega a /gym sin ?selectedDow=N. El panel de detalle del dia no se muestra. Fix: todos los links internos a /gym deben incluir el DOW del dia actual como queryParam. Archivos: dashboard/page.tsx, gym/page.tsx.' },
          { title: 'GYM-FEAT-01 — Sin boton Cambiar rutina cuando hay rutina activa asignada', done: true, priority: 'P2', note: 'gym/page.tsx: cuando el atleta tiene assignedWorkout activo, no hay forma de cambiar o desvincular la rutina. Fix: boton "Cambiar rutina" en el header de /gym cuando routine != null. Click → modal de confirmacion → POST /api/gym/assign con otro templateId. POST /api/gym/assign ya desactiva la anterior. Archivos: src/app/(athlete)/gym/page.tsx.' },
        ],
      },
      {
        id: 'atleta-nutricion',
        label: 'Nutrición — Tracking Real & Porciones',
        period: 'En construcción',
        items: [
          { title: 'FoodLog: POST + GET /api/nutrition/log (web + mobile)', done: true, note: 'Totales y % vs target. intensityToDayType() mapea intensity→dayType. calcMacros() por gramos.' },
          { title: 'FoodSetupFlow: usa IDs de Foods de DB (sin nombres libres hardcodeados)', done: true, note: 'buildFoodCategories(allFoods) agrupa por food.category desde DB.' },
          { title: 'FoodLogTracker mobile: 4 barras de progreso + LogFoodModal', done: true, note: 'Búsqueda en librería, quick-picks gramaje (50/100/150/200g), preview macros en tiempo real.' },
          { title: 'Ajuste nutricional por intensidad real: notificación + aceptar/rechazar', done: true, priority: 'P1', note: 'Domain + API completos. UI mobile: NutritionAdjustmentCard (amber-themed) con botones Aceptar/Rechazar en nutrition.tsx. Tipos PendingNutritionAdjustment + acceptNutritionAdjustment/rejectNutritionAdjustment en api/nutrition.ts. Card aparece sobre sección de macros cuando data.pendingAdjustment existe. worktree at-01-athlete-ux item 6.' },
          { title: 'Validar MealPlan JSON con Zod antes de renderizar en NutritionContent', done: true, note: 'parseMealPlanData() en domain/nutrition/generate_meal_plan.ts valida estructura { hard, easy, rest } y retorna null si es inválido. nutrition/page.tsx usa parsedMealPlan: si null → fallback UI con CTA regenerar. normalizeMealPlan() en NutritionContent maneja DayMeals con arrays vacíos como fallback secundario.' },
          { title: 'Estandarizar REST carbs: NutritionContent debe usar getDailyNutritionTarget()', done: true, note: 'Fix: NutritionContent importa getDailyNutritionTarget de daily-target.ts + intensityToDayType de day-type.ts. Eliminada la lógica inline duplicada (low: ×0.88, rest: ×0.7). Campos renombrados a proteinG/carbsG/fatG.' },
          { title: 'getDayType a lib compartida — eliminar duplicado web vs mobile', done: true, note: 'day-type.ts ya existía como lib compartida. NutritionContent tenía `type DayType` local duplicando la def. Fix: eliminado local, importado de day-type.ts. Tests en day-type.test.ts.' },
          { title: 'buildStaticMealPlan: porciones en gramos reales usando Foods de DB', done: true, note: 'describeFood() con weighsFood=true: "Pollo — 200g (240 kcal, 34g prot)". Vegetales: "Brócoli — 80g (27 kcal)". Snacks: "Almendras — 30g (180 kcal, 5g prot)". Separador \\n cuando weighsFood=true. 9 tests nuevos en generate-meal-plan.test.ts.' },
          { title: 'UI: mostrar gramos y macros por porción en NutritionContent', done: true, note: 'Fix: Meal type extendido con items?: MealFoodItem[]. normalizeDay popula items desde formato coach (foodName+grams+macros). UI: si items disponibles → fila por alimento "Arroz · 150g · 220 kcal · P34g · C28g · G4g". Fallback a foods string para planes legacy. Backward-compatible.' },
          { title: 'Atleta ve cuánto le falta para el target del día: número exacto (kcal + macros restantes)', done: true, priority: 'P2', note: 'TrackingSection.tsx: texto "Faltan X{unit}" bajo cada barra cuando val < tgt. Calculado en cliente desde tgt-val, sin query adicional.' },
          { title: 'Nutrición: comidas guardadas (meal templates) — registrar comida habitual en 1 tap', done: true, priority: 'P1', note: 'DB: MealTemplate + MealTemplateItem en schema.prisma, migración aplicada en Neon prod. API: GET/POST /api/nutrition/meal-templates, DELETE /api/nutrition/meal-templates/[id], ídem /api/mobile/*. UI web: sección "Mis comidas" en LogFoodModal (search step) + paso "Guardar como plantilla". UI mobile: ídem en LogFoodModal.tsx con useQuery + mutaciones. worktree at-01-athlete-ux item 9.' },
          { title: 'Nutrición: resumen semanal de adherencia al plan nutricional', done: true, priority: 'P2', note: 'DONE: card en /nutrition page — FoodLog últimos 7 días agrupados por día, kcal loggeada vs targetKcalEasy * 0.9. Texto: "Esta semana cumpliste tu meta X de Y días". Puntos visuales (verde=hit, gris=miss). Color del número: verde ≥70%, ámbar ≥40%, rojo <40%. Solo visible si hay logs de la semana.' },
          { title: 'Nutrición: recetas propias con cálculo automático de macros', done: false, priority: 'P2', note: 'Atleta crea su receta (nombre + ingredientes + porciones) → sistema calcula kcal/proteína/carbs/grasa totales → guarda como un alimento registrable en 1 tap. Reduce fricción de comidas caseras complejas. DB: Recipe { userId, name, ingredients: RecipeIngredient[], totalMacros, isPublic }.' },
          { title: 'Nutrición: módulo de recetas comunitarias — usuarios contribuyen recetas con macros', done: false, priority: 'P3', note: 'Extensión del módulo de recetas propias. El atleta puede marcar su receta como pública → aparece en el catálogo comunitario. Otros atletas la encuentran, la usan y la registran en 1 tap. Crea efecto de red: más usuarios = mejor catálogo. Moderación básica (reportar receta). El sistema sugiere calorías por comida, no alimentos específicos — las recetas comunitarias son la capa que conecta targets con comida real LATAM.' },
          { title: 'Nutrición: pantalla principal — barra de progreso diaria como elemento hero', done: true, priority: 'P1', note: 'TrackingSection.tsx rediseñado: kcal en text-3xl font-black naranja, % color-coded (rojo≥100%/naranja≥80%/gris), barra h-3, botón "+ Registrar" inline en hero. Movida a primer lugar en nutrition/page.tsx (antes de NutritionContent). Mobile: TrackingSection movida al inicio en nutrition.tsx. worktree at-01-athlete-ux item 7.' },
          { title: 'Nutrición: coach propone ajuste nutricional en tiempo real — atleta acepta/rechaza', done: true, priority: 'P1', note: 'DONE. Modelo CoachNutritionProposal + migración 20260712000002. Port ICoachNutritionProposalRepository + infra repo. API coach POST /api/coach/athletes/[id]/nutrition/propose. API atleta GET /api/athlete/nutrition/proposals + PATCH /[id]. UI coach: ProposeModal + botón en FoodLogsSection. UI atleta: CoachNutritionProposalCard (azul) en nutrition/page antes del ajuste del sistema.' },
          { title: 'UX-NUTRICION-01 — NutritionAdjustmentCard muestra delta sin contexto: atleta no sabe por qué cambió su plan', done: true, priority: 'P2', note: 'La card de ajuste nutricional (BUG-038 ya implementó Aceptar/Rechazar) muestra "+15g carbs" pero el atleta no sabe la causa. Fix: leer el campo reason o trigger del PendingNutritionAdjustment (verificar si existe en el modelo — si no, usar el weeklyCheckIn.adjustments relacionado). Mostrar texto contextual: "Tu check-in del lunes indicó esfuerzo alto. Ajustamos tus carbos +15g para la recuperación." Si no hay razón disponible en DB, mostrar causa genérica por trigger (RPE alto → "esfuerzo detectado", peso bajó → "pérdida de peso detectada"). Archivo: src/app/(athlete)/nutrition/_components/NutritionAdjustmentCard.tsx.' },
          { title: 'NUT-BUG-01 — FAT_LOSS sin weightGoalKg: no se aplica deficit calorico en el onboarding', done: true, priority: 'P1', note: 'complete-onboarding.use-case.ts usa hasWeightGoal = !!data.weightGoalKg. Si el atleta selecciona FAT_LOSS pero no ingresa weightGoalKg (campo opcional y oculto para RUNNING), deficit = 0. Fix: (1) onboarding/page.tsx — mostrar weightGoalKg para todos los activityType cuando gymGoal=FAT_LOSS o gymGoal=RECOMPOSITION. (2) complete-onboarding.use-case.ts — hasDeficit = !!data.weightGoalKg || data.gymGoal === "FAT_LOSS" || data.gymGoal === "RECOMPOSITION". Archivos: src/app/onboarding/page.tsx, src/domain/onboarding/complete_onboarding.use_case.ts.' },

          // ── DASHBOARD NUTRICION — alinear /nutrition con diseño Figma (frame 3753:43) ──
          { title: 'NUT-DASH-01 — ActivityCard en /nutrition: sesion del dia visible en pantalla de nutricion', done: true, priority: 'P2', note: 'DONE 2026-07-29. ActivityCard.tsx: badge "Día de entrenamiento", label del SessionType (RODAJE_Z2→Rodaje Z2, FUERZA→Entrenamiento de fuerza, etc), durationMin, kcal estimadas (HIGH 520/MODERATE 360/LOW 200). Visible si todaySession || hasGymSessionToday. Select extendido en page.tsx: intensity+type+durationMin. Archivos: _components/ActivityCard.tsx + nutrition/page.tsx.' },
          { title: 'NUT-DASH-02 — MacroCards hero siempre visibles en /nutrition (4 targets del dia)', done: true, priority: 'P2', note: 'DONE 2026-07-29. MacroTargetCards.tsx: 4 cards (Energía/Proteína/Carbos/Grasas) con color por macro, siempre visibles cuando effectiveNutritionPlan && (todayKcal > 0 || todayProtein > 0). Posicion: entre ActivityCard y TrackingSection. Sin queries adicionales — data ya disponible en page.tsx. Archivo: _components/MacroTargetCards.tsx + nutrition/page.tsx.' },
          { title: 'NUT-DASH-03 — DeficitHero con macro pills: consumido vs restante desglosado por macro', done: true, priority: 'P2', note: 'DONE 2026-07-29. TrackingSection.tsx: 3 macro pills (Proteína/Carbos/Grasas) siempre visibles entre la barra kcal y el botón expandir. Cada pill: bg-gray-50, label, "val/tgt g" en color del macro, barra thin h-1. Usa totals ya disponibles (sin fetch extra). Botón expandir renombrado a "Ver/Ocultar registros" (los macros ya son visibles). Archivo: src/app/(athlete)/nutrition/_components/TrackingSection.tsx.' },
          { title: 'NUT-UI-FIGMA — Alineacion completa de /nutrition con Figma (layout 2 columnas + 8 componentes nuevos)', done: true, priority: 'P1', note: 'DONE 2026-09-05. Layout 2 columnas desktop (main 3/5 + sidebar 2/5) via NutritionPageClient.tsx con slots de server components. Componentes nuevos: DeficitHeroCard (consumido/restante + barra + macro pills + 2 CTAs), NutritionSummaryDonut (donut multi-segmento P/C/G en sidebar), ProximaComidaCard (countdown siguiente comida), PendingMealsBanner (comidas pendientes), EmptyMealPlanCard (ilustracion + 3 feature pills + CTAs), CoachNutritionBanner (info coach + CTAs B2B), ConsumedModal (bottom sheet lista alimentos + eliminar), MealListInline (checklist comidas mobile). Mobile: single column con todos los componentes inline. 3 estados: sin-plan, con-plan, b2b. Visual gaps Figma-to-code (5 fixes): MacroTargetCards border-left coloreado, ActivityCard en sidebar para sin-plan, B2B plan banner dorado separado de CoachNutritionBanner, DeficitHeroCard nota kcal actividad, Donut legend formato "g · %". UPDATE 2026-09-07: Verificacion exhaustiva Figma tokens mobile (frames sin-plan 4523:550, con-plan 4523:633, b2b 4523:753) vs codigo — 20+ ajustes en 8 componentes: header movido fuera del wrapper (patron dashboard/plan), CalorieDonutHero gaps responsivos, ActivityCard rediseñado (icon+pill), MealListInline padding/fonts, ProximaComidaCard badge+icon, TipCard compacto, WeeklyNutritionBars labels 9px. Desktop layout verificado sin breakage. MOBILE APP: mismos tokens aplicados a nutrition.tsx + NutritionProgressCard + NutritionBanner — header pb:22 px:20 mt:12, donut card p:16 gap:20 macros gap:12 mt:10 miniRing 40x40 stroke:4, HydrationSection rediseñada a compact 1-row (rounded:14 border:#f0f0f0), MealList header split (title+count naranja), TrackingSection padding compacto, ActivityCard rediseñado icon+pill, WeeklySummary tokens reducidos, tip card #fffaf0/#735926, PlannedMeals/Supplements/Rules/Proposals headers alineados (px:14 pt:10 pb:6 fs:9). FIX desktop sidebar overflow: grid-cols-[1fr_320px] → grid-cols-[minmax(0,1fr)_320px] — 1fr defaulteaba a minmax(auto,1fr) forzando la columna izquierda a su min-content width y empujando el sidebar fuera del viewport. FIX mobile component order: reordenado NutritionPageClient mobile section para coincidir con Figma frame-by-frame — sin-plan: Donut→Hydration→Activity→Empty→Tip→Weekly; con-plan: Activity→Donut→Hydration→Meals→Proxima→Weekly→Tip; b2b: CoachBanner→Proposal→Donut→Hydration→Activity→Meals→Proxima→Tip→Weekly. Cambios: ActivityCard condicional (con-plan antes del donut, sin-plan/b2b después de hydration), CoachBanner movido al inicio para b2b, Tip/Weekly order condicional por estado. CoachCTA ("Mensaje al coach") implementado: Link a /mensajes, rounded-full border, 📩 icon, solo b2b mobile entre Tip y Weekly.' },
          { title: 'NUT-MOB-FIGMA — Mobile RN nutrition screen aligned to Figma (5 new components + API + render order)', done: true, priority: 'P1', note: 'DONE 2026-09-09. API /api/mobile/nutrition/today: added isB2B, coachName, planName, mealChecklist, nextMeal, tip to response. coach.name included in assignedNutritionPlan query. mealChecklist computed server-side from effectiveMealPlan (assigned or static). nextMeal = first unlogged meal. tip = deterministic by dayType. RN components (inline in nutrition.tsx): TipCard, ProximaComidaCard, CoachBanner, CoachCTA, MealChecklistInline. Render order refactored per Figma: sin-plan shows Donut(0/0)+Hydration+Activity+EmptyState+Tip+Weekly (was only EmptyState). con-plan: Adjustment→Activity→Donut→Hydration→MealChecklist→NextMeal→Weekly→Tip. b2b: CoachBanner→Adjustment→Donut→Hydration→Activity→MealChecklist→NextMeal→Tip→CoachCTA→Weekly. Fix: templateDayToMeals uses MEAL_TYPE_LABELS[m.mealType] instead of m.label (NutritionTemplateMeal has mealType enum, not label field).' },
          { title: 'NUT-MOB-FIGMA-02 — Mobile nutrition: 10 fixes para alineacion pixel-perfect con Figma', done: true, priority: 'P1', note: 'DONE 2026-09-14. 10 fixes: (1) ConsumedSheet — bottom sheet modal (Figma 4523:1764) con handle bar, totales macro dots, lista agrupada por DESAYUNO/ALMUERZO/MERIENDA, boton x eliminar, footer "+ Agregar comida". TrackingSection rediseñado como card con 2 CTAs "Ver lo que consumi" + "+ Registrar comida". (2) Hydration buttons -250/+250/+500/+1L. (3) Header B2B badge "Coach asigna". (4) Sin-plan donut label "OBJETIVO DIARIO". (5) Sin-plan CTA "Pedir a mi coach que lo configure". (6) B2B checklist header "Plan de comidas · Coach". (7) WeeklySummarySection con barras diarias L-D coloreadas. (8) Floating CTA bar con-plan "Editar menu" + "Aplicar semana". (9) LogFoodModal meal type tabs + dots paginacion en step search (Figma 4523:1858). (10) paddingBottom dinamico.' },
          { title: 'NUT-DASH-04 — MealCards compactas: sugerencias del dia con CTA "Ver plan completo"', done: true, priority: 'P2', note: 'DONE 2026-07-29. MealSummaryCards.tsx: muestra hasta 3 comidas de HOY agrupadas por mealType (MEAL_ORDER: BREAKFAST/PRE_WORKOUT/LUNCH/SNACK/DINNER/POST_WORKOUT). Cada card: nombre mealType, lista de alimentos con gramos, kcal calculadas. CTA "Ver plan completo (N comidas) →" a /nutrition/planner. Aparece cuando todayPlannedMeals.length > 0 en el estado (c) del NUT-FLOW-01. plannedMealsThisWeek query extendida para incluir mealType+grams+date+food.name+food.kcalPer100g. Archivos: _components/MealSummaryCards.tsx + nutrition/page.tsx.' },
          { title: 'NUT-WATER-01 — WaterLog tracking web: endpoint POST + widget con botones +250ml/+500ml/+1L', done: true, priority: 'P2', note: 'DONE web 2026-07-29. GET /api/nutrition/water + POST { delta } → upsert Math.max(0, existing + delta). HydrationWidget.tsx: update optimista, 3 botones, barra azul, badge meta. PENDIENTE mobile: /api/mobile/nutrition/water + widget mobile equivalente (ver NUT-WATER-02 o agregar como tarea mobile separada). Archivos: src/app/api/nutrition/water/route.ts + _components/HydrationWidget.tsx.' },
          { title: 'NUT-DASH-05 — NutritionSummaryCard: donut distribucion de macros P/C/G del dia', done: true, priority: 'P3', note: 'DONE 2026-07-29. MacroDonut SVG inline en TrackingSection.tsx (sin libreria externa). 3 segmentos con stroke-dasharray + rotacion acumulada: Proteina azul (proteinG*4), Carbos amarillo (carbsG*4), Grasas verde (fatG*9). Kcal totales al centro. Solo visible cuando totals > 0 y hay target. Archivo: src/app/(athlete)/nutrition/_components/TrackingSection.tsx.' },
          { title: 'NUT-DASH-06 — TipCard contextual: consejo del dia segun tipo de sesion', done: true, priority: 'P3', note: 'El diseno Figma muestra una card pequena "CONSEJO DEL DIA" con icono emoji + titulo + texto corto. El consejo debe ser contextual: Dia duro → "Carbos antes del gym — Consume avena o arroz 60 min antes. Maximo rendimiento." | Dia facil → "Proteina post-sesion — 30g en los 30 min post-entreno para recuperacion." | Descanso → "Hidratacion activa — Mantente en 2L incluso sin entrenar. Facilita recuperacion muscular." Implementar: array de tips por dayType en utils/nutrition-tips.ts + TipCard.tsx. Sin DB — determinista por todayDayType. Archivo: src/app/(athlete)/nutrition/_components/TipCard.tsx.' },
          { title: 'NUT-PLANNED-01 — PlannedMeal web: endpoints + UI atleta planifica su semana', done: true, priority: 'P2', note: 'DONE 2026-07-29. POST /api/athlete/nutrition/planned-meals/log-today: convierte todos los PlannedMeals de HOY en FoodLogs (1 tap, idempotente via skipDuplicates). LogTodayButton.tsx: client component con estado idle/loading/done, router.refresh() post-success. MealSummaryCards.tsx: agrupa hasta 3 tipos de comida del dia, total kcal, CTA LogTodayButton + "Ver plan completo (N) →". Mobile: POST /api/mobile/nutrition/planned-meals/log-today con getMobileUser + requireFeature(nutrition). Archivos: src/app/api/athlete/nutrition/planned-meals/log-today/route.ts + _components/LogTodayButton.tsx + _components/MealSummaryCards.tsx + api/mobile/nutrition/planned-meals/log-today/route.ts.' },

          // -- Flujo Constructores Nutricion -- propuesta Figma aprobada 2026-07-29
          { title: 'NUT-TMPL-01 -- Constructor A (NutritionTemplate): embeber en layout con sidebar en lugar de full-screen overlay', done: true, priority: 'P1', note: 'DONE 2026-07-29. Eliminado fixed inset-0 z-50 -> min-h-screen. Header sticky top-14 lg:top-0 (respeta mobile topbar + desktop sidebar). Layout two-column: main flex-1 + sidebar w-64 sticky. Panel derecho: targets HARD/EASY/REST desde NutritionPlan (targetKcalHard/Easy/Rest, proteinG, carbsHardG/EasyG, fatG) + barras de progreso actual vs objetivo por macro. NutritionPlan cargado en paralelo en page.tsx. Bug fix colateral: FoodSearchModal usaba data.foods, corregido a Array.isArray(data). Archivos: AthleteNutritionBuilderClient.tsx + builder/[id]/page.tsx.' },
          { title: 'NUT-TMPL-02 -- Constructor A: exponer PRE_WORKOUT y POST_WORKOUT como tipos de comida seleccionables en UI', done: true, priority: 'P2', note: 'DONE — ya implementado. MEAL_LABELS y MEAL_ORDER en AthleteNutritionBuilderClient.tsx y NutritionBuilderClient.tsx (coach) ya incluyen PRE_WORKOUT "⚡ Pre-entreno" y POST_WORKOUT "💪 Post-entreno". availableMealTypes = MEAL_ORDER.filter(!usedMealTypes) los expone correctamente. No requirió cambio de código.' },
          { title: 'NUT-TMPL-03 -- Constructor A -> Constructor B: navegar a /nutrition/planner al aplicar semana en lugar de abrir modal', done: true, priority: 'P1', note: 'DONE 2026-07-29. Eliminado ApplyWeekModal. "Aplicar semana" navega a /nutrition/planner?week=YYYY-MM-DD&templateId=[id]. Constructor B (PlannedMealPlannerClient) detecta templateId y muestra ApplyTemplatePanel inline: 7 filas HARD/EASY/REST (default desde weekIntensities del TrainingPlan), boton "Aplicar plantilla" -> POST /api/athlete/nutrition/templates/[id]/apply -> router.push sin templateId para recargar datos del servidor. Archivos: AthleteNutritionBuilderClient.tsx + PlannedMealPlannerClient.tsx + planner/page.tsx.' },
          { title: 'NUT-PLAN-01 -- Constructor B: crear ruta /nutrition/planner con PlannedMealPlannerClient', done: true, priority: 'P1', note: 'DONE 2026-07-29. Server component en /nutrition/planner: auth + redirect B2B, carga PlannedMeal semana + NutritionPlan + intensidades TrainingPlan en paralelo. Pasa a PlannedMealPlannerClient. Archivos: src/app/(athlete)/nutrition/planner/page.tsx + _components/PlannedMealPlannerClient.tsx.' },
          { title: 'NUT-PLAN-02 -- CRUD individual de PlannedMeal para atleta B2C (Constructor B)', done: true, priority: 'P1', note: 'DONE 2026-07-29. DELETE + PATCH /api/athlete/nutrition/planned-meals/[id] con ownership userId. POST /api/athlete/planned-meals en ruta separada. 10 tests pasando. Archivos: src/app/api/athlete/nutrition/planned-meals/[id]/route.ts + route.test.ts.' },
          { title: 'NUT-PLAN-03 -- Constructor B: food search inline + gram input editable por PlannedMeal', done: true, priority: 'P1', note: 'DONE 2026-07-29. PlannedMealPlannerClient: FoodSearchModal con debounce 300ms + FoodLog macro preview, GramInput editable inline (PATCH al blur, skip si sin cambio, revert en error), boton X DELETE hover-reveal, sidebar semanal con macros totales vs objetivo por intensidad, "Guardar y volver" a /nutrition. Archivos: PlannedMealPlannerClient.tsx.' },
          { title: 'NUT-FLOW-01 -- /nutrition page: CTA dinamico segun estado del atleta (sin template / con template / con plan semanal)', done: true, priority: 'P2', note: 'DONE 2026-07-29. Queries agregadas: nutritionTemplate.findFirst + plannedMeal.findMany(Lun-Dom). 3 estados B2C sin coach: (a) !athleteTemplate -> navy "Crear plantilla" -> /nutrition/builder, (b) athleteTemplate && !hasPlannedMealsThisWeek -> orange "Planificar semana" -> /nutrition/builder/[id] (nombre de plantilla en subtext), (c) hasPlannedMealsThisWeek -> green "Ver plan" + conteo de comidas -> /nutrition/planner. B2B (assignedNutritionPlan) no ve estos CTAs. Archivo: nutrition/page.tsx.' },
          { title: 'NUT-CLEAN-01 -- Deprecar FoodSetupFlow.tsx (modal legacy 2 pasos) reemplazado por Constructor A', done: true, priority: 'P2', note: 'DONE 2026-07-29. Eliminado FoodSetupFlow.tsx (397 líneas) + /api/nutrition/generate-meals/route.ts. Última referencia (invalid mealPlan case) reemplazada por Link simple a /nutrition/builder. Removidos import, hasFoodProfile variable, foodProfile de Promise.all + foodProfile DB query. TS sin errores en src/. Archivos eliminados: _components/FoodSetupFlow.tsx + src/app/api/nutrition/generate-meals/route.ts.' },
        ],
      },
      {
        id: 'atleta-avanzado',
        label: 'Tracking Avanzado & Tracker Libre',
        period: 'Próximo',
        items: [
          { title: 'Medidas corporales en check-in (cintura, brazos, caderas, piernas)', done: true, priority: 'P1', note: 'UI mobile completa: sección colapsable "Medidas corporales" en checkin.tsx con 4 TextInputs (cintura/brazos/caderas/muslos). Payload enviado en handleSubmit. CheckinPayload tipado con waistCm/armsCm/hipsCm/thighsCm opcionales. worktree at-01-athlete-ux item 4.' },
          { title: 'Gráficas de circunferencias en /progress (web + mobile)', done: true, priority: 'P2', note: 'Completo. Web: ya estaba. Mobile: measurementPoints[] tipado en src/api/progress.ts. UI en progress.tsx — sección "Circunferencias" con 4 filas (cintura/brazos/cadera/muslos), valor actual, delta desde inicio, historial de puntos por semana. Colores: naranja/azul/violeta/verde.' },
          { title: 'Fotos de progreso semanales (Vercel Blob)', done: false, note: 'Modelo ProgressPhoto { userId, url, takenAt }. POST /api/progress/photos (multipart). Comparador side-by-side en /progress.' },
          { title: 'Log libre sin plan — sessionId opcional en /api/log/session y /api/mobile/log/session', done: true, note: 'Implementado: /api/mobile/log/session maneja !sessionId → freeSessionType. /api/log/run con plannedSessionId: null. /api/log/session con plannedSessionId opcional.' },
          { title: 'UI mobile: pantalla de log libre sin sessionId (selector tipo + RPE + duración + notas)', done: true, note: 'log.tsx soporta isFreeMode (cuando !sessionId): selector de 3 tipos (Correr/Fuerza/Otro), RPE, duración, distancia, FC, notas. Accesible desde dashboard.' },
          { title: 'Gym tracker libre sin AssignedWorkout ni TrainingPlan', done: true, note: 'GET /api/gym/session/today devuelve freeSession:true cuando no hay template/plan FUERZA. POST /api/gym/session/complete: tercera ruta libre (sin assignedWorkoutId/plannedSessionId), workoutExerciseId opcional. UI gym/session/page.tsx: input de nombre de ejercicio + logger de series, canFinish/handleComplete adaptados.' },
          { title: 'Dashboard sin plan: mostrar logs reales de la semana (web + mobile)', done: true, note: 'Fix: dashboard query enriquecida con freeSessionType (SessionLog) + assignedWorkout.template.name (GymSession). weekActivities[] con {dateStr, label, emoji} pasado a DailySessionCard. FREE/RECOVERY mode: "Lo que hiciste esta semana" lista los días con actividad.' },
          { title: 'Historial unificado: plan + libre juntos en /progress cronológico', done: true, note: 'progress/page.tsx: queries paralelas SessionLog + GymSession (últimas 30 c/u) → HistoryItem[] fusionado y ordenado por fecha desc. ProgressClient.tsx: sección "Historial de actividad" con emoji run/gym, label, duración, distancia, RPE.' },
          { title: 'Comparativa sesión actual vs anterior: Δ distancia, Δ ritmo, Δ RPE en pantalla de log', done: true, priority: 'P2', note: 'GET /api/log/last-session?type= devuelve la última sesión libre del mismo tipo. LogRunPage: useEffect por runType → fetch prev → card azul "Última vez — {fecha}" con duración/distancia/RPE previos. Ayuda al atleta a ver progreso sin queries extra.' },
          { title: 'GAP-02 — sessionMinutes no afecta TDEE: mismo multiplicador para 30 min/sesión que para 90 min/sesión', done: true, priority: 'P3', note: 'DONE: calculateTDEE() acepta sessionMinutes? opcional. Con sessionMinutes calcula weeklyMinutes=daysPerWeek×sessionMinutes y mapea a factor: <120→1.375, 120-300→1.55, 300-600→1.725, >600→1.9. Sin sessionMinutes mantiene comportamiento anterior. AthleteHealthProfile extendido con sessionMinutes+daysPerWeek. process-check-in los usa en recálculo de TDEE. 6 tests nuevos.' },
          { title: 'Carga de entrenamiento acumulada: TSS semanal y tendencia ATL/CTL (forma física estimada)', done: false, priority: 'P3', note: 'TSS = (durationH × avgHR/hrMax)² × 100. ATL = promedio 7d, CTL = promedio 42d. Gráfica en /progress. Requiere hrMax y FC registrada en SessionLog.' },
          { title: 'Proyección al objetivo: "A este ritmo llegas a tu meta el DD/MM"', done: false, priority: 'P3', note: 'Basado en adherencia últimas 4 semanas y TrainingPlan.totalWeeks. Cálculo lineal. Si adherencia < 70% → proyección en rojo con sugerencia de ajuste.' },
          { title: 'Editar sesión ya registrada (edit post-log): corregir RPE, distancia o notas después de guardar', done: true, priority: 'P2', note: 'EditRunButton.tsx (client island) embebido en cada RunCard del historial. Muestra "✏️ Editar" footer → inline form (duración, distancia, RPE grid 1-10, notas) → PATCH /api/log/session/[logId] → router.refresh(). src/app/(athlete)/log/history/_components/EditRunButton.tsx.' },
          { title: 'Editar perfil de salud desde mobile (peso, talla, FC reposo, lesiones)', done: true, priority: 'P1', note: 'Nuevo endpoint GET/PATCH /api/mobile/profile/route.ts con getMobileUser + estimateHRMax automático. Pantalla edit-health-profile.tsx con KeyboardAvoidingView + ScrollView: 6 campos editables (peso actual/meta/altura/FC reposo/FC máx/sueño). Acceso desde Profile tab → "Datos físicos" → "Perfil de salud" (solo ATHLETE). worktree at-01-athlete-ux item 5.' },
          { title: '/pending mejorado: progreso visual + CTA log libre + notificación al coach a 48h', done: true, priority: 'P1', note: 'pending/page.tsx rediseñado: stepper 3 pasos (CheckCircle2/Clock, línea conectora), badge "Llevas N días esperando", CTAs "Mientras tanto" — log libre + nutrición + mensaje al coach (condicional si coachId). Middleware actualizado: /log y /nutrition bypasean redirect a /pending para B2B no activados. worktree at-01-athlete-ux item 3.' },
          { title: 'Check-in: pantalla de resultado post-envío con ajustes aplicados', done: true, priority: 'P1', note: 'Web: triggers[] en respuesta API + CheckInResultScreen.tsx (componente inline en CheckInClient.tsx) muestra triggers detectados + ajustes aplicados + recomendación. Mobile: triggers[] en /api/mobile/checkin + CheckinResult type + resultado inline en checkin.tsx ("Lo que detectamos" / "Lo que ajustamos"). Cierra el loop atleta→sistema. worktree at-01-athlete-ux item 2.' },
          { title: 'Recompensas Capa 1 — Racha de entrenamiento en dashboard', done: true, priority: 'P2', note: 'DONE: streakDays ya computado en getDashboardSummary (merge SessionLog + GymSession). Web: badge "🔥 N días · racha activa" en dashboard header. Mobile: badge "🔥 N días · racha" en hero. buildWeeklySummary lo menciona si streakDays ≥4. Pendiente: push notification al romper racha.' },
          { title: 'Recompensas Capa 2 — Hitos de consistencia compartibles', done: true, priority: 'P2', note: 'DONE (núcleo): ShareMilestoneButton.tsx (PR/STREAK/PERFECT_WEEK) + StreakShareButton.tsx wired en dashboard. Racha ≥7 días muestra botón compartir. Pendiente P3: DB UserAchievement tracking automático (milestones: 10 check-ins, 50 sesiones, plan completado) + perfect week detection en web.' },
          { title: 'Recompensas Capa 3 — PR gym con celebración prominente (web + mobile)', done: true, priority: 'P2', note: 'DONE: PRModal mejorado en gym-session.tsx — spring scale-in animation (Animated), trophy bounce, confetti emoji row, Share.share() → "Compartir 📤" + "¡Genial! 🎉". Reemplaza modal estático anterior. haptic en onMount.' },
        ],
      },
      {
        id: 'atleta-dailylog',
        label: 'DailyLog — Canal de datos diario (peso, sueño, energía)',
        period: 'P1 — Mobile endpoint primero',
        items: [
          {
            title: 'DAILY-01 — Mobile endpoint: POST /api/mobile/metrics/log',
            done: true,
            priority: 'P1',
            note: 'DONE: GET+POST /api/mobile/metrics/log — getMobileUser + rate limit. POST: upsert DailyLog(userId_date) con weightKg/energyLevel/hrResting/sleepHours/notes. Zod DailyLogSchema.',
          },
          {
            title: 'DAILY-02 — Dashboard: mostrar peso y energía de hoy desde DailyLog',
            done: true,
            priority: 'P1',
            note: 'DONE: todayLog query en dashboard route Promise.all. TodayLogCard en dashboard.tsx mobile — colapsado si ya loggeado (badge verde + valores), expandido si no. TextInput peso + grid 1-5 energía + Guardar → POST /api/mobile/metrics/log. DashboardData.todayLog tipado.',
          },
          {
            title: 'DAILY-03 — /progress: usar DailyLog como fuente de curva de peso histórica',
            done: true,
            priority: 'P2',
            note: 'DONE: query dailyLog últimos 90 días en progress/page.tsx (where: weightKg not null). DailyWeightChart SVG con área + puntos + eje fechas. SectionCard "Peso Diario — últimos 90 días" con TrendBadge y línea de meta. Aparece solo si hay ≥2 registros.',
          },
          {
            title: 'DAILY-04 — Panel coach: mostrar últimos 7 días de DailyLog del atleta',
            done: true,
            priority: 'P2',
            note: 'DONE: GET /api/coach/athletes/[id]/dailylogs — verifica coachRelation, devuelve últimos 7 días de DailyLog (peso, energía, FC, sueño). AthleteDetailClient: dailyLogs state + useEffect lazy en tab Resumen. Tabla con badge semafórico de energía (verde ≥4 / amarillo 3 / rojo <3).',
          },
          {
            title: 'DAILY-BUG-01 — Perfil: boton Registrar no cambia a Editar cuando ya hay log del dia',
            done: true,
            priority: 'P2',
            note: 'ProfileClient.tsx: todayLog se computa correctamente pero el texto del boton esta hardcodeado a "Registrar" y el form no pre-rellena los valores existentes. Fix: (1) texto dinamico: todayLog ? "Editar registro de hoy" : "Registrar". (2) pre-rellenar weightKg/energyLevel/hrResting/sleepHours/notes desde todayLog si existe. El upsert del endpoint ya maneja actualización. Archivo: src/app/(athlete)/profile/_components/ProfileClient.tsx.',
          },
        ],
      },
      {
        id: 'checkin-sugerencias',
        label: 'Check-in — Sugerencias Interactivas (no-destructivo)',
        period: 'P1-P2 — Después de CI-DB-01 (CheckInSuggestion model)',
        items: [
          {
            title: 'CI-B-01 — Refactor processCheckIn: genera CheckInSuggestion en lugar de auto-aplicar ajustes',
            done: true,
            priority: 'P1',
            note: 'Implementado. Plans COACH → generateSuggestions() → PrismaSuggestionRepository.createMany() dentro del $transaction. applySessionAdjustments() exportada. generate-suggestions.ts en domain/checkin. Schema: SuggestionStatus/SuggestionType enums + CheckInSuggestion model. DB aplicada via prisma db push (2026-07-09). Tests: process-check-in.use-case.test.ts + generate-suggestions.test.ts — todos ✅.',
          },
          {
            title: 'CI-B-02 — POST /api/checkin/suggestions/[id]/accept + /reject',
            done: true,
            priority: 'P1',
            note: 'Implementado. Web: /api/checkin/suggestions/[id]/accept + reject (auth()). Mobile: /api/mobile/checkin/suggestions/[id]/accept + reject (getMobileUser + rate limit). Accept aplica payload via applySessionAdjustments() en $transaction. Ownership check en ambos. Mobile badge en checkin.tsx: cards con Aceptar/Rechazar por sugerencia.',
          },
          {
            title: 'CI-B-03 — Reglas de evaluación para gym en evaluateCheckInRules()',
            done: true,
            priority: 'P1',
            note: 'DONE: evaluate-rules.ts — nuevo trigger gym_sobrecarga: context.hasGymPlan && rpe >= 8 (cualquier fase). Se excluye rpe_excesivo cuando hasGymPlan=true. CheckInContext extendido con hasGymPlan, sport, consecutiveLowEnergyWeeks. process-check-in.use-case.ts deriva hasGymPlan=!!assignedWorkout, sport, y countConsecutiveLowEnergy() desde los últimos 4 check-ins.',
          },
          {
            title: 'CI-B-04 — Reglas de evaluación para nutrición en evaluateCheckInRules()',
            done: true,
            priority: 'P2',
            note: 'DONE: evaluate-rules.ts — nuevo trigger nutricion_deficit_critico cuando nutritionAdherence <= 2 AND energyLevel <= 3 → severity critical. La regla general nutricion_baja (< 4) solo dispara si no se detectó nutricion_deficit_critico.',
          },
          {
            title: 'CI-B-05 — CheckInContext: extender con contexto multi-deporte',
            done: true,
            priority: 'P2',
            note: 'DONE: evaluate-rules.ts CheckInContext + check-in.types.ts PlanContext extendidos con sport?, hasGymPlan?, consecutiveLowEnergyWeeks?. process-check-in.use-case.ts los deriva en Phase 1 (recentCheckIns en paralelo) y Phase 2 (countConsecutiveLowEnergy). SuggestionGenerationContext dejó de duplicar consecutiveLowEnergyWeeks.',
          },
          {
            title: 'CI-B-06 — Cron: expirar CheckInSuggestion PENDING después de 7 días',
            done: true,
            priority: 'P2',
            note: 'Implementado. GET /api/cron/expire-suggestions (Bearer CRON_SECRET). PrismaSuggestionRepository.expireOld() → updateMany status=PENDING AND expiresAt < now() → EXPIRED. Registrado en vercel.json: schedule "0 3 * * *".',
          },
          {
            title: 'CI-B-07 — GET /api/checkin: incluir sugerencias pendientes en la respuesta',
            done: true,
            priority: 'P1',
            note: 'DONE: GET /api/checkin y GET /api/mobile/checkin ahora retornan pendingSuggestions[] (tipo, título, descripción, expiresAt). POST /api/checkin y POST /api/mobile/checkin retornan suggestions[] creadas en esa transacción (si pendingSuggestions > 0). Query con status=PENDING AND expiresAt > now().',
          },
          {
            title: 'CI-F-01 — UI interactiva: tarjeta por sugerencia con Aceptar/Rechazar en CheckInResultScreen',
            done: true,
            priority: 'P1',
            note: 'DONE: CheckInResultScreen.tsx convertido a client component con useState. Recibe suggestions prop desde CheckInClient. Cada sugerencia muestra card azul con título, descripción, botones Aceptar/Rechazar. Llaman a /api/checkin/suggestions/[id]/accept|reject via fetch. Estado responded[] oculta la card tras la respuesta.',
          },
          {
            title: 'CI-F-02 — Sección de sugerencias pendientes en dashboard (si hay PENDING de la semana)',
            done: true,
            priority: 'P2',
            note: 'DONE: dashboard/page.tsx — pendingSuggestionsCount via prisma.checkInSuggestion.count(). Banner azul en la parte superior del dashboard con count + link a /checkin. Condicional: solo se muestra si count > 0.',
          },
          {
            title: 'CI-F-03 — Secciones gym + nutrición en formulario de check-in',
            done: true,
            priority: 'P2',
            note: 'DONE: CheckInClient.tsx recibe hasGym prop desde page.tsx (session.user.features?.gym). Cuando hasGym=true → slider "RPE sesión de gym" visible en la sección de métricas. El RPE gym se combina con el RPE de running (Math.max) para el campo hardestRpe enviado al backend.',
          },
          {
            title: 'CI-F-04 — Mobile: UI interactiva de sugerencias en checkin.tsx',
            done: true,
            priority: 'P2',
            note: 'DONE: CI-B-07 retorna suggestions[] en POST /api/mobile/checkin. La UI mobile en checkin.tsx (implementada en sesión anterior) ya consume suggestions del resultado. La API mobile ahora también retorna pendingSuggestions en GET.',
          },
          {
            title: 'CI-F-05 — Check-in result: mostrar cambios aplicados al plan con valores exactos (zonas, volumen, nutrición)',
            done: true,
            priority: 'P1',
            note: 'ProcessCheckInResult extendido con planChanges.volumeDeltaPct y nutritionChanges.{newKcalHard, newKcalEasy}. syncWeight() ahora retorna kcal calculadas. CheckInResultScreen muestra sección Valores aplicados con delta % y kcal. Mobile checkin.tsx idem. Web y mobile en sync.',
          },
          {
            title: 'CI-B-08 — Check-in enriquecido: reglas objetivas desde datos reales de entrenamiento',
            done: true,
            priority: 'P1',
            note: 'DONE: 4 reglas objetivas en evaluateCheckInRules() usando WeekActivitySummary (SessionLog+GymSession). OBJ-01 sin_descanso (≥5 días consecutivos). OBJ-02 rpe_discrepancia (avgRpe≥8 vs reportado≤5). OBJ-03 pico_volumen (minutos semanales ≥150% promedio 4 semanas). OBJ-04 sesion_muy_intensa (maxRpe≥9, excluyente con rpe_excesivo). Port getWeekActivitySummary en ICheckInRepository + impl Prisma. Conectado en Phase 1 de processCheckIn(). generateSuggestions() extendido. buildSessionAdjustments incluye pico_volumen y sin_descanso como volume triggers. 80 tests evaluate_rules + 131 total checkin domain.',
          },
          {
            title: 'CI-F-06 — Recuperación por grupo muscular en check-in (web + mobile)',
            done: false,
            priority: 'P2',
            note: 'Agregar inputs opcionales de recuperación muscular al check-in: legsRecovery, backRecovery, pushRecovery, pullRecovery (escala 1-5, sin auto-ajuste). Dato visible para el atleta y para el coach en su panel. Requiere: (1) migración DB — 4 campos Int? en WeeklyCheckIn; (2) API web /api/checkin + API mobile /api/mobile/checkin — recibir y guardar los 4 campos; (3) UI web — sección colapsable en CheckInClient.tsx; (4) UI mobile — sección adicional en checkin.tsx; (5) panel coach — mostrar en resumen del atleta. Sin automatización: solo es dato de contexto. Validar con coaches antes de implementar si realmente lo leerían. Fuente: análisis competitivo MyFitCoach 2026-08-05.',
          },
        ],
      },
      // ── B2C PRO — GENERADOR DE PLAN & CONSOLIDACIÓN ──────────────────────────
      {
        id: 'b2c-pro-plan',
        label: 'B2C Pro — Generador de TrainingPlan & Dashboard Consolidado',
        period: 'Próximo — ejecutar en orden 1→2→3→4',
        items: [
          {
            title: 'B2C-01 — Fix GAP-01: activityToSportGoal() preserva MUSCLE_GAIN/FAT_LOSS — desbloqueante para generador de plan',
            done: true,
            priority: 'P1',
            note: 'DONE. activityToSportGoal() ahora recibe gymGoal+runningGoal reales. MUSCLE_GAIN→STRENGTH_TRAINING, FAT_LOSS/RECOMPOSITION→BODY_RECOMPOSITION, RACE_5K/10K conservados. sportGoal en HealthProfile ya distingue estrategia de volumen vs déficit. 0 errores TS.',
          },
          {
            title: 'B2C-02 — Builder hub: autogestión de rutinas desde dashboard y sidebar (gym/builder + nutrition/builder). GeneratePlanCard y /api/plan/generate eliminados — modelo correcto: atletas crean sus propias rutinas',
            done: true,
            priority: 'P1',
            note: 'Paso 2 del plan. El B2C Pro puede generar un TrainingPlan estructurado sin necesidad de coach ni IA. Flujo: wizard simplificado (objetivo + duración semanas + daysPerWeek + sessionMinutes + experienceLevel → ya disponibles en HealthProfile) → selección de template por goalType + semanas → TrainingPlan creado con PlanWeek + PlannedSession. Templates a parametrizar: STRENGTH_TRAINING (MUSCLE_GAIN/FAT_LOSS/RECOMPOSITION), GENERAL_FITNESS (RUNNING). Con TrainingPlan activo el check-in tiene algo sobre qué operar → sistema se siente vivo para B2C Pro. La IA después personaliza sobre esta base sin cambio de arquitectura. Rutas: GET /api/plan/templates (listado), POST /api/plan/generate (crea plan desde template). UI: /new-plan wizard o CTA desde dashboard vacío.',
          },
          {
            title: 'B2C-03 — Constructor de nutrición consolidado: pasar de macros calculados a comidas reales con contexto del plan',
            done: true,
            priority: 'P1',
            note: 'Paso 3 del plan. Hoy NutritionPlan = solo TDEE + macros (números). El constructor B2C (NUT-F-01 a NUT-F-05 en nutricion-atleta-autonomo) ya tiene la base. Consolidar: (1) NUT-B-06 (resumen día planificado vs realizado), (2) NUT-F-02 (vista semanal menú), (3) NUT-F-03 (gráfica adherencia 7 días), (4) NUT-F-04 (desglose por comida). Si tiene TrainingPlan activo → intensidad del día (HARD/EASY/REST) alimenta automáticamente el tipo de día en la plantilla de nutrición → loop de personalización sin IA.',
          },
          {
            title: 'B2C-04 — Dashboard adaptativo: FREE mode con FreeDashboard + BuilderHubCard. Coach discovery banner. Sidebar Buscar coach vs Mensajes segun hasCoach',
            done: true,
            priority: 'P1',
            note: 'Paso 4 del plan. El dashboard hoy es estático — muestra el mismo layout para todos los estados. Consolidar en 4 modos contextuales: (1) B2C Free → tracking básico + CTA upgrade destacado. (2) B2C Pro sin TrainingPlan → CTA "Generar tu plan" prominente (→ B2C-02). (3) B2C Pro con plan activo → plan de la semana + check-in + métricas + nutrición contextual. (4) B2B activado → plan del coach + check-in + comunicación coach. La lógica de selección ya existe parcialmente en FreeDashboard.tsx — unificar en un switch por contexto en dashboard/page.tsx. Cierra el loop: B2C Free → upgrade → plan → check-in → ajuste automático → progreso visible.',
          },
        ],
      },
    ],
  },

  // ─── COACH ───────────────────────────────────────────────────────────────────

  {
    id: 'coach',
    label: 'Coach',
    color: '#1e3a5f',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    phases: [
      {
        id: 'coach-core',
        label: 'Core — Panel, Atletas, Mensajería & Finanzas',
        period: 'Completado',
        items: [
          { title: 'Dashboard coach: KPIs de negocio (ingresos, atletas activos, adherencia, distribución deporte)', done: true, note: '/coach/dashboard = métricas CEO. /coach/athletes = lista operacional.' },
          { title: 'Panel atleta: tabs Resumen, Plan, Progreso, Nutrición, Gym, Benchmarks (datos reales de DB)', done: true, note: 'Promise.all: HealthProfile, TrainingPlan+weeks+sessions, CheckIns×8, NutritionPlan. Verificación coach-atleta.' },
          { title: 'Coach activa features del atleta (PATCH /api/coach/athletes/[id]/config)', done: true, note: 'features: { plan, checkin, nutrition, progress, log, gym } = true. Atleta siempre empieza con features=false.' },
          { title: 'Feed de alertas en dashboard (sin check-in >7d, RPE ≥8, pérdida peso >750g/semana)', done: true, note: 'Lista con link directo al atleta.' },
          { title: 'Editor de sesión inline en Tab Plan (tipo, duración, zona, descripción)', done: true, note: 'API PATCH /api/coach/sessions/[id]. intensity recalculada al cambiar el tipo.' },
          { title: 'Log de ajustes automáticos en Tab Resumen (semana, fecha, triggers aplicados)', done: true, note: 'Columna RPE y Ajustes en tabla check-ins.' },
          { title: 'Tab Plan coach: carga semanal (HIGH=3, MODERATE=2, LOW=1, REST=0)', done: true, note: 'Badge "Carga: X pts" por semana. Alerta roja si incremento >20% vs semana anterior.' },
          { title: 'Tab Nutrición coach: editor de targets por fase del plan', done: true, note: 'PHASE_KCAL_DELTA: BASE -200, DESARROLLO 0, ESPECIFICO +100, AFINAMIENTO -100.' },
          { title: 'Tab Nutrición coach: logs de alimentos del atleta (últimos 7 días)', done: true, priority: 'P2', note: 'GET /api/coach/athletes/[id]/nutrition ahora devuelve foodLogs (7 días) con snapshot kcal/proteína/carbs/grasa por entrada. AthleteDetailClient tab Nutrición: sección "Registro alimenticio" — logs agrupados por día, totales vs target promedio (kcalHard+Easy+Rest)/3 con % de cumplimiento en color verde/naranja/rojo.' },
          { title: 'CoachAthlete.status ACTIVE/PAUSED — tab Pausados + toggle optimista', done: true, note: 'API PATCH /api/coach/athletes/[id]/status.' },
          { title: 'Mensajería asíncrona coach ↔ atleta (web + mobile)', done: true, note: 'Modelo Message. 4 endpoints web + 4 mobile. Badge unread sidebar. Polling 5s chat, 30s lista.' },
          { title: 'Finanzas: Payment model + CRUD + /coach/finanzas + badge mora', done: true, note: 'GET auto-marca OVERDUE. PaymentAuditLog trail (CREATED|MARKED_PAID|REMINDED). Badge mora en panel atletas.' },
          { title: 'Notificación al coach cuando atleta completa onboarding B2B', done: true, note: 'sendAthleteReadyEmail + sendPushNotification. Fire-and-forget.' },
          { title: 'applyPlanAdjustments: omite sesiones con edición manual del coach', done: true, note: 'Sesiones con coachNotes sin "[AUTO]" se saltan.' },
          { title: 'Off-by-one fecha sesión corregido — dayOfWeek - 1 en sessions y copy-prev', done: true, note: 'dayOfWeek=1 (lunes) + startDate(lunes) = lunes correctamente.' },
          { title: 'CoachAthlete.coachGoal + privateNotes: meta visible del atleta + notas privadas en Tab Resumen', done: true, note: 'Campos String? en schema CoachAthlete (db push). PATCH /api/coach/athletes/[id]/config acepta coachGoal y privateNotes junto a features. UI en AthleteDetailClient Tab Resumen: card "Seguimiento del coach" con inputs y botón guardar.' },
          { title: 'Adherencia de atletas calculada correctamente: sessions filtradas por date <= now (no incluye futuras)', done: true, note: 'Fix en athletes/page.tsx query + athletes/_lib/map_athlete.ts usa getPlanWeekNumber() canónico + clampea a totalWeeks. También corregido en /api/mobile/progress.' },
          { title: 'Lista operacional /coach/athletes separada del dashboard — paginación, filtros, SPORT_LABELS ampliados', done: true, note: 'SPORT_LABELS cubre RUNNING|STRENGTH|CYCLING|SWIMMING|TRIATHLON|FOOTBALL en AthleteTabs.tsx y dashboard/page.tsx. Label de alerta unificado: "Carga alta" (antes "RPE alta").' },
          { title: 'Coach notificado (push + email) cuando atleta completa check-in semanal', done: true, priority: 'P2', note: 'sendCoachCheckInEmail() en resend.ts. Ambos endpoints POST /api/checkin y /api/mobile/checkin hacen prisma.coachAthlete.findFirst() tras processCheckIn y envían email al coach con Energía, RPE y Peso — fire-and-forget vía .catch(() => {}).' },
          { title: 'Coach pre-llena perfil del atleta al crearlo: peso, altura, objetivo, sport — atleta solo confirma y pone contraseña', done: true, priority: 'P1', note: 'POST /api/coach/clients/create acepta opcionales: heightCm, weightKg, dateOfBirth, gender, experienceLevel. Si heightCm+weightKg presentes → tx.healthProfile.create(). Formulario /coach/clients/new tiene sección colapsable "Datos físicos". Derivan sport+goal a HealthProfile.sport/sportGoal.' },
          { title: 'Vista de atletas pendientes de onboarding en /coach/athletes — badge contador + botón reenviar link', done: true, priority: 'P1', note: 'Query paralela en /coach/athletes/page.tsx filtra coachAthletes donde athlete.onboardingCompleted=false. PendingAthletesSection (client component) muestra nombre, email, días desde invitación y botón "Copiar link" que llama GET /api/coach/athletes/[id]/invite-link (JWT 7d).' },
          { title: 'Onboarding mínimo para atletas B2B: nombre + contraseña → adentro, perfil completa después', done: true, priority: 'P2', note: 'GET /api/onboarding/prefilled devuelve HealthProfile del atleta si existe. OnboardingPage llama el endpoint en useEffect si session.user.isB2B. Pre-popula age/heightCm/weightKg/gender/experienceLevel en el estado del wizard. StepPhysical muestra banner azul "Tu entrenador ya registró estos datos" cuando hasPrefilled=true.' },
          { title: 'Dashboard coach: CTA "Copiar link de invitación" prominente junto a "+ Nuevo asesorado"', done: true, priority: 'P2', note: 'DONE: header del dashboard tiene botón "Compartir link" (href /coach/invite) al lado de "+ Nuevo asesorado". Mismo nivel de prominencia.' },
          { title: 'Dashboard coach: alertas con tipo diferenciado (fatiga, dolor, estrés, motivación baja)', done: true, priority: 'P2', note: 'DONE: TRIGGER_LABEL map en dashboard/page.tsx: rpe_excesivo→"RPE alto", dolor_activo→"Dolor activo", sueno_bajo→"Sueño bajo", energia_baja→"Energía baja", estres_alto→"Estrés alto", motivacion_baja→"Motivación baja", fc_alta→"FC elevada", perdida_peso_rapida→"Baja peso rápido". Usa alertFlags.adjustments[] del check-in. Fallback a "Carga alta" si sin adjustments.' },
          { title: 'Dashboard coach: widget "Atletas sin plan asignado" y "Pendientes de onboarding"', done: true, priority: 'P2', note: 'DONE: dos widgets condicionales en dashboard/page.tsx. "Pendientes de onboarding": CoachAthlete[ACTIVE, onboardingCompleted=false] con días desde invitación. "Sin plan asignado": atletas donde planStatus==="SIN PLAN" (derivado de athletes array). Ambos muestran CTA directo al atleta.' },
          { title: 'Dashboard coach: pagos vencidos visibles en dashboard principal', done: true, priority: 'P2', note: 'DONE: query Payment[PENDING, dueDate < now, coachId] en dashboard/page.tsx. Widget "Pagos vencidos" con borde rojo, badge conteo, días vencido, monto y CTA "Cobrar →" → /coach/athletes/[id]. Solo visible si hay pagos vencidos.' },
          { title: 'Dashboard coach: fix "Adherencia promedio 0%" cuando hay check-ins completados', done: true, priority: 'P1', note: 'Fix: filtrar athletesWithPlan (planStatus === ACTIVE) antes de calcular avgAdherence. Retorna null (mostrado como "—") si ningún atleta tiene plan activo. KpiCard actualizada con colores semafóricos. Branch: bugfix/mvp-ux-flows.' },
          { title: 'Dashboard coach: widget "Distribución deporte" sin datos — conectar o eliminar', done: true, priority: 'P3', note: 'DONE. Widget ya conectado: healthProfile.findMany({ where: { user: { coachedBy: { some: { coachId } } } } }) → sportCounts. Muestra barras proporcionales por deporte. Estado era stale.' },
          { title: 'COACH-FEAT-01 — Exponer templates de plan en el builder del coach (templates ya existen en código)', done: true, priority: 'P1', note: 'DONE. Ver ítem duplicado más abajo — implementado vía /api/coach/athletes/[id]/plan/from-template + PlanBuilderClient.' },
          { title: 'COACH-FEAT-02 — First-time experience para coach nuevo: overlay de bienvenida 3 pasos', done: true, priority: 'P2', note: 'DONE. dashboard/page.tsx ya tiene bloque {totalCount === 0 && ...} con banner "Bienvenido a Medaliq" + CTA "Agregar primer asesorado" + "Compartir link de invitación". Estado era stale. Adicionalmente fix: eliminado $${totalCount*6} USD (modelo per-atleta) en widget "Este mes" → reemplazado por "Atletas totales".' },
          { title: 'COACH-UX-01 — Auditoría Figma coach + dropdown acciones + tabs alineados + ResumenTab mejorado', done: true, priority: 'P1', note: 'DONE (2026-08-20). Figma: 43 frames verificados sin overlaps, tabs actualizados a 9 (Resumen/Plan/Progreso/Nutrición/Ejercicios/Sesiones/Adherencia/Benchmarks/Mensajes), dropdown con cobros disabled y variante Reactivar, cascada de reposicionamiento (Progreso→Nutrición→Propuesta v2→Gym→Mensajes). Código: AthleteDropdown.tsx (7 acciones), AthleteTabs.tsx integra dropdown en desktop+mobile, AthleteDetailClient.tsx soporta ?tab= query param + badge deporte, ResumenTab.tsx con TrendSummary (tendencia 7 días) + Lesiones/Condiciones médicas. Tests: AthleteDropdown.test.ts 5 tests.' },
          { title: 'COACH-UX-02 — Discipline-aware plan: specialties[] canónico + PlanTab con 4 discipline cards + Figma rediseñado', done: true, priority: 'P1', note: 'DONE (2026-08-21). Schema: primarySpecialty @deprecated, specialties String[] como fuente canónica ([] = ALL backward compat). Sidebar: CoachSidebarClient migrado de enum a array helpers (hasGym/hasNutrition). PlanTab.tsx: nuevo DisciplineCards con 4 cards (Running/Gym/Nutrition/Copy) filtradas por coachSpecialties + AthleteProfileReference siempre visible. AthleteDetailClient pasa coachSpecialties desde page.tsx. TEMPLATE_PREVIEW corregido 16→12 semanas. Figma: frame 4594:31 rediseñado con perfil atleta + 4 discipline cards coloreadas. Tests: 22 tests coach-specialty.test.ts. Domain doc coach.md actualizado.' },
          { title: 'COACH-UX-03 — PlanTab rewrite completo: 4 fases (empty state, data layer, progress timeline, session table) + Figma organizado', done: true, priority: 'P1', note: 'DONE (2026-08-28). PlanTab.tsx reescrito ~570 líneas: (1) Empty state con OnboardingBanner + ProfileCards (6 stat cards) + DisciplineCards (Running/Fuerza/Copiar). (2) Data layer: page.tsx expandido con SessionLog, GymSession.setLogs, WorkoutDay relations + raw SQL volume aggregation + Payment/PR/GymRoutine queries. (3) PlanProgressTimeline: semanas clickeables con adherencia color-coded (verde ≥80%, ámbar 60-79%, rojo <60%). (4) SessionsCard: tabla Plan vs Real con RunningSessionRow (distancia, pace, FC, RPE) y GymSessionRow (volumen, sets, PRs, muscle groups). Status logic: completed/partial/pending/rest/rest_respected. Figma: 4 frames reorganizados — Running (4594:169) y Gym (4594:461) con SessionsCard/Row-* y PlanProgressTimeline/*, No Plan (4767:31) agrupado en OnboardingBanner + ProfileCards + DisciplineCards, Builder (5091:31) con BuilderSidebar/* y BuilderContent/DayCol-*.' },
        ],
      },
      {
        id: 'coach-gym',
        label: 'Gym — Rutinas, Asignación & WorkoutDays de Sistema',
        period: 'En construcción',
        items: [
          { title: 'Schema DB: Exercise, WorkoutTemplate, WorkoutDay, AssignedWorkout, GymSession, SetLog', done: true, note: 'Migración aplicada. 39 ejercicios globales en seed.' },
          { title: 'Biblioteca de ejercicios del coach (filtros por músculo y equipo)', done: true, note: 'Global + personalizados por coach.' },
          { title: 'Constructor de rutinas wizard 4 pasos (Info → Días → Ejercicios → Revisar)', done: true, note: 'Creación + edición. /coach/gym/routines/[id] wizard pre-cargado desde DB.' },
          { title: 'Asignación de rutina a atleta (un atleta = una rutina activa)', done: true, note: 'Desactiva la anterior automáticamente. Con fecha inicio, duración y notas.' },
          { title: 'Coach ve logs y progresión del atleta en Tab Gym', done: true, note: 'Gráfica de peso por ejercicio + detalle última sesión.' },
          { title: 'WorkoutTemplate de sistema (coachId: null) — plantillas globales sin dueño', done: true, note: '"Fuerza corredor" (id: system-fuerza-corredor) en seed. coachId: null, isPublic: false.' },
          { title: 'Seed: WorkoutTemplate "Fuerza corredor" con 2 WorkoutDays (BASE y ESPECÍFICO)', done: true, note: 'BASE: sentadilla, lunges, hip thrust, talones 3×12-15. ESPECÍFICO: sentadilla, peso muerto, lunges, talones 4×8-10.' },
          { title: 'generate-plan.use-case.ts: vincular sesiones FUERZA al WorkoutDay de sistema según fase', done: true, note: 'RUNNING_GOALS + FUERZA_CORREDOR_DAY map en use case. BuiltSession.workoutDayId + createSessions lo persiste.' },
          { title: 'Gym tracker: cargar ejercicios del WorkoutDay cuando hay workoutDayId', done: true, note: '/api/gym/session/today ya tenía el plan-based fallback (líneas 127-215). Funcionaba pero sin workoutDayId en DB. Ahora el plan generator lo escribe.' },
          { title: 'GYM-GAP-01 — Push notification al atleta cuando coach asigna rutina', done: true, priority: 'P2', note: 'DONE: POST /api/coach/gym/routines/[id]/assign llama createNotification(athleteId, PLAN_ACTUALIZADO, ...) fire-and-forget tras la tx. createNotification maneja push (pushToken del atleta) y registro en DB en un solo helper.' },
          { title: 'GYM-GAP-02 — suggestedNextWeightKg fire-and-forget (no transaccional)', done: true, priority: 'P3', note: 'DONE: .catch(() => {}) reemplazado por .catch(err => console.error(...)) — fallos detectables en logs de producción. Mover dentro del tx descartado: es metadata no crítica y causaría timeouts.' },
          { title: 'GYM-GAP-03 — Notes [AUTO] del check-in se acumulan sin limpieza en WorkoutDay.warmupNotes', done: true, priority: 'P3', note: 'DONE: proceso check-in strip previo [AUTO] con regex /\\s*\\[AUTO\\].*$/s antes de escribir nueva nota. Sin trigger activo → también limpia notas [AUTO] stale. Solo escribe a DB si el valor cambia.' },
          { title: 'GYM-GAP-04 — Mobile no tiene estado de sesión en progreso (cierra app = pierde datos)', done: true, priority: 'P2', note: 'DONE (ya implementado): saveDraft/loadDraft via AsyncStorage en gymSessionDraft.ts. Se guarda en cada updateSet/markSetDone/cycleSetType. Se restaura al reabrir gym-session.tsx. Pending sync offline incluido.' },
          { title: 'GYM-GAP-05 — Orphan sets pierden tracking de progresión tras edición de rutina por coach', done: true, priority: 'P2', note: 'DONE: 1) WeNameToWeIdMap (name→weId) pasado a computeProgressionUpdates — orphans con exerciseName son recuperados y contribuyen a sugerencias de progresión. 2) sanitizeWeId() en route previene FK crash (P2003) cuando set se envía con weId eliminado — lo nulifica y usa exerciseName como fallback. 4 tests nuevos cubren ambos casos.' },
          { title: 'GYM-GAP-06 — WeeklyRoutine desconectada de toda ejecución', done: true, priority: 'P3', note: 'DONE: gym/session/today fetcha WeeklyRoutine en paralelo. En free session fallback incluye selfCoachDay (activity+split del día) y deriva templateName+isRestDay desde la rutina del atleta B2C. No dead code — es el self-coach feature.' },

          // ── Biblioteca de ejercicios — fuente de GIFs (2026-08-28) ──────────────
          { title: 'EX-ADAPTER-01 — AscendAPI adapter: IExerciseSourceClient para fuente gratuita de ejercicios', done: true, priority: 'P1', note: 'WorkoutX quotas agotadas (502/500 requests gratis). Implementado infrastructure/exercise_sync/ascendapi.client.ts — implementa IExerciseSourceClient. Cursor pagination vía ?after=<lastId>. 1,500 ejercicios + GIFs en Cloudflare CDN público. gifStoredUrl bypasea proxy WorkoutX. Rollback a WorkoutX: cambiar EXERCISE_SOURCE=workoutx (sin tocar código).' },
          { title: 'EX-SYNC-01 — sync-exercises.ts + admin route soportan EXERCISE_SOURCE env var', done: true, priority: 'P1', note: 'scripts/sync-exercises.ts: flag --source=ascendapi|workoutx o env EXERCISE_SOURCE. Default: ascendapi. src/app/api/admin/exercises/sync/route.ts: lee env, retorna { synced, source }.' },
          { title: 'EX-GIF-01 — UpsertExerciseData extendido con gifStoredUrl + gifUrl opcionales', done: true, priority: 'P1', note: 'domain/exercise/exercise.types.ts: gifStoredUrl? y gifUrl? ambos opcionales. infrastructure/db/exercise.repository.ts upsertMany persiste ambos campos. AscendAPI GIFs van a gifStoredUrl (CDN público directo, sin proxy). resolveExerciseGifUrl() prioriza gifStoredUrl → si null usa proxy WorkoutX con gifUrl.' },
          { title: 'EX-ORDER-01 — Ejercicios con GIF se muestran primero en las 3 grillas', done: true, priority: 'P2', note: 'orderBy: [gifStoredUrl asc nulls last, popularityRank asc nulls last, name asc] aplicado en: athlete/gym/page.tsx, athlete/gym/exercises/page.tsx, coach/gym/exercises/page.tsx.' },
          { title: 'EX-CDN-01 — Escaneo y limpieza de URLs CDN rotas (404)', done: true, priority: 'P2', note: 'Script concurrent HEAD requests (concurrency 20) sobre 1,530 URLs AscendAPI. 177 rotas (11.5%). gifStoredUrl nulificado en DB para las 177 rotas. 176 ejercicios sin GIF y sin rutinas → eliminados. 1 preservado (global-exercise-extension-triceps-polea: 4 referencias en rutinas). 1,353/1,354 ejercicios con GIF funcional.' },
          { title: 'EX-CLEAN-01 — 196 ejercicios sin GIF eliminados de DB', done: true, priority: 'P2', note: '176 con CDN roto (EX-CDN-01) + 20 manuales sin gifStoredUrl/gifUrl y sin referencias en WorkoutExercise. Verificación: _count.workoutExercises === 0 antes de delete. 30 manuales con rutinas activas preservados.' },
          { title: 'EX-MATCH-01 — 30 ejercicios manuales sin GIF emparejados con equivalentes AscendAPI', done: true, priority: 'P2', note: 'Claude Haiku (llamada única) buscó equivalentes en biblioteca AscendAPI para 30 ejercicios con nombre español. Tasa de match: 100% (todos high confidence). gifStoredUrl copiado del equivalente. Todos los 30 quedaron con GIF funcional.' },
          { title: 'EX-I18N-01 — 1,500 nombres AscendAPI traducidos al español (nameEs)', done: true, priority: 'P2', note: 'Script Claude Haiku API (raw fetch, no SDK) en batches de 80, max_tokens 8192. Idempotente (solo nameEs: null). Todos los ejercicios tienen nameEs. Costo estimado <$0.50 total.' },

          // ── Nutrición — Barcode + LatAm + Lista del mercado (2026-08-28) ────────
          { title: 'BAR-FIX-01 — NSCameraUsageDescription en app.json + plugin expo-camera + permiso Android', done: true, priority: 'P0', note: 'app.json: ios.infoPlist.NSCameraUsageDescription + plugins["expo-camera"] + android.permissions["android.permission.CAMERA"]. Sin esto el escáner crasheaba en iOS. Backend + BarcodeScannerModal + LogFoodModal ya estaban completos. Requiere EAS rebuild para aplicar.' },
          { title: 'LATAM-SEED-01 — Verificar y ejecutar seeds de alimentos LatAm en producción', done: true, priority: 'P1', note: 'Ejecutado 2026-08-28. seed-latam-foods.ts: 37 insertados, 2 ya existían. seed-foods-latam.ts: 55 ya existían (skipped). Fix colateral: seed-latam-foods.ts usaba PrismaClient() sin adapter — corregido a PrismaPg (Prisma 7 lo exige).' },
          { title: 'LATAM-COUNTRY-01 — Búsqueda de alimentos prioriza país del atleta', done: true, priority: 'P1', note: 'src/lib/utils/timezone_country.ts: TZ_TO_COUNTRY + countryFromTimezone(). Ambos endpoints (web /api/nutrition/foods + mobile /api/mobile/nutrition/foods) consultan User.timezone, derivan ISO country, sort 4 niveles: favoritos→mismo país→globales→resto. take:80 + slice(50) para tener margen de priorización.' },
          { title: 'LATAM-EXPAND-01 — Seeds PE, AR, VE, EC ya incluidos en scripts existentes', done: true, priority: 'P2', note: 'seed-latam-foods.ts ya cubre AR (milanesa, empanadas, asado, dulce de leche), PE (lomo saltado, ceviche, anticuchos, maca), CO, MX, EC, VE, CL, BO. Idempotente. Ejecutar en prod: pnpm tsx scripts/seed-latam-foods.ts + pnpm tsx scripts/seed-foods-latam.ts.' },
          { title: 'GROCERY-01 — Backend: GET /api/athlete/nutrition/grocery-list + mobile', done: true, priority: 'P1', note: 'Web: src/app/api/athlete/nutrition/grocery-list/route.ts. Mobile: src/app/api/mobile/nutrition/grocery-list/route.ts. Param ?weekStart=YYYY-MM-DD (default: lunes actual). Lee PlannedMeal semana → agrupa por food.category → suma gramos → ordena por CAT_ORDER + alfabético. Retorna { weekStart, weekEnd, totalItems, categories[{category, label, items[{name, totalG}]}] }.' },
          { title: 'GROCERY-02 — UI mobile: pantalla lista del mercado', done: true, priority: 'P2', note: 'app/(app)/grocery-list.tsx: lista semanal agrupada por categoría (PROTEIN/CARB/VEGETABLE...), checkboxes con tachado, barra de progreso, Share.share() texto plano. CTA en nutrition.tsx cuando hay plannedMeals. Backend ya existía en /api/mobile/nutrition/grocery-list. getGroceryList() agregado a src/api/nutrition.ts.' },
        ],
      },
      {
        id: 'coach-planes',
        label: 'Constructor Visual de Planes',
        period: 'En construcción',
        items: [
          { title: 'API: POST /api/coach/athletes/[id]/plan/custom', done: true, note: 'Crea TrainingPlan+PlanWeeks en $transaction. Verifica ownership coach-atleta.' },
          { title: 'API: PATCH + DELETE /api/coach/sessions/[id]', done: true, note: 'Edita o elimina sesión. Campos: durationMin, type, zoneTarget, detailText, coachNote.' },
          { title: 'API: POST /api/coach/plan/[planId]/sessions', done: true, note: 'Agregar sesión a una semana de plan existente.' },
          { title: 'API: PATCH /api/coach/plan/[planId]/week/[weekId]', done: true, note: 'Editar metadata: phase, focusDescription, isRecoveryWeek, volumeKm.' },
          { title: 'Página /coach/athletes/[id]/plan/build (full-screen, overlay fixed inset-0 z-50)', done: true, note: 'Cubre el sidebar sin cambiar el layout.' },
          { title: 'WeekGrid, SessionCard, SessionModal — constructor visual completo', done: true, note: '7 columnas Lun-Dom. Type badge + intensity + duración. Form add/edit con quick-pick durationMin.' },
          { title: 'WeekNav: mini-overview horizontal de todas las semanas', done: true, note: 'Punto de color por fase. Gris si vacío, ámbar si recovery. Tooltip fase + sesiones.' },
          { title: '"Copiar semana anterior" para acelerar construcción', done: true, note: 'API copy-prev/route.ts + botón en PlanBuilderClient.tsx. Confirma antes de reemplazar.' },
          { title: 'PlannedSession.structure: bloques zone|duration|description en editor inline y vista Tab Plan', done: true, note: 'Campo String? en schema (db push). PATCH /api/coach/sessions/[sessionId]/edit acepta structure (trim, null si vacío). Editor: textarea con hint "zona|duración|descripción". Vista: bloques por \\n, parsea zona|duración|descripción con colores (azul zona, gris duración, texto descripción).' },
          { title: '"Generar desde template → abrir en constructor" — precarga y edita', done: true, note: 'TEMPLATE_PREVIEW record en AthleteDetailClient.tsx: 6 goalTypes → {weeks, description, phases[]}. Card de preview bajo el selector de goalType en el modal de creación de plan — muestra semanas, descripción y badges de fases. Coach selecciona el objetivo y ve el template antes de generar.' },
          { title: 'COACH-FEAT-01: Template selector en builder de planes — grid de 5 cards + plan en blanco', done: true, priority: 'P1', note: 'DONE: Builder sin plan muestra grid de 5 templates (5K, 10K, Media Maratón, Recomposición, Fuerza) + botón "Plan en blanco". Click template → form con nombre pre-llenado y semanas readonly. API POST /api/coach/athletes/[id]/plan/from-template crea plan con sessions pre-pobladas desde templates.ts usando $transaction con createMany. PlanBuilderClient.tsx: mode: initial|blank-form|template-form (reemplaza creating: boolean).' },
          { title: 'PlannedSession.sportLabel String? — migración pendiente', done: true, note: 'Campo ya existía en schema+migración. UI añadida: campo "Etiqueta de deporte" en SessionModal (PlanBuilderClient.tsx), se muestra en blue-500 sobre la tarjeta de sesión. PATCH/POST sessions APIs actualizadas para persistirlo.' },
          { title: 'Copiar sesión de un atleta a otro — reutilización entre asesorados', done: true, priority: 'P2', note: 'DONE (API): POST /api/coach/sessions/[sessionId]/copy-to — body { targetWeekId, dayOfWeek }. Verifica ownership de ambos atletas en paralelo (coach debe ser dueño de la sesión origen y de la semana destino). Copia type/intensity/durationMin/zoneTarget/detailText/structure/sportLabel. workoutDayId deliberadamente omitido (es específico del coach+atleta). Pendiente UI: botón "Copiar sesión a..." en SessionCard del constructor visual.' },
          { title: 'UI: botón "Copiar sesión a..." en SessionCard del PlanBuilderClient', done: true, priority: 'P2', note: 'DONE: icono Copy (lucide-react) en esquina top-right de cada SessionCard, aparece on-hover. CopySessionModal.tsx (inline en PlanBuilderClient): dropdown de semana destino + grid de día (Lun-Dom). Llama POST /api/coach/sessions/[sessionId]/copy-to. Actualización optimista del estado del plan para la semana destino.' },
          { title: 'ARCH-06 — POST /api/coach/athletes/[id]/sessions — publicar sesión individual en el calendario del atleta', done: true, priority: 'P1', note: 'DONE: src/app/api/coach/athletes/[id]/sessions/route.ts. Body: { date: YYYY-MM-DD, type, durationMin, zoneTarget?, detailText?, coachNote? }. Busca PlanWeek activa que contenga la fecha (startDate ≤ date ≤ endDate, plan.status=ACTIVE). Deriva dayOfWeek desde Date.getUTCDay() (1=Lun...7=Dom). 422 si no hay plan activo para esa fecha. Zod validation. Útil para sesiones ad-hoc fuera del template de semanas.' },
        ],
      },
      {
        id: 'coach-avanzado',
        label: 'Benchmarks & Métricas Avanzadas',
        period: 'Próximo',
        items: [
          { title: 'PerformanceBenchmark model (sport, metric, value, unit, testedAt)', done: true, note: 'Métricas: 5K_TIME|10K_TIME|HM_TIME|MARATHON_TIME|1RM_SQUAT|1RM_BENCH|1RM_DEADLIFT|PACE_Z2.' },
          { title: 'API CRUD: GET + POST /api/coach/athletes/[id]/benchmarks', done: true, note: 'Historial agrupado por metric. Solo coach asignado puede crear.' },
          { title: 'UI coach: Tab Benchmarks en panel atleta (form + lista agrupada por deporte)', done: true, note: 'Tiempos formateados MM:SS.' },
          { title: 'UI atleta: benchmarks en /progress (SectionCard "Tests de Rendimiento")', done: true, note: 'Solo visible si el atleta tiene benchmarks.' },
          { title: 'Medidas corporales en Tab Progreso del coach (cintura, brazos, caderas)', done: true, note: 'CheckInData extendido con waistCm/armsCm/hipsCm/thighsCm. Tabla de check-ins añade 4 columnas. Sección "Circunferencias corporales" con mini bar charts (4 colores: índigo/naranja/rosa/teal) en AthleteDetailClient.tsx. page.tsx mapea los 4 campos desde WeeklyCheckIn.' },
          { title: 'Notificación in-app al coach cuando atleta completa una sesión', done: true, note: 'Fix (push): notifyCoach() helper en gym/session/complete/route.ts envía push al coach vía pushToken tras cada sesión de gym. Idem en log/session/route.ts para sesiones de running. Fire-and-forget (catch→noop). Pendiente: badge in-app requeriría tabla Notification en DB.' },
          { title: 'Finanzas: filtro por atleta en /coach/finanzas', done: true, note: 'Ya implementado: filterAthlete state + select "Todos los atletas" visible cuando athletes.length > 1 + filter client-side byAthlete. Verificado en coach/finanzas/page.tsx.' },
          { title: 'generator.ts: calibrar zonas HR con benchmark reciente de running', done: true, note: 'DONE: GeneratePlanInput.recentBenchmark5KSecs opcional. computePaceHints(fiveKTimeSecs) en generate-plan.use-case.ts: easy=pace×1.35, tempo=pace×1.10, interval=pace. withPaceHint() añade "Ritmo fácil/umbral/objetivo: ~X:YZ min/km" a detailText de sesiones RODAJE_Z2, TIRADA_LARGA, TEMPO, INTERVALOS, TEST, SIMULACRO. Coach route /api/coach/athletes/[id]/plan/route.ts: query performanceBenchmark (RUNNING, 5K_TIME, <90d) y lo pasa al generator.' },
          { title: 'Duplicar plan entre atletas: copiar semanas de un atleta a otro con offset de fechas', done: true, priority: 'P1', note: 'POST /api/coach/athletes/[id]/plan/copy-from (body: sourcePlanId + startDate). GET /api/coach/plans lista todos los planes de atletas del coach. UI en AthleteDetailClient: toggle "Desde template" | "Copiar de otro atleta" — dropdown con atleta+plan+semanas, date picker de inicio. Recalcula fechas de semanas y sesiones desde el nuevo startDate.' },
          { title: 'Preview del plan desde perspectiva del atleta (modo lectura en el constructor)', done: true, priority: 'P2', note: 'BuilderHeader: botón "Vista atleta ↗" abre /coach/athletes/[id]/plan/view en nueva pestaña. Página read-only con semanas/sesiones + estado de completado.' },
          { title: 'Alertas de fatiga acumulada: índice compuesto (RPE>7 + sueño<6h + energía<3 en misma semana)', done: true, priority: 'P2', note: 'evaluate-rules.ts: regla compuesta fatiga_acumulada si triggers.length >= 3 → severity critical. Badge ⚠ Fatiga en AthleteTabs desktop + mobile. Trigger incluido en adjustmentsTriggered del check-in.' },
          { title: 'Vista comparativa de adherencia entre atletas (ranking o grid por atleta)', done: true, priority: 'P2', note: 'AthleteTabs: nueva pestaña "Por adherencia" ordena por adherencePct asc (peor primero). Umbrales corregidos: >80% verde, 60-80% ámbar, <60% rojo. Aplicado en table desktop + mobile cards.' },
          { title: 'Perfil público del coach (/join/[code]) con métricas reales: atletas activos, adherencia promedio, PRs del mes', done: true, priority: 'P2', note: 'GET /api/invite/[code] ahora incluye activeAthletes (count ACTIVE), avgAdherence (avg dietAdherencePct de check-ins), prsThisMonth (SetLog.isPR en GymSession del mes). Grid 3 columnas bajo el header del coach — solo visible si activeAthletes > 0. Prueba social anónima para prospectos.' },
          { title: 'Tarjeta de logro compartible para el atleta: semana perfecta, PR nuevo, racha de sesiones', done: true, priority: 'P2', note: 'DONE (componentes): ShareMilestoneButton.tsx (web share API + clipboard fallback, tipos PR/STREAK/PERFECT_WEEK) + StreakShareButton.tsx (wrapper para racha ≥7 días). Wired en dashboard/page.tsx (racha). PR sharing en mobile: PRModal con Share.share() ya implementado (Capa 3). Pendiente P3: DB Achievement tracking (10 check-ins / 50 sesiones / plan completado) + perfect week detection en web.' },
          { title: 'Código de referido coach→coach: entrenador invita a otro, ambos reciben mes extendido', done: false, priority: 'P1', note: 'SUBIDO de P3→P1 (2026-09-14): canal de adquisición más barato y creíble en LatAm — la recomendación entre pares. Implementación: (1) Schema: tabla CoachReferral { id, referrerId, newCoachId, redeemedAt, creditDays Int @default(30) }. (2) Coach genera código en /coach/settings (reutiliza inviteCode existente o genera uno nuevo tipo REF-XXXXX). (3) Nuevo coach se registra con el código → POST /api/coach/register valida código, crea CoachReferral, extiende suscripción de ambos +30 días. (4) UI: badge "1 mes gratis por referido" en settings + contador de referidos exitosos. Sin restricción de disciplina — un coach de running puede referir a un nutricionista. El efecto red: cada coach que entra trae 5-20 atletas gratis.' },
        ],
      },
      {
        id: 'coach-nutricion-constructor',
        label: 'Constructor Visual de Nutrición',
        period: 'Próximo',
        items: [
          { title: 'Schema: NutritionTemplate — plan nutricional reutilizable del coach', done: true, priority: 'P1', note: 'Fix: NutritionTemplate + NutritionTemplateDay + NutritionTemplateMeal + NutritionTemplateFoodItem + AssignedNutritionPlan en schema.prisma. enum NutritionDayType (HARD/EASY/REST). Relaciones en User + Food. Migración 20260702030112_nutrition_constructor aplicada en Neon prod.' },
          { title: 'API CRUD: GET + POST /api/coach/nutrition/templates', done: true, priority: 'P1', note: 'Fix: src/app/api/coach/nutrition/templates/route.ts. GET devuelve templates con días/comidas/ítems e _count.assignments. POST crea template + 3 days HARD/EASY/REST automáticamente.' },
          { title: 'API CRUD: GET + PATCH + DELETE /api/coach/nutrition/templates/[templateId]', done: true, priority: 'P1', note: 'Fix: src/app/api/coach/nutrition/templates/[templateId]/route.ts. DELETE bloqueado si assignmentCount > 0 (409).' },
          { title: 'API: POST + DELETE /api/coach/nutrition/templates/[templateId]/meals', done: true, priority: 'P1', note: 'Fix: src/app/api/coach/nutrition/templates/[templateId]/meals/route.ts. POST: upsert meal + create item con snapshot de macros. DELETE: ownership verificada por cadena item→meal→day→template. Validación VALID_DAY_TYPES + VALID_MEAL_TYPES.' },
          { title: 'API: POST /api/coach/nutrition/templates/[templateId]/assign', done: true, priority: 'P1', note: 'Fix: src/app/api/coach/nutrition/templates/[templateId]/assign/route.ts. POST: upsert AssignedNutritionPlan (reemplaza si ya existe). DELETE: desasigna. Verifica CoachAthlete.status=ACTIVE.' },
          { title: 'Página /coach/nutrition/templates — biblioteca de planes nutricionales', done: true, priority: 'P1', note: 'Fix: /coach/nutrition/page.tsx (server) + NutritionTemplatesClient.tsx (client). Grid de cards con totales por tipo de día (HARD/EASY/REST), #atletas asignados, CTA crear + editar + eliminar.' },
          { title: 'Constructor visual /coach/nutrition/templates/[templateId]/build', done: true, priority: 'P1', note: 'Fix: /coach/nutrition/templates/[templateId]/build/page.tsx + NutritionBuilderClient.tsx. Tabs día (HARD/EASY/REST) + comidas ordenadas + totales en tiempo real. Full-screen overlay, sin cambiar layout base.' },
          { title: 'Modal de búsqueda de alimentos en el constructor (reusar FoodSearch de /nutrition)', done: true, priority: 'P1', note: 'Fix: FoodSearchModal en NutritionBuilderClient.tsx. GET /api/nutrition/foods?q= existente. Quick-picks 50/100/150/200g + preview macros en tiempo real antes de agregar.' },
          { title: 'API mobile: GET /api/mobile/nutrition/assigned-plan', done: true, priority: 'P1', note: 'Fix: src/app/api/mobile/nutrition/assigned-plan/route.ts. Devuelve template asignado + comidas del día según intensidad de la sesión de hoy (HARD/EASY/REST). Incluye totales del día + targets NutritionPlan para comparación.' },
          { title: 'Atleta: personalización sobre plan asignado (swap de alimentos)', done: true, priority: 'P2', note: 'DONE: AthleteNutritionOverride model + migration. POST/DELETE /api/mobile/nutrition/plan/[id]/swap (validación ±10% kcal). GET plan mobile incluye override. SwapPicker inline en PlannedMealsSection (botón Cambiar + Restaurar). Coach ve swap badge + alimento original en CoachPlannedMealPlanner. Totales diarios del coach usan override cuando existe.' },
          { title: 'Link en sidebar del coach: "Nutrición" → /coach/nutrition/templates', done: true, priority: 'P1', note: 'Fix: CoachSidebarClient.tsx — icono Salad + href /coach/nutrition. isActive añadido a exactMatch.' },
        ],
      },
      {
        id: 'builder-v2',
        label: 'Plan Builder v2 — Orquestador Multi-disciplina',
        period: 'Próximo',
        items: [
          { title: 'BUILDER-01 — Selector de disciplina en sidebar (Running / Fuerza / Todas)', done: true, priority: 'P1', note: 'DONE: pills selector en sidebar — Todas/Running/Fuerza. DISCIPLINE_RUNNING y DISCIPLINE_FUERZA sets. SESSION_TYPES filtrado reactivamente. Estado discipline en PlanBuilderClient. Default: Todas.' },
          { title: 'BUILDER-02 — Vincular NutritionTemplate a nivel de plan (config, no sidebar)', done: true, priority: 'P1', note: 'DONE: TrainingPlan.nutritionTemplateId String? + FK + inverse relation en NutritionTemplate. prisma db push aplicado. PATCH /api/coach/athletes/[id]/plan/nutrition-template con ownership check. Selector en sidebar del builder — se muestra solo si el coach tiene templates. Estado linkedTemplate + indicador verde al vincular.' },
          { title: 'BUILDER-03 — Unificar AssignedWorkout vs PlannedSession.workoutDayId', done: false, priority: 'P2', note: 'Decisión tomada (2026-08-25): Plan Builder es el hub único. Tab Ejercicios eliminado. AssignedWorkout sigue útil para atletas SIN plan activo (gym-only). Para atletas CON plan, el builder usa PlannedSession.workoutDayId. Pendiente: migrar UI de asignación legacy al builder sidebar (drag gym day → session slot).' },
          { title: 'BUILDER-04 — Campo distancia (km) en sesiones de running', done: false, priority: 'P2', note: 'PlannedSession.distanceKm Float? — campo nuevo. El coach puede especificar distancia objetivo además de duración. Visible en SessionCard y SessionModal del builder.' },
          { title: 'BUILDER-05 — Session templates reutilizables (guardar/cargar sesiones frecuentes)', done: false, priority: 'P2', note: 'Coach guarda una sesión como template (ej: "Intervalos 5×1000m"). Al crear nueva sesión, puede elegir de su biblioteca de templates en vez de llenar desde cero. Tabla SessionTemplate { coachId, name, type, durationMin, zoneTarget, detailText, structure }.' },
          { title: 'BUILDER-06 — Distribución de intensidad visual (barra o gráfica por semana)', done: false, priority: 'P3', note: 'Mostrar proporción HIGH/MODERATE/LOW/REST por semana en el WeekNav o en un panel lateral. Ayuda al coach a verificar periodización sin contar sesiones manualmente.' },
          { title: 'BUILDER-07 — Detección de conflictos (dos sesiones alta intensidad consecutivas)', done: false, priority: 'P3', note: 'Warning visual si el coach coloca INTERVALOS + TEMPO en días consecutivos, o >3 sesiones HIGH en una semana. No bloquea, solo alerta.' },
          { title: 'BUILDER-08 — CTA "Vincular a plan" en Constructor de comidas del coach', done: false, priority: 'P2', note: 'En /coach/nutrition/templates/[id]/build agregar botón que permite vincular el template al plan activo de un atleta. Hoy el coach crea templates pero no tiene camino directo desde el constructor de comidas al plan del builder.' },
        ],
      },
      {
        id: 'nutricion-consolidacion',
        label: 'Consolidación Nutrición — Modelo Unificado',
        period: 'En construcción',
        items: [
          // Fase 1 — Fix estructural (P0)
          { title: 'NUT-01 — Unificar adherencia a getDailyNutritionTarget() en todos los endpoints', done: true, priority: 'P0', note: 'DONE (2026-08-01). Unificado: (1) web athlete nutrition/page.tsx — adherencia semanal + barras ahora usan getDailyNutritionTarget por día con intensidad de weekSessions, (2) coach adherence API — targets por día según intensidad del plan activo + soporte synthetic targets desde AssignedNutritionPlan, (3) cron nutrition-alert — target por día con intensidad + soporte B2B sin NutritionPlan. Helper compartido: src/lib/nutrition/get_intensity_for_date.ts (getIntensityMapForDateRange + mapSessionToIntensity). Mobile summary ya usaba la función correcta — sin cambios.' },
          { title: 'NUT-02 — Tab Nutrición del coach lee y muestra AssignedNutritionPlan', done: true, priority: 'P0', note: 'DONE (2026-08-01). API GET /api/coach/athletes/[id]/nutrition retorna assignedTemplate + templateTotals (kcal/P/C/F por dayType). UI: card "Plan nutricional asignado" con nombre, goal badge, totales HARD/EASY/REST, links a editar template y asignar otro. Empty state con CTA a /coach/nutrition.' },
          { title: 'NUT-03 — Accept de CoachNutritionProposal aplica delta a NutritionPlan', done: true, priority: 'P0', note: 'DONE (2026-08-01, fix 2026-08-03). Use case respondCoachProposal en domain/nutrition/. ACCEPT: aplica deltas a NutritionPlan con floor(0), source=COACH, en $transaction. REJECT: solo marca status. Fix: PATCH /api/coach/athletes/[id]/nutrition usa upsert (antes update) — B2B sin NutritionPlan previo ahora funciona. Web: PATCH /api/athlete/nutrition/proposals/[id]. Mobile: GET+POST /api/mobile/nutrition/proposals(/[id]). Tests: 7 casos + integration.' },
          // Fase 2 — Conectar flujos (P1)
          { title: 'NUT-04 — Accept de PendingNutritionAdjustment efectivo (ajuste diario)', done: true, priority: 'P1', note: 'DONE (2026-08-01). getAcceptedAdjustmentsForDateRange() en get-intensity-for-date.ts. Override aplicado en: nutrition/page.tsx (weekBars + daysHit), coach adherence API (28d), cron nutrition-alert (3d), mobile summary (/api/mobile/nutrition/log/summary). Solo ACCEPTED override kcal+carbs — PENDING/REJECTED ignorados.' },
          { title: 'NUT-05 — PlannedMeal del coach visible y unificado en mobile', done: true, priority: 'P1', note: 'DONE (2026-08-01). Verificado: no hay bug. Coach POST /api/coach/athletes/[id]/nutrition/plan escribe PlannedMeal con userId=athleteId (línea 103). Mobile GET /api/mobile/nutrition/plan lee PlannedMeal con where userId=mobile.id + fecha, incluyendo food con macros. La cascada PlannedMeal > AssignedNutritionPlan > tracking libre se resuelve client-side en mobile. Documentada con comentario en el endpoint mobile.' },
          { title: 'NUT-06 — Cron nutrition-alert soporta B2B sin NutritionPlan', done: true, priority: 'P1', note: 'DONE (2026-08-01). Implementado como parte de NUT-01. Cron ahora busca AssignedNutritionPlan si no hay NutritionPlan y sintetiza targets desde template (sum macros de items por dayType HARD/EASY/REST). Coach adherence API también soporta el mismo fallback.' },
          { title: 'NUT-07 — Coach puede expandir template → PlannedMeal por semana desde tab atleta', done: true, priority: 'P1', note: 'DONE (2026-08-01). POST /api/coach/athletes/[id]/nutrition/apply-template con { weekStartDate }. Lee AssignedNutritionPlan + getIntensityMapForDateRange para mapear cada dia a HARD/EASY/REST. Transaction: deleteMany + createMany. Boton "Aplicar a esta semana" en tarjeta de template asignado (AthleteDetailClient). Re-mount CoachPlannedMealPlanner via key.' },
          // Fase 3 — Atleta autónomo (P1)
          { title: 'NUT-08 — API atleta: CRUD NutritionTemplate propio (B2C self-service)', done: true, priority: 'P1', note: 'DONE (2026-08-01). GET+POST /api/athlete/nutrition/templates (list + create con 3 days HARD/EASY/REST). GET+PATCH+DELETE /api/athlete/nutrition/templates/[id] (single template con full tree). POST+DELETE /api/athlete/nutrition/templates/[id]/meals (add/remove food items con macro snapshot). B2B guard: 403 si tiene coach activo. Filtro coachId=null en todas las queries.' },
          { title: 'NUT-09 — API atleta: expandir template propio → PlannedMeal semanal (web)', done: true, priority: 'P1', note: 'DONE (2026-08-01). POST /api/athlete/nutrition/templates/[id]/apply con { weekStartDate }. Calcula intensidad server-side via getIntensityMapForDateRange (HIGH→HARD, MODERATE→EASY, REST→REST). Transaction: deleteMany + createMany PlannedMeal para la semana. Ownership: athleteId + coachId=null.' },
          { title: 'NUT-10 — API atleta: CRUD PlannedMeal individual por fecha', done: true, priority: 'P2', note: 'DONE (2026-08-01). GET+POST /api/athlete/nutrition/planned-meals (list by date or weekStart + create). PATCH+DELETE /api/athlete/nutrition/planned-meals/[id] (ya existia). Zod validation, food.isActive check. B2B puede agregar (suplementa plan del coach). 18 tests.' },
          { title: 'NUT-11 — API atleta: editar targets NutritionPlan (source=ATHLETE)', done: true, priority: 'P2', note: 'DONE (2026-08-01). GET+PATCH /api/athlete/nutrition/targets. GET retorna NutritionPlan actual. PATCH actualiza targets (kcal hard/easy/rest, macros) y setea source=ATHLETE. B2B con coach activo recibe 403. Zod validation, partial update.' },
          // Fase 4 — Limpieza (P2)
          { title: 'NUT-12 — Deprecar MealPlan (JSON blob) + NutritionConstructor UI', done: true, priority: 'P2', note: 'DONE. NutritionConstructor removido del tab Nutricion del coach. PATCH meals marcado deprecated. parsedMealPlan marcado fallback deprecated en nutrition/page.tsx.' },
          { title: 'NUT-13 — Eliminar dead code: MealPlanVersion, Recipe, RecipeIngredient', done: true, priority: 'P2', note: 'DONE. Comentarios DEPRECATED en schema.prisma sobre MealPlanVersion, Recipe, RecipeIngredient. Sin migracion — marcados para limpieza futura.' },
          { title: 'NUT-14 — Endpoint unificado mobile: GET /api/mobile/nutrition/today', done: true, priority: 'P2', note: 'DONE. Fat endpoint unificado: devuelve hasNutritionPlan, dayType, macros, targets, plannedMeals (con overrides), foodLogs (con totals/target/pct), adherence, water, mealPlan (JSON), gymKcalBurned, planPhaseContext, proposals, weeklySummary. Mobile nutrition.tsx usa single useQuery + useFocusEffect + RefreshControl (patrón dashboard). Endpoints legacy conservados.' },
          // Fase 4 — Deprecar PendingNutritionAdjustment + FoodProfile (P0)
          { title: 'NUT-15 — Deprecar PendingNutritionAdjustment: reemplazar con notificación informativa', done: true, priority: 'P0', note: 'DONE (2026-08-03). Ya no se generan PendingNutritionAdjustment. Post log-session: si source=SYSTEM y delta≥200kcal → notificación tipo SUGERENCIA_NUTRICIONAL (informativa, sin accept/reject). Archivos: api/log/session, api/mobile/log/session. Accept/reject endpoints quedan como legacy (no romper atletas con adjustments existentes).' },
          { title: 'NUT-16 — Remover override de accepted adjustments en adherencia', done: true, priority: 'P0', note: 'DONE (2026-08-03). Adherencia se calcula solo contra NutritionPlan base (getDailyNutritionTarget). Sin overrides de PendingNutritionAdjustment.ACCEPTED. Archivos: nutrition/page.tsx, coach adherence API, cron nutrition-alert, mobile summary, mobile/nutrition/today. 6 archivos limpiados.' },
          { title: 'NUT-17 — FoodProfile endpoints web + mobile', done: true, priority: 'P1', note: 'DONE (2026-08-03). GET+PUT /api/athlete/nutrition/food-profile (web, Auth.js). GET+PUT /api/mobile/nutrition/food-profile (mobile, JWT). PUT: upsert con validación Zod (availableFoodIds min 1, restrictions, mealsPerDay 2-6, weighsFood, notes). Verifica foodIds existen y son activos.' },
          { title: 'NUT-18 — Priorizar alimentos del atleta en búsqueda de foods', done: true, priority: 'P1', note: 'DONE (2026-08-03). GET /api/nutrition/foods y GET /api/mobile/nutrition/foods: cargan FoodProfile.availableFoodIds y priorizan esos alimentos al inicio de resultados. Sort estable: preferidos primero, luego por categoría/nombre.' },
          { title: 'NUT-19 — Cleanup dead code PendingNutritionAdjustment', done: true, priority: 'P2', note: 'DONE (2026-08-03). Eliminados: getAcceptedAdjustmentsForDateRange() (dead code), NutritionAdjustmentCard.tsx (huérfano). Agregado: SUGERENCIA_NUTRICIONAL a TYPE_CONFIG en notifications. Limpiado: pendingAdj query en mobile/nutrition/route.ts → Promise.resolve(null). 4 accept/reject endpoints marcados DEPRECATED.' },
        ],
      },
      {
        id: 'coach-identidad',
        label: 'Identidad & Verificación Anti-fraude',
        period: 'Pre-lanzamiento',
        items: [
          {
            title: 'DB migration: User.identification + User.phoneWa únicos para coaches',
            done: true,
            priority: 'P0',
            note: 'Migración 20260708000001_identity_notification_food aplicada en Neon prod. identification String? @unique, phoneWa String? @unique, showPhoneWa Boolean @default(false) en User. Indexes únicos creados en DB.',
          },
          {
            title: 'Onboarding coach: recopilar identification + phoneWa antes de invitar atletas',
            done: true,
            priority: 'P0',
            note: 'PATCH /api/coach/profile acepta identification (5-30 chars) + phoneWa (E.164). Validación + persistencia en User. Banner ⚠️ en coach dashboard si profileComplete=false. JWT incluye profileComplete para no requerir query extra por request.',
          },
          {
            title: 'Validación unicidad: identification y phoneWa al completar perfil coach',
            done: true,
            priority: 'P0',
            note: 'Checks en paralelo: slug + identification + phoneWa. findFirst({ role: COACH, NOT: { id: coachId } }) → 409 con mensaje específico por campo. Aplicado en PATCH /api/coach/profile.',
          },
          {
            title: 'Bloqueo POST /api/coach/clients/create si perfil coach incompleto',
            done: true,
            priority: 'P1',
            note: '403 PROFILE_INCOMPLETE si !identification || !phoneWa. Doble check: JWT profileComplete (rápido) + query DB (si token stale). Mensaje: "Completa tu cédula y número de WhatsApp en tu perfil antes de invitar asesorados."',
          },
          {
            title: 'Definición canónica de atleta activo para billing',
            done: false,
            priority: 'P1',
            note: 'Atleta cuenta como activo si: (1) CoachAthlete.status = ACTIVE + (2) onboardingCompleted = true + (3) al menos 1 SessionLog registrado. Atletas sin sesión no cuentan → previene cuentas fantasma para inflar/desinflar conteo. Usar esta definición en el endpoint de billing snapshot y en el panel admin.',
          },
          {
            title: 'Admin: ver identification y phoneWa del coach — panel de verificación',
            done: true,
            priority: 'P1',
            note: 'En /admin/coaches: identification y phoneWa visibles bajo el email de cada coach. Badge rojo "Sin cédula" / "Sin WhatsApp" si faltan. Solo visible para admin — nunca expuesto en APIs públicas.',
          },
          {
            title: 'PhoneWa en perfil público del coach (/p/[slug]) — opt-in',
            done: true,
            priority: 'P2',
            note: 'DONE (PLT-06): User.phoneWa + User.showPhoneWa en DB. Coach activa en /coach/profile. /p/[slug] muestra botón verde #25D366 full-width "Escribir por WhatsApp" con SVG + mensaje pre-redactado si showPhoneWa=true && phoneWa presente. Links legacy profile.whatsapp/instagram se mantienen como secundarios.',
          },
        ],
      },
    ],
  },

  // ─── PLATAFORMA ───────────────────────────────────────────────────────────────

  {
    id: 'plataforma',
    label: 'Plataforma — Admin, Marketplace & Notificaciones',
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    phases: [
      {
        id: 'plataforma-core',
        label: 'Core — Infraestructura base completada',
        period: 'Completado',
        items: [
          { title: 'Schema DB: CoachProfile, CoachProgram, CoachPost', done: true, note: 'Migración marketplace aplicada.' },
          { title: 'Directorio público /coaches (grid + filtros por deporte)', done: true, note: 'Infraestructura lista.' },
          { title: 'Perfil público /p/[slug] (bio, programas, posts, CTA)', done: true, note: 'Coach edita su perfil, slug, especialidades, publica contenido.' },
          { title: '/join/[code] con branding completo del coach (avatar, headline, bio)', done: true, note: 'Convierte el onboarding B2B en funnel branded del coach.' },
          { title: 'Landing page con hero, pricing y animaciones', done: true, note: 'RevealOnScroll, fadeUp hero, hover lift cards.' },
          { title: 'Panel admin: KPIs, usuarios, coaches, suscripciones, activaciones, configuración, roadmap', done: true, note: 'Control de activaciones manual. Cambio de rol en tiempo real.' },
          { title: 'Middleware: protección completa de rutas por rol', done: true, note: 'Orden: login→roleSelection→onboarding→pending→coach→admin. COACH+/dashboard→/coach/dashboard.' },
          { title: 'Emails transaccionales (Resend): welcome coach, welcome atleta B2B, asignación, forgot password', done: true, note: 'Dominio verificado. DNS en Route53. RESEND_API_KEY en Vercel.' },
          { title: 'Crons: check-in reminder (dom 23:00 UTC), sesión del día (lun 12:00 UTC), pago vencido (diario 14:00 UTC)', done: true, note: 'vercel.json configura los 3 crons. Route handlers en /api/cron/* con CRON_SECRET auth. Panel admin /admin/crons con trigger manual. Activos en Vercel en producción.' },
          { title: 'SEO: meta tags + sitemap dinámico para /coaches y /p/[slug]', done: true, note: 'og:image, og:description. Indexables para "coach running Colombia".' },
          { title: 'Ocultar Marketplace hasta tener 20+ coaches activos', done: false, note: 'Directorio vacío genera fricción. Mantener infraestructura sin promocionar.' },
          { title: 'Admin: métricas de negocio reales en /admin/metrics (5 KPIs + delta semanal)', done: true, note: 'check-ins, sesiones, planes activos, coaches con atletas, tasa onboarding. Implementado en bugfix/18.' },
          { title: 'Admin: búsqueda y filtros en /admin/users + paginación 50/página', done: true, note: 'UsersTable client component con búsqueda por nombre/email/rol. Implementado en bugfix/18.' },
          { title: 'Admin: perfil individual /admin/users/[id] (HealthProfile, plan activo, último check-in)', done: true, note: 'Página creada en bugfix/18. Incluye feature flags, coach asignado y datos de salud.' },
          { title: 'Admin: sincronizar features al cambiar rol', done: true, note: 'role/route.ts actualizado con featuresByRole map. Implementado en bugfix/18.' },
          { title: 'Admin P0: dashboard financiero — MRR estimado, fee por coach, cobros pendientes', done: true, priority: 'P0', note: 'Fix: /admin/finanzas con MRR atletas Pro ($9.99×count), fee por coach (tramos $6/$5/$3), pagos PAID/PENDING/OVERDUE. Link en sidebar desktop.' },
          { title: 'Admin P0: funnel de activación — registro → onboarding → plan activo → check-in esta semana', done: true, priority: 'P0', note: 'Implementado en /admin (overview). 4 pasos con barra de progreso, % del total y % conversión del paso anterior. Color verde/naranja/rojo según tasa.' },
          { title: 'Admin P1: feed de alertas operativas — atletas en /pending > 48h, coaches sin atletas > 7d', done: true, priority: 'P1', note: '/admin/alerts: lógica pura en domain/admin/alerts.ts (testada), link en sidebar. Severidad medium/high con semáforo. Incluye 21 tests de domain + domain/admin/finanzas.ts también extraído y testeado.' },
          { title: 'Admin P1: log de actividad — audit trail de acciones admin (quién, qué, cuándo)', done: true, priority: 'P1', note: 'AdminAuditLog en schema (db push). domain/admin/audit_log.ts con labelForAction, describeAuditEntry, colorForAction (14 tests). logAdminAction() fire-and-forget en 2 rutas API (CHANGE_ROLE, CHANGE_PLAN). /admin/audit con últimas 200 acciones.' },
          { title: 'Admin P1: eliminar usuario — acción destructiva con confirmación doble', done: true, priority: 'P1', note: 'DELETE /api/admin/users/[id]: audit log ANTES del delete (meta preserva email+name+role), luego prisma.user.delete cascade. DeleteUserButton: 2 pasos inline (confirm1 → confirm2 → delete). Impide auto-eliminación. 250 tests pasando (5 nuevos DELETE_USER en audit-log.test.ts).' },
          { title: 'Admin P2: revenue por coach — ranking de coaches por atletas activos y fee generado', done: true, priority: 'P2', note: 'Cubierto por /admin/finanzas: tabla de coaches ordenada por fee desc con tramo, nº atletas activos y total.' },
          { title: 'Admin P2: gestión de invite codes — ver, revocar y generar códigos manualmente', done: true, priority: 'P2', note: '/admin/invite-codes: GET/POST /api/admin/invite-codes + DELETE /api/admin/invite-codes/[id]. Tabla con estado activo/usado/vencido, coach y atleta que lo usó. Generador con selector de coach.' },
          { title: 'Admin P2: reset contraseña manual — admin puede disparar link de reset para cualquier usuario', done: true, priority: 'P2', note: 'ResetPasswordButton en /admin/users/[id]: llama POST /api/auth/forgot-password con el email del usuario. Feedback inline.' },
          { title: 'Admin P2: estado de crons — última ejecución y trigger manual desde el panel', done: true, priority: 'P2', note: '/admin/crons: tabla de los 3 crons con schedule human-readable + botón "Ejecutar ahora" → POST /api/admin/crons/trigger (llama internamente con CRON_SECRET). Última ejecución pendiente (Vercel no expone API pública de historial).' },
          { title: 'Admin P2: página /admin/ai y AI profile — ELIMINADO', done: true, priority: 'P2', note: 'AI eliminada del sistema (2026-08-29). Página, endpoint, SystemConfig.aiProfile, traducciones y sidebar link removidos.' },
          { title: 'Admin P3: búsqueda global (⌘K) — encontrar cualquier usuario/coach desde cualquier página admin', done: true, priority: 'P3', note: 'AdminSearchPalette en layout: ⌘K/Ctrl+K abre overlay, debounce 200ms, rankResults domain puro (17 tests), flechas+Enter para navegar, ESC cierra. GET /api/admin/search?q= con Prisma contains insensitive.' },
          { title: 'Admin P3: editor de ejercicios globales desde /admin', done: true, priority: 'P3', note: '/admin/exercises: CRUD completo (GET+POST /api/admin/exercises, PATCH+DELETE /[id]). validateExercise domain puro (23 tests). Formulario inline con selects de categoría y equipamiento. Filtro client-side por nombre/categoría.' },
          { title: 'MOB-UPG — Flujo de upgrade/marketplace in-app (mobile)', done: true, priority: 'P1', note: 'pricing.tsx (tabla Free vs Pro + checkout in-app via expo-web-browser), find-coach.tsx (pantalla B2B + marketplace próximamente). upgrade.tsx y UpgradeWall.tsx migrados de Linking.openURL a router.push pricing. Poll getMe post-pago hasta features.plan=true.' },
          { title: 'ADMIN-FEAT — Configuración de features por tipo de usuario (/admin/features)', done: true, priority: 'P1', note: 'TierFeatureConfig DB table (B2C_FREE, B2C_PRO, B2B). Migración + seed. Infrastructure repo con cache 5min. GET+PATCH /api/admin/features. UI toggle grid en /admin/features. /status route B2B usa config DB en vez de hardcode.' },
        ],
      },
      {
        id: 'plataforma-bi',
        label: 'Admin — Business Intelligence',
        period: 'Próximo',
        items: [
          { title: 'MRR estimado: coaches activos × fee por tier (tabla + total mensual en /admin)', done: true, priority: 'P0', note: 'Implementado en /admin/finanzas. Domain: src/domain/admin/finanzas.ts (coachFeeRate, mrrAthletes, mrrCoaches). Cards: MRR atletas Pro + fee coaches + total. Tabla breakdown por coach con tramo y fee.' },
          { title: 'WAU (Weekly Active Users) con tendencia 8 semanas — gráfica en /admin/metrics', done: true, priority: 'P1', note: 'Implementado en /admin/metrics. Domain: src/domain/admin/wau.ts (isoWeekKey, computeWAU, lastNWeekKeys). Bar chart nativo sin deps. "Activo" = SessionLog o WeeklyCheckIn en esa semana. 11 tests.' },
          { title: 'Retención 14 días: % atletas con al menos 1 check-in o log en los últimos 14 días', done: true, priority: 'P1', note: 'Implementado en /admin/metrics junto al WAU (grid 2/3 + 1/3). Domain: retention.ts (activeUserIdsInWindow, computeRetention, retentionColor). Base = featurePlan:true. Reutiliza eventos ya cargados para WAU. 13 tests.' },
          { title: 'Coaches activos esta semana (al menos 1 acción en los últimos 7 días)', done: true, priority: 'P1', note: 'Implementado via coach-activity.ts: detecta actividad de coaches en los últimos 7 días combinando mensajes enviados (Message.fromId) y pagos creados/actualizados (Payment). Visible en /admin/coaches.' },
          { title: 'Conversión de invite codes: códigos generados vs usados (tasa y tiempo promedio)', done: true, priority: 'P2', note: 'InviteCode ya tiene usedAt. Query: count(usedAt IS NOT NULL) / count(*) por coach. Tiempo promedio: avg(usedAt - createdAt). Visible en /admin/invite-codes o en ficha de coach.' },
          { title: 'Admin MRR real, churn mensual y ranking coaches por revenue', done: true, priority: 'P2', note: 'KPIs reales en /admin/finanzas: proAthletes desde UserSubscription(tier=PRO), churnAthletes (cancelAtPeriodEnd=true), paidCoaches (coachTier!=STARTER). MRR sub muestra "N atletas con tier PRO en DB". Gráfica histórica pendiente.' },
          { title: 'PLT-02 — Distribución geográfica de usuarios en /admin/metrics', done: true, priority: 'P2', note: 'Tabla en /admin/metrics: User.timezone → país con bandera. Columnas: país, usuarios, coaches, atletas, %. TZ_COUNTRY map con 24 zonas LatAm + España. Ordenado por total desc.' },
          { title: 'PLT-03 — Atletas sin coach (B2C tracker puro) como segmento visible en /admin/metrics', done: true, priority: 'P2', note: 'Widget B2C vs B2B en /admin/metrics: barras proporcionales con %. B2B = CoachAthlete[ACTIVE], B2C = total − B2B.' },
          { title: 'Uso del AI chat — ELIMINADO', done: true, priority: 'P3', note: 'AI eliminada del sistema (2026-08-29).' },
          { title: 'PLT-04 — Configuración de AI en /admin — ELIMINADO', done: true, priority: 'P3', note: 'AI eliminada del sistema (2026-08-29).' },
        ],
      },
      {
        id: 'plataforma-marketplace',
        label: 'Marketplace — Directorio de coaches',
        period: 'P2 — cuando 20+ coaches activos',
        items: [
          { title: 'PLT-05 — Abrir /coaches con filtros: especialidad, ciudad, nivel, precio referencial', done: false, priority: 'P2', note: 'Hoy /coaches existe en código pero está oculto de la navegación. Condición de apertura: 20+ coaches activos con perfil completo. Filtros: CoachSpecialty (RUNNING/GYM/NUTRITION/ALL), ciudad derivada de timezone, precio referencial (rango). Ordenamiento: atletas activos DESC. Requiere CoachSpecialty en DB (ARCH-02). DECISIÓN PRODUCTO: /coaches como directorio público global es prematuro con pocos coaches — marketplace vacío daña credibilidad. Evaluar si se oculta hasta alcanzar masa crítica o se mantiene solo para SEO.' },
          { title: 'PLT-05b — Coach discovery in-app: pantalla de descubrimiento de coaches para atleta B2C', done: false, priority: 'P2', note: 'Atleta B2C Free/Pro sin coach no tiene forma de descubrir coaches desde dentro de la app (mobile ni web). Hoy /find-coach existe en web pero no en mobile. Feature: pantalla accesible desde dashboard/plan del atleta con lista de coaches filtrable por deporte, ciudad, rango de precio. Diferencia vs /coaches (público): esta pantalla vive dentro del app layout con auth, puede mostrar coaches recomendados por cercanía/deporte, y el CTA es "Solicitar unirse" (no "Crear cuenta"). Prerequisito: PLT-05 (20+ coaches activos). /p/[slug] se mantiene como herramienta de venta individual del coach (el coach comparte su link en redes — canal de adquisición externa, no marketplace).' },
          { title: 'PLT-06 — Botón "Contactar coach" en /p/[slug] con WhatsApp como canal primario', done: true, priority: 'P2', note: 'DONE: coach select ampliado con phoneWa/showPhoneWa. Botón verde #25D366 full-width en sección Contacto con SVG WhatsApp + mensaje pre-redactado "Hola, te encontré en Medaliq y me interesa tu asesoría". Se muestra solo si coach.showPhoneWa=true && coach.phoneWa presente. Links legacy profile.whatsapp/instagram se mantienen como secundarios.' },
        ],
      },
      {
        id: 'plataforma-notificaciones',
        label: 'Notificaciones — Centro in-app y crons',
        period: 'P1-P2',
        items: [
          { title: 'PLT-07 — Centro de notificaciones in-app (campana + feed de eventos)', done: true, priority: 'P1', note: 'DONE: Schema + migración 20260708000001. APIs: GET /api/notifications + GET /api/mobile/notifications (take 30, unreadCount), PATCH /api/notifications/read-all + /api/mobile/notifications/read-all. Web: bell en sidebar desktop + top bar mobile → /notifications/page.tsx (client, mark-all-read). Mobile: bell+badge naranja en dashboard header → app/(app)/notifications.tsx (FlatList, type icons, mark-all-read). Tipos soportados: SESION_HOY/CHECKIN_DISPONIBLE/PLAN_ACTUALIZADO/MENSAJE_COACH/AJUSTE_NUTRICIONAL/LOGRO/PROPUESTA_COACH.' },
          { title: 'PLT-08 — Cron: atleta sin actividad 3+ días → push + email re-engagement', done: true, priority: 'P2', note: 'DONE: GET /api/cron/inactive-athlete-reminder (CRON_SECRET auth). Query: User[ATHLETE, onboardingCompleted=true, ACTIVE] sin SessionLog ni GymSession >= cutoff (now-3d), con historial previo. Push "¿Todo bien? 💪 + N días" + sendReengagementEmail (resend.ts). vercel.json: "0 14 * * *".' },
          { title: 'PLT-09 — Cron: racha en riesgo → push al atleta (1 día sin actividad)', done: true, priority: 'P2', note: 'DONE: GET /api/cron/streak-risk (CRON_SECRET auth). Atleta entrenó ayer pero no hoy, racha ≥ 3 días consecutivos (SessionLog + GymSession últimos 30d). Push "Tu racha está en riesgo 🔥 · {streakDays} días seguidos". data: { screen: "log" }. vercel.json: "0 20 * * *".' },
          { title: 'PLT-10 — Cron: atleta en /pending 48h → push + email al coach', done: true, priority: 'P1', note: 'DONE: GET /api/cron/pending-athlete-reminder (CRON_SECRET auth). Query: CoachAthlete[ACTIVE] WHERE athlete.onboardingCompleted=true AND athlete.featurePlan=false AND createdAt < now()-48h. Email: sendCoachPendingAthleteEmail (resend.ts) + push al coach. vercel.json: "0 12 * * *" (12:00 UTC = 07:00 COT).' },
          { title: 'PLT-11 — Trigger Notification records en eventos clave del sistema', done: true, priority: 'P2', note: 'DONE (2026-07-19). infrastructure/db/notification.ts: createNotification(userId, type, title, body, options). Wired en 5 eventos: (1) check-in ajusta sesiones → PLAN_ACTUALIZADO al atleta (checkin/route.ts), (2) coach edita sesión → PLAN_ACTUALIZADO al atleta (coach/sessions/edit/route.ts), (3) mensaje enviado → MENSAJE_COACH al destinatario (messages/route.ts + mobile/messages/route.ts, push:false — push ya existe), (4) ajuste nutricional propuesto → AJUSTE_NUTRICIONAL al atleta (log/session/route.ts), (5) PR detectado en gym → LOGRO al atleta (gym/session/complete/route.ts, 3 paths). Todos fire-and-forget (.catch(() => {})).' },
        ],
      },
    ],
  },

  // ─── LANDING PAGE ─────────────────────────────────────────────────────────────

  {
    id: 'landing',
    label: 'Landing Page — Ventas & Credibilidad',
    period: 'En construcción',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#c4b5fd',
    phases: [
      {
        id: 'landing-p0',
        label: 'P0 — Legal & SEO Técnico (Bloqueante)',
        period: 'Urgente',
        items: [
          { title: 'Páginas /terminos y /privacidad con contenido real (Ley 1581 Colombia + LGPD Brasil básico)', done: true, priority: 'P0', note: 'Páginas existentes actualizadas: Ley 1581 de 2012 (Colombia) + LGPD Brasil (Lei 13.709/2018) + derechos ARCO + transferencias internacionales + fecha jul-2026.' },
          { title: 'Meta tags: <title>, <meta description> optimizados por página', done: true, priority: 'P0', note: 'layout.tsx ya tenía title/description. Cada page legal tiene su propio metadata export.' },
          { title: 'Open Graph tags (og:title, og:description, og:image) para preview en WhatsApp/LinkedIn/Twitter', done: true, priority: 'P0', note: 'DONE (PR #45): src/app/opengraph-image.tsx — ImageResponse edge (1200×630px). META_IMAGE=https://medaliq.com/opengraph-image. /coaches y /p/[slug] con generateMetadata propio.' },
          { title: 'robots.txt + sitemap.xml (incluyendo /coaches y /p/[slug])', done: true, priority: 'P0', note: 'src/app/robots.ts: allow público, disallow app privada. src/app/sitemap.ts: páginas estáticas + /p/[slug] dinámico desde CoachProfile.' },
          { title: 'hreflang para es/en/pt — indicar a Google el idioma de cada versión', done: true, priority: 'P0', note: 'layout.tsx metadata.alternates.languages: es/en/pt → medaliq.com (single-URL multilingüe). Genera <link rel="alternate" hreflang>.' },
          { title: 'Cookie consent banner — requerido si se usa cualquier analytics/pixel', done: true, priority: 'P0', note: 'src/app/_components/CookieConsent.tsx: banner en footer, Accept/Reject, guarda preferencia en localStorage (medaliq_cookie_consent). Añadido a layout.tsx.' },
          { title: 'Eliminar toda referencia a "Trial" o "30 días gratis" del copy de la landing — producto sin trial', done: true, priority: 'P0', note: 'Aplicado en ES/EN/PT: step1Desc, step5Title/Desc, proCta, freeF1/F2/F3, proF4, guarantee.badgeTitle, guarantee.faq4A. Keys trialLabel..trialF5 eliminadas de types.ts y las 3 traducciones. page.tsx: span "$79.99/año · 30 días gratis" reducido a solo "$79.99/año". Commit: fix(landing): eliminar referencias trial + corregir copy — P0 bloqueante.' },
          { title: 'Corregir paso 2 del flujo "Cómo funciona" — el sistema NO genera planes automáticamente', done: true, priority: 'P0', note: 'Corregido en step2Desc ES/EN/PT: "Medaliq genera su plan automáticamente" → "queda listo en minutos. Tú le asignas el plan desde tu panel." Mismo commit que el item de trial.' },
        ],
      },
      {
        id: 'landing-p1',
        label: 'P1 — Conversión y Credibilidad',
        period: 'Alta prioridad',
        items: [
          { title: 'Schema JSON-LD: Organization + SoftwareApplication + FAQPage — rich results en Google + AI search', done: true, priority: 'P1', note: 'DONE: WebSite+SearchAction en layout.tsx. SoftwareApplication+FAQPage+Organization en page.tsx landing. Person en /p/[slug]. llms.txt en /public para AI crawlers. robots.ts permite GPTBot/PerplexityBot/ClaudeBot/Google-Extended. Meta robots max-snippet:-1 para AI Overviews.' },
          { title: 'Testimonios con foto real o avatar + nombre + ciudad + deporte (reemplazar texto plano)', done: false, priority: 'P1', note: 'Testimonios de texto sin foto tienen ~0% credibilidad. Mínimo: foto de perfil real o avatar generado con iniciales.' },
          { title: 'Contador de coaches/atletas creíble — reemplazar "8 entrenadores reservaron"', done: true, priority: 'P1', note: 'DONE: Contador fake eliminado. Reemplazado por mensaje "¿Sin entrenador? Medaliq también es para ti" — sin números inventados. Cuando haya 20+ coaches reales se mostrará el número.' },
          { title: 'Sección comparativa vs TrueCoach/Excel — tabla con diferenciador 0% fee', done: true, priority: 'P1', note: 'DONE: Decisión de producto — sin comparativas ni menciones a competidores. Implementado en su lugar: sección "Todo lo que necesitas" con 6 feature cards para coaches (constructor de planes, panel multi-atleta, rutinas de gym, cobros, notas por sesión, alertas de progreso). Diferenciador 0% fee subido al hero sin mencionar competidores.' },
          { title: 'WhatsApp flotante o widget de contacto directo (estándar en LatAm)', done: true, priority: 'P1', note: 'DONE (PR #45): src/components/ui/whatsapp_button.tsx — flotante bottom-right, visible en rutas públicas. Lee NEXT_PUBLIC_WHATSAPP_NUMBER env.' },
          { title: 'Email capture secundario — formulario "únete a la lista" para quienes no convierten hoy', done: true, priority: 'P1', note: 'DONE: Reemplazado por CTA WhatsApp directo (wa.me/573113630732). Más efectivo en LatAm que email — respuesta en minutos, sin formularios. Sección "¿Tienes dudas? Escríbenos por WhatsApp" antes de Garantía.' },
          { title: 'Corregir copy mobile en pricing atleta PRO', done: true, priority: 'P1', note: 'proF4 actualizado en ES/EN/PT: "Webapp móvil incluida · App nativa en desarrollo". Aplicado en el mismo commit P0.' },
          { title: 'Landing cleanup: consistencia de producto + SEO + AI search + HTML semántico', done: true, priority: 'P1', note: 'DONE (2026-09-05): Sem X/18→X/12 (producto max 12W). gym→ejercicios. Features Pro diferenciadas (zonas FC + PRs). <a><button>→<a> (HTML válido). LanguageSwitcher removido (landing hardcodea ES). Meta title/desc/keywords optimizados. JSON-LD: SoftwareApplication+FAQPage+Organization. llms.txt para AI crawlers. robots.ts: GPTBot/PerplexityBot/ClaudeBot/Google-Extended permitidos. max-snippet:-1 para AI Overviews.' },
          { title: 'Plan page: alinear WeekSection con Figma (active + completed + tracking)', done: true, priority: 'P1', note: 'DONE (2026-09-10): WeekNavBar bg-[#f1f5f9]→bordered white (Figma match). PlanCalendarStrip desktop variant="cards"→grid (cells en grid compartido, no cards individuales). GridCell: checkmark junto al número+emoji siempre visible (antes CheckCircle2 reemplazaba emoji). PlanCompletedClient y PlanTrackingClient: PageTopBar+calendar envueltos en card blanca con shadow+progress bar+footer sesiones (antes separados). Consistencia visual en los 3 estados del plan.' },
          { title: 'Dashboard+Plan: unificar estilos WeekSection y Day cells con Figma', done: true, priority: 'P1', note: 'DONE (2026-09-11): PageTopBar title text-[20px]→text-2xl (24px, Figma match). GridCell alineación center→left (Figma match). ✓/HOY movido de junto al date number a top-right del cell (justify-between con day label). PlanCompletedClient: inline grid reemplazado por WeekDayStrip compartido (elimina duplicación, estilos consistentes). Figma: "Variante: Mi Plan"→"WeekSection" en 5 frames (naming unificado con código).' },
          { title: 'Dashboard: alinear hero cards y calendar strip con Figma', done: true, priority: 'P1', note: 'DONE (2026-09-11): NutritionProgressCard label "Objetivo diario"→"Calorías de hoy" (card+compact). ActivityCard: +📊 icon. WeightCard: +⚖️ icon. DashboardCard empty cells: fallback "Sin sesión" para celdas sin sesión (antes vacías).' },
          { title: 'Unificar WeekDayStrip: Plan usa misma variante cards que Dashboard', done: true, priority: 'P1', note: 'DONE (2026-09-11): Default de WeekDayStrip cambiado de variant="grid" a variant="cards". Plan y Dashboard ahora renderizan el mismo DashboardCard — componente global compartido sin variantes divergentes en web desktop. GridCell reescrito previamente para match 1:1 con DashboardCard (10 diffs: isInverted, done bg, checkmark, emoji, tipografía, colores).' },
          { title: 'Google OAuth en /login visible pero en standby — activar o quitar de la UI', done: true, priority: 'P1', note: 'Botón "Continuar con Google" y divider eliminados de login/page.tsx. Flujo en standby — reactivar cuando se configure GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET en Google Cloud Console + Vercel. Branch: bugfix/mvp-ux-flows.' },
          { title: 'Subir el diferenciador 0% fee al hero section — visible en los primeros 3 segundos', done: true, priority: 'P1', note: 'DONE: pill "✓ 0% de comisión · tus ingresos son tuyos, siempre" en el hero, debajo de los CTAs. Eliminada mención a TrueCoach — el diferenciador se comunica por valor propio, sin comparativas.' },
          { title: 'Actualizar features del tier Free del atleta en pricing — alinear con modelo real', done: true, priority: 'P1', note: 'freeF1/F2/F3 actualizados en ES/EN/PT: incluye nutrición y gym, quita "dashboard básico". Aplicado en el mismo commit P0.' },
          { title: 'Agregar sección del flujo atleta B2C en landing — mostrar el valor del Free permanente', done: true, priority: 'P1', note: 'DONE: Sección "¿Sin entrenador? Medaliq también es para ti" con 2 cards (Free: log + nutrición + gym gratis / Pro: plan adaptativo + check-in + métricas $9.99/mes). Añadida entre Cómo funciona y Testimonios.' },
        ],
      },
      {
        id: 'landing-p2',
        label: 'P2 — Ventas y Confianza',
        period: 'Próximo sprint',
        items: [
          { title: 'Video demo de 60-90 segundos — mostrar el flujo real del coach + atleta', done: false, priority: 'P2', note: 'Los coaches necesitan ver el producto antes de registrarse. Sin video demo la tasa de conversión de coaches es ~30% menor. Prioridad: pantalla de coach (panel de atletas + asignación de rutina).' },
          { title: 'Calculadora de ROI para coaches — "¿cuánto tiempo recuperas con Medaliq?"', done: true, priority: 'P2', note: 'DONE: ROICalculator.tsx client component. Slider 1-100 atletas → horas/semana ahorradas (1.5h×atletas×65%) + USD equivalente ($25/h). Sección antes de Pricing en landing.' },
          { title: 'Sección seguridad de datos — "Tus datos y los de tus atletas están seguros"', done: true, priority: 'P2', note: 'DONE: Card con escudo SVG entre WhatsApp CTA y garantía. Menciona HTTPS, Neon, backups, no compartir datos con terceros.' },
          { title: 'Garantía con términos explícitos — "30 días o te ayudamos a exportar todo"', done: true, priority: 'P2', note: 'DONE: Badge verde "✓ 30 días de garantía" centrado encima del título de la sección garantía en landing. CORREGIDO (2026-09-12): removida promesa de "exportar todo" (no existe funcionalidad de export). Ahora dice "sin letra chica, sin permanencia".' },
          { title: 'Auditoría de landing — eliminar desinformación y claims no respaldados', done: true, priority: 'P0', note: 'DONE (2026-09-12): (1) aggregateRating fabricado 4.8/50 reviews eliminado del structured data. (2) Testimonios falsos convertidos a "escenarios" sin nombres ficticios. (3) Pro B2C "plan periodizado" cambiado a "seguimiento semanal + métricas". (4) Promesas de "exportar todo" eliminadas en 3 idiomas. (5) FAQ structured data alineado. Archivos: page.tsx, es.ts, en.ts, pt.ts.' },
          { title: 'Página 404 personalizada con CTA y navegación de regreso', done: true, priority: 'P2', note: 'DONE: not-found.tsx ya tenía logo + botones. Verificado correcto.' },
          { title: 'Meta Pixel + Google Tag Manager — tracking de conversiones para ads', done: false, priority: 'P2', note: 'Sin pixel no hay retargeting. Sin GTM no hay medición de conversión. Requerido antes de invertir en cualquier pauta paga.' },
        ],
      },
      {
        id: 'landing-p3',
        label: 'P3 — SEO Orgánico y Crecimiento',
        period: 'Mediano plazo',
        items: [
          { title: 'Blog/recursos — 2-3 artículos iniciales para SEO orgánico', done: false, priority: 'P3', note: 'Artículos target: "Cómo periodizar para runners principiantes", "Gestión de atletas online: guía para coaches". Tráfico orgánico sin inversión en pauta.' },
          { title: 'Landing pages por deporte — /running y /gym con copy específico', done: false, priority: 'P3', note: 'Permite rankear para búsquedas como "app para entrenadores de running Colombia". Copy diferente por segmento.' },
          { title: 'Sección de integraciones — Garmin, Strava, Apple Watch (aunque sea coming soon)', done: false, priority: 'P3', note: 'Genera percepción de producto maduro. Footer o sección "compatible con" con logos grises + "próximamente".' },
          { title: 'manifest.json y PWA básico — instalable desde el navegador móvil', done: false, priority: 'P3', note: 'Permite instalar la landing como app en home screen sin pasar por stores. Aumenta retention de usuarios móviles.' },
          { title: 'Press kit / media page — logo, screenshots, descripción oficial para prensa', done: false, priority: 'P3', note: 'Cuando un influencer fitness o medio quiera escribir sobre Medaliq, necesita assets. /press o /media con logo SVG, paleta, screenshots.' },
          { title: 'A/B testing de hero copy y CTA — validar variantes de conversión', done: false, priority: 'P3', note: 'Test A: copy actual "Tus atletas ven su progreso" vs Test B: copy pain-first "¿Cuántas horas pierdes en Excel cada semana?". Implementar con Vercel Edge Config o PostHog.' },
        ],
      },
    ],
  },


  // ─── MOBILE ───────────────────────────────────────────────────────────────────

  {
    id: 'mobile',
    label: 'Mobile',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#a5f3fc',
    phases: [
      {
        id: 'mobile-core',
        label: 'Core & QA',
        period: 'En construcción',
        items: [
          { title: 'Auth nativa: login email/password con JWT en SecureStore', done: true, note: 'src/api/auth.ts. Token Bearer en todas las requests. Boot: index.tsx → getMe → route guard.' },
          { title: 'Bottom tabs: Dashboard, Plan, Gym, AI Coach, Check-in, Nutrición, Perfil', done: true, note: 'Expo Router file-based. Safe area insets en todos.' },
          { title: 'Dashboard, Plan, Check-in, Nutrición, Progreso, Log, Perfil — pantallas completas', done: true, note: 'Pull-to-refresh, error con retry. /api/mobile/* endpoints.' },
          { title: 'Gym session tracker mobile (sets/reps/peso, timer, FinishModal RPE)', done: true, note: 'app/(app)/gym-session.tsx + gym-history.tsx.' },
          { title: 'Mensajería mobile: messages + coach-inbox + coach-chat', done: true, note: 'Polling 5s chat atleta, 30s lista coach. Badge unread.' },
          { title: 'Google OAuth mobile: expo-auth-session + POST /api/mobile/auth/google', done: true, note: 'id_token → JWT. Si needsRoleSelection → pantalla select-role.' },
          { title: 'Rate limiting mobile (11 endpoints) y feature gating PRO en endpoints mobile', done: true, note: 'requireFeature() en nutrition/log, progress, gym/week, nutrition/generate-meals.' },
          { title: 'Onboarding mobile: steps por deporte, hr-fitness, stepHistory stack', done: true, note: 'Sincronizado con flujo web. Ruta corta GYM/BODY.' },
          { title: 'Fix React Rules of Hooks: hooks antes de returns condicionales en 6 pantallas', done: true, note: 'gym, checkin, plan, ai-coach, nutrition, progress.' },
          { title: 'UX: headers homogéneos LinearGradient (#1e3a5f→#2d5a8e), safe area insets en todos los screens', done: true, note: 'nutrition, progress, gym-history — patrón uniforme.' },
          { title: 'Pantalla /upgrade para INACTIVE + boot check trial expirado', done: true, note: 'app/(app)/upgrade.tsx. index.tsx: userPlan === "INACTIVE" → upgrade.' },
          { title: 'Fix /upgrade/page.tsx — eliminar referencias a trial, corregir precio $15 → $9.99, actualizar features Free', done: true, priority: 'P0', note: 'Trial eliminado del modelo de negocio (2026-07-03). Corregido: título "Tu trial de 30 días terminó" → "Elige tu plan", Free features actualizadas (nutrición + gym), Pro $15 → $9.99, CTA mailto actualizado. Gap detectado al auditar Figma vs código.' },
          { title: 'AI Coach chat mobile — UI implementada, /api/mobile/ai/chat NO existe aún', done: true, note: 'app/(app)/(tabs)/ai-coach.tsx con FlatList + UpgradeWall. AI removida intencionalmente.' },
          { title: 'Push notifications: recordatorio sesión del día', done: true, priority: 'P1', note: 'DONE (2026-07-29). PUSH-01: expo-notifications instalado + registerForPushNotificationsAsync() en src/lib/notifications.ts + POST /api/mobile/push-token (guarda en User.pushToken). Tap handler addNotificationResponseReceivedListener en _layout.tsx navega a screen correcta via SCREEN_ROUTES map. app.json: extra.eas.projectId placeholder (Miguel debe reemplazar con ID real de expo.dev). Pendiente Miguel: EAS rebuild para recibir tokens APNs/FCM reales.' },
          { title: 'FEAT-MOBILE-01 — week-sessions: mostrar SessionLogs libres cuando no hay plan activo o semana sin PlanWeek', done: true, priority: 'P2', note: 'DONE. El path !planMeta && !assignedWorkout ya estaba implementado. Fix nuevo: else branch en selectedWeek=null (plan activo sin PlanWeek) → query SessionLog WHERE plannedSessionId=null + completedAt en rango semana → agrupar por dayOfWeek. Atleta B2C sin plan ni gym ve su actividad libre de la semana.' },
        ],
      },
      {
        id: 'mobile-platform',
        label: 'Platform, BLE & Stores',
        period: 'Futuro',
        items: [
          { title: 'Instalar Xcode 15+ y Android Studio (SDK 34+)', done: false, note: 'Requerido para BLE, HealthKit, Health Connect en dispositivo real.' },
          { title: 'EAS Build: perfiles dev/preview/production + publicar en App Store y Google Play', done: false, note: 'Apple Developer ($99/año) + Google Play ($25). Assets: icono 1024x1024, screenshots, Privacy Policy en medaliq.com/privacy.' },
          { title: 'OTA Updates con EAS Update para hotfixes post-publicación', done: false, note: 'eas update --branch production. Cambios JS/UI sin re-review de store.' },
          { title: 'Monorepo pnpm (apps/web + apps/mobile + packages/shared-types)', done: false, note: 'Hoy web y mobile tienen tipos duplicados. pnpm-workspace.yaml cuando sea prioritario.' },
          { title: 'INT-01 — Apple HealthKit + Google Health Connect: sync automático de actividades, FC, sueño y VO2max', done: true, priority: 'P1', note: 'DONE (2026-07-29). iOS: react-native-health (managed Expo plugin). Permisos: Workout/HeartRate/RestingHeartRate/SleepAnalysis/VO2Max. syncRecent() en _layout.tsx fire-and-forget al autenticar. Pre-fill check-in desde HealthKit (FC + sueño). UI integrations.tsx con toggle. Campos SessionLog ya migrados (INT-05). Pendiente Miguel: npm install react-native-health + EAS rebuild. Ver grupo integraciones en roadmap.' },
          { title: 'INT-02 — Strava OAuth: importar actividades completadas → auto-completa SessionLog', done: true, priority: 'P1', note: 'DONE (2026-07-29). OAuth redirect+callback, token refresh, webhook challenge+handler, activity fetcher, mapper sport_type→discipline. WearableConnection.providerAccountId para mapeo owner_id→userId. UI settings/integrations web. DELETE desconectar. Admin one-time subscribe endpoint. Pendiente Miguel: STRAVA_CLIENT_ID/SECRET/VERIFY_TOKEN en Vercel + pnpm prisma migrate deploy (migración 20260729000001) + POST /api/admin/integrations/strava/subscribe. Ver grupo integraciones en roadmap.' },
          { title: 'INT-03 — Garmin Connect API: VO2max, HRV, Training Status, sueño, Body Battery', done: false, priority: 'P2', note: 'Más popular entre corredores serios en LatAm. Los datos más ricos del mercado: VO2max, HRV, Training Status (productivo/sobrecarga), Body Battery. REQUIERE INVESTIGACIÓN: partnership con Garmin Health API — proceso de aprobación y tiempo estimado desconocidos. Alternativa MVP: importar .fit files manualmente. Ver integraciones.md.' },
          { title: 'INT-04 — BLE HRM: conectar monitor de FC por Bluetooth durante sesión (Polar H10, Wahoo TICKR)', done: false, priority: 'P2', note: 'FC en tiempo real durante entrenamiento — visual de zona actual en gym tracker mobile. react-native-ble-plx, UUID 0x180D (Heart Rate Service). Atletas sin smartwatch pero con banda de FC (~$50-80 USD). Requiere bare workflow o config plugin. FC media/máxima → auto-guardada en SessionLog.' },
          { title: 'INT-05 — Schema DB: campos nuevos para datos de wearables en SessionLog y HealthProfile', done: true, priority: 'P1', note: 'Migración 20260708000002_gym_wearables aplicada en Neon prod. SessionLog: caloriesBurned Int?, avgPaceSecPerKm Int?, dataSource String?, externalId String? (hrAvg/hrMax ya existían de DBA-P1). HealthProfile: vo2maxEstimate Float?. WeeklyCheckIn: hrvMs Float?. SetLog: setLogType SetLogType @default(WORK) (enum WORK/WARMUP/DROPSET).' },
        ],
      },
      {
        id: 'mobile-gaps',
        label: 'Gaps Mobile vs Web — Paridad & Tipos',
        period: 'P0–P3 según prioridad',
        items: [
          // ── P0 — Tipos TypeScript que silencian datos reales ─────────────
          { title: 'MOB-P0-01 — CheckinStatus: agregar pendingSuggestions[] al GET /api/mobile/checkin', done: true, priority: 'P0', note: 'DONE. pendingSuggestions?: CheckinSuggestion[] agregado a CheckinStatus. La pantalla submitted ahora muestra sugerencias pendientes con botones aceptar/rechazar.' },
          { title: 'MOB-P0-02 — CheckinResult: agregar sleepScore y suggestions[] al POST response', done: true, priority: 'P0', note: 'DONE. CheckinResult reestructurado: suggestions? a nivel root (no dentro de adjustment). Bug crítico corregido: setSuggestions(data.adjustment?.suggestions) → setSuggestions(data.suggestions). Las sugerencias ahora se muestran correctamente post-envío.' },

          // ── P1 — Features completas en backend sin UI mobile ──────────────
          { title: 'MOB-P1-01 — Food log: botón delete en UI mobile (endpoint DELETE ya existe)', done: true, priority: 'P1', note: 'DONE. deleteFoodLog() en nutrition.ts. Botón × con confirmación Alert en cada fila del log en TrackingSection. Invalida nutrition-log y nutrition-summary al eliminar.' },
          { title: 'MOB-P1-02 — Food proposals: UI "Proponer alimento" + "Mis propuestas" (3 endpoints listos)', done: true, priority: 'P1', note: 'DONE. ProposeFoodModal.tsx en src/components: formulario completo (nombre, categoría chips, macros por 100g, porción opcional, notas). MyProposalsSection en nutrition.tsx con badges PENDING/APPROVED/REJECTED. Botón "Proponer alimento" al final de la pantalla.' },
          { title: 'MOB-P1-03 — Weekly nutrition summary: llamar GET /api/mobile/nutrition/log/summary', done: true, priority: 'P1', note: 'DONE. getWeeklyNutritionSummary() + WeeklyNutritionSummary type en nutrition.ts. Componente WeeklySummarySection en nutrition.tsx: días registrados, kcal promedio vs target, barra de adherencia con feedback textual.' },
          { title: 'MOB-P1-04 — Gym session: botón "Cambiar ejercicio" (exerciseOverrides ya tipado)', done: true, priority: 'P1', note: 'YA IMPLEMENTADO. Botón "Sustituir" en header de ejercicio (gym-session.tsx línea 1144). SwapModal conectado con handleSwap. Overrides se incluyen en el payload al finalizar. Estado era stale.' },
          { title: 'MOB-P1-05 — gymAdherenceByWeek: agregar al endpoint /api/mobile/progress y tipo ProgressData', done: true, priority: 'P1', note: 'DONE. Backend: query rawGymSessions en Promise.all + agrupación por lunes ISO → gymAdherenceByWeek[{weekLabel,sessions}] últimas 8 semanas. Tipo: gymAdherenceByWeek en ProgressData. UI: sección "Sesiones de gym por semana" en progress.tsx con barras relativas al máximo semanal.' },

          // ── P2 — Datos que llegan pero no se muestran ────────────────────
          { title: 'MOB-P2-01 — Progress tab: sección hrPoints (FC reposo por semana) no renderizada', done: true, priority: 'P2', note: 'DONE. Sección "FC Reposo" en progress.tsx: último bpm, delta vs primer registro, badge contextual (Atlético <55/Normal <70/Elevado), sparkline últimas 8 semanas.' },
          { title: 'MOB-P2-02 — Progress tab: sleepHours en bienestar no se muestra', done: true, priority: 'P2', note: 'DONE. Fila "Sueño promedio" en sección bienestar de progress.tsx: avgSleep calculado desde wellbeingPoints.sleepHours, barra azul, feedback Excelente ≥8h / Bueno ≥7h / Mejorable.' },
          { title: 'MOB-P2-03 — Gym session: input de duración visible (estado durationMin ya declarado)', done: true, priority: 'P2', note: 'YA IMPLEMENTADO. TextInput "Duración (minutos)" existe en FinishModal (gym-session.tsx línea ~403). Estado era stale.' },
          { title: 'MOB-P2-04 — Hidratación mobile: usar waterMlTarget real en vez de mealPlan.hydrationL', done: true, priority: 'P2', note: 'DONE. (1) Backend /api/mobile/nutrition/route.ts incluye waterMlTarget; (2) NutritionData type añadido waterMlTarget?; (3) HydrationSection rediseñada con props {waterMlTarget?, fallbackL?}; (4) call site usa data.waterMlTarget con fallback a mealPlan hydrationL.' },

          // ── P3 — Features ricas en web sin equivalente mobile ─────────────
          { title: 'MOB-P3-01 — Log run: comparativa vs sesión anterior (web lo tiene, mobile no)', done: true, priority: 'P3', note: 'DONE. Backend: /api/mobile/log/last-session (nuevo, usa getMobileUser). API: getLastRunSession(type) en progress.ts + tipo LastRunSession. UI: card azul comparativa en log-run.tsx aparece cuando el usuario selecciona tipo de corrida — muestra duración, distancia, RPE y notas de la última sesión del mismo tipo.' },
          { title: 'MOB-P3-02 — Progress: benchmarks y PRs gym en endpoint mobile', done: true, priority: 'P3', note: 'DONE. Backend: queries rawBenchmarks (performanceBenchmark.findMany) + rawGymPRs (setLog isPR:true) en /api/mobile/progress/route.ts. Tipos: Benchmark y GymPR en progress.ts. UI: sección PRs con ejercicio/peso/reps/fecha + sección benchmarks con formato inteligente de tiempo/valor en progress.tsx.' },
          { title: 'MOB-P3-03 — Health profile mobile: agregar campos faltantes (edad, deporte, lesiones)', done: true, priority: 'P3', note: 'DONE. Backend: profilePatchSchema + handler extendidos con gender, sport, experienceLevel, injuries[], conditions[]. Select actualizado en GET y PATCH. Tipos: HealthProfile + ProfilePatchPayload actualizados. UI: sección "Identidad deportiva" (dateOfBirth, género, deporte, nivel) + sección "Salud" con ChipSelector para lesiones y condiciones.' },

          // ── Cleanup — tipos stale ─────────────────────────────────────────
          { title: 'MOB-CLEAN-01 — dashboard.ts: eliminar trialDaysLeft (TRIAL eliminado del modelo)', done: true, priority: 'P3', note: 'DONE. Campo trialDaysLeft eliminado de DashboardData en dashboard.ts.' },
          { title: 'MOB-CLEAN-02 — profile.tsx: eliminar badge TRIAL → "Trial 30 días"', done: true, priority: 'P3', note: 'DONE. Eliminados: entry TRIAL del planLabel map, badge condicional plan===TRIAL, banner "Trial activo 30 días". Solo FREE/PRO/INACTIVE.' },

          // ── Paridad Nutrición — Mobile gaps identificados 2026-07-09 ──────────
          { title: 'MOB-NUT-01 — Banner contexto de fase del plan en pantalla nutrición mobile (carga/descarga)', done: true, priority: 'P1', note: 'DONE (2026-07-17). planPhaseContext: string | null añadido a /api/mobile/nutrition/route.ts (query PlanWeek.isRecoveryWeek + sessions.intensity en paralelo con el resto). Valores: "Semana de descarga" | "Semana de carga alta" | "Semana de carga media" | null. NutritionData type actualizado. Banner azul con subtexto contextual en nutrition.tsx sobre los macros.' },
          { title: 'MOB-NUT-02 — Gráfica adherencia nutricional 30 días en /progress mobile', done: true, priority: 'P2', note: 'DONE (2026-07-30). Backend: rawFoodLogs (FoodLog últimos 30 días, kcalLogged snapshot con fallback a kcalPer100g×grams) + nutritionPlan (targetKcalEasy) en Promise.all de /api/mobile/progress/route.ts. Agrupación por date → pct vs targetKcalEasy. nutritionAdherence[] en response. Tipo: nutritionAdherence en ProgressData (src/api/progress.ts). UI: sección "Adherencia nutricional" en progress.tsx — barras verticales últimos 14 días, verde ≥80%/naranja 60-79%/rojo <60%, avg% en header, leyenda de colores.' },
          { title: 'MOB-LOG-01 — Historial unificado running+gym en mobile (pantalla log-history)', done: true, priority: 'P2', note: 'DONE (2026-07-24). Backend: GET /api/mobile/log/history — merge SessionLog (running) + GymSession (completed) ordenado por fecha desc, top 40. Mobile: app/(app)/log-history.tsx — RunCard con emoji, tipo, km/duración/HR/RPE/notas + GymCard con template, ejercicios, duración/RPE. CTA "Ver historial de sesiones →" en log.tsx. Gym tab: botón "Historial de sesiones" reapunta a log-history (unificado en vez de gym-history solo).' },
        ],
      },
      {
        id: 'mobile-plan-gym',
        label: 'Paridad Plan & Gym — Mobile vs Web',
        period: 'P1 inmediato · P2–P3 backlog',
        items: [
          // ── P1 — Impacto directo en experiencia del atleta ───────────────
          { title: 'PLN-MOB-01 — PlanCompletionCard en mobile: celebración cuando el plan termina', done: true, priority: 'P1', note: 'GET /api/mobile/plan devuelve { lastCompletedPlan } cuando no hay plan activo. plan.tsx muestra pantalla de celebración con trofeo, stats de adherencia y mensaje de próximo plan.' },
          { title: 'GYM-MOB-01 — Resumen post-sesión en mobile: banner con stats después de completar', done: true, priority: 'P1', note: 'Creado src/store/gymSession.ts (Zustand). gym-session.tsx onSuccess almacena { durationMin, prCount, prs }. gym.tsx muestra banner verde dismissible con duración y PRs al volver.' },
          { title: 'GYM-MOB-02 — Banner Plan+Gym en mobile: detectar sesión running en plan activo', done: true, priority: 'P1', note: '/api/gym/session/today incluye plannedRunToday via query paralela al plan activo. GymSessionData tipado. gym.tsx muestra banner azul cuando hay running también hoy.' },
          // ── P2 — Datos presentes sin renderizar ─────────────────────────
          { title: 'PLN-MOB-02 — focusDescription + isRecoveryWeek en mobile: datos disponibles sin UI', done: true, priority: 'P2', note: 'DONE. API: focusDescription+isRecoveryWeek agregados al map de weeks en /api/mobile/plan/route.ts. Tipo: PlanWeek en src/api/plan.ts actualizado. UI: chips row en plan.tsx — chip verde "🌿 Semana de recuperación" + chip azul con focusDescription. Aparecen entre CalendarStrip y "Sesión seleccionada".' },
          { title: 'PLN-UI-FIGMA — Mi Plan: alinear UI web + mobile con Figma (3 plataformas)', done: true, priority: 'P2', note: 'Web desktop + web-mobile + mobile nativo. Coach badge: dot verde "Diseñado por Coach X" (antes emoji 👨‍🏫). Race countdown: badge naranja en right prop de PageTopBar (desktop) y header (mobile). Coach note: card azul en SessionDetailCard (web + mobile nativo). PageTopBar subtitle cambiado a ReactNode. Mobile: SessionDetailCard coachNote separado de detailText fallback → card azul propia.' },
          // ── P3 — Features grandes ────────────────────────────────────────
          { title: 'PLN-MOB-03 — Vista mensual del plan en mobile (PlanCalendarView)', done: false, priority: 'P3', note: 'Web tiene PlanCalendarView — calendario mensual con estado por sesión. Mobile solo tiene strip semanal. Fix: pantalla o modal de vista mensual. Considerable en esfuerzo — backlog hasta que el strip semanal genere feedback de limitación real.' },
          { title: 'GYM-MOB-03 — Gym Builder en mobile: crear rutinas propias', done: true, priority: 'P3', note: 'DONE (2026-07-24). app/(app)/gym-builder.tsx: ExercisePicker con debounce 300ms → /api/gym/exercises/search. Card por ejercicio con chips sets (2/3/4/5) y reps scroll (8/10/12/15/8-10/10-12/12-15/6-8/AMRAP). Save: POST /api/athlete/gym/routines + assignTemplate(id) → Alert → router.replace gym tab. CTAs en gym.tsx: botón "Crear nueva rutina" en vista con plantilla y card dashed en TemplatePickerScreen.' },
          { title: 'MOB-NUT-03 — Mobile: UI para crear y editar plantilla nutricional propia (NUT-F-01 paridad mobile)', done: true, priority: 'P2', note: 'DONE (2026-07-24). app/(app)/nutrition-builder.tsx: lista de templates con TemplateCard (nombre, tipo, macros, alimentos). CreateForm: nombre, selector mealType chips (HARD/EASY/REST/DESAYUNO...), búsqueda de alimentos con getMealTemplates/createMealTemplate/deleteMealTemplate. CTA "Mis plantillas de comida" agregado en nutrition.tsx.' },
          { title: 'MOB-NUT-04 — Mobile: apply template a la semana con selector de intensidad por día', done: true, priority: 'P2', note: 'DONE 2026-07-29. nutrition-apply-template.tsx: selector de plantilla (lista GET /api/mobile/nutrition/templates), 7 días de la semana con cycleIntensity() HARD→EASY→REST, kcal promedio estimado con useMemo, POST /api/mobile/nutrition/templates/[id]/apply (nuevo endpoint mobile con getMobileUser, validación zod weekStart+intensityMap, tx deleteMany+createMany). API client: getNutritionTemplates + applyNutritionTemplate + logAllPlannedMealsToday. Archivos: app/(app)/nutrition-apply-template.tsx + src/api/nutrition.ts + api/mobile/nutrition/templates/route.ts + api/mobile/nutrition/templates/[id]/apply/route.ts.' },
          { title: 'MOB-NUT-05 — Mobile: 6 pantallas constructor de nutricion (Figma alignment)', done: true, priority: 'P1', note: 'DONE 2026-09-10. 3 screens mobile: nutrition-constructor.tsx (estado vacio, Figma 4523:3150), nutrition-day-builder.tsx (plantilla por tipo de dia + add food modal paso 1 y 2, Figma 4523:3224+4961:43+4961:147), nutrition-week-planner.tsx (planificador semanal + dia sin configurar, Figma 4523:3332+4944:89). Backend: POST /api/mobile/nutrition/templates (crear template), POST+DELETE /api/mobile/nutrition/templates/[id]/meals (CRUD items), GET+POST /api/mobile/nutrition/planned-meals, DELETE /api/mobile/nutrition/planned-meals/[id]. API client: createNutritionTemplate, addTemplateMealItem, getPlannedMealsWeek, createPlannedMeal, deletePlannedMeal.' },
          { title: 'GYM-MOB-04 — Sugerencia de próxima carga en sesión de gym mobile', done: true, priority: 'P2', note: 'DONE (2026-08-14). (1) completed:sl.completed agregado a map previousLogs en ambas rutas de /api/gym/session/today/route.ts. (2) GymSessionData.exercises actualizado con suggestedNextWeightKg + completed en previousLogs. (3) gym-session.tsx: allPrevCompleted + suggestedWeight computation (ex.suggestedNextWeightKg ?? prevAvgWeight+2.5). Badge verde "↑ Xkg" sobre el input de peso — tap auto-rellena el campo.' },
          { title: 'NUT-WATER-MOB — Water tracking mobile: GET/POST + progress bar + quick-add buttons', done: true, priority: 'P2', note: 'DONE (2026-08-14). Backend: GET+POST /api/mobile/nutrition/water (upsert WaterLog con delta, rate limiting, getMobileUser). API client: getWaterLog + logWater + WaterLogData type en src/api/nutrition.ts. UI: HydrationSection en nutrition.tsx rediseñada — useQuery water-log, useMutation logWater, progress bar kcal-styled, quick-add +250/+500/+750 ml, botón − para corregir, badge verde al alcanzar meta.' },
          { title: 'COACH-NUT-UI-01/02/03 — KPI band + bar chart + macro donut en panel de nutrición del coach', done: true, priority: 'P2', note: 'DONE (2026-08-14). NutricionTab.tsx: (1) KPI band 4 cards — adherencia 7d con semáforo, TDEE base, proteína media g/día, fase del plan. (2) Bar chart 7 días kcal consumidas vs objetivo — barras relativas al máximo, color por adherencia pct (verde/naranja/rojo), target como barra semitransparente. (3) Donut SVG macros 7d — proteína #3b82f6 / carbos #f97316 / grasas #eab308, leyenda con %+g/día. Todos calculados inline desde props foodLogs+adherenceData ya disponibles.' },
          // ── GYM Sprint 1 — exponer datos de backend existente ───────────────
          { title: 'GYM-S1-01 — setLogType + rpe por set en gym/history API', done: true, priority: 'P2', note: 'DONE (2026-08-19). gym/history/route.ts: select de exercise extendido con bodyPart/target/secondaryMuscles. exerciseMap ahora incluye setLogType+rpe por set. Tipo ExerciseEntry con bodyPart/target/secondaryMuscles.' },
          { title: 'GYM-S1-02 — bodyPart + target + secondaryMuscles en gym/week + gym/history APIs', done: true, priority: 'P2', note: 'DONE (2026-08-19). gym/week/route.ts: ambas rutas de selectedDetail (assignedWorkout path + plan path) incluyen bodyPart+target por exercise. Tipo CompletedExercise con campos de músculo.' },
          { title: 'GYM-S1-03 — Endpoint GET /api/mobile/gym/prs + 1RM estimado en gym-session', done: true, priority: 'P1', note: 'DONE (2026-08-19). Nuevo endpoint gym/prs/route.ts: Epley formula (kg×(1+reps/30)×10)/10, max por ejercicio de todos los SetLog. gym-session.tsx: useQuery gym-prs, GymPR type + getGymPRs en src/api/gym.ts. Display "🏆 1RM est.: X kg" en header de ejercicio.' },
          { title: 'GYM-S1-04 — Screen wake lock con expo-keep-awake', done: true, priority: 'P1', note: 'DONE (2026-08-19). gym-session.tsx: import * as KeepAwake + useEffect activateKeepAwakeAsync al montar, deactivateKeepAwake en cleanup.' },
          { title: 'GYM-S1-05 — Colores WARMUP (azul) y DROPSET (púrpura) en badges de set', done: true, priority: 'P2', note: 'DONE (2026-08-19). SET_TYPE_CONFIG: WARMUP bg=#eff6ff text=#3b82f6 badge=W, DROPSET bg=#f5f3ff text=#7c3aed badge=D.' },
          // ── GYM Sprint 2 — muscle map SVG ───────────────────────────────────
          { title: 'GYM-S2-01 — GET /api/mobile/progress/muscles: agregación de volumen muscular con fatigueLevel', done: true, priority: 'P2', note: 'DONE (2026-08-19). Nuevo progress/muscles/route.ts: setLogs con workoutExerciseId → bodyPart/target/secondaryMuscles. Volume=kg×reps, secondary ×0.5. fatigueLevel: >48h=0, >24h=1, >12h=2, <12h=3.' },
          { title: 'GYM-S2-02 — MuscleMap.tsx: SVG body map front/back con colores por fatigueLevel', done: true, priority: 'P2', note: 'DONE (2026-08-19). src/components/MuscleMap.tsx con react-native-svg. Silueta compartida (BodySilhouette). FrontBody: delts/chest/biceps/forearms/abs/quads/calves. BackBody: traps/upperBack/lats/triceps/forearms/lowerBack/glutes/hamstrings/calves. Toggle front/back + leyenda.' },
          { title: 'GYM-S2-03 — MuscleMap integrado en progress screen + heatmap 52 semanas', done: true, priority: 'P2', note: 'DONE (2026-08-19). progress.tsx: useQuery progress-muscles → getMuscleVolume(7). Sección "Músculos esta semana" con MuscleMap. Heatmap ActivityHeatmap: grid 52 semanas, colores por sessionCount (0/1/2/3+). activityGrid agregado en /api/mobile/progress/route.ts (gymSessions+runSessions).' },
          // ── GYM Sprint 3 — polish ────────────────────────────────────────────
          { title: 'GYM-S3-02 — Muscle preview pre-sesión en gym.tsx (músculos de hoy)', done: true, priority: 'P2', note: 'DONE (2026-08-19). gym.tsx: calcula muscleData desde session.exercises.bodyPart/target → MuscleMap con fatigueLevel=3 (todos "intenso") antes de iniciar. Card "Músculos de hoy" entre CTA y pills.' },
          // ── GYM Sprint 4 — gaps vs openGym ──────────────────────────────────
          { title: 'GYM-S4-01 — Progresión de carga por ejercicio en gym-history', done: true, priority: 'P2', note: 'DONE (2026-08-19). gym-history.tsx: ExerciseProgressionChart component (mini bar chart últimas 8 sesiones, último bar en naranja). progressionByExercise map con useMemo (max weight por ejercicio por sesión). Mostrado bajo sets en vista expandida.' },
          { title: 'GYM-S4-02 — Barra de progreso de series por ejercicio en gym-session', done: true, priority: 'P2', note: 'DONE (2026-08-19). gym-session.tsx: progress bar por ejercicio (done/total) con fill naranja proporcional. Mostrada debajo del bloque de series/reps.' },
          { title: 'GYM-S4-03 — Notas por ejercicio en gym-session', done: true, priority: 'P3', note: 'DONE (2026-08-19). gym-session.tsx: exerciseNotesMap state (Record<string,string>). TextInput por ejercicio visible cuando exercise done. Notas concatenadas al notes de sesión con formato "Ejercicio: nota" al finalizar.' },
          { title: 'GYM-S4-04 — completedSets visible en SessionCard de gym-history', done: true, priority: 'P3', note: 'DONE (2026-08-19). gym-history.tsx: "{session.completedSets} series" mostrado en área de stats derecha de la card.' },
          { title: 'GYM-S4-05 — Proyección de carga 4 semanas en gym.tsx', done: true, priority: 'P2', note: 'DONE (2026-08-19). gym.tsx: sección "Progresión planeada" con tabla Ant. | Hoy | S+2 | S+3 | S+4 por ejercicio. Base: suggestedNextWeightKg ?? prevWeight+2.5, luego +2.5kg/semana.' },
          { title: 'GYM-S4-06 — Músculos esta semana en gym.tsx (weekly MuscleMap)', done: true, priority: 'P2', note: 'DONE (2026-08-19). gym.tsx: useQuery progress-muscles (7 días, staleTime 10min). Sección "Músculos esta semana" con MuscleMap del aggregate semanal de la API.' },
          // ── GYM Web — MuscleMapWeb en panel web ─────────────────────────────
          { title: 'GYM-WEB-01 — MuscleMapWeb en gym/page.tsx (no-workout): fatigue map + session preview', done: true, priority: 'P2', note: 'DONE (2026-08-20). gym/page.tsx sin rutina: query SetLogs 7d + agregación bodyPart/target → MuscleMapWeb mode=fatigue entre Plantillas y Biblioteca. Con rutina: todayMuscleData desde muscleGroups+target → MuscleMapWeb compact mode=session en card "Sesión de hoy". src/components/MuscleMapWeb.tsx (SVG inline, paths curvados, front/back toggle, leyenda, compact mode).' },
          { title: 'GYM-WEB-02 — MuscleMapWeb en gym/session/page.tsx (during session): session mode compact', done: true, priority: 'P2', note: 'DONE (2026-08-20). gym/session/page.tsx: buildSessionMuscleData([workoutDay.muscleGroups, exercises.muscleGroups]) → MuscleMapWeb compact mode=session entre header y progress bar.' },
        ],
      },
    ],
  },

  // ─── PRE-LANZAMIENTO ─────────────────────────────────────────────────────────

  // ─── NEGOCIO ─────────────────────────────────────────────────────────────────

  {
    id: 'negocio',
    label: 'Negocio — Pagos & Revenue',
    period: 'Post-lanzamiento',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [

      // ── COMPLETADO ──────────────────────────────────────────────────────────
      { title: 'UserSubscription model en DB + /upgrade placeholder', done: true, note: 'UserSubscription model en DB (TRIAL|FREE|PRO). Botón temporal mailto: hasta integrar pasarela. NOTA: Trial fue eliminado del modelo de negocio (2026-07-03) — el enum DB existe pero se ignora en lógica nueva.' },
      { title: 'Feature flags: derivación por tier + límites de asesorados para coaches', done: true, note: 'computeAthleteFeatures(tier) + getCoachLimits(CoachTier) en domain/subscription/tier_features.ts. Enforcement en POST /api/coach/clients/create: 402 si activeCount >= maxAthletes.' },

      // ── DEUDA TÉCNICA MAPEADA — activar al implementar billing ─────────────
      { title: 'GAP-03 — Email verification no bloquea acceso al producto (deuda pre-billing)', done: true, priority: 'P2', note: 'DONE (2026-07-17). Gate implementado detrás de flag: EMAIL_GATE_ENABLED=true activa el bloqueo en authorize() (web) y /api/mobile/auth/login. emailVerified añadido a USER_SELECT en ambas rutas. Gate inactivo en beta — activar antes de conectar billing.' },

      // ── P0 — PRERREQUISITOS: ejecutar en este orden antes de conectar Wompi ─
      {
        title: 'FIX — coachFeeRate() → coachTierFee() tier plano en domain/admin/finanzas.ts',
        done: true,
        priority: 'P0',
        note: 'DONE. coachTierFee(tier, athleteCount) implementado: STARTER→0, GROWTH→39, PRO→79, SCALE→129+$1.50×extra>100. coachTierFeeLabel() con etiquetas. Admin page actualizada para leer subscription.coachTier y usar nuevas funciones. Tests actualizados (15 tests). coachFeeRate marcada @deprecated.',
      },
      {
        title: 'FIX — Bug tier:TRIAL en atletas B2B al crearlos',
        done: true,
        priority: 'P0',
        note: 'Fix: POST /api/coach/clients/create — eliminado el bloque que creaba UserSubscription con tier:TRIAL. Atletas B2B no tienen suscripción propia; su acceso viene del coach vía mergeFeatures(). Comentario explicativo añadido. TRIAL también eliminado del tipo AthleteSubscriptionTier en tier-features.ts. Branch: feature/landing-conversion.',
      },
      {
        title: 'TIER-MODEL — Actualizar computeAthleteFeatures() al modelo definitivo',
        done: true,
        priority: 'P0',
        note: 'DONE (re-fix 2026-07-06): FREE={ plan:false, checkin:false, nutrition:true, progress:false, log:true, gym:true } — capa de tracking. PRO={ todo true excepto coach }. TRIAL eliminado del tipo — no existe en el modelo de negocio. Gate de pago B2C: plan + checkin + progress. Branch: feature/landing-conversion.',
      },
      {
        title: 'BILLING-PREP — getUserPlan() real + migración usuarios beta',
        done: true,
        priority: 'P0',
        note: 'DONE: getUserPlan() ahora lee BILLING_ENABLED env. Si false (beta) → PRO para todos. Si true → lee subscriptionTier param (TRIAL|PRO|FREE). Script scripts/migrate-beta-users.ts para migrar usuarios sin sub → TRIAL 30 días. Ejecutar con DRY_RUN=false antes de activar Wompi.',
      },
      {
        title: 'Admin — Panel manual de coachTier (P0 para design partners)',
        done: true,
        priority: 'P0',
        note: 'DONE: PATCH /api/admin/coach/[id]/tier + CoachTierDropdown en /admin/coaches. Select con badge por tier (STARTER/GROWTH/PRO/SCALE), upsert UserSubscription.coachTier, audit log. Branch: feature/admin-coach-tier.',
      },
      {
        title: 'B2B-ATHLETE-FREE — Atleta B2B nunca ve pantalla de pago',
        done: true,
        priority: 'P0',
        note: 'Fix: getUserPlan() en user-config.ts ahora acepta isB2B?: boolean. Si isB2B=true → siempre retorna PRO independiente del tier en DB. Billing habilitado: B2B bypasea la consulta de subscription. TRIAL eliminado del flujo de getUserPlan(). Branch: feature/landing-conversion.',
      },

      // ── PRERREQUISITO MIGUEL — registro en pasarelas de pago ────────────────
      {
        title: 'REGISTRO — Crear cuenta en Wompi (dashboard.wompi.co)',
        done: false,
        priority: 'P0',
        note: 'Acción manual de Miguel. Registrarse en dashboard.wompi.co con RUT/cédula + cuenta bancaria colombiana para recibir pagos. En Configuración → API keys obtener WOMPI_PRIVATE_KEY (prv_prod_...) y WOMPI_PUBLIC_KEY. En Configuración → Webhooks configurar URL https://medaliq.com/api/webhooks/wompi y obtener WOMPI_INTEGRITY_SECRET.',
      },
      {
        title: 'ACTIVAR — Configurar env vars de Wompi en Vercel',
        done: false,
        priority: 'P0',
        note: 'Acción manual de Miguel. Agregar en Vercel Settings → Environment Variables: PAYMENT_GATEWAY=wompi, WOMPI_PRIVATE_KEY=prv_prod_..., WOMPI_INTEGRITY_SECRET=... También agregar en .env.local para desarrollo. Con WOMPI_SANDBOX=true se usan llaves de prueba (prv_test_...).',
      },
      {
        title: 'VERIFICAR — Prueba end-to-end de checkout en sandbox Wompi',
        done: false,
        priority: 'P0',
        note: 'Con WOMPI_SANDBOX=true: (1) coach hace upgrade STARTER→GROWTH → payment link generado → pagar con tarjeta de prueba 4111 1111 1111 1111. (2) Wompi sandbox envía webhook APPROVED → verificar coachTier=GROWTH en DB. (3) Enviar mismo webhook 2 veces → verificar idempotencia (solo 1 upgrade). (4) Cron billing-check con currentPeriodEnd=ayer → verificar downgrade.',
      },
      {
        title: 'ACTIVAR — Habilitar Nequi y PSE en dashboard de Wompi',
        done: false,
        priority: 'P1',
        note: 'Wompi soporta Nequi y PSE nativamente sin código adicional. Activar en dashboard.wompi.co → Métodos de pago antes del lanzamiento público. Tarjeta sola excluye ~50% del mercado colombiano (bancarización). Nequi es el método más popular en LatAm joven.',
      },

      // ── P1 — CHECKOUT Y WEBHOOK: primer cobro real ──────────────────────────
      {
        title: 'Checkout coach — POST /api/billing/coach/checkout',
        done: true,
        priority: 'P1',
        note: 'DONE. POST /api/billing/coach/checkout — auth COACH, valida upgrade al tier siguiente, llama createCoachCheckout(gateway). Arquitectura gateway-agnostic: IPaymentGateway port en domain/ports/payment_gateway.port.ts. StubPaymentGateway (dev) + factory getPaymentGateway() leen PAYMENT_GATEWAY env. Pendiente: UI UpgradeModal en el coach cuando recibe 402 COACH_LIMIT_REACHED.',
      },
      {
        title: 'Checkout atleta Pro — POST /api/billing/athlete/checkout',
        done: true,
        priority: 'P1',
        note: 'DONE. POST /api/billing/athlete/checkout — auth ATHLETE, bloquea B2B activo (403), bloquea ya PRO (409), llama createAthleteCheckout(gateway). Pendiente: UI feature gate cuando atleta B2C Free toca checkin/progress.',
      },
      {
        title: 'Webhook Wompi unificado — POST /api/webhooks/wompi',
        done: true,
        priority: 'P1',
        note: 'DONE (webhook genérico, no Wompi-específico). POST /api/webhooks/payment — verifica firma via gateway.parseWebhookEvent(rawBody, signature). Eventos: charge.success → upgradeCoach/upgradeAthlete; charge.failed → sin acción (gracia via cron); subscription.cancelled → downgrade inmediato. Idempotente por diseño. Al integrar Wompi: implementar WompiPaymentGateway + ajustar PAYMENT_GATEWAY=wompi.',
      },
      {
        title: 'WompiPaymentGateway — implementar el adaptador real (PAYMENT_GATEWAY=wompi)',
        done: true,
        priority: 'P1',
        note: 'DONE (2026-08-11). WompiPaymentGateway implementado en src/infrastructure/billing/wompi_payment_gateway.ts. createCoachCheckout y createAthleteCheckout crean payment links con single_use:true en COP. parseWebhookEvent verifica integridad con SHA256(reference+amount+currency+WOMPI_INTEGRITY_SECRET). Factory wired con case wompi. Precios COP en billing.types.ts. Idempotencia via lastWebhookEventId en UserSubscription. Ruta dedicada /api/webhooks/wompi. Env vars requeridas: WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET, PAYMENT_GATEWAY=wompi. Probar con sandbox: WOMPI_SANDBOX=true.',
      },
      {
        title: 'Downgrade automático — cron diario + lógica de gracia',
        done: true,
        priority: 'P1',
        note: 'DONE. domain/billing/downgrade.use_case.ts: isGracePeriodExpired() + runBillingCheck(repo, now). BILLING_GRACE_DAYS=3. BillingRepository.findExpired(graceDays, now) → currentPeriodEnd < now - graceDays. Cron: POST /api/cron/billing-check (vercel.json 0 2 * * *), auth Bearer CRON_SECRET. Tests: 9 casos passing.',
      },
      {
        title: 'Snapshot atleta activo en billing date — validación de tier del coach',
        done: false,
        priority: 'P1',
        note: 'Atleta activo para billing = CoachAthlete.status=ACTIVE + onboardingCompleted=true + al menos 1 SessionLog. El snapshot se toma el día 1 de cada mes (billing date). Si el count cambia de tier → notificación al coach 3 días antes: "Tienes X atletas activos — tu próxima factura será Y tier ($Z)". Sin prorrateo en v1: tier del mes completo basado en snapshot.',
      },
      {
        title: 'Notificación pre-billing al coach — 3 días antes del cobro',
        done: false,
        priority: 'P1',
        note: 'Cron 3 días antes de billing date: calcular atletas activos del coach → determinar tier → enviar email: "Tu próxima factura: X atletas activos → tier Y → $Z el [fecha]". Si el tier cambió respecto al mes anterior → indicarlo. Usa sendCoachBillingReminderEmail() via Resend.',
      },

      // ── P2 — GESTIÓN Y EXPANSIÓN ────────────────────────────────────────────
      {
        title: 'Página gestión de suscripción del atleta — /settings/plan',
        done: true,
        priority: 'P2',
        note: 'DONE (2026-08-15). /(athlete)/settings/plan: tabla comparativa Free vs Pro, precio en COP (calculado con TRM real desde Banco República), fecha TRM mostrada para transparencia. botón Activar Pro → POST /api/billing/athlete/checkout → redirect a Wompi. B2B activo ve mensaje de que el acceso lo gestiona el coach. Toast ?billing=success|cancelled.',
      },
      {
        title: 'Página gestión de suscripción del coach — /coach/settings/plan',
        done: true,
        priority: 'P2',
        note: 'DONE (2026-08-15). /coach/settings/plan: tier actual, atletas activos vs límite (barra de progreso), fecha de renovación, cards de upgrade con precios COP/USD. TRM real mostrado con fecha para transparencia. Botón upgrade → POST /api/billing/coach/checkout → redirect a Wompi. Toast ?billing=success|cancelled.',
      },
      {
        title: 'TRM real-time — Banco de la República (transparencia de precios COP)',
        done: true,
        priority: 'P1',
        note: 'DONE (2026-08-19). TrmService (clase con cache TTL 1h por instancia) + BancoRepublicaTrmAdapter (datos.gov.co — Superintendencia Financiera oficial). Sin DB, sin cron — fetch directo con cache en módulo. Jerarquía: API → env TRM_USD_COP → fallback 4200 (siempre loggea). UI: settings/plan coach + atleta muestran precio COP + TRM date. Mobile: /api/mobile/billing/prices. Wompi usa getTrm() al momento del checkout. 20 unit tests.',
      },
      {
        title: 'Scale+ tier — $129 + $1.50/atleta activo sobre 100',
        done: false,
        priority: 'P2',
        note: 'Para coaches con más de 100 atletas activos: base $129/mes + $1.50 por cada atleta sobre 100. Ejemplo: 150 atletas = $129 + (50 × $1.50) = $204/mes. Implementar en coachTierFee() como case adicional. El checkout debe calcular el monto dinámicamente según snapshot del mes.',
      },
      {
        title: 'Admin: MRR real, churn mensual y ranking coaches por revenue',
        done: true,
        priority: 'P2',
        note: 'KPIs reales en /admin/finanzas: proAthletes desde UserSubscription(tier=PRO), churnAthletes (cancelAtPeriodEnd=true), paidCoaches (coachTier!=STARTER). MRR sub muestra "N atletas con tier PRO en DB". Gráfica histórica pendiente.',
      },
      {
        title: 'Stripe para usuarios internacionales',
        done: false,
        priority: 'P2',
        note: 'Después de validar mercado colombiano con Wompi. Mismo flujo de checkout/webhook pero con Stripe. Detectar país del usuario → Wompi si CO/LatAm → Stripe si internacional.',
      },
      {
        title: 'Cobro en Nequi / PSE (Wompi los cubre nativamente)',
        done: false,
        priority: 'P2',
        note: 'Wompi soporta Nequi y PSE sin integración adicional — se activan en el dashboard de Wompi. Tarjeta sola excluye buena parte del mercado colombiano (bancarización ~50%). Activar Nequi en el dashboard de Wompi antes del lanzamiento público.',
      },
    ],
  },


  // ─── MÓDULO NUTRICIÓN ────────────────────────────────────────────────────────
  // Scope independiente para trabajo a profundidad en nutrición (atleta + coach + sistema)
  // Los items de atleta-nutricion y coach-nutricion-constructor permanecen en sus scopes originales
  // Este scope cubre features avanzadas no capturadas allá

  {
    id: 'modulo-nutricion',
    label: 'Módulo Nutrición — Profundización',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    phases: [
      {
        id: 'nutricion-atleta-avanzado',
        label: 'Atleta — Tracking Avanzado',
        period: 'Próximo',
        items: [
          { title: 'Proponer alimento a la librería global — ver NUT-03 a NUT-08 en modulo-nutricion', done: true, priority: 'P1', note: 'DONE. UI web implementada como step "propose" dentro de LogFoodModal.tsx. CTA "¿No lo encontraste? Proponer alimento →" aparece en búsqueda con ≥2 chars sin resultados. Form: nombre, categoría (chips), macros por 100g, país, notas. Success state con checkmark verde. POST /api/nutrition/foods/propose. Admin panel NUT-07/08 ya existente. Flujo completo end-to-end.' },
          { title: 'Escaneo de código de barras — ver NUT-10/11/12 en modulo-nutricion', done: true, priority: 'P2', note: 'DONE. NUT-10/11/12 completados. Ver sección modulo-nutricion §Sistema para detalles.' },
          { title: 'Recetas compuestas: grupo de alimentos guardados como una unidad (ej. "Mi desayuno habitual")', done: true, priority: 'P2', note: 'DONE. LogFoodModal.tsx (mobile): nuevo step "recipe-builder" con inline search, lista de ingredientes con grams editables, totales en card navy (kcal+P+C+F), botón guardar → createMealTemplate con múltiples items. Accesible desde "+ Nueva receta" en sección "Mis comidas" del step search. La receta queda en la lista "Mis comidas" y se puede registrar de golpe.' },
          { title: 'Historial de adherencia nutricional diario en /progress (gráfica 30 días)', done: true, priority: 'P2', note: 'DONE: FoodLog 30 días agrupado por fecha → adherencePct vs targetKcalEasy. Gráfica de barras verticales verde/amarillo/rojo en ProgressClient. Promedio en naranja. Props NutritionAdherencePoint[] + nutritionTargetKcal en ProgressClientProps.' },
          { title: 'Contexto de fase en nutrición: texto explicativo según semana del plan (carga vs descarga)', done: true, priority: 'P2', note: 'DONE: Query PlanWeek (isRecoveryWeek + sessions.intensity) como 11ma query en Promise.all de nutrition/page.tsx. Banner azul antes de propuestas coach: descarga / carga alta / carga moderada según mayoría de intensidades.' },
          { title: 'Metas de hidratación diaria: log rápido de agua y barra de progreso en dashboard', done: false, priority: 'P3', note: 'WaterLog { userId, date, ml } modelo nuevo. Quick-tap desde dashboard: +250ml. NutritionPlan.waterMlTarget Int? (default 2000ml). Barra de progreso en tarjeta de nutrición del dashboard.' },
        ],
      },
      {
        id: 'nutricion-atleta-autonomo',
        label: 'Atleta Autónomo — Constructor de Nutrición B2C',
        period: 'En progreso',
        items: [
          {
            title: 'NUT-B-01 — GET /api/athlete/planned-meals + POST /api/athlete/planned-meals',
            done: true,
            priority: 'P1',
            note: 'DONE 2026-07-09: src/app/api/athlete/planned-meals/route.ts. GET ?weekStart=YYYY-MM-DD → PlannedMeal agrupados por fecha (byDate map). Sin weekStart → lunes de la semana actual. POST { date, mealType, foodId, grams } → validación de mealType enum + food.isActive + grams > 0 → create. Incluye food select completo.',
          },
          {
            title: 'NUT-B-02 — GET + POST /api/athlete/nutrition/templates — templates nutricionales propios del atleta B2C',
            done: true,
            priority: 'P1',
            note: 'DONE 2026-07-09: src/app/api/athlete/nutrition/templates/route.ts. GET → templates where athleteId = userId. POST → verifica que no tiene CoachAthlete ACTIVE (403 si tiene) → crea NutritionTemplate { athleteId: userId, coachId: null } con 3 días HARD/EASY/REST auto-creados. Requiere DB-06 (aplicado en migración 20260712000001).',
          },
          {
            title: 'NUT-B-03 — POST /api/athlete/nutrition/templates/[id]/apply — aplicar template a semana → PlannedMeal records',
            done: true,
            priority: 'P1',
            note: 'DONE 2026-07-09: src/app/api/athlete/nutrition/templates/[id]/apply/route.ts. Zod: weekStart YYYY-MM-DD + intensityMap Record<date, HARD|EASY|REST>. Multi-tenant: template where { id, athleteId: userId }. Indexa días por dayType → crea PlannedMeal por cada meal.item. $transaction: deleteMany semana + createMany. Idempotente.',
          },
          {
            title: 'NUT-B-04 — GET /api/athlete/nutrition/adherence — adherencia calórica diaria vs PlannedMeal',
            done: true,
            priority: 'P1',
            note: 'DONE 2026-07-09: src/app/api/athlete/nutrition/adherence/route.ts. ?from=YYYY-MM-DD&to=YYYY-MM-DD (default últimos 7 días). Parallel: PlannedMeal + FoodLog. plannedKcal = grams/100*kcalPer100g. loggedKcal = snapshot kcalLogged ?? calc. adherencePct = round(logged/planned*100), null si plannedKcal=0. Retorna [{ date, plannedKcal, loggedKcal, adherencePct }] sorted.',
          },
          {
            title: 'NUT-B-06 — GET /api/athlete/nutrition/planned-summary — resumen del día planificado vs realizado',
            done: true,
            priority: 'P2',
            note: '?date=YYYY-MM-DD. Retorna: { plannedMeals: PlannedMeal[], loggedFoods: FoodLog[], totals: { plannedKcal, loggedKcal, plannedProtein, loggedProtein, ... } }. Para mostrar la comparativa en /nutrition del día. Sin lógica de negocio — solo agrupación de datos del día.',
          },
          {
            title: 'NUT-F-01 — Builder UI: crear y editar plantilla de nutrición propia (día/semana)',
            done: true,
            priority: 'P1',
            note: 'DONE 2026-07-09: /nutrition/builder → redirect a /nutrition/builder/[id] si hay plantilla, o pantalla create. /nutrition/builder/[id] con AthleteNutritionBuilderClient: 3 tabs HARD/EASY/REST, FoodSearchModal reutilizada (misma UX coach), add/remove items via POST+DELETE /api/athlete/nutrition/templates/[id]/meals. ApplyWeekModal: 7 días desde hoy, selector HARD/EASY/REST por día, llama NUT-B-03. Botón "Aplicar semana" en header y CTA inline. Atletas B2B con coach redirigen a /nutrition.',
          },
          {
            title: 'NUT-F-02 — Vista semanal de comidas planificadas en /nutrition',
            done: true,
            priority: 'P1',
            note: 'Sección en /nutrition: "Menú de esta semana" — 7 días con mealType y alimentos planificados por día. Badge de intensidad (Duro/Fácil/Descanso) según el plan. CTA "Aplicar mi menú" → POST /api/athlete/nutrition/templates/[id]/apply. Depende de NUT-B-03. Reemplaza el estado vacío actual de PlannedMeal en /nutrition.',
          },
          {
            title: 'NUT-F-03 — Gráfica adherencia calórica diaria en /nutrition (barras 7 días)',
            done: true,
            priority: 'P2',
            note: 'Sección en /nutrition: "Adherencia de la semana" — mini bar chart con 7 barras (Lun-Dom): altura = % de meta calórica cubierta. Color: verde >90%, naranja 70-90%, rojo <70%. Si no hay PlannedMeal para ese día → barra gris "Sin plan". Sin dependencias externas — reutilizar el patrón de SVG/div nativo del resto de gráficas.',
          },
          {
            title: 'NUT-F-04 — Desglose macros por comida en vista del día planificado',
            done: false,
            priority: 'P2',
            note: 'En /nutrition/day o en modal: lista de comidas del día (Desayuno/Almuerzo/Cena/Snack) con alimentos planificados + macros calculados. Total de la comida con barra de progreso inline. Permite al atleta preparar cada comida del día con datos precisos. Usa NUT-B-06.',
          },
          {
            title: 'NUT-F-05 — Comparativa PlannedMeal vs FoodLog real al final del día',
            done: false,
            priority: 'P2',
            note: 'En /nutrition al final del día (18:00+) o en /nutrition/summary: tabla comparativa — comida planificada vs comida registrada. Delta kcal/proteína/carbs/grasa. Badge "Completado" si adherencia >=80%, "Déficit" o "Exceso" según el caso. Motivación por completar el plan nutricional propio. Depende de NUT-B-06.',
          },
          {
            title: 'PLAN-NUT-02 — Mobile: endpoints y UI PlannedMeal (atleta ve y convierte su plan diario en FoodLog)',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). GET /api/mobile/nutrition/plan?date= — PlannedMeals del día. POST /api/mobile/nutrition/plan/[id]/log — convierte PlannedMeal en FoodLog con 1 tap (upsert idempotente: suma gramos si ya existía). getPlannedMeals() + logPlannedMeal() en src/api/nutrition.ts. PlannedMealsSection en nutrition.tsx: muestra alimentos agrupados por mealType con botón "Registrar" → estado "✓ Listo" con haptic. Al registrar → invalida nutrition-log + nutrition-summary para actualizar tracking en tiempo real. Solo visible si hay PlannedMeals para hoy.',
          },
        ],
      },
      {
        id: 'nutricion-coach-avanzado',
        label: 'Coach — Supervisión Nutricional',
        period: 'Próximo',
        items: [
          { title: 'Coach ve logs de alimentos del atleta en Tab Nutrición (últimos 7 días + adherencia diaria)', done: true, priority: 'P1', note: 'DONE: API agrega grams al select. FoodLogsSection: filas por día expandibles (resumen kcal/% target/P·C·G + detalle individual alimento/gramos/kcal al expandir). AthleteDetailClient usa FoodLogsSection. Branch: feature/coach-nutrition-logs.' },
          { title: 'Coach ajusta targets de macros del atleta individualmente (sin tocar template base)', done: true, priority: 'P1', note: 'DONE: PATCH /api/coach/athletes/[id]/nutrition/targets. Verifica CoachAthlete ownership. Zod: { targetKcalHard?, targetKcalEasy?, targetKcalRest?, proteinG? }. Persiste en NutritionPlan.source="COACH". No toca template base del sistema.' },
          { title: 'Vista de adherencia nutricional del atleta en panel del coach (semana actual + tendencia 4 semanas)', done: true, priority: 'P2', note: 'DONE: GET /api/coach/athletes/[id]/nutrition/adherence — FoodLog 28 días agrupado por día, adherencePct vs targetKcalHard. NutritionAdherenceCard.tsx: badge semana actual (verde/amarillo/rojo) + sparkline 4 semanas + días registrados. Integrado antes de FoodLogsSection en Tab Nutrición de AthleteDetailClient.' },
          { title: 'Alerta al coach cuando atleta tiene adherencia nutricional < 60% tres días seguidos', done: true, priority: 'P2', note: 'DONE: GET /api/cron/nutrition-alert (CRON_SECRET). CoachAthlete ACTIVE → atletas con NutritionPlan → FoodLog 3 días → si 3 días con registro y todos <60% → push al coach.pushToken. vercel.json: "0 9 * * *".' },
          { title: 'Panel coach: adherencia nutricional calculada (FoodLog) vs auto-reportada (check-in) — vista comparativa', done: true, priority: 'P2', note: 'DONE: NutritionAdherenceCard recibe selfReportedPct (WeeklyCheckIn.dietAdherencePct del último check-in, vía AthleteDetailClient → NutricionTab). Fila comparativa "Real (FoodLog) X% · Reportado (check-in) Y%". Si |real − reportado| > 20% → badge amarillo "⚠ Posible desconexión (N%)". Sin llamada extra al backend — dato ya disponible en recentCheckIns.' },
          { title: 'PLAN-NUT-01 — Coach asigna alimentos concretos al atleta por fecha (PlannedMeal flow coach)', done: true, priority: 'P1', note: 'DONE (2026-07-29). GET/POST /api/coach/athletes/[id]/nutrition/plan + DELETE /api/coach/athletes/[id]/nutrition/plan/[mealId]. Auth: COACH role + CoachAthlete ownership. CoachPlannedMealPlanner.tsx: week navigator, day strip, meals agrupadas por mealType, búsqueda inline de alimentos (GET /api/nutrition/foods?q=), quick picks 50/100/150/200g, totales diarios. Planner visible SIEMPRE en Tab Nutrición (con o sin NutritionPlan). Nota: schema PlannedMeal no tiene createdById — coach crea con userId=athleteId.' },
          { title: 'PAN-B-07 — NutritionContent: normalizar renderizado para formato del constructor del coach', done: true, priority: 'P2', note: 'DONE 2026-07-09: nutrition/page.tsx ahora consulta AssignedNutritionPlan en el Promise.all. Helper templateDayToMeals() transforma NutritionTemplateFoodItem → formato canónico Meal. assignedMealPlan (MealPlanData) se calcula desde la plantilla del coach para HARD/EASY/REST. hasMealPlan = !!(assignedMealPlan ?? parsedMealPlan). Badge "Plan de tu coach: {nombre}" visible encima de NutritionContent cuando el coach asignó template.' },
          { title: 'COACH-NUT-UI-01 — KPIs banda top en Tab Nutrición coach (adherencia %, TDEE, proteína media, fase del plan)', done: true, priority: 'P2', note: 'DONE (2026-08-14). NutricionTab.tsx: grid 4 cards — adherencia 7d con semáforo verde/naranja/rojo, TDEE base kcal, proteína media g/día, fase del plan. Calculados inline desde props foodLogs + adherenceData + nutritionPlan + currentPhase (todos ya disponibles).' },
          { title: 'COACH-NUT-UI-02 — Gráfica "Kcal consumidas vs target" en Tab Nutrición coach (barras 7 días)', done: true, priority: 'P2', note: 'DONE (2026-08-14). NutricionTab.tsx: bar chart 7 días — barras de altura relativa al máximo diario, color por adherencePct (verde ≥80/naranja ≥60/rojo <60), barra semitransparente navy para el target. Leyenda con swatches. Calculado desde adherenceData (último 7 días).' },
          { title: 'COACH-NUT-UI-03 — Donut "Distribución de macros" en Tab Nutrición coach (promedio 7 días)', done: true, priority: 'P2', note: 'DONE (2026-08-14). NutricionTab.tsx: SVG donut con segmentos proteína #3b82f6 / carbos #f97316 / grasas #eab308, rotación CSS -90°. Leyenda con %, g/día promedio. Calculado desde foodLogs 7 días (kcalLogged/proteinLogged/carbsLogged/fatLogged con snapshot o estimación).' },
          { title: 'COACH-NUT-UI-04 — Quick quantity buttons en FoodSearchModal coach (50g/100g/150g/200g/250g/Personalizar)', done: true, priority: 'P2', note: 'DONE (2026-08-15). NutritionConstructor.tsx: pills [50/100/150/200/250g] + input libre "Otro" + macro preview (kcal/prot/carb/gras) antes de agregar. NutritionBuilderClient ya tenía pills — UX ahora consistente en ambos constructores.' },
          { title: 'COACH-NUT-UI-05 — Target por comida en Constructor de Plantilla Nutricional', done: false, priority: 'P3', note: 'Figma 4117:821 muestra "Target: 550 kcal" por comida (Desayuno/Almuerzo/Merienda/Cena). El coach define cuántas kcal quiere en cada comida. NutritionTemplateMeal no tiene campo targetKcal — requiere migración. Ayuda al coach a balancear la distribución calórica.' },
          { title: 'COACH-NUT-UI-06 — Sidebar "Resumen del día" + "Tip" en Constructor de plan de comidas del atleta', done: false, priority: 'P3', note: 'Figma 4185:177 muestra sidebar derecho con resumen de macros del día seleccionado + tip contextual para el coach. Datos ya disponibles en NutritionConstructor. Solo UI.' },
        ],
      },
      {
        id: 'nutricion-sistema',
        label: 'Sistema — Base de Datos, Propuestas & Barcode',
        period: 'Próximo',
        items: [
          { title: 'NUT-01 — Migración schema Food: campos source, barcode, country + indexes', done: true, priority: 'P1', note: 'Migración 20260708000001_identity_notification_food aplicada en Neon prod. Food: source String @default("system"), barcode String? @unique, country String?. Indexes: Food_barcode_idx, Food_country_idx. Único en barcode garantizado a nivel DB.' },
          { title: 'NUT-02 — Seed Colombia + Mexico: ~250 alimentos nuevos con macros verificados', done: true, priority: 'P1', note: 'DONE: scripts/seed-foods-latam.ts ejecutado en Neon prod. 54 alimentos creados (1 skipped): CO — panadería (pandebono, almojábana, buñuelo), platos (bandeja paisa, ajiaco, sancocho, tamal, frijoles, empanada), frutas exóticas (lulo, curuba, uchuva, feijoa, maracuyá, guanábana, pitahaya, tomate de árbol), proteínas. MX — base (tortillas, frijoles negros/pinto, arroz rojo), platos (quesadilla, tacos, pozole, enchiladas, tamales, chiles rellenos, guacamole), frutas (mamey, zapote, nopal, jícama, tamarindo, tuna). Compartidos CO+MX — plátano maduro, yuca, aguacate, mango, guayaba, papaya, piña.' },
          { title: 'NUT-03 — Modelo FoodProposal + enum FoodProposalStatus + migración', done: true, priority: 'P1', note: 'Migración 20260708000001_identity_notification_food aplicada en Neon prod. enum FoodProposalStatus { PENDING | APPROVED | REJECTED }. Tabla FoodProposal con FK a User (submittedBy/reviewedBy) y Food. Indexes: status, submittedById. Relations en User y Food actualizadas en schema.prisma.' },
          { title: 'NUT-04 — ProposeFoodUseCase + IFoodProposalRepository + PrismaFoodProposalRepository', done: true, priority: 'P1', note: 'DONE: domain/ports/food_proposal.repository.ts (IFoodProposalRepository interface: propose, listByUser, listPending, review, countPending). infrastructure/db/food_proposal.repository.ts (PrismaFoodProposalRepository): propose=$transaction(Food.create{source:community,isVerified:false}+FoodProposal.create), review=$transaction(FoodProposal.update+Food.update{isVerified:true}|{isActive:false}).' },
          { title: 'NUT-05 — POST /api/nutrition/foods/propose + /api/mobile/nutrition/foods/propose', done: true, priority: 'P1', note: 'DONE: api/nutrition/foods/propose/route.ts + api/mobile/nutrition/foods/propose/route.ts. Zod: name/category/kcalPer100g/proteinPer100g/carbsPer100g/fatPer100g requeridos, servingG/servingLabel/country/notes opcionales. Rate limit 10/hora. Retorna { proposalId, foodId }.' },
          { title: 'NUT-06 — GET /api/nutrition/foods/my-proposals + mobile — atleta ve sus propuestas y estado', done: true, priority: 'P1', note: 'DONE: GET /api/nutrition/foods/my-proposals + GET /api/mobile/nutrition/foods/my-proposals. Retorna { proposals[] } con status/reviewNote. Mobile con rate limit 120/min.' },
          { title: 'NUT-07 — Admin: GET /api/admin/nutrition/proposals + panel /admin/nutrition/proposals', done: true, priority: 'P1', note: 'DONE: GET /api/admin/nutrition/proposals (role=ADMIN, listPending + pendingCount). Panel /admin/nutrition/proposals con ProposalsClient: cards con macros, país, propuesto por, fecha relativa. Aprobación 1-click. Rechazo con nota opcional. Link en admin sidebar (Apple icon).' },
          { title: 'NUT-08 — POST .../approve + .../reject — ReviewFoodUseCase', done: true, priority: 'P1', note: 'DONE: PATCH /api/admin/nutrition/proposals/[id] con { action: APPROVE|REJECT, reviewNote? }. APPROVE: FoodProposal.status=APPROVED + Food.isVerified=true. REJECT: FoodProposal.status=REJECTED + Food.isActive=false. Ambos en $transaction. Requiere role=ADMIN.' },
          { title: 'NUT-03-08 UI — Proponer alimento: step "propose" en LogFoodModal web + mobile', done: true, priority: 'P1', note: 'DONE: LogFoodModal.tsx (web: /nutrition/_components) y LogFoodModal.tsx (mobile: MEDALIQ-MOBILE/src/components). Nuevo step "propose" con form: nombre, categoría (chips), macros 4-col por 100g, país (chips Universal/CO/MX/AR/PE/VE/CL), notas textarea. CTA "¿No lo encontraste? Proponer alimento →" aparece en búsqueda con ≥2 chars, pre-rellena nombre. Estado success con checkmark. Web usa fetch plain, mobile usa useMutation. POST /api/nutrition/foods/propose (web) y /api/mobile/nutrition/foods/propose (mobile).' },
          { title: 'NUT-09 — Seed Argentina/Peru/Chile/Venezuela (~150 alimentos)', done: true, priority: 'P2', note: 'DONE. scripts/seed-latam-foods.ts — 41 alimentos LatAm: AR (milanesa, empanada, choripán, dulce de leche, asado, yerba mate), PE (lomo saltado, ceviche, aji amarillo, maca, causa, anticuchos, choclo), VE (arepa harina PAN, pabellón criollo, cachapa, caraotas, hallaca, tequeños), CL (pastel de choclo, sopaipilla, completo, chorrillana, mote), CO extra (bandeja paisa, pandebono, ajiaco, changua, buñuelo, chicharrón), MX (tortilla maíz, guacamole, frijoles refritos, tacos). Upsert-safe por nombre. Run: pnpm tsx scripts/seed-latam-foods.ts' },
          { title: 'NUT-10 — IFoodLookupClient port + OpenFoodFactsClient (barcode scanning)', done: true, priority: 'P2', note: 'DONE. Port IFoodLookupClient en domain/ports/food_lookup.client.ts. OpenFoodFactsClient en infrastructure/food/open_food_facts.client.ts. Fetch OFF v2 con 5s timeout, User-Agent Medaliq/1.0. Requiere nombre + 4 macros, else null. FoodItem.fiberPer100g añadido a tipo mobile (src/api/nutrition.ts) — resuelve TS error en BarcodeScannerModal.' },
          { title: 'NUT-10 — IFoodLookupClient port + OpenFoodFactsClient (barcode scanning)', done: true, priority: 'P2', note: 'DONE. Port IFoodLookupClient en domain/ports/food_lookup.client.ts. OpenFoodFactsClient en infrastructure/food/open_food_facts.client.ts. Fetch OFF v2 con 5s timeout, User-Agent Medaliq/1.0. Requiere nombre + 4 macros, else null.' },
          { title: 'NUT-11 — GET /api/nutrition/foods/barcode + /api/mobile/nutrition/foods/barcode', done: true, priority: 'P2', note: 'DONE. GET ?code= → DB lookup first → OpenFoodFactsClient fallback → needsConfirmation pattern. POST confirma y crea Food con source:openfoodfacts. Rate limit 60/min GET, 10/min POST.' },
          { title: 'NUT-12 — Mobile: UI scanner código de barras + flujo de confirmación', done: true, priority: 'P3', note: 'DONE. BarcodeScannerModal.tsx con expo-camera CameraView + barcodeScannerSettings ean13/ean8/upc. Botón 📷 en LogFoodModal search header. onFoodFound → handleSelectFood (detail step). onNotFound → propose step con barcode en notes. Confirmación OFF con macros grid antes de crear.' },
          { title: 'NUT-13 — Categorías de alimentos como filtro en búsqueda (chips web + mobile)', done: true, priority: 'P2', note: 'DONE. ScrollView horizontal con chips de categoría en LogFoodModal search step. Filtro client-side sobre foods ya cargados. Estado filterCategory, reset en handleClose. Chip "Todos" para limpiar filtro.' },
          { title: 'NUT-AI-01 — Reconocimiento de alimentos por foto con AI (estilo CalAI/CutCoach)', done: false, priority: 'P2', note: 'CONTEXTO: El producto es 100% determinista hoy — esta es la PRIMERA feature que introduce AI en producción. Requiere decisión explícita de Miguel antes de implementar. Condición previa del domain doc: "No antes de validar el producto con usuarios reales" (domains/nutricion.md:259). Análisis competitivo: Lose It! Snap It = 68.7% accuracy con modelo propio entrenado en 230K imágenes. CalAI y CutCoach usan LLM vision (accuracy superior, sin modelo propio). Decisión anterior (competitors/nutricion.md:693): "foto IA es P3 o fuera de roadmap" — basada en modelos especializados tipo Snap It. Con Claude Vision/GPT-4o Vision la ecuación cambia: no hay modelo que entrenar, accuracy superior, y el costo es ~$0.01-0.03/foto. --- ARQUITECTURA TÉCNICA (hexagonal, sin romper capas): (1) DOMINIO: domain/ports/food_recognition.service.ts — interface IFoodRecognitionService { recognizeFood(imageBase64: string): Promise<RecognizedFood[]> } donde RecognizedFood = { name, confidence, estimatedGrams, kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g }. (2) INFRAESTRUCTURA: infrastructure/ai/claude_food_recognition.service.ts — implementa IFoodRecognitionService usando @anthropic-ai/sdk con Claude claude-sonnet-4-5-20250514 vision. Prompt: envía imagen + pide identificar alimentos visibles con porciones estimadas en gramos + macros por 100g. Respuesta structured JSON (tool_use o JSON mode). Fallback: si confidence < 0.6 → retorna resultado pero marca needsConfirmation: true. (3) API: POST /api/mobile/nutrition/foods/recognize + POST /api/nutrition/foods/recognize — recibe image base64 (max 4MB), llama IFoodRecognitionService, retorna RecognizedFood[]. Rate limit: 20/hora por usuario (controlar costo). (4) MOBILE UI: Botón 📷 en LogFoodModal (ya existe para barcode) → nuevo modo "foto" → CameraView captura → envía a API → muestra resultados con confidence % → atleta confirma/ajusta porción → loguea. (5) WEB UI: Botón "Registrar con foto" en LogFoodModal → file input o cámara del dispositivo → mismo flujo. (6) MATCH CON DB: post-reconocimiento, intentar match fuzzy con Food existente en DB (por nombre). Si match → usar macros verificados de DB (más precisos). Si no match → usar macros del modelo + ofrecer "Proponer alimento" (NUT-05 ya existe). --- DEPENDENCIAS NUEVAS: @anthropic-ai/sdk (npm). ENV: ANTHROPIC_API_KEY (ya existe en .env). --- COSTO ESTIMADO: Claude Sonnet vision ~$0.01-0.03/foto. 1000 atletas × 3 fotos/día = ~$90-270/mes. Escala linealmente. --- RIESGO LatAm: modelos vision tienen mejor accuracy con comida occidental. Para bandeja paisa, arepa, pozole → el prompt debe incluir contexto "Latin American cuisine, Colombian/Mexican food" para mejorar accuracy. Testear con 50 platos LatAm antes de lanzar. --- ORDEN DE IMPLEMENTACIÓN: (A) Instalar @anthropic-ai/sdk + crear adaptador infrastructure/ai/. (B) Port + use case en domain/. (C) Endpoints API con rate limit estricto. (D) UI mobile primero (mayor impacto), web después. (E) Testear accuracy con dataset de 50 platos LatAm. (F) Lanzar como beta con badge "AI beta" y opción de corregir.' },
          { title: 'MealPlan versionado: historial de cambios del plan nutricional asignado por el coach', done: false, priority: 'P3', note: 'MealPlan.version ya existe en schema. Agregar MealPlanVersion { userId, version, data, assignedAt, assignedBy }. Coach puede ver cuándo cambió el plan y comparar versiones. Trazabilidad completa.' },
        ],
      },
    ],
  },

  // ─── MÓDULO FUERZA ────────────────────────────────────────────────────────────
  // Scope independiente para trabajo a profundidad en fuerza (tracking, rutinas, progresión)
  // "Fuerza" cubre gym, home workout, calistenia, fortalecimiento corredor — más amplio que "Gym"
  // En UI: renombrar a "Fuerza". En código: mantener gym/GymSession/featureGym para evitar migración.

  {
    id: 'modulo-fuerza',
    label: 'Módulo Fuerza & Ejercicios',
    color: '#1e3a5f',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    phases: [
      {
        id: 'fuerza-atleta-ux',
        label: 'Atleta — UX del Tracker',
        period: 'Próximo',
        items: [
          { title: 'Timer descanso configurable por ejercicio (coach define restSeconds en constructor)', done: true, priority: 'P1', note: 'DONE: RestTimerModal mobile — botones −15s/+15s con Math.max(5s) mínimo + haptic. restSeconds del coach es el default al marcar set done. Atleta ajusta en sesión sin persistir. Branch: feature/gym-tracker-ux.' },
          { title: 'Sustitución de ejercicio durante sesión activa (swap in-session)', done: true, priority: 'P1', note: 'DONE: SwapModal mobile con búsqueda debounced + filtro bodyPart. Botón Sustituir en header del ejercicio (oculto si hay sets completados). Nombre swapped en UI con "Antes: X". exerciseOverrides en payload → route.ts ya aceptaba el schema. Branch: feature/gym-swap-session + feature/16-self-directed-tracking.' },
          { title: 'Curva de fuerza por ejercicio: gráfica de 1RM estimado histórico', done: true, priority: 'P1', note: 'DONE (FASE 1): Brzycki client-side en Tab Sesiones de AthleteDetailClient.tsx. Coach ve gráfica 1RM por ejercicio, últimas 12 semanas. Pendiente: gráfica en /progress del atleta (mobile).' },
          { title: 'Sesión auto-dirigida con búsqueda en librería de ejercicios (sin template requerido)', done: true, priority: 'P1', note: 'DONE: AddExerciseModal en gym-session.tsx — búsqueda debounced en /api/mobile/exercises con filtro bodyPart + thumbnail GIF. FreeExercise con localId virtual. addFreeExercise() + addFreeSet(). Sets con exerciseName en lugar de workoutExerciseId para payload. Estado vacío con CTA. session.freeSession flag desde API. Branch: feature/16-self-directed-tracking.' },
          { title: 'Visualización de sesión anterior mejorada: Δ peso/reps por set (verde si mejora, rojo si baja)', done: true, priority: 'P1', note: 'DONE: gym-session.tsx — prevLog por setNumber. weightDelta y repsDelta calculados en render. Delta label bajo cada input: "+2.5kg" verde, "-2.5kg" rojo, "=80kg" gris, "ant: 80kg" si sin input aún. Placeholder del Kg input muestra valor anterior. Branch: feature/gym-tracker-ux.' },
          { title: 'Drop sets y sets de calentamiento: marcar tipo de set (trabajo / calentamiento / drop)', done: true, priority: 'P2', note: 'DONE (GYM-15): LocalSet.setLogType en gym-session.tsx. Tap en número de set cicla WORK → WARMUP (badge W, fondo naranja) → DROPSET (badge ↓, fondo rojo). SET_TYPE_CONFIG con estilos por tipo. cycleSetType() guarda en draft. setLogType en payload y persistido en SetLog. 3 paths de route.ts actualizados. Backward compat: drafts viejos → default WORK.' },
          { title: 'RPE por ejercicio individual al terminar todos sus sets (no solo RPE de sesión completa)', done: true, priority: 'P2', note: 'DONE: ExerciseRpePicker inline en gym-session.tsx — aparece cuando todos los sets del ejercicio están completados (isExerciseDone). Grid 1-10 con haptic. exerciseRpeMap state. avgExerciseRpe() → defaultRpe en FinishModal. SetLog.rpe persiste en los 3 paths de route.ts. SetLog type + SetPayloadSchema actualizados.' },
          { title: 'FUERZA-PROG-01 — Curva histórica de 1RM para el atleta en /progress (web y mobile)', done: true, priority: 'P2', note: 'DONE (2026-07-21 web · 2026-07-24 mobile). Web: progress/page.tsx + ProgressClient.tsx — query rawSetHistory sobre SetLog, Epley 1RM, sparkline SVG, top 5 ejercicios. Mobile: /api/mobile/progress/route.ts incluye rawSetHistory + gymPRHistory en respuesta. GymPRHistoryPoint/GymPRHistorySeries types en src/api/progress.ts. UI: sección "Progresión 1RM" en progress.tsx con bar chart (RN View) por ejercicio — últimos 6 puntos, delta badge, fecha eje X.' },
          { title: 'GYM-WEB-01 — Exercise picker en /gym/session web: reemplazar input texto por selector de librería', done: true, priority: 'P2', note: 'DONE (2026-07-21). /api/gym/exercises/search/route.ts: nuevo endpoint GET con auth web + mobile, busca nameEs ?? name con insensitive contains, retorna id/name(español)/bodyPart(traducido)/gif, take 20 por popularityRank. gym/session/page.tsx: PickerExercise type, showPicker/pickerQuery/pickerResults/pickerLoading state, useEffect debounced 300ms, selectPickerExercise agrega al free list. UI: botón "+" con borde punteado abre modal portal con input autofocus + lista de resultados con thumbnail GIF.' },
        ],
      },
      {
        id: 'fuerza-coach',
        label: 'Coach — Supervisión y Progresión',
        period: 'Próximo',
        items: [
          { title: 'Coach ve historial completo de gym del atleta: tabla de sesiones, ejercicios, volumen, RPE', done: true, priority: 'P1', note: 'DONE (FASE 1): logs/route.ts con isPR + setLogType por set. Tab Sesiones en AthleteDetailClient con sesiones, ejercicios y curva 1RM. GET /api/coach/gym/athlete/[id]/logs. Pendiente: paginación 20/página y export CSV.' },
          { title: 'PRs consolidados en panel del coach: todos los récords del atleta agrupados por ejercicio', done: true, priority: 'P1', note: 'DONE (FASE 1): GET /api/coach/gym/athlete/[id]/prs — isPR=true, setLogType=WORK. Sección PRs en Tab Sesiones de AthleteDetailClient con ejercicio, peso, reps y fecha. Branch: feature/gym-module-complete.' },
          { title: 'Plantillas de rutina reutilizables entre atletas: duplicar plantilla de otro atleta como base', done: true, priority: 'P1', note: 'DONE: POST /api/coach/gym/routines/[id]/copy — deep copy en $transaction (template + days + exercises + supersets). DuplicateRoutineButton en /coach/gym, redirige al clon para edición inmediata. Branch: feature/routine-copy.' },
          { title: 'Progresión automática de cargas ajustada: incremento si >90% sets completados, baja si <60%', done: true, priority: 'P2', note: 'DONE: computeProgressionUpdates en domain/gym/complete_gym_session.use_case.ts — ratio>0.9 → +2.5kg, ratio<0.6 → −2.5kg (floor 0), zona gris → sin cambio. Constantes PROGRESSION_UP/DOWN_THRESHOLD + PROGRESSION_STEP_KG. 5 nuevos tests.' },
          { title: 'Carga de entrenamiento semanal por atleta: volumen total kg y alerta >20% vs semana anterior', done: true, priority: 'P2', note: 'DONE: GET /api/coach/gym/athlete/[id]/volume — thisWeekKg/lastWeekKg/deltaPct/alert. KPI card en Tab Adherencia de AthleteDetailClient: fondo rojo si alert (>20%), delta en verde/rojo, badge "⚠ +20%". Warmup sets excluidos del cómputo.' },
          { title: 'Vídeos de referencia por ejercicio en el constructor (URL YouTube o Blob)', done: false, priority: 'P3', note: 'Exercise.videoUrl String?. En gym tracker mobile: botón "Ver técnica" abre video en fullscreen. Útil para atletas remotos. Coach puede asignar video por ejercicio en el constructor de rutinas.' },
        ],
      },
      {
        id: 'fuerza-mobile',
        label: 'Mobile — Offline & Wearables',
        period: 'Futuro',
        items: [
          { title: 'Offline support para gym session tracker (AsyncStorage con sync al reconectar)', done: true, priority: 'P1', note: 'DONE: gymSessionDraft.ts — saveDraft/loadDraft (sets en AsyncStorage durante sesión) + savePendingSync/loadPendingSync (cola retry al reconectar). gym-session.tsx carga draft al abrir, guarda en cada cambio y reintenta sync al montar. Branch: feature/16-self-directed-tracking.' },
          { title: 'Apple Watch companion: iniciar sesión de fuerza y registrar sets desde la muñeca', done: false, priority: 'P3', note: 'watchOS extension con WatchConnectivity. Ejercicio actual + timer descanso + conteo de sets en la muñeca. Sync directo al teléfono. Requiere expo bare workflow + native module.' },
        ],
      },

      // ── EJERCICIOS — PRODUCTO ────────────────────────────────────────────────
      {
        id: 'fuerza-producto',
        label: 'Módulo Ejercicios — producto',
        period: 'P1-P2',
        items: [
          { title: 'EJ-01 — Renombrar "Gym" → "Ejercicios" en UI (nav, labels, títulos)', done: true, priority: 'P2', note: 'Renombrado completo de UI: i18n (es/en/pt), sidebars atleta y coach (vía s.gym), tab "Ejercicios" en AthleteDetail (+ comparaciones activeTab), página /coach/gym h1, historial breadcrumb, DailySessionCard, onboarding labels, coaches page filter, ProfileForm/ProgramForm/ProfileSection, upgrade/admin, help pages, api error msgs, mobile fallback label. Código, DB, feature flags y rutas sin tocar.' },
          { title: 'EJ-02 — Atleta crea su propia rutina (self-coach path sin coach asignado)', done: true, priority: 'P2', note: 'DONE: /gym/builder — wizard 3 pasos (nombre+objetivo, días, ejercicios por día). API: POST /api/athlete/gym/routines + /api/gym/assign. Si coach activo → muestra mensaje "tu coach gestiona tu rutina" y bloquea el builder.' },
          { title: 'EJ-03 — Selector de disciplina en sesión libre: Gym / Running / Fortalecimiento / Descanso', done: true, priority: 'P1', note: 'DONE (FASE 2 mobile): log.tsx — FREE_ACTIVITY_TYPES incluye Gym y Descanso con formulario por tipo. Branch: feature/16-self-directed-tracking. Pendiente: web.' },
          { title: 'EJ-04 — Día off/descanso como sesión registrada que cuenta para métricas', done: true, priority: 'P2', note: 'DONE (FASE 2 mobile): log.tsx — SessionType.DESCANSO disponible en selector. Cuenta como actividad en historial sin contar como sesión de entrenamiento. Branch: feature/16-self-directed-tracking.' },
          { title: 'EJ-05 — Métricas multi-período en /progress: mensual, trimestral, semestral, anual', done: true, priority: 'P2', note: 'DONE: period selector 1M/3M/6M/1A (4/12/26/52 semanas). Gráfico actividad mensual (gym+running por mes). Data take extendida a 120 sesiones. monthlyActivity prop en ProgressClient.' },
          { title: 'EJ-06 — Benchmarks UI para el atleta: registrar y ver sus propios tests de rendimiento', done: true, priority: 'P3', note: 'DONE: endpoints GET+POST /api/progress/benchmarks (web Auth.js) + GET+POST /api/mobile/progress/benchmarks (mobile JWT). UI: formulario "Agregar resultado" en sección Tests de Rendimiento en /progress — selector deporte/métrica, tiempo MM:SS o kg, fecha, notas. Estado local optimista.' },
          { title: 'EJ-07 — Panel de adherencia del plan por atleta en coach dashboard', done: true, priority: 'P1', note: 'DONE (FASE 1): GET /api/coach/gym/athlete/[id]/adherence. Tab Adherencia en AthleteDetailClient: últimas 4 semanas, badge semafórico verde >80% / amarillo 60-80% / rojo <60%, barra acumulada. Branch: feature/gym-module-complete.' },
        ],
      },
      {
        id: 'ejercicios-seed',
        label: 'Biblioteca — Fase 0: Ingesta del dataset WorkoutX',
        period: 'P1 — Base del módulo',
        items: [
          {
            title: 'EX-01 — Modelo Prisma Exercise: id, name, bodyPart, target, equipment, difficulty, mechanic, force, caloriesPerMinute, met, popularityRank, isUnilateral, recommendedSets, recommendedReps, description, secondaryMuscles[], instructions[], gifUrl, gifStoredUrl?, source, syncedAt + índices bodyPart/target/equipment',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): schema.prisma reescrito — enums EquipmentType/ExerciseCategory eliminados, muscleGroups[] → bodyPart+target strings, isGlobal → coachId: null. Migración 20260710000001_exercise_rewrite aplicada en Neon prod. @@index([bodyPart/target/equipment]) creados.',
          },
          {
            title: 'EX-02 — WorkoutXClient: adapter HTTP que consume WorkoutX API — solo usado en sync, nunca en producción runtime',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): src/infrastructure/exercise_sync/workoutx.client.ts — fetchAll() pagina 100/request, mapea WorkoutX JSON → Exercise domain. IExerciseSourceClient port en src/domain/exercise/ports/exercise_source.client.ts.',
          },
          {
            title: 'EX-03 — ExerciseSyncUseCase: orquesta fetch → map → upsertMany. Endpoint admin POST /api/admin/exercises/sync',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): src/infrastructure/exercise_sync/exercise_sync.use_case.ts + POST /api/admin/exercises/sync. Pendiente: configurar WORKOUTX_API_KEY en Vercel y ejecutar el endpoint para seed inicial de 1,400+ ejercicios.',
          },
          {
            title: 'EX-04 — IExerciseRepository port + PrismaExerciseRepository: toda la app consume ejercicios desde nuestro DB, nunca desde WorkoutX',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): src/domain/exercise/ports/exercise.repository.ts (IExerciseRepository) + src/infrastructure/db/exercise.repository.ts (PrismaExerciseRepository). findAll(filters), findById, findSimilar, upsertMany.',
          },
          {
            title: 'EX-05 — Seed inicial: correr ExerciseSyncUseCase una vez — carga 1,400+ ejercicios con metadata completa en DB local',
            done: true,
            priority: 'P0',
            note: 'DONE: 1,330 ejercicios sincronizados en DB Neon (producción) vía scripts/sync-exercises.ts. WorkoutXClient corregido: header X-WorkoutX-Key, PAGE_SIZE=10 (free plan cap), loop allExercises.length < total, retry 429 con backoff exponential (attempt*5000ms), 500ms delay entre páginas. PrismaExerciseRepository: BATCH_SIZE=50, $transaction interactivo con timeout:30000ms. Desbloquea EX-08/EX-09/EX-10/EX-11/EX-15/EX-16.',
          },
          {
            title: 'EX-05b — Migración Prisma: agregar nameEs String? + instructionsEs String[] al modelo Exercise + actualizar WorkoutXClient con lang=es',
            done: true,
            priority: 'P0',
            note: 'DONE: (1) Migración ya aplicada en DB-13 (20260708180057). (2) WorkoutXClient actualizado: fetchAll() pasa ?lang=es, interface WorkoutXExerciseEs extiende base con nameEs?/instructionsEs?. map() persiste ambos campos. UpsertExerciseData + Exercise domain types actualizados con nameEs?/instructionsEs[]. Branch: feature/exercise-seed-ready.',
          },
        ],
      },
      {
        id: 'ejercicios-hardening',
        label: 'Biblioteca — Fase 0b: Hardening pre-seed',
        period: 'P0/P1 — Hacer antes de EX-05 y antes de construir UI',
        items: [
          {
            title: 'EX-19 — upsertMany: reemplazar 1,400 queries secuenciales por $transaction por batches de 100',
            done: true,
            priority: 'P0',
            note: 'DONE: exercise.repository.ts — loop secuencial reemplazado por chunks de 100 en prisma.$transaction(batch.map(upsert)). 14 transacciones atómicas en lugar de 1,400 queries sueltas. Elimina timeout de Vercel. Branch: feature/exercise-seed-ready.',
          },
          {
            title: 'EX-20 — Mover ExerciseSyncUseCase de infrastructure/ a domain/exercise/',
            done: true,
            priority: 'P1',
            note: 'DONE: domain/exercise/exercise_sync.use_case.ts creado con imports relativos a ports/ del dominio. infrastructure/exercise_sync/exercise_sync.use_case.ts eliminado. admin/exercises/sync/route.ts actualizado con nuevo path de import.',
          },
          {
            title: 'EX-21 — /api/coach/gym/exercises GET: reemplazar prisma directo por PrismaExerciseRepository + agregar paginación',
            done: true,
            priority: 'P1',
            note: 'DONE: coach/gym/exercises/route.ts reescrito — usa PrismaExerciseRepository.findAll({ coachId, q, bodyPart, target, equipment, page, limit }). Respuesta: { exercises[], total, page, limit }. Callers (routines/new y routines/[id]) actualizados a data?.exercises. Branch: feature/exercise-seed-ready.',
          },
          {
            title: 'EX-22 — requireAdmin en sync/route.ts: leer role del JWT en lugar de hacer query extra a DB',
            done: true,
            priority: 'P1',
            note: 'DONE: requireAdmin() simplificado — session?.user?.role === "ADMIN". Eliminado prisma.user.findUnique + import de prisma. 1 query DB eliminada por cada llamada al sync.',
          },
          {
            title: 'EX-23 — Unificar UpsertExerciseData con Exercise eliminando duplicación de campos',
            done: true,
            priority: 'P2',
            note: 'DONE: UpsertExerciseData → type alias: Omit<Exercise, "gif" | "syncedAt" | "instructionsEs"> & { gifUrl: string; syncedAt: Date; instructionsEs?: string[] }. instructionsEs opcional en el override para custom exercises sin traducción. 0 errores TS.',
          },
          {
            title: 'EX-24 — Usar validateExercise() del dominio en /api/coach/gym/exercises POST en lugar de validación inline duplicada',
            done: true,
            priority: 'P2',
            note: 'DONE: 4 if-checks manuales reemplazados por validateExercise({ name, bodyPart, target, equipment, description }). Ahora incluye límite de 120 chars en nombre que el inline no tenía. Retorna { errors[] } en 400.',
          },
          {
            title: 'EX-25 — Agregar coachId como filtro opcional en ExerciseFilters e IExerciseRepository',
            done: true,
            priority: 'P2',
            note: 'DONE: ExerciseFilters.coachId?: string agregado en exercise.types.ts. PrismaExerciseRepository.findAll: si coachId → AND[OR[{coachId},{coachId:null}], ...otros filtros]. Sin coachId → solo { coachId: null }. AND[] evita colisión de múltiples OR en el mismo objeto Prisma. Branch: feature/exercise-seed-ready.',
          },
          {
            title: 'EX-26 — NaN guard en query params page y limit en /api/exercises y /api/mobile/exercises',
            done: true,
            priority: 'P3',
            note: 'DONE: api/exercises/route.ts + api/mobile/exercises/route.ts — parseInt(val ?? "1", 10) || 1. Fallback a 1/20 si el param es no-numérico. Previene Prisma 500 por skip: NaN.',
          },
          {
            title: 'EX-27 — Quick Swap en constructor de rutinas del coach: reemplazar ejercicio por similar en 1 click',
            done: true,
            priority: 'P2',
            note: 'DONE: SwapModal component en /coach/gym/routines/[id]/page.tsx. Botón "Cambiar por similar" aparece debajo del select cuando hay ejercicio seleccionado. Modal filtrado por bodyPart del ejercicio actual con buscador inline + GIF preview. 1 click actualiza el slot sin perder sets/reps/notes configurados.',
          },
          {
            title: 'EX-28 — Biblioteca de ejercicios standalone en mobile: pantalla /exercises con grid + búsqueda + filtros + modal detalle',
            done: true,
            priority: 'P2',
            note: 'DONE: app/(app)/exercises.tsx — grid 2 cols con GIF, buscador en header, filtros bodyPart scroll horizontal, paginación. Modal nativo pageSheet con GIF 240px + tags + músculos secundarios + instrucciones numeradas. src/api/exercises.ts con getExercises + getExerciseDetail. Botón "Ejercicios →" en header del gym tab (ambas vistas: template picker + rutina asignada). Endpoint /api/mobile/exercises ya existía.',
          },
        ],
      },
      {
        id: 'ejercicios-api',
        label: 'Biblioteca — Fase 1: API propia',
        period: 'P1 — Sin dependencia runtime',
        items: [
          {
            title: 'EX-06 — GET /api/exercises: filtros bodyPart, target, equipment, q= con paginado. GET /api/exercises/:id: detalle completo',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): /api/exercises/route.ts + /api/exercises/[id]/route.ts + /api/mobile/exercises/route.ts + /api/mobile/exercises/[id]/route.ts. gifUrl: gifStoredUrl ?? gifUrl. Filtros: bodyPart, target, equipment, source, q con contains insensitive.',
          },
          {
            title: 'EX-07 — GET /api/exercises/:id/similar: ejercicios similares calculados desde DB (mismo bodyPart + target)',
            done: true,
            priority: 'P1',
            note: 'DONE (feature/exercise-rewrite): /api/exercises/[id]/similar/route.ts — WHERE bodyPart = X AND target = Y AND id != currentId LIMIT 6. Sin dependencia de WorkoutX en runtime.',
          },
        ],
      },
      {
        id: 'ejercicios-ui',
        label: 'Biblioteca — Fase 2: UI visual rediseñada',
        period: 'P1 — Cerrar brecha visual vs Pulse',
        items: [
          {
            title: 'EX-08 — Rediseño /coach/gym/exercises: tabla de texto → hero con contadores + selector visual de bodyPart + chips de equipment + search bar + grid 3 col de cards con GIF',
            done: true,
            priority: 'P1',
            note: 'DONE: tabla → hero stats (total/grupos/tuyos) + search bar + 10 body-part chips + grid 4 col con GIF lazy-load aspect-square + bodyPart/target badges + Global/Tuyo. Paginación 48/página con URLs limpias. Server component, sin JS cliente. Elimina columnas en favor de densidad visual.',
          },
          {
            title: 'EX-09 — Modal detalle de ejercicio: GIF grande + músculos primarios y secundarios + instrucciones paso a paso + badges completos',
            done: true,
            priority: 'P1',
            note: 'DONE: ExercisesGrid.tsx (client component) — click en card → fetch GET /api/coach/gym/exercises/[id] (nuevo endpoint) → modal con GIF full-width, nombre ES+EN, badges (bodyPart/target/difficulty/mechanic/force/equipment), secondaryMuscles chips, instrucciones numeradas (instructionsEs ?? instructions), description. Backdrop click cierra. Loading overlay. Depende de EX-08.',
          },
          {
            title: 'EX-10 — Ejercicios con GIF inline en el constructor de rutinas del coach al asignar ejercicio',
            done: true,
            priority: 'P2',
            note: 'DONE: routines/new/page.tsx + routines/[id]/page.tsx — ExerciseOption incluye nameEs?/gif?. Al seleccionar ejercicio → thumbnail GIF 64×64 inline junto al select (flex container). gifStoredUrl??gifUrl en query del builder. Reduce errores de asignación visual. Branch: develop.',
          },
          {
            title: 'EX-15 — Biblioteca de ejercicios para atleta en web: /exercises con filtros bodyPart + equipment + search + grid de cards con GIF',
            done: true,
            priority: 'P2',
            note: 'DONE: /gym/exercises/page.tsx — server page con bodyPart chips + search + paginación PAGE_SIZE=48. AthleteExercisesGrid.tsx (client) — grid + modal detalle igual que coach (GIF, badges, instrucciones ES). API GET /api/gym/exercises/[id] accesible a ATHLETE y COACH. Link "Ejercicios" en header de /gym. Branch: develop.',
          },
          {
            title: 'EX-16 — Modal detalle de ejercicio para atleta: GIF + músculos + instrucciones + botón "Agregar a rutina libre"',
            done: true,
            priority: 'P2',
            note: 'DONE: ExerciseModal en AthleteExercisesGrid.tsx — GIF full-width, nombre ES+EN, badges (bodyPart/target/difficulty/mechanic/force/equipment), secondaryMuscles, instrucciones numeradas ES. Backdrop click cierra. Loading overlay. Branch: develop.',
          },
          {
            title: 'EX-17 — Swap de ejercicio en sesión activa: sugerencia de alternativas calculada desde DB local (mismo bodyPart + equipment compatible)',
            done: true,
            priority: 'P2',
            note: 'DONE: GET /api/mobile/exercises/[id]/alternatives — bodyPart+equipment match OR body weight, fallback any bodyPart, LIMIT 5. SwapModal: exerciseId prop + fetch alternativas on open + sección "Sugeridas" con scroll horizontal + thumbnail GIF. swapTarget state incluye exerciseId. Cero llamadas a WorkoutX. Branch: develop + feature/16-self-directed-tracking.',
          },
          {
            title: 'EX-18 — Calorías quemadas en sesión gym: caloriesPerMinute × duración → kcalBurned en SessionLog → descuento en balance nutricional del día',
            done: true,
            priority: 'P2',
            note: 'DONE: GymSession.caloriesBurned Int? (migración 20260711000001). complete/route.ts: estimateCalories(durationMin) = durationMin × avg(caloriesPerMinute de ejercicios, fallback 5.0 kcal/min). 3 paths actualizados. /api/mobile/nutrition/route.ts: query gymSessionToday.caloriesBurned → gymKcalBurned en response. NutritionData type + nutrition.tsx: badge "🔥 Quemaste X kcal en gym hoy" naranja debajo de macros.',
          },
        ],
      },
      {
        id: 'entreno-figma',
        label: 'Entreno — Diseño UX en Figma',
        period: 'P1 — Fuente de verdad visual',
        items: [
          {
            title: 'ENTRENO-FIGMA-01 — Rediseño UX completo de la sección Entreno en Figma: 7 frames web con layout 2 columnas',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-09-11). 7 frames en Figma (fileKey fV1SK1rxdJHAmA8n1zK3Cm, página Atleta 7:2, sección 6108:194 renombrada "🏋️ Entreno"). Frames: Estado Vacío (6258:190), Dashboard (6258:191), Sesión Activa (6258:192), Resumen Post-Sesión (6258:193), Historial (6258:194), Biblioteca de Ejercicios (6291:204), Constructor de Rutinas (6291:287). Layout 2-col (58-65%/35-42%), progressive disclosure, tokens DS (navy/orange/green). Sidebar nav renombrada de "Gym" a "Entreno" en los 5 frames originales. Screen 3 incluye rest timer + biserie badges. Cubre 100% de features del código actual.',
          },
          {
            title: 'ENTRENO-FIGMA-02 — Auditoría completa Figma vs código: 13 frames (6 mobile + 7 web) alineados + 2 code bugs fijos',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-09-14). Auditoría de 13 frames Entreno vs código web+mobile. Mobile: 4 frames corregidos (1-4), 2 ya alineados (5-6). Web: Frame 4 corregido ("¿Molestias?"→"¿Alguna molestia?", "Guardar y ver resumen"→"Guardar y continuar"). Code bugs: exercises/page.tsx breadcrumb "← Gym"→"← Entreno", history/page.tsx breadcrumb "Ejercicios"→"Entreno". Posición frames corregida: web arriba (y=80), mobile abajo (y=1100) — consistente con Dashboard/Plan/Check-in/Nutrición.',
          },
          {
            title: 'ENTRENO-CODE-01 — Extracción de lógica compartida gym web↔mobile a domain use cases',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-09-15). ~660 líneas duplicadas eliminadas. Creados: domain/gym/get_today_session.use_case.ts (orquestador today), domain/gym/complete_session.orchestrator.ts (orquestador complete), domain/gym/gym_session.schemas.ts (Zod schemas compartidos). 4 rutas refactorizadas a thin wrappers (~20 líneas c/u): web today, mobile today, web complete, mobile complete. Misma respuesta JSON, zero breaking changes.',
          },
          {
            title: 'ENTRENO-CODE-02 — Implementación layout 2 columnas Figma en 5 páginas web Entreno',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-09-16). 5 páginas reestructuradas de max-w-3xl single-column a max-w-7xl con grid grid-cols-1 lg:grid-cols-[1fr_380px]. gym/page.tsx: estado vacío (plantillas + sidebar mapa muscular/ejercicios/coach tip) y dashboard (sesión hoy con ejercicios numerados + sidebar adherencia semanal/plan semanal). gym/history/page.tsx: stats full-width top + lista sesiones clickeables + sidebar detalle sesión (searchParams ?s=). gym/session/page.tsx: ejercicios con GIF/inputs + sidebar mapa muscular/progreso ejercicios. gym/builder GymRoutineBuilder.tsx: step 3 usa max-w-7xl con editor días + sidebar agregar ejercicios. gym/exercises/page.tsx ya tenía max-w-7xl. Responsive: sidebar hidden lg:block, mobile 1-col. TypeScript zero errors.',
          },
        ],
      },
      {
        id: 'ejercicios-mobile',
        label: 'Biblioteca — Fase 3: Mobile',
        period: 'P2 — Atleta ve el ejercicio del día',
        items: [
          {
            title: 'EX-11 — Ejercicio del día en mobile y web: GIF demo al ejecutar la sesión asignada por el coach',
            done: true,
            priority: 'P1',
            note: 'DONE: Mobile (gym-session.tsx): GIF 160px height + resizeMode:contain. Web (athlete/gym/session/page.tsx): gif añadido a ExerciseData type + img max-h-48 renderizado al expandir ejercicio. API ya retornaba gif (gifStoredUrl??gifUrl) en ambas rutas.',
          },
          {
            title: 'EX-12 — Búsqueda de ejercicios en mobile: atleta puede explorar la biblioteca desde la app',
            done: true,
            priority: 'P2',
            note: 'DONE: AddExerciseModal en gym-session.tsx implementa búsqueda full con debounce + filtro bodyPart + thumbnail GIF + lista de resultados. Cubre el caso de exploración de ejercicios desde la app en contexto de sesión libre. src/api/gym.ts: gif? en ExerciseSearchResult. Branch: feature/16-self-directed-tracking.',
          },
        ],
      },
      {
        id: 'ejercicios-storage',
        label: 'Biblioteca — Fase 4: Independencia total (GIFs en AWS S3)',
        period: 'P2 — Trigger: 5 coaches pagando activos',
        items: [
          {
            title: 'EX-13 — Script admin: descarga todos los GIFs desde gifUrl → sube a AWS S3 → actualiza gifStoredUrl en DB',
            done: false,
            priority: 'P2',
            note: 'BLOQUEADO por licencia: WorkoutX ToS prohíbe bulk caching. Requiere comprar ExerciseDB $599 one-time (self-hosting permitido explícitamente). Trigger: cuando haya 5 coaches pagando activos. Alternativa interim implementada: proxy GET /api/gym/gif/[id] (EX-GIF-PROXY).',
          },
          {
            title: 'EX-14 — UI transparente: gifStoredUrl ?? gifUrl en todos los componentes que muestran GIFs de ejercicios',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-08-20): resolveExerciseGifUrl() en src/lib/gym/gif_url.ts. Proxy GET /api/gym/gif/[id] añade X-WorkoutX-Key server-side. Todos los puntos actualizados: exercise.repository.ts, gym/session/today, (athlete)/gym/page.tsx, gym/exercises/page.tsx + AthleteExercisesGrid.tsx, coach/gym/exercises/page.tsx + ExercisesGrid.tsx, api/gym/exercises/search/route.ts, api/gym/session/[id]/route.ts, api/mobile/exercises/[id]/alternatives/route.ts. Cache 7 días en Vercel Edge.',
          },
        ],
      },
    ],
  },

  // ─── IA & FUTURO ─────────────────────────────────────────────────────────────

  // Sección "Coach AI & IA Proactiva" eliminada (2026-08-29) — AI removida del sistema

  // ─── BUGS ACTIVOS — lista viva ────────────────────────────────────────────────
  // Agregar con done: false | Al resolver: marcar done: true (desaparece automáticamente)

  {
    id: 'bugs',
    label: 'Bugs Activos',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    liveList: true,
    phases: [

      // ── GYM & TRACKING ────────────────────────────────────────────────────────
      {
        id: 'bugs-gym',
        label: 'Gym & Tracking',
        period: 'Urgente',
        items: [
          { title: 'BUG-001 — Gym: "Finalizar sesión" no persiste en desktop (modal no monta)', done: true, priority: 'P0', note: 'Root cause: animate-fade-up en AthleteLayout aplica CSS transform → nuevo stacking context → fixed modal queda atrapado dentro del <main>. Fix: createPortal en gym/session/page.tsx monta CompleteModal directamente en document.body.' },
          { title: 'BUG-025 — Gym: POST /api/gym/session/complete rechaza CUID/slugs con "Invalid UUID"', done: true, priority: 'P0', note: 'Fix: z.string().uuid() → z.string().min(1) en 5 campos de gym/session/complete/route.ts (SetPayloadSchema.workoutExerciseId, ExerciseOverrideSchema x2, GymCompleteSchema.assignedWorkoutId+plannedSessionId). Idem en api/log/session/route.ts:plannedSessionId y api/mobile/log/session/route.ts:sessionId.' },
          { title: 'BUG-026 — Dashboard: dots de consistencia semanal muestran 0 tras completar sesión de gym (modo FREE)', done: true, priority: 'P2', note: 'Root cause: dots w-2 (8px) demasiado pequeños para detectar visualmente + Next.js Router Cache puede servir /dashboard stale. Fix: dots w-2→w-3 (12px) + revalidatePath("/dashboard") en gym/session/complete/route.ts en ambos paths (plannedSession y assignedWorkout). La lógica weekSessionCount era correcta.' },
          { title: 'BUG-016 — Plan "Gym / Ganar músculo" incluye 3 sesiones de running/semana', done: true, priority: 'P1', note: 'Fix: nuevo STRENGTH_TRAINING_16W en templates.ts — Upper/Lower 4 días (Lun/Mar/Jue/Vie), sin RODAJE_Z2. Push/Quad/Pull/Posterior con progressión de fases BASE→DESARROLLO→ESPECIFICO→AFINAMIENTO. PLAN_TEMPLATES apunta STRENGTH_TRAINING al nuevo template.' },
          { title: 'BUG-017 — Registro de sesión del plan es binario (Sí/No), sin métricas reales', done: true, priority: 'P1', note: 'Fix: LogModal ahora detecta tipo de sesión. Running (RODAJE_Z2,FARTLEK,TEMPO,etc): campo distanceKm + ritmo calculado (mm:ss/km). FUERZA: card con link al módulo Gym. EditModal también agrega distanceKm para running. API PATCH /log/session/[logId] acepta distanceKm. Datos mapeados en page.tsx vía logDistanceKm.' },
        ],
      },

      // ── ONBOARDING & PLAN ─────────────────────────────────────────────────────
      {
        id: 'bugs-onboarding',
        label: 'Onboarding & Plan',
        period: 'Urgente',
        items: [
          { title: 'BUG-002 — Onboarding "Plan personalizado" no genera el plan automáticamente', done: true, priority: 'P0', note: 'Fix: onboarding/page.tsx redirige RUNNING/BOTH a /new-goal tras completar setup (antes iba a /dashboard vacío). dashboard/page.tsx agrega CTA "Crear plan" para modo FREE sin historial previo. El onboarding por diseño solo configura nutrición + perfil; el plan se genera en /new-goal.' },
          { title: 'BUG-005 — /new-goal no hereda la meta elegida en onboarding; falta opción "Ganar músculo"', done: true, priority: 'P1', note: 'Fix: page.tsx convertida a server component → lee HealthProfile.sportGoal → pasa defaultGoal a NewGoalClient.tsx (nuevo client component). Pre-selecciona la meta del onboarding con banner informativo. Añadida opción STRENGTH_TRAINING al selector.' },
          { title: 'BUG-021 — Onboarding pregunta el deporte 3 veces y los días disponibles 2 veces', done: true, priority: 'P2', note: 'Resuelto en commit dcdda75 (feat: simplificar wizard a 3 pasos). El onboarding actual tiene solo goal → physical → generating. No hay repetición de deporte ni días disponibles. Tests existentes en onboarding-steps.test.ts verifican los flujos.' },
        ],
      },

      // ── DATOS & CÁLCULOS ──────────────────────────────────────────────────────
      {
        id: 'bugs-datos',
        label: 'Datos & Cálculos',
        period: 'Urgente',
        items: [
          { title: 'BUG-003 — FC máxima inconsistente: onboarding Fox (211-0.64×edad) vs perfil Tanaka (208-0.7×edad)', done: true, priority: 'P1', note: 'Fix: ProfileClient.tsx ahora usa Fox (211-0.64×edad). generate-plan.use-case persiste hrMax calculado a HealthProfile en Phase 3. help/page.tsx actualizado. Fox es fuente canónica en todo el sistema.' },
          { title: 'BUG-004 — TDEE inconsistente entre vistas (4 valores distintos el mismo día)', done: true, priority: 'P1', note: 'Fix: nutrition/page.tsx lazy init ahora usa daysPerWeek=5 (igual que syncWeight y nutrition/generate). Todas las recalculaciones de TDEE usan factor 1.725. Vistas solo leen NutritionPlan.tdee.' },
          { title: 'BUG-007 — Progreso: "Objetivo 0 kg · Faltan 77 kg" sin meta de peso definida', done: true, priority: 'P2', note: 'Fix: ProgressClient.tsx cambia weightGoal !== null → !!weightGoal. Si no hay meta: CTA "Define tu meta de peso" con Link a /profile en lugar de mostrar 0 kg.' },
          { title: 'BUG-009 — FC reposo del check-in no sincroniza al perfil de salud', done: true, priority: 'P2', note: 'Ya implementado: process-check-in.use-case línea 145-148 hace txHealthProfile.updateHrResting(userId, data.heartRate). Web y mobile checkin routes mapean body.hrResting → heartRate correctamente.' },
          { title: 'BUG-010 — Dos métricas de adherencia distintas en la misma pantalla (/plan)', done: true, priority: 'P2', note: 'Fix: KPICard ahora dice "Adherencia / esta semana". Chart renombrado a "Historial de adherencia / Promedio histórico X%". Labels dejan claro que miden períodos distintos.' },
          { title: 'BUG-011 — "Adherencia promedio 2%" engañoso en usuario nuevo (promedia semanas vacías)', done: true, priority: 'P2', note: 'Ya implementado: pastSlots = slots.filter(s => !s.isFuture) excluye semanas futuras. El promedio solo considera semanas pasadas + semana actual hasta el día de hoy.' },
          { title: 'EDGE-06 — /api/checkin y /api/mobile/checkin: validar min/max en todos los campos numéricos', done: true, priority: 'P2', note: 'Fix: weightKg con min(10).max(500) en ambas rutas. Todos los campos numéricos ya tenían min/max en Zod. Web: api/checkin/route.ts, Mobile: api/mobile/checkin/route.ts.' },
          { title: 'BUG-022 — HealthProfile.age almacenado, no calculado — se vuelve stale después del onboarding', done: true, priority: 'P1', note: 'Fix: calcAge(dob) en src/lib/utils/calc_age.ts calcula edad en runtime desde dateOfBirth. health-profile.repository.ts ahora incluye dateOfBirth en find(). process-check-in.use-case.ts usa runtimeAge = calcAge(profile.dateOfBirth) con fallback a profile.age. Tests en calc-age.test.ts (8 casos).' },
          { title: 'BUG-023 — InviteCode.usedBy es String? sin FK — referencia huérfana si el usuario se elimina', done: true, priority: 'P2', note: 'Fix: usedByUser User? @relation("UsedInvites", onDelete: SetNull) en schema.prisma. Migración 20260630000001 aplica FK a prod. Admin page /admin/invite-codes ahora usa include: { usedByUser } en lugar de lookup manual + join manual — elimina segunda query y el Map.' },
          { title: 'GAP-01 — gymGoal granularidad perdida: activityToSportGoal() mapea MUSCLE_GAIN/FAT_LOSS/RECOMPOSITION todos a BODY_RECOMPOSITION', done: true, priority: 'P1', note: 'DONE. Verificado en complete-onboarding.use-case.ts: MUSCLE_GAIN → STRENGTH_TRAINING ya estaba implementado (línea 149). FAT_LOSS y RECOMPOSITION → BODY_RECOMPOSITION (correcto per spec). Fix ya estaba en código desde sesión anterior — solo faltaba marcarlo done. Para usuarios existentes con sportGoal incorrecto: actualizar manualmente en DB si hay atletas MUSCLE_GAIN con sportGoal=BODY_RECOMPOSITION (beta, pocos usuarios).' },
        ],
      },

      // ── UI / UX ATLETA ────────────────────────────────────────────────────────
      {
        id: 'bugs-ux',
        label: 'UI/UX Atleta',
        period: 'Urgente',
        items: [
          { title: 'BUG-006 — Bottom-nav mobile omite Nutrición, Progreso y Mensajes', done: true, priority: 'P1', note: 'Nav tiene 6 tabs visibles: Inicio · Plan · Gym · Nutrición · Progreso · Perfil. Mensajes accesible desde Perfil con badge de unread count — patrón correcto para no saturar la barra. Checkin oculto del nav (href:null) pero accesible como ruta.' },
          { title: 'BUG-008 — Guardar no refresca la vista hasta recargar (stale UI)', done: true, priority: 'P2', note: 'Fix dual: (1) PlanClient.tsx SessionDetailCard.onSaved agrega router.refresh() para invalidar cache de Next.js y refrescar props server-side al editar sesión. (2) ProfileClient.tsx calcula displayAge/displayHrMax desde prop p (server-refreshed) en lugar de profileForm state, así FC máxima en modo vista refleja datos actualizados.' },
          { title: 'BUG-018 — KPI cards hermanas con 3 tratamientos visuales distintos', done: true, priority: 'P2', note: 'Fix: KpiCard compartido en src/app/_components/kpi_card.tsx (props: label, value, sub, color, center). Usado en coach/dashboard (local eliminado), admin/metrics y coach/finanzas. getDisplayStatus extraída a src/lib/coach/payment_status.ts con 6 tests.' },
          { title: 'BUG-012 — Enums crudos visibles en UI (RACE_10K, HYPERTROPHY, CHEST…)', done: true, priority: 'P3', note: 'Fix: src/lib/labels/enum_labels.ts fuente canónica (GOAL_LABEL + SPORT_LABEL + ROLE_LABEL + label()). Aplicado en admin/users/_components/UsersTable.tsx (columna Deporte/Objetivo) y admin/users/[id]/page.tsx (Deporte+Objetivo de salud). 25 tests.' },
          { title: 'BUG-013 — "Zona N/A" en sesiones de fuerza', done: true, priority: 'P3', note: 'Fix: shouldShowZone(sessionType, zoneTarget) en src/lib/plan/zone_utils.ts. Guard aplicado en WeekDayStrip.tsx (DashboardCard + GridCell) y PlanBuilderClient.tsx. Oculta zona si FUERZA o zoneTarget es N/A/vacío. 10 tests.' },
          { title: 'BUG-014 — Leyenda "KM por fase" repite la etiqueta ESPECÍFICO', done: true, priority: 'P3', note: 'Fix: normalizePhase() en ProgressClient.tsx elimina tildes antes del lookup en PHASE_BAR_COLOR. DB puede guardar ESPECÍFICO o ESPECIFICO — normalización garantiza color correcto en ambos casos.' },
          { title: 'BUG-015 — Dos lugares para registrar métricas (Check-in vs Perfil)', done: true, priority: 'P3', note: 'Fix: hint en ProfileClient.tsx explicando que Perfil = datos base permanentes, Check-in semanal = seguimiento semanal con link directo a /checkin. No hay lógica duplicada — los endpoints son distintos (healthProfile vs weeklyCheckIn).' },
          { title: 'BUG-019 — Sin escala consistente de border-radius (0/4/10/18px mezclados)', done: true, priority: 'P3', note: 'Fix: rounded-md → rounded-lg en ActivateButton, DeleteUserButton, NutritionConstructor y DailySessionCard (badges). rounded-[8px] → rounded-lg en CheckInClient textareas. Escala canónica: inputs/botones=rounded-lg, cards=rounded-xl, cards grandes=rounded-2xl, badges pequeños=rounded-full.' },
          { title: 'BUG-020 — Touch targets < 44px (selector idioma ~20px, links 15px)', done: true, priority: 'P3', note: 'Fix: min-h-[44px] min-w-[44px] en LanguageSwitcher.tsx (py-3 + px-2.5) y botones logout de los 3 sidebars (athlete SidebarClient, CoachSidebarClient, AdminSidebarClient). Área táctil 44×44px sin cambio visual apreciable.' },
          { title: 'A11Y-02 — lang="pt" en HTML root (debería ser "es")', done: true, priority: 'P3', note: 'Working as designed: layout.tsx usa lang={locale} dinámico via getServerLocale(). DEFAULT_LOCALE="es" — cookieless users reciben "es". User con cookie pt="pt" recibe "pt" correctamente (producto multilingüe es/en/pt).' },
          { title: 'BUG-045 — Landing pública muestra CTAs en inglés cuando browser language=en', done: true, priority: 'P1', note: 'QA-2026-07-03: CTAs en landing (/) aparecen en inglés ("Reserve free access", "I\'m a coach", "I\'m an athlete", "Start free") cuando el Accept-Language del browser es "en". DEFAULT_LOCALE debería forzar español para la landing pública independientemente del browser, ya que el mercado objetivo es LatAm. Investigar getServerLocale() en layout.tsx — ¿usa Accept-Language header en lugar de solo la cookie? Fix: para rutas públicas (/) ignorar Accept-Language y usar siempre DEFAULT_LOCALE="es", o al menos para la landing de marketing.' },
          { title: 'BUG-046 — Check-in viernes: mensaje "espera al viernes" cuando HOY es viernes', done: true, priority: 'P2', note: 'DONE: checkin/page.tsx ya usa nowInTz (timezone America/Bogota) para dayOfWeek. isEarlyInWeek = dayOfWeek >= 1 && dayOfWeek <= 4 → viernes (5) siempre abre formulario directo.' },
          { title: 'BUG-047 — Dashboard Sebastián: hero muestra "Sin plan activo" pero widget semanal muestra plan 5K', done: true, priority: 'P2', note: 'Cerrado: no es bug. Hero filtra status=\'ACTIVE\' → correcto. Widget semanal muestra PlanCompletionCard en modo RECOVERY (plan completado ≤14 días) → comportamiento diseñado según atleta.md:66-83.' },
          { title: 'BUG-048 — Onboarding paso 2: sin feedback de validación al usuario (valores inválidos bloqueados en silencio)', done: true, priority: 'P2', note: 'Fix: isStepValid() ahora valida rangos (edad 10-100, altura 100-250, peso 30-300). onboarding/page.tsx muestra mensajes de error inline en rojo bajo cada campo fuera de rango. Label "Talla" → "Altura" (UX-02). Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-049 — Sidebar idioma persiste en PT (Portugués) entre sesiones de usuarios en ES', done: true, priority: 'P2', note: 'QA-2026-07-03: El sidebar de navegación muestra labels en Portugués ("Sair", "Início", "Meu Plano", "Nutrição") para múltiples usuarios (Ana, Miguel, Juan, Sebastián) aunque el contenido de la página está en español. El selector de idioma muestra "PT" activo. La cookie de idioma queda persistida en PT desde sesiones anteriores y no se limpia al hacer logout o al login de un nuevo usuario. Fix: al hacer login, verificar si hay cookie de idioma y solo resetear a DEFAULT_LOCALE="es" si el usuario no tiene preferencia explícita guardada en DB.' },
          { title: 'BUG-050 — /checkin UI muestra "Semana 6 · 22 may" aunque el check-in se guardó correctamente en semana 12', done: true, priority: 'P1', note: 'Fix: weekData sintético construido cuando PlanWeek no existe en DB. startMs = plan.startDate + (currentWeek-1)*7días. Elimina fallback al último PlanWeek. checkin/page.tsx. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-051 — Botón "Actualizar datos de esta semana" en /checkin redirige al home en lugar de abrir formulario', done: true, priority: 'P2', note: 'DONE: CheckInClient.tsx — onUpdate={() => setOpenForm(true)} abre formulario inline. SubmittedCheckInView recibe y usa onUpdate correctamente.' },
          { title: 'BUG-052 — Click en Guía de alimentos de /nutrition navega a /progress (event bubbling)', done: true, priority: 'P2', note: 'DONE: TrackingSection y FoodGuide son divs independientes en nutrition/page.tsx sin wrapper de Link a /progress. FoodCard usa buttons. No hay propagación.' },
          { title: 'BUG-053 — /nutrition: sin botón eliminar alimento registrado en el log del día (web)', done: true, priority: 'P2', note: 'DONE: TrackingSection.tsx tiene handleDelete() + botón ✕ por cada log entry. Llama DELETE /api/nutrition/log/[id] y refresca la lista.' },
          { title: 'BUG-054 — /gym/session: click en "×" de set de ejercicio colapsado navega al home', done: true, priority: 'P1', note: 'QA-2026-07-03: En la sesión activa de gym (/gym/session), al intentar registrar un set "×" en un ejercicio que no está expandido activamente, el evento navega a https://www.medaliq.com/ (home) en lugar de registrar la serie. Solo funciona registrar sets en el ejercicio que está actualmente expandido. Causa probable: el elemento "×" dentro del acordeón colapsado tiene un link o un ancestor con href="/" que captura el click antes del handler de registrar serie. Verificar GymSessionClient.tsx — los set markers dentro de acordeones colapsados tienen event bubbling hacia un elemento clickeable que apunta al home. Fix: stopPropagation() en el handler de click del set marker, o reestructurar el DOM para que el link padre no envuelva los set markers.' },
          { title: 'BUG-055 — Peso inconsistente: /plan y /profile (75kg) vs /dashboard y /progress (73.5kg)', done: true, priority: 'P2', note: 'Fix: syncWeight compara vs profile.weightKg (base) no vs check-in previo. `const prev = profile.weightKg ?? newWeight`. process-check-in.use-case.ts. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-056 — Dashboard ESTA SEMANA: calendario muestra ✓ Rodaje Z2 (SessionLog) pero DailySessionCard muestra "😴 Descanso hoy" (PlanWeekSession)', done: true, priority: 'P1', note: 'CÓDIGO LOCALIZADO 2026-07-03. Dos componentes independientes con fuentes desincronizadas. (1) DashboardCalendarStrip llama /api/athlete/calendar → buildCalendarWeek() en src/infrastructure/db/calendar.ts:41-105 que consulta PlannedSession + SessionLog + GymSession y los reconcilia en week-day-cells.ts:73-78 → muestra ✓ Rodaje Z2. (2) DailySessionCard usa datos del server en dashboard/page.tsx:330-341 que SOLO consulta PlannedSession → si plan dice DESCANSO, todaySession=null → DailySessionCard línea 125-129 muestra "😴 Descanso hoy". Contador "0/0 completadas" en page.tsx:367-369 también ignora SessionLog. FIX: en dashboard/page.tsx:330, si todayPlanned.type === DESCANSO, revisar también SessionLog del día y pasarlo a DailySessionCard como actividad libre registrada.' },
          { title: 'BUG-057 — Dashboard "0/0 completadas" ignora SessionLog: atleta que entrena libremente no ve progreso semanal', done: true, priority: 'P2', note: 'CÓDIGO LOCALIZADO 2026-07-03. Archivo: src/app/(athlete)/dashboard/page.tsx líneas 367-369. `completedCount = selectedPlanWeekSessions.filter(s => s.log && s.type !== DESCANSO).length` y `totalTraining = selectedPlanWeekSessions.filter(s => s.type !== DESCANSO).length`. Ambos solo cuentan PlannedSession — SessionLog (actividades libres via /log/run) no entra. FIX: consultar también SessionLog de la semana actual y sumar al contador, o mostrar un contador adicional "N actividades libres esta semana" en DailySessionCard.' },
          { title: 'BUG-058 — /plan semanas sin PlanWeek en DB muestran "Día de descanso" sin distinguir de plan incompleto', done: true, priority: 'P1', note: 'Fix: condición !week antes del else → "📋 Semana sin sesiones definidas" vs "😴 Día de descanso". PlanClient.tsx. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-059 — /plan adherencia histórica 0% en semanas con plan vacío: métrica engañosa para atleta', done: true, priority: 'P2', note: 'QA-2026-07-03: El historial de adherencia en /plan muestra 0% para semanas 10-14. Técnicamente correcto (0 sesiones planificadas / 0 sesiones completadas = no aplica), pero se muestra como 0% que parece "mal desempeño". Las semanas donde el plan no tiene sesiones deberían mostrarse como "—" o "sin datos" en lugar de 0%. Fix: en el cálculo de adherencia, si denominador === 0 → mostrar null/"—" en lugar de 0%. Verificar el componente de adherencia en /plan y en /progress.' },
          { title: 'BUG-060 — /nutrition: CTA "¿Quieres un plan de comidas?" aparece aunque el atleta ya tiene NutritionPlan activo', done: true, priority: 'P3', note: 'Cerrado: texto "Configura tu plan nutricional" no existe en código actual. nutrition/page.tsx usa condición !nutritionPlan correctamente. Si el atleta tiene NutritionPlan en DB, no se muestra ningún CTA.' },
          { title: 'BUG-061 — /progress adherencia histórica 0% en todas las semanas (doble causa: seed no guarda el campo + API calcula mal)', done: true, priority: 'P1', note: 'CÓDIGO LOCALIZADO 2026-07-03. CAUSA 1 — Seed no persiste el campo: prisma/seed.ts:258-264 crea WeeklyCheckIn con wkg/hr/sleep/score/rpe/pain/energy/notes pero OMITE `adh` (adherencia). El campo DB se llama `dietAdherencePct` (schema.prisma:449) — el seed nunca lo popula, queda en null. CAUSA 2 — API calcula adherencia solo desde logs: src/app/api/mobile/progress/route.ts:86-91 `adherencePct: adherencePct(w.sessions)` que cuenta `PlannedSession.log !== null`. Nunca consulta WeeklyCheckIn.dietAdherencePct. FIX DOBLE: (1) prisma/seed.ts:259 agregar `dietAdherencePct: ci.adh` al create de WeeklyCheckIn. (2) progress/route.ts:86: en la query incluir WeeklyCheckIn para la semana y usar su dietAdherencePct si existe, sino calcular desde sessions.' },
          { title: 'BUG-062 — /progress: texto "ÚLTIMAS 1 SESIONES" gramaticalmente incorrecto', done: true, priority: 'P3', note: 'DONE: ProgressClient.tsx — title condicional: recentActivity.length === 1 ? "última sesión" : `últimas ${n} sesiones`.' },
          { title: 'BUG-063 — /gym B2B: atleta sin rutina asignada bloqueado sin acceso a plantillas (early return en gym/page.tsx:95-106)', done: true, priority: 'P2', note: 'Fix: early return eliminado. B2B sin rutina ve banner azul "Tu coach aún no te asignó una rutina" + plantillas públicas debajo. B2C sin coach ve plantillas directamente sin banner. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-064 — /gym: sin opción de registrar sesión libre mientras se espera rutina del coach', done: true, priority: 'P2', note: 'DONE: gym/page.tsx — banner "Tu coach aún no te asignó una rutina" ahora incluye link "Registrar sesión libre →" apuntando a /gym/session (que ya soporta modo freeSession cuando no hay AssignedWorkout).' },
          { title: 'BUG-065 — /log/run: sin redirect ni confirmación visual tras guardar corrida', done: true, priority: 'P2', note: 'DONE: log/run/page.tsx ya hace router.push("/dashboard") tras POST exitoso. Feedback visual implícito vía navegación.' },
          { title: 'BUG-066 — /log/run: slider de duración no se resetea al valor default después de guardar', done: true, priority: 'P3', note: 'DONE: log/run/page.tsx — handleSubmit llama setRunType(null), setDurationMin(45), setDistanceKm(""), setRpe(null), setNotes("") antes del router.push. Formulario vuelve al estado inicial tras cada guardado exitoso.' },
          { title: 'BUG-067 — /profile: fecha de nacimiento vacía pero edad muestra "30 años" (edad hardcodeada en HealthProfile.age)', done: true, priority: 'P2', note: 'DONE: ProfileClient.tsx muestra `{p.dateOfBirth ? calcAge(p.dateOfBirth) : p.age} años` — calcula dinámicamente desde birthDate si existe. Formulario de edición tiene campo dateOfBirth. calcAge() implementada con lógica correcta de cumpleaños.' },
          { title: 'BUG-068 — /progress: gap S7-S11 en gráfico de peso por check-in guardado en semana incorrecta (encadenado con BUG-050)', done: true, priority: 'P2', note: 'Cerrado: consecuencia de BUG-050 (ya resuelto). getPlanWeekNumber() ahora calcula correctamente. Los datos con weekNumber incorrecto eran de seed, no de usuarios reales.' },
          { title: 'BUG-069 — Onboarding: contador "Paso X de Y" cambia el total dinámicamente al seleccionar opciones', done: true, priority: 'P3', note: 'Fix: onboarding/page.tsx — totalSteps calculado excluyendo el paso "generating" (steps.filter(s => s !== "generating").length). El total ya no incluye la pantalla de carga como paso visible, estabilizando el contador. isLastDataStep sigue usando steps[stepIndex + 1] === "generating" (correcto). Branch: feature/landing-conversion.' },
          { title: 'BUG-070 — /new-goal: pre-selección de meta no corresponde al deporte elegido en onboarding', done: true, priority: 'P2', note: 'Resuelto por eliminación: directorio /new-goal eliminado (ARCH-01). La ruta no es accesible desde ningún flujo activo.' },
          { title: 'BUG-071 — /new-goal: "Error generando plan" (HTTP 500) — WorkoutDay FK no existe en producción', done: true, priority: 'P0', note: 'Fix (UX-04): /new-goal ya no genera plan. NewGoalClient llama PATCH /api/athlete/sport que guarda goalType en HealthProfile y redirige a /dashboard. El plan se genera cuando el coach lo asigne o vía flujo posterior. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-072 — /checkin: botón "Abrir check-in de todas formas" navega a /api/auth/signout — cierra sesión', done: true, priority: 'P0', note: 'Fix: EarlyCheckInScreen.tsx — ambos botones ("Volver al dashboard" y "Abrir check-in de todas formas") no tenían type="button". Sin ese atributo, dentro de un form (layout con SignOut), el tipo default submit activaba el form de nextauth signout. Añadido type="button" a ambos. Branch: feature/landing-conversion.' },
          { title: 'BUG-073 — Sesión Auth.js expira en ~2-3 minutos en producción (comportamiento anómalo)', done: true, priority: 'P0', note: 'Fix: auth.ts y auth.config.ts — session.maxAge no estaba configurado. Añadido maxAge: 30 * 24 * 60 * 60 (30 días) en ambos configs. La ausencia de maxAge explícito causaba expiración con el default del JWT (que puede ser muy corto en algunas versiones del beta). Branch: feature/landing-conversion.' },
          { title: 'BUG-074 — /nutrition: tipear en modal de búsqueda de alimentos navega al home (/)', done: true, priority: 'P1', note: 'Fix: LogFoodModal.tsx — input de búsqueda no tenía type="search" ni handler de Enter. Añadido type="search" y onKeyDown={e => e.key === "Enter" && e.preventDefault()} para bloquear submit de form padre. Branch: feature/landing-conversion.' },
          { title: 'BUG-075 — Sesión expirada redirige a /onboarding en lugar de /login para usuario con onboardingCompleted=true', done: true, priority: 'P1', note: 'Fix resuelto como consecuencia de BUG-073: con maxAge=30 días configurado correctamente las sesiones no expiran prematuramente. La lógica del middleware ya es correcta: !isLoggedIn → /login antes de evaluar onboardingCompleted. El bug era por el maxAge muy corto que generaba JWTs que expiraban y creaban estados inconsistentes. Branch: feature/landing-conversion.' },
          { title: 'BUG-076 — /progress: TypeError crash cuando HealthProfile.hrResting es null (usuario nuevo sin FC en reposo)', done: true, priority: 'P1', note: 'Fix: ProgressClient.tsx — hrStart/hrEnd/weightStart/weightEnd ahora son nullable (null cuando el array está vacío). Secciones "Peso" y "FC Reposo" envueltas con {data.length > 0 && (...)}. Métricas Clave usa condicionales para mostrar rows solo cuando hay datos. Comparaciones nulas eliminadas en tabla desktop y cards mobile. Branch: feature/landing-conversion.' },
          { title: 'BUG-077 — /new-goal: opciones "Ganar músculo" y "Recomposición corporal" visibles para atleta runner', done: true, priority: 'P2', note: 'Resuelto por eliminación: directorio /new-goal eliminado (ARCH-01). La ruta y NewGoalClient.tsx ya no existen.' },
          { title: 'BUG-078 — /onboarding: typo "Medalliq" (doble L) en subtítulo del paso 1', done: true, priority: 'P3', note: 'Duplicado de BUG-NEW-01. Fix ya aplicado en onboarding/page.tsx. Branch: feature/landing-conversion.' },
          { title: 'BUG-079 — Dashboard vs Plan: inconsistencia de datos de hidratación entre calendario/semana', done: true, priority: 'P1', note: 'Fix: (1) Use case totalTraining contaba DESCANSO — excluido con filter. (2) Web hardcodeaba dayOfWeek:0 en input del use case — añadido dayOfWeek al select de sessions y pasado correctamente. (3) Plan page no pre-hidrataba calendario — añadido buildCalendarWeek(userId,0) server-side como initialCalendarWeek prop a PlanClient (elimina flash en carga inicial). Tests: 2 nuevos tests para exclusión de DESCANSO.' },
          { title: 'BUG-080 — Plan NutritionCard: consumo siempre 0 + mobile sin coach badge, race countdown, adjustment banner ni next-day preview', done: true, priority: 'P1', note: 'Fix web: (1) plan/page.tsx añade foodLog query al Promise.all + computeFoodTotals → todayConsumed prop a PlanClient. (2) NutritionCard recibe consumed prop y muestra datos reales en CalorieRingSvg y MiniMacroRingSvg. Fix mobile: (3) plan.tsx muestra coach badge y race countdown en header desde dash.coach/dash.raceDays. (4) Adjustment banner con dash.pendingSuggestionsCount antes del session card. (5) Next-day preview (nextSession) después del session card con SESSION_LABELS.' },
          { title: 'REFACTOR-01 — Plan page: consolidar fetching en getPlanPageData() + extraer 9 componentes + gym overlay en CalendarStrip mobile', done: true, priority: 'P1', note: 'Refactor: (1) Nuevo get-plan-data.ts con getPlanPageData() — misma arquitectura que getDashboardData(). (2) plan/page.tsx reducido de 348 a 68 líneas — thin route layer. (3) 9 componentes extraídos de PlanClient.tsx: PlanCalendarStrip, PlanNutritionCard, PlanKPICards, PlanPhaseBar, PlanAdherenceChart, PlanBodyCompositionCard, PlanEstadoSemana, PlanZonasFC, PlanCheckInBanner. (4) Mobile CalendarStrip: gymLabel field + purple circle/indicator para días de gym.' },
          { title: 'BUG-081 — Dashboard vs Plan: inconsistencia de datos en calendario, colores, labels y expiración de plan', done: true, priority: 'P0', note: 'Fix: (1) PlanCalendarStrip ahora usa calendarDaysToWeekCells() como fuente de verdad — misma función que Dashboard, incluye free runs y gym. (2) Colores de círculos rest/empty unificados a bg-[#f1f5f9] border-[#cbd5e1]. (3) Progress bar de 7 segmentos añadida a Plan mobile (antes solo Dashboard). (4) Checkmark ✓ en pills completadas de Plan mobile (antes solo mostraba fecha). (5) getPlanPageData() detecta planes expirados y los marca COMPLETED — antes solo Dashboard lo hacía. (6) DailySessionCard: limpiados 11 props muertos + import PHASE_COLORS eliminado de dashboard/page.tsx.' },
          { title: 'NEW-P1-01 — PaywallCard muestra precio inconsistente: $15/mes vs $9.99/mes en /upgrade', done: true, priority: 'P1', note: 'Fix: ctaLabel default en PaywallCard.tsx cambiado de "$15/mes" a "$9.99/mes". Precio canónico: $9.99/mes según upgrade/page.tsx y todos los CTAs de pricing.' },
          { title: 'NEW-P1-02 — GENERAL_FITNESS en selector /new-goal no existe en GoalType enum DB', done: true, priority: 'P1', note: 'Fix: GENERAL_FITNESS eliminado del array GOALS en NewGoalClient.tsx. No hay template ni GoalType::GENERAL_FITNESS en el schema — si algún flujo intentara guardarlo en TrainingPlan.goalType daría error 500. HealthProfile.sportGoal (String) lo aceptaba sin error hoy, pero era una bomba de tiempo. GoalTypes válidos: RACE_5K, RACE_10K, STRENGTH_TRAINING, BODY_RECOMPOSITION.' },
          { title: 'NEW-P0-03 — /progress: calcAdherencePct incluye sesiones DESCANSO en denominador → adherencia siempre menor que en dashboard', done: true, priority: 'P0', note: 'Fix: calcAdherencePct ahora filtra s.type !== DESCANSO antes de calcular. Semana con 5 training + 2 DESCANSO, 5 completados: antes 71%, ahora 100%. Consistente con dashboard/page.tsx que ya filtra DESCANSO explícitamente.' },
          { title: 'NEW-P1-04 — Precio inconsistente $15/mes en paywalls de /plan, /progress, /gym/session, /gym/history', done: true, priority: 'P1', note: 'Fix: 4 CTAs "Pro $15/mes" → "Pro $9.99/mes" en plan/page.tsx, progress/page.tsx, gym/session/page.tsx, gym/history/page.tsx. Precio canónico $9.99/mes. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-05 — mapWebCheckinBody defaultea rpe=5, sleepHours=7, stressLevel=0 para campos no enviados → datos fake en DB', done: true, priority: 'P2', note: 'Fix completo web + mobile: CheckInInput hace rpe/sleepHours/energyLevel/stressLevel opcionales; evaluate-rules añade !== undefined guards; mapper web elimina defaults; mapper mobile elimina sleepHours??7 y stressLevel??3; repositorio usa ??undefined para omitir del write. Cubierto en detalle por NEW-P2-10. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-06 — gym sessions (GymSession, no SessionLog) no cuentan en streakDays — getDashboardSummary calcula streak solo desde SessionLog', done: true, priority: 'P2', note: 'Fix aplicado — ver NEW-P2-11. DashboardInput recibe gymCompletionDates?: Date[]; streak mergea SessionLog y GymSession. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-07 — nutrition/generate fetcha user.goals pero la variable goal nunca se usa (dead code)', done: true, priority: 'P2', note: 'Fix: goals eliminado del include en api/nutrition/generate/route.ts, api/nutrition/generate-meals/route.ts y api/mobile/nutrition/generate-meals/route.ts. También limpiados coach/dashboard/athletes, coach/athletes/page.tsx y coach/dashboard/page.tsx que incluían goals innecesariamente. Branch: feature/landing-conversion.' },
          { title: 'NEW-P1-08 — CalendarStrip mostraba semana diferente al dashboard/plan cuando el plan no empezaba en lunes', done: true, priority: 'P1', note: 'buildCalendarWeek() usaba el lunes del calendario como referencia (monday - startDate). getPlanWeekNumber() usa Date.now(). Divergían si el plan empezaba en día no-lunes. Fix: calendar.ts usa currentPlanWeek = getPlanWeekNumber(startDate) + weekOffset — misma fuente de verdad que dashboard, /plan y checkin. weekOffset=0 siempre es la semana actual; -1/+N es navegación relativa coherente. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-09 — /gym: banner "Sesión de fuerza programada" nunca aparecía (timezone mismatch en query de PlannedSession)', done: true, priority: 'P1', note: 'NOTA CORREGIDA (NEW-P1-13): PlannedSession.date SÍ existe en schema (DateTime no nullable). Causa real: timezone mismatch — comparaba date UTC vs fecha local Bogotá → query retornaba null. Fix: where.date reemplazado por dayOfWeek: todayDow + week.weekNumber con getPlanWeekNumber. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-10 — Check-in mapper persistía valores fake (rpe=5, sleepHours=7, energyLevel=5, stressLevel=0) para campos no enviados por el atleta', done: true, priority: 'P2', note: 'Fix web + mobile: (1) CheckInInput hace rpe/sleepHours/energyLevel/stressLevel opcionales; (2) evaluate-rules añade !== undefined checks antes de disparar trigger; (3) mapper web elimina defaults; (4) mapper mobile elimina sleepHours??7 y stressLevel??3 (opcionales en MobileCheckinBody); (5) repositorio usa ?? undefined para omitir campos del write. muscleSoreness y energyLevel siguen requeridos en mobile. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-11 — Streak del dashboard no contaba sesiones de gym (GymSession), solo SessionLog', done: true, priority: 'P2', note: 'getDashboardSummary calculaba streak solo desde recentLogs (SessionLog). Atleta solo-gym con AssignedWorkout tenía streak=0 aunque entrenara todos los días. Fix: DashboardInput recibe gymCompletionDates?: Date[]; el streak ahora merges las dos fuentes. dashboard/page.tsx fetcha GymSession.date (take: 60) y los pasa. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-10 — /api/messages/me retornaba coachId incluso cuando la relación CoachAthlete no era ACTIVE', done: true, priority: 'P1', note: 'La query no filtraba status: "ACTIVE". Si el coach había desvinculado al atleta (status INACTIVE/REMOVED), el chat seguía mostrándose y el atleta podía seguir enviando mensajes. Fix: where: { athleteId: userId, status: "ACTIVE" }. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-11 — /api/mobile/dashboard no pasa gymCompletionDates al use case → streak 0 para usuarios gym-only en mobile', done: true, priority: 'P1', note: 'Fix: añadida query gymSessions al Promise.all y gymCompletionDates: recentGymSessions.map(gs=>gs.date) al call de getDashboardSummary. Idéntico al fix de web (NEW-P2-11). Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-12 — nutrition/page.tsx hace upsert (write) durante render de Server Component → GET que escribe a DB', done: true, priority: 'P1', note: 'Fix: lazy-init extraído a POST /api/nutrition/init/route.ts. NutritionInitClient (use client) llama el endpoint via useEffect y hace router.refresh(). nutrition/page.tsx solo lee, nunca escribe. Imports de calculateTDEE/calculateMacros eliminados del Server Component. Sin regresión UX: si falta el plan, se inicializa automáticamente tras la primera carga. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-13 — NEW-P1-09 nota incorrecta: PlannedSession.date SÍ existe en schema como DateTime (no nullable)', done: true, priority: 'P1', note: 'DONE: nota de NEW-P1-09 corregida en roadmap-data.ts — causa real era timezone mismatch (UTC vs Bogotá), no ausencia del campo. Pendiente investigar: mobile/progress adherencePct usa `where: { date: { lte: new Date() } }` → mismo bug potencial en UTC-5.' },
          { title: 'REFACTOR-02 — Centralizar queries y lógica compartida entre Dashboard y Plan en shared-athlete-data.ts', done: true, priority: 'P1', note: 'Nuevo: src/infrastructure/db/shared_athlete_data.ts — single source of truth para: (1) Plan lifecycle (handlePlanLifecycle: dedup + expiration detection), (2) queryPendingSuggestions con filtro expiresAt, (3) queryTodayFoodLogs, (4) computeWeightData, (5) extractCheckInData, (6) computeRaceDays, (7) tipos compartidos (WeightData, FoodTotals, NutritionTarget, CheckInData, BodyMeasures, HRZones). Ambos fetchers refactorizados para importar de shared. dashboard-queries.ts actualizado para usar queries centralizadas.' },
          { title: 'BUG-082 — Plan: checkInSuggestion.count no filtraba expiresAt → contaba sugerencias expiradas', done: true, priority: 'P1', note: 'Fix: get-plan-data.ts ahora usa queryPendingSuggestions() de shared-athlete-data.ts que incluye expiresAt: { gt: new Date() }. Dashboard ya lo tenía correcto vía dashboard-queries.ts (ahora también usa la función compartida).' },
          { title: 'BUG-083 — PlanAdherenceChart siempre mostraba semana actual ignorando la seleccionada por el usuario', done: true, priority: 'P2', note: 'Fix: PlanAdherenceChart acepta selectedWeekNum prop. Usa selectedWeekNum ?? currentWeekNum para elegir qué semana mostrar. todayDow solo aplica si isCurrentWeek. PlanClient pasa selectedWeekNum en ambas instancias (mobile + desktop).' },
          { title: 'BUG-084 — PlanCompletedClient: fechas hardcodeadas i+14 y fecha de completado usaba new Date() en vez de endDate real', done: true, priority: 'P2', note: 'Fix: (1) endDate añadido a CompletedPlanInfo y pasado como prop. (2) Fechas de pills calculadas desde lastWeekMonday (derivado de endDate). (3) Fecha "Completado el..." usa endDate real. (4) Colores de rest days unificados a bg-[#f1f5f9] border-[#cbd5e1]. (5) Day labels añadidos a pills mobile.' },
          { title: 'REFACTOR-03 — athlete-loader: queries centralizadas para todas las páginas del atleta', done: true, priority: 'P2', note: 'Creado athlete-loader.ts con 8 slices (user, healthProfile, activePlanMeta, nutritionPlan, coachRelation, checkIns, oldestWeightCheckIn, todayFood, pendingSuggestions). Migradas 5 páginas: profile, settings/plan, checkin, nutrition/planner, plan/_lib/get_plan_data. Elimina 15+ queries duplicadas. Una sola definición por entidad, selects canónicos, fix-once-fix-everywhere.' },
          { title: 'REFACTOR-04 — Plan page: tipos unificados, helpers extraídos, naming, bugs corregidos', done: true, priority: 'P2', note: 'plan.types.ts importa tipos compartidos de shared-athlete-data (fuente única). plan-helpers.ts extrae getWeekMonday/formatVolume/formatPlanName. MobileDayPills extraído. Bug DAY_LABELS Sunday-first → Monday-first. Bug "Mañana" cruzando semana. Prisma directo → loadAthleteData. Skeleton en nav. PlanEstadoSemana→PlanWeekStatus, PlanZonasFC→PlanHRZones. Re-exports innecesarios eliminados. Bugs: SessionDetailCard setState-during-render → useEffect. LogModal "No la hice" cerraba con onSuccess → onClose. EditModal as-number-?? precedencia → paréntesis. PlanCompletedClient missed-sessions green → gray. PlanBodyCompositionCard hardcoded ↓ → dinámico. PlanAdherenceChart loggedIds footgun → null-check. recoveryDaysSinceEnd clamp ≥0. get-plan-data new Date() ×2 → variable única. PlanClient initialCalendarWeek dep inestable → solo weekOffset.' },
          { title: 'REFACTOR-05 — Timezone: getWeekMonday + buildCalendarWeek + auto-detect timezone-aware', done: true, priority: 'P1', note: 'getWeekMonday acepta timezone opcional — resuelve "hoy" en TZ del usuario, no del servidor. buildCalendarWeek pasa timezone. auto-complete-strength setHours(23,59) → aritmética UTC. Dashboard/Plan/Gym fetchean User.timezone de DB. API routes aceptan ?tz= param. TimezoneSync.tsx (web) envía PATCH /api/me en mount con sessionStorage dedup. Mobile syncTimezone() post-login. Mobile getWeekSessions envía tz param. Elimina getCalendarMonday duplicado en dashboard.' },
          { title: 'REFACTOR-06 — Project scaffolding cleanup: naming, API namespace, deuda estructural', done: true, priority: 'P2', note: '(1) lib/plan/ shims eliminados — 13 imports migrados a @/domain/plan/, tests movidos a domain/plan/. (2) coach/athlete/ (singular, vestigio) eliminado — solo queda coach/athletes/. (3) 10 API routes movidas bajo api/athlete/ (checkin, log, metrics, notifications, onboarding, plan, progress, routine, upgrade, integrations) + 3 más (user, nutrition, gym merge). 23+ fetch refs actualizados. (4) Tabs coach renombradas: NutricionTab→NutritionTab, EjerciciosTab→ExercisesTab, SesionesTab→SessionsTab, AdherenciaTab→AdherenceTab, ProgresoTab→ProgressTab, MensajesTab→MessagesTab, ResumenTab→SummaryTab. (5) Ports: billing.repository.port.ts y payment-gateway.port.ts → sin .port (consistente con los otros 11). (6) Archivos sueltos lib/: gym-labels→lib/gym/labels, mobile-auth→lib/auth/mobile_auth, push→lib/push/expo_push (89+ imports actualizados). (7) domain/ai-coach/ vacío eliminado. (8) app/p/ documentado con comentario.' },
          { title: 'REFACTOR-07 — Naming convention: hyphens → underscores en 123 archivos + 2 directorios internos', done: true, priority: 'P2', note: 'Convención unificada: underscore (_) para separar palabras, punto (.) para rol arquitectónico (types, use_case, repository, client, adapter, mapper, factory, service). 123 archivos renombrados con git mv + sed masivo de imports. 2 directorios internos renombrados: domain/coach-dashboard→coach_dashboard, infrastructure/exercise-sync→exercise_sync. Directorios de App Router (rutas URL) conservan guiones (convención de URLs). TypeScript compila limpio post-rename.' },
          { title: 'BUG-085 — calendar.ts: getPlanWeekNumber sin totalWeeks → semana incorrecta en planes expirados', done: true, priority: 'P1', note: 'buildCalendarWeek llamaba getPlanWeekNumber(startDate) sin totalWeeks. Si plan de 12 semanas estaba en semana raw 14, calendar buscaba PlanWeek 14 (no existe) → slots vacíos. Dashboard/Plan clampeaban a 12. Fix: select totalWeeks del activePlan, pasar a getPlanWeekNumber. Calendar era el ÚNICO caller sin totalWeeks.' },
          { title: 'BUG-086 — todayDow usaba hora del servidor (UTC) en vez de timezone del usuario', done: true, priority: 'P1', note: 'Todos los server-side files migrados a todayDowInTz(tz): get_dashboard_data, get_plan_data, week-sessions, gym/page, nutrition/page, mobile/gym/week, mobile/nutrition/today, mobile/nutrition, domain/gym/build_gym_week. buildDaySummaries recibe timezone como parámetro.' },
        ],
      },

      // ── ONBOARDING UX — mejoras identificadas QA 2026-07-03 ──────────────────
      {
        id: 'mejoras-onboarding',
        label: 'Onboarding UX',
        period: 'Próximo sprint',
        items: [
          { title: 'UX-01 — Simplificar paso 1 de onboarding: de 4 opciones a 2 (Ejercicios / Running)', done: true, priority: 'P1', note: 'QA-2026-07-03: Las 4 opciones actuales (Ejercicios, Running, Ejercicios+Running, Solo trackear) generan fricción. El usuario promedio LatAm se identifica con "voy al gym" o "corro". Propuesta: 2 opciones — Ejercicios (sub-pregunta interna: objetivo de composición corporal) y Running (sub-pregunta: distancia objetivo + fecha). "Ejercicios+Running" y "Solo trackear" son edge cases que se manejan post-onboarding. Archivos: src/app/onboarding/page.tsx, src/app/onboarding/_types.ts.' },
          { title: 'UX-02 — Cambiar label "Talla (cm)" por "Altura (cm)" en datos personales del onboarding', done: true, priority: 'P3', note: 'Fix incluido en BUG-048. Label cambiado en onboarding/page.tsx. Branch: bugfix/mvp-ux-flows.' },
          { title: 'UX-03 — /new-goal: calcular semanas automáticamente desde fecha evento, no mostrarlas como opción fija', done: true, priority: 'P1', note: 'QA-2026-07-03: Hoy se muestran "8 semanas", "12 semanas" como etiqueta de cada meta. El usuario no debería elegir semanas — el sistema las calcula: si el atleta tiene fecha de evento, semanas = (fechaEvento - hoy) / 7. Si no tiene fecha, usar default por distancia (5K=8, 10K=12). Restricción mínima: al menos 4 semanas desde hoy. Restricción máxima: no fechas pasadas. Archivo: src/app/(athlete)/new-goal/_components/NewGoalClient.tsx.' },
          { title: 'UX-04 — /new-goal: CTA "Generar plan" → "Ir al dashboard" (no generar plan en este punto)', done: true, priority: 'P1', note: 'Fix: CTA renombrado a "Guardar meta". Llama PATCH /api/athlete/sport (nuevo). Redirige a /dashboard. Elimina LOADING_STEPS. Branch: bugfix/mvp-ux-flows.' },
        ],
      },

      // ── ADMIN ─────────────────────────────────────────────────────────────────
      {
        id: 'bugs-admin',
        label: 'Admin',
        period: 'Urgente',
        items: [
          { title: 'ADMIN-BUG-01 — /admin/settings hardcodeado con datos desactualizados', done: true, priority: 'P2', note: 'Fix: stack actualizado (Next.js 16, Resend, Expo). Integraciones con estado real. (es 16), "Vercel + Neon (pendiente)" (ya deployado), "Google OAuth pendiente" (implementado), "AWS SES" (se usa Resend). Fix: actualizar valores o eliminar la sección y mostrar solo estado real.' },
          { title: 'ADMIN-BUG-02 — /admin/metrics solo muestra 2 contadores — sin contexto real', done: true, priority: 'P2', note: 'Faltan: usuarios activos (logueados últimos 7d), adherencia promedio de la plataforma, coaches con atletas activos, tasa de onboarding completado. Fix: expandir con queries útiles para el negocio.' },
          { title: 'ADMIN-BUG-03 — Sin búsqueda ni filtros en /admin/users y /admin/coaches', done: true, priority: 'P2', note: 'Con 50+ usuarios la tabla es inmanejable. Fix: input de búsqueda por nombre/email + filtro por rol en users, búsqueda por nombre en coaches.' },
          { title: 'ADMIN-BUG-04 — Sin acceso a perfil individual de atleta desde admin', done: true, priority: 'P3', note: 'Solo se ve la tabla, no hay link al perfil completo. Fix: link en columna nombre → /admin/users/[id] con vista de HealthProfile, plan activo, último check-in.' },
          { title: 'ADMIN-BUG-05 — ChangeRoleButton no resetea feature flags al cambiar rol', done: true, priority: 'P1', note: 'Fix: /api/admin/user/[id]/role ahora sincroniza features según el rol destino vía featuresByRole map. ATHLETE→todas true, COACH→solo featureCoach, ADMIN→todas false.' },
          { title: 'ADMIN-BUG-06 — Plan FREE y PRO activan features idénticas en /api/admin/users/[id]/plan', done: true, priority: 'P1', note: 'Fix: rama FREE ahora activa solo featureLog=true (log manual), resto false. PRO mantiene todas activas.' },
          { title: 'ADMIN-BUG-07 — /admin/help expone credenciales de producción en texto plano', done: true, priority: 'P1', note: 'Fix: bloque de credenciales eliminado. Reemplazado por aviso que apunta a CLAUDE.md + comando pnpm prisma db seed.' },
          { title: 'ADMIN-BUG-08 — Sidebar admin 9 items — ilegible en laptops y sin agrupar', done: true, priority: 'P2', note: 'Fix: bottom nav mobile reducido a 5 items principales. Desktop sidebar mantiene todos los items + /admin/metrics agregado.' },
          { title: 'ADMIN-BUG-09 — /admin/plans y /admin/metrics no aparecen en el sidebar', done: true, priority: 'P2', note: 'Fix: /admin/metrics agregado al sidebar desktop con icono BarChart2. /admin/plans pendiente de consolidar en métricas.' },
          { title: 'ADMIN-BUG-10 — Sin paginación en tablas de usuarios, coaches y suscripciones', done: true, priority: 'P3', note: 'Con 100+ usuarios la tabla carga todo en memoria. Fix: cursor-based pagination con page/limit en los endpoints.' },
          { title: 'ADMIN-BUG-11 — Sin confirmación antes de cambiar rol o desactivar usuario', done: true, priority: 'P3', note: 'ChangeRoleButton ejecuta el PATCH directamente sin confirm dialog. Fix: modal de confirmación con resumen del cambio.' },
          { title: 'ADMIN-BUG-12 — inferPlanTier marca atletas inactivos como "Pro"', done: true, priority: 'P2', note: 'Fix: inferPlanTier ahora recibe featurePlan + featureLog. INACTIVE=sin features, FREE=solo log, PRO=featurePlan. Badge "Inactivo" en /admin/users y tier correcto en /admin/subscriptions.' },
          { title: 'ADMIN-BUG-13 — completedOnboarding usa findMany en lugar de count', done: true, priority: 'P3', note: 'Fix: reemplazado por prisma.user.count({ where: { onboardingCompleted: true } }). Eliminado el filter en JS.' },
        ],
      },

      // ── COACH ─────────────────────────────────────────────────────────────────
      {
        id: 'bugs-coach',
        label: 'Coach',
        period: 'Urgente',
        items: [
          { title: 'COACH-BUG-02 — Constructor de plan abre en semana 1, debería abrir en la semana activa del atleta', done: true, priority: 'P1', note: 'Fix: getInitialWeekIdx(plan) extraída como función pura exportada → usa getPlanWeekNumber(startDate, totalWeeks) - 1, clampeada a [0, weeks.length-1]. useState lazy init en PlanBuilderClient. 8 tests en PlanBuilderClient.test.ts cubren null, semana 1, semanas intermedias, clamp superior e inferior.' },
          { title: 'COACH-BUG-03 — Coach ve "Semana 6/18", atleta ve "11/18" — semana activa inconsistente', done: true, priority: 'P1', note: 'Fix aplicado en athletes/_lib/map_athlete.ts: usa getPlanWeekNumber(startDate, totalWeeks) + clamp a totalWeeks. Lado coach (lista /coach/athletes) corregido.' },
          { title: 'COACH-BUG-04 — Coach ve "FASE: DESARROLLO", atleta ve "BASE" — fase activa inconsistente', done: true, priority: 'P1', note: 'Fix: getInitialWeekIdx() movida a lib/core/week_number.ts como fuente canónica (usa getPlanWeekNumber, UTC-safe). AthleteDetailClient.tsx: reemplazados 2 custom date loops (planViewWeekIdx + currentPhase) por getInitialWeekIdx. 17 tests en week-number.test.ts + 8 tests en PlanBuilderClient.test.ts.' },
          { title: 'COACH-BUG-01 — Columna DEPORTE vacía en lista atletas y "Sin datos de deporte" en dashboard', done: true, priority: 'P2', note: 'Fix: SPORT_LABELS ampliado en AthleteTabs.tsx y dashboard/page.tsx cubre RUNNING|STRENGTH|CYCLING|SWIMMING|TRIATHLON|FOOTBALL. Datos vienen de HealthProfile.sport vía map-athlete.ts.' },
          { title: 'COACH-BUG-05 — Campos Estrés/Motivación/Dolor siempre "—" en Tab Resumen del coach', done: true, priority: 'P2', note: 'Verificado: AthleteDetailClient.tsx muestra stressLevel/motivationLevel/painLevel con colores semafóricos (líneas 807-820 card resumen, 983-1007 tabla check-ins). El dato viene de page.tsx que los mapea con ?? null desde WeeklyCheckIn.' },
          { title: 'COACH-BUG-07 — Finanzas sin filtro por atleta — inmanejable con escala', done: true, priority: 'P2', note: 'Fix: selector "Todos los atletas" en finanzas/page.tsx (visible solo cuando hay >1 atleta). Filtro client-side sobre pagos ya cargados en memoria — byAthlete + filtered en cascada con filterStatus.' },
          { title: 'COACH-BUG-06 — /coach/settings = "Próximamente" — item de nav lleva a página vacía', done: true, priority: 'P3', note: 'Fix: coach/settings/page.tsx redirige a /coach/profile con redirect() — el perfil ya tiene edición completa de nombre, bio, especialidades y disponibilidad.' },
          { title: 'SEC-01 — POST /api/messages y /api/mobile/messages sin validar relación coach-atleta', done: true, priority: 'P1', note: 'Fix: coachAthlete.findFirst en paralelo con recipient lookup (Promise.all). 403 si no existe relación en ambos endpoints. api/messages/route.ts y api/mobile/messages/route.ts.' },
          { title: 'COACH-BUG-08 — coachAthlete.count sin filtro ACTIVE: atletas PAUSED cuentan contra el límite de tier', done: true, priority: 'P2', note: 'Fix: status: "ACTIVE" añadido al where del count en clients/create/route.ts.' },
          { title: 'COACH-BUG-09 — PaymentAuditLog escribe MARKED_PAID también en reversiones a PENDING', done: true, priority: 'P2', note: 'Fix: action derivada del nuevo status → PAID = MARKED_PAID, cualquier otro = REVERTED. payments/[paymentId]/route.ts PATCH.' },
          { title: 'COACH-BUG-10 — DELETE payment sin transacción y sin registro en audit trail', done: true, priority: 'P2', note: 'Fix: $transaction([auditLog.create({ action: "DELETED" }), payment.delete]) en payments/[paymentId]/route.ts DELETE.' },
          { title: 'COACH-BUG-11 — config/route.ts: mergeFeatures + coachAthlete.update con Promise.all sin $transaction', done: true, priority: 'P3', note: 'Fix: prisma.$transaction(async tx => { PrismaUserRepository(tx).mergeFeatures + tx.coachAthlete.update }) en athlete/[id]/config/route.ts.' },
          { title: 'COACH-BUG-12 — ingresosMes en dashboard hardcodeado: totalCount * 6 — no refleja pagos reales ni tier del coach', done: true, priority: 'P0', note: 'dashboard/page.tsx líneas 143 y 235: ingresosMes = totalCount * 6 es un valor fijo inventado. No suma pagos reales, ignora el tier del coach. Fix: ampliar el query de Payment existente (ya trae pagos vencidos) para incluir también Payment[PAID, paidAt en mes actual, coachId]. Reemplazar ingresosMes por payments.filter(paid this month).reduce((acc, p) => acc + Number(p.amount), 0). Cambiar texto "× $6 USD" por la suma real formateada. Sin cambios en DB ni nuevos endpoints. Archivo: src/app/coach/dashboard/page.tsx.' },
          { title: 'COACH-BUG-13 — Indicador de límite de tier ausente: coach no sabe que está cerca del tope de atletas', done: true, priority: 'P1', note: 'El coach alcanza el límite de atletas de su tier y recibe un error 402 por sorpresa. Fix: en dashboard/page.tsx, llamar getCoachLimits(coachTier) — ya importado en clients/create. Mostrar badge "X / Y atletas activos" junto a los KPIs. Si totalCount >= maxAthletes * 0.8 → badge naranja. Si totalCount >= maxAthletes → badge rojo con link "Actualizar plan". Sin cambios en DB. Archivo: src/app/coach/dashboard/page.tsx.' },
          { title: 'COACH-BUG-14 — Bloqueo identidad al crear atleta: error crudo sin contexto ni redirect', done: true, priority: 'P1', note: 'Coach sin identification/phoneWa intenta crear atleta → recibe error genérico. Debe adivinar que debe ir a su perfil, completar datos, y volver. Fix: (1) API clients/create/route.ts: agregar code: "IDENTITY_INCOMPLETE" al response JSON existente (2 líneas). (2) UI formulario crear atleta: detectar code === "IDENTITY_INCOMPLETE" → mostrar banner "Para invitar atletas, completa tu cédula y WhatsApp en tu perfil" + botón que va a /coach/profile?returnTo=/coach/clients/new. (3) coach/profile/page.tsx: leer ?returnTo al guardar → redirect de vuelta. Archivos: clients/create/route.ts + coach/clients/new/ + coach/profile/page.tsx.' },
        ],
      },

      // ── ATLETA & CHECK-IN ─────────────────────────────────────────────────────
      {
        id: 'bugs-atleta',
        label: 'Atleta & Check-in',
        period: 'Urgente',
        items: [
          { title: 'BUG-027 — actualIntensity ausente en web /api/log/session: ajuste nutricional nunca se dispara desde web', done: true, priority: 'P1', note: 'Fix: actualIntensity añadido a LogSessionSchema + lógica post-create con try/catch en api/log/session/route.ts.' },
          { title: 'BUG-028 — Race condition en PendingNutritionAdjustment.create: P2002 no capturado rompe el response', done: true, priority: 'P1', note: 'Fix: wrap en try/catch alrededor del bloque de ajuste nutricional en api/mobile/log/session/route.ts para absorber P2002 sin romper el response.' },
          { title: 'BUG-029 — nutritionAdherencePct ausente en schema mobile check-in: regla nutricion_baja nunca activa desde mobile', done: true, priority: 'P2', note: 'Fix: nutritionAdherencePct z.number().min(0).max(100).optional() añadido al schema + mapeado como Math.round(pct/10) al use case en api/mobile/checkin/route.ts.' },
          { title: 'BUG-030 — /api/log/run/route.ts sin Zod: durationMin, distanceKm, rpe sin validación de rango', done: true, priority: 'P2', note: 'Fix: LogRunSchema con z.enum(VALID_RUN_TYPES) + z.number() con min/max en api/log/run/route.ts.' },
          { title: 'BUG-031 — stressLevel: opcional en web (min 0), requerido en mobile (min 1) — asimetría en use case', done: true, priority: 'P3', note: 'Fix: stressLevel ahora .optional() en mobile checkin schema. Fallback scale5to10(body.stressLevel ?? 3) — valor neutro si no se envía.' },
          { title: 'BUG-032 — hrMax solo se registra desde web, mobile lo ignora silenciosamente', done: true, priority: 'P3', note: 'Fix: hrMax z.number().int().min(30).max(250).optional() añadido al schema mobile + persistido en ambos sessionLog.create en api/mobile/log/session/route.ts.' },
          { title: 'BUG-039 — formStatus usa check-in de hace 53 días para recomendar "Prioriza la recuperación hoy"', done: true, priority: 'P1', note: 'Fix: computeFormStatus() con expiración a 7 días, contexto de sesión hoy (día libre vs entreno), spike de volumen >20% sube alerta, modo RECOVERY siempre rest. Mensajes contextuales en web + mobile (use case compartido).' },
          { title: 'BUG-040 — Web mobile sin CoachCard ni CheckinBanner (Pro/B2B) — solo visibles en desktop', done: true, priority: 'P2', note: 'Fix: CoachCard y CheckinBanner agregados a ProMobileCards en MobileCardsSection.tsx. Props coach + checkinPending + hasActivePlan pasadas desde page.tsx. Paridad con mobile nativo.' },
        ],
      },

      // ── NUTRICIÓN & PROGRESO ──────────────────────────────────────────────────
      {
        id: 'bugs-nutricion',
        label: 'Nutrición & Progreso',
        period: 'Urgente',
        items: [
          { title: 'BUG-033 — Gym sin running: web muestra macros "día fácil", mobile muestra "día duro" — misma sesión', done: true, priority: 'P2', note: 'Fix: nutrition/page.tsx:113 → hasGymSessionToday ? "hard" : "rest" — unificado con mobile (HIGH → hard). Ambos canales ahora usan macros de día duro para gym-only.' },
          { title: 'BUG-034 — /api/mobile/progress solo busca plan ACTIVE: semanas históricas invisibles cuando plan termina', done: true, priority: 'P2', note: 'Fix: status: { in: ["ACTIVE", "COMPLETED"] } en api/mobile/progress/route.ts.' },
          { title: 'BUG-035 — /api/mobile/nutrition/log/summary: adherencePct siempre vs targetKcalEasy, ignora tipo de día', done: true, priority: 'P2', note: 'Fix: query de PlannedSession por semana + getDailyNutritionTarget(intensity) por día con FoodLog. Adherencia calculada por promedio de ratio diario real/target. api/mobile/nutrition/log/summary/route.ts.' },
          { title: 'BUG-036 — NutritionPlan lazy-init en web pero no en mobile: estado diverge entre canales', done: true, priority: 'P3', note: 'Fix: lazy-init con calculateTDEE+calculateMacros+upsert añadido a api/mobile/nutrition/route.ts. Mismo bloque que nutrition/page.tsx para paridad entre canales.' },
          { title: 'BUG-037 — volumeKm ausente en /api/mobile/progress: semanas sin dato de volumen en mobile', done: true, priority: 'P3', note: 'Fix: volumeKm: w.sessions.reduce((acc, s) => acc + (s.log?.distanceKm ?? 0), 0) añadido al map de semanas en api/mobile/progress/route.ts.' },
          { title: 'INFO-001 — Tres implementaciones del cálculo de macros por tipo de día (riesgo de divergencia futura)', done: true, priority: 'P3', note: 'Fix: api/mobile/nutrition/route.ts reemplazado cálculo inline por getDailyNutritionTarget(sessionIntensity, nutritionPlan). Fuente canónica única usada en mobile, web y summary.' },
          { title: 'BUG-038 — Ajuste nutricional pendiente solo visible y accionable en mobile, no en web', done: true, priority: 'P2', note: 'Fix: (1) creados POST /api/nutrition/adjustment/[id]/accept|reject con auth() web — misma lógica que los mobile. (2) NutritionAdjustmentCard client component con botones Aceptar/Rechazar + router.refresh(). (3) nutrition/page.tsx queries pendingAdjustment del día vía date gte/lt y lo muestra antes del contenido principal.' },
        ],
      },

      // ── GYM & EJERCICIOS ──────────────────────────────────────────────────────
      {
        id: 'bugs-gym-ejercicios',
        label: 'Gym & Ejercicios (integridad)',
        period: 'Urgente',
        items: [
          { title: 'BUG-043 — PR detection falla cuando coach edita rutina: SetLogs históricos quedan con workoutExerciseId=null → cualquier peso es PR', done: true, priority: 'P1', note: 'Fix: query paralela de orphanSets (workoutExerciseId=null, exerciseName in known names), merged con historicalSets en maxPerExercise via nameToExerciseId pivot. api/gym/session/complete/route.ts.' },
          { title: 'BUG-044 — Adherencia coach dashboard siempre baja: denominador incluye sesiones de semanas futuras', done: true, priority: 'P1', note: 'Fix: map-athlete.ts:82 → plan?.weeks.filter((w) => w.weekNumber <= currentWeek).flatMap(...). Antes tomaba todas las semanas del plan como denominador — atleta en semana 1 de plan de 12 semanas mostraba ~8% aunque completara todo.' },
          { title: 'BUG-039 — today/route.ts usa UTC para weekNumber pero timezone atleta para dayOfWeek: semana incorrecta en medianoche Bogotá', done: true, priority: 'P2', note: 'Fix: todayDate calculada con toLocaleString("en-US", { timeZone: tz }) antes de getPlanWeekNumber en api/gym/session/today/route.ts.' },
          { title: 'BUG-040 — assign/route.ts no verifica CoachAthlete.status ACTIVE: coach desvinculado puede asignar rutinas', done: true, priority: 'P2', note: 'Fix: status: "ACTIVE" añadido al where en ambos handlers (POST + DELETE) de api/coach/gym/routines/[id]/assign/route.ts.' },
          { title: 'BUG-041 — isPR siempre false en sesión libre: récords en sesión libre nunca se detectan', done: true, priority: 'P3', note: 'Fix: maxPerFreeExerciseName map + isPRByName() helper + query histórica por exerciseName para PR detection en path libre. api/gym/session/complete/route.ts.' },
          { title: 'BUG-042 — Historial mobile muestra sesiones libres FUERZA (SessionLog) con sets=0 y volumen=0', done: true, priority: 'P3', note: 'Fix: filter formattedFree por s.durationMin !== null || s.rpe !== null || s.notes !== null antes del merge — solo muestra libres con algún dato útil. api/mobile/gym/history/route.ts.' },
        ],
      },

      // ── PERSISTENCIA & TRANSACCIONES — Auditoría 2026-07-03 ──────────────────
      {
        id: 'bugs-persistencia',
        label: 'Persistencia & Transacciones',
        period: 'Urgente — Auditoría 2026-07-03',
        items: [
          { title: 'PERSIST-01 — FoodLog @@unique([userId,foodId,date,mealType]) bloquea registrar el mismo alimento 2× en la misma comida', done: true, priority: 'P0', note: 'Caso de uso real: comer arroz al almuerzo, luego agregar más arroz. El segundo POST devuelve P2002 silencioso → el registro se pierde sin feedback al usuario. Archivos: api/nutrition/log/route.ts + api/mobile/nutrition/log/route.ts. Fix: usar upsert sumando gramos, o quitar foodId del constraint y manejar varias filas por (userId, date, mealType), o al menos capturar P2002 y devolver mensaje descriptivo.' },
          { title: 'PERSIST-02 — auth/register: user.create fuera de $transaction — usuario huérfano si la tx de userSubscription/coachProfile falla', done: true, priority: 'P0', note: 'Fix: user.create movido dentro del $transaction en api/auth/register/route.ts. Ahora user+userSubscription+coachProfile se crean atómicamente. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-03 — nutrition/generate-meals: 3 writes independientes sin $transaction (foodProfile + nutritionPlan + mealPlan)', done: true, priority: 'P1', note: 'Archivos: api/nutrition/generate-meals/route.ts + api/mobile/nutrition/generate-meals/route.ts. Promise.all([foodProfile.upsert, nutritionPlan.upsert]) + mealPlan.upsert separado. Si falla mealPlan, el atleta queda con nutritionPlan actualizado pero sin mealPlan generado. Fix: envolver los 3 writes en $transaction.' },
          { title: 'PERSIST-04 — nutrition/generate: nutritionPlan.upsert + enableFeatures sin $transaction — features desincronizadas si falla', done: true, priority: 'P1', note: 'Fix: ambas operaciones envueltas en $transaction. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-05 — gym/assign + coach/gym/assign: updateMany(isActive:false) + create sin $transaction → rutinas activas duplicadas', done: true, priority: 'P1', note: 'Fix: ambos endpoints (gym/assign + coach/gym/routines/[id]/assign) envueltos en $transaction. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-06 — log/session: race condition en check de idempotencia (findUnique + create) → P2002 propagado como 500', done: true, priority: 'P1', note: 'Fix: catch específico de P2002 en sessionLog.create → devuelve 200 alreadyLogged. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-07 — gym/session/complete: sin check de idempotencia → GymSession @@unique puede fallar en doble submit', done: true, priority: 'P1', note: 'Fix: findFirst previo en ambos paths (plannedSession + assignedWorkout) → 200 alreadyCompleted. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-08 — coach/clients/link: check+create sin $transaction → dos coaches pueden vincular al mismo atleta simultáneamente', done: true, priority: 'P1', note: 'Fix: catch P2002 en coachAthlete.create → 409. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-09 — GET /api/mobile/nutrition hace write (lazy-init de NutritionPlan) → viola REST, race condition con unique constraint', done: true, priority: 'P1', note: 'Fix: eliminado lazy-init del GET. El GET solo lee; si no hay NutritionPlan retorna defaults sin escribir. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-10 — metrics/log POST: upsert sobreescribe con null campos no enviados — pérdida de métricas diarias', done: true, priority: 'P1', note: 'Fix: update object construido con spread condicional (...(field !== undefined && { field })). Branch: bugfix/mvp-persistence. ACTUALIZADO (2026-08-27): endpoint web alineado con mobile — Zod validation (rangos: weightKg positive max 500, energyLevel 1-5, hrResting 20-250, sleepHours 0-24, notes max 500), date forzado a hoy (no del body), validación "al menos un campo", response { log }. Consumidores TodayLogCard.tsx y ProfileClient.tsx actualizados.' },
          { title: 'PERSIST-11 — painDescription no se guarda desde web: schema de validación del check-in web omite el campo', done: true, priority: 'P1', note: 'Fix: painDescription z.string().max(500).optional() añadido al schema Zod en api/checkin/route.ts + actualizado checkin-mapper. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-12 — plan/new: enableFeatures fuera de $transaction de generatePlan → features desincronizadas si falla', done: true, priority: 'P2', note: 'Resuelto por eliminación: api/plan/new/route.ts borrado — endpoint sin caller activo desde ARCH-01 (/new-goal eliminado). Branch: chore/remove-plan-new-dead-endpoint.' },
          { title: 'PERSIST-13 — mobile/dashboard: fire-and-forget plan completion con .catch(()=>{}) → plan expirado nunca marcado COMPLETED', done: true, priority: 'P2', note: 'Fix: .catch() ahora loguea console.error con planId y error completo. Fire-and-forget sigue siendo correcto (no bloquear respuesta) pero el fallo es observable en Vercel logs. Branch: bugfix/loop-hardening.' },
          { title: 'PERSIST-14 — mobile/profile PATCH: healthProfile.update() falla con P2025 si HealthProfile no existe', done: true, priority: 'P2', note: 'Fix: healthProfile.update() → upsert(update: data, create: { userId, age:0, heightCm:0, weightKg:0, ...data }). Defaults 0 para campos requeridos en el create path — onboarding los sobrescribe inmediatamente. api/mobile/profile/route.ts.' },
          { title: 'PERSIST-15 — user/profile PATCH web: sin validación Zod — acepta weightKg:-999, heightCm:"abc" (mobile sí valida con profilePatchSchema)', done: true, priority: 'P2', note: 'Fix: profilePatchSchema Zod con min/max para weightKg(20-500), heightCm(50-300), hrResting(30-120), hrMax(100-250), sleepHoursAvg(1-24). Schema usa .strict() para rechazar campos desconocidos. Branch: bugfix/loop-hardening.' },
          { title: 'PERSIST-16 — autoCompleteStrengthSession: fire-and-forget sin manejo de P2002 → SessionLog duplicado silenciado', done: true, priority: 'P2', note: 'Fix: sessionLog.create() envuelto en try/catch — P2002 (unique constraint) retorna null limpiamente, otros errores re-throw. Branch: bugfix/loop-hardening.' },
          { title: 'NEW-P2-01 — gym/session/complete: idempotency check + create sin P2002 catch → doble submit concurrente devuelve 500', done: true, priority: 'P2', note: 'Fix: ambos paths (plannedSession + assignedWorkout) ahora capturan P2002 en el gymSession.create y devuelven { alreadyCompleted: true, 200 } con el id existente. DB ya tenía los constraints únicos (plannedSessionId @unique y @@unique([athleteId,date,assignedWorkoutId])) — faltaba el catch. api/gym/session/complete/route.ts.' },
          { title: 'NEW-P2-02 — coach/profile: slug race condition sin P2002 catch → upsert concurrente con mismo slug → 500', done: true, priority: 'P2', note: 'Fix: prisma.coachProfile.upsert ahora captura P2002 y retorna 409 con "Ese slug ya está en uso." — mismo mensaje que el check manual previo. El pre-check de findUnique sigue para feedback inmediato; el catch P2002 cierra la ventana de concurrencia. api/coach/profile/route.ts.' },
          { title: 'NEW-P2-03 — dashboard/page.tsx: await en writes fire-and-forget bloquea el render en cada visita al dashboard', done: true, priority: 'P2', note: 'Fix: removido await de los dos writes de plan-completion en dashboard/page.tsx — (1) deduplicación de planes ACTIVE duplicados (line ~184) y (2) auto-complete de plan expirado (line ~199). Ambos usan .catch(()=>{}) y son fire-and-forget por diseño. El await hacía que el render esperara el write innecesariamente.' },
          { title: 'NEW-P3-04 — athlete/sport PATCH: healthProfile.update() falla con P2025 si profile no existe', done: true, priority: 'P3', note: 'Fix: update() → upsert(update, create: { userId, age:0, heightCm:0, weightKg:0, sportGoal, raceDate }). Rarísimo en producción (onboarding crea el profile antes de que /new-goal sea accesible) pero el middleware no lo garantiza en 100% de edge cases. api/athlete/sport/route.ts. QA 2026-07-04: test route.test.ts corregido — mock update→upsert y assertions actualizadas para verificar { where, update, create }.' },
          { title: 'PERSIST-17 — Auditoría completa timezone: 15 endpoints migrados de setHours(0,0,0,0) a todayInTz(tz)/getWeekMonday(tz)', done: true, priority: 'P1', note: 'Bug sistémico: endpoints usaban new Date().setHours(0,0,0,0) (UTC midnight del servidor) para queries/writes, pero dashboard reads usaban todayInTz(tz). Atleta UTC-5 logueando a las 11pm veía datos del día equivocado o creaba registros en fecha incorrecta. Fix: 15 endpoints migrados — P0: athlete+mobile nutrition/planned-meals/log-today (FoodLog.date corrupto), gym/session/complete (gymSession.date corrupto), mobile/nutrition/today (waterLog invisible). P1: athlete/planned-meals ×2, mobile/nutrition/assigned-plan, mobile/nutrition/route, mobile/gym/week, coach/gym/volume, coach/gym/adherence, coach/nutrition/plan. P2: athlete/nutrition/adherence, coach/dailylogs, gym/session/today, coach/gym/assigned. getWeekBounds() en build_gym_week.ts ahora acepta timezone. Local getThisMonday()/getMondayOf() eliminados en favor de getWeekMonday() de date_utils.' },
        ],
      },

      // ── PERFORMANCE & FAT ROUTES — Auditoría 2026-07-03 ─────────────────────
      {
        id: 'bugs-performance',
        label: 'Performance & Fat Routes',
        period: 'Próximo sprint — Auditoría 2026-07-03',
        items: [
          { title: 'PERF-01 — Dashboard web+mobile: carga plan COMPLETO con todas las semanas/sesiones/logs cuando solo necesita 1 semana', done: true, priority: 'P1', note: 'Archivos: app/(athlete)/dashboard/page.tsx líneas 142-150 + api/mobile/dashboard/route.ts líneas 24-33. include: { weeks: { include: { sessions: { include: { log } } } } } sin filtro. Plan de 12 semanas = ~84 sesiones + logs cargados en cada visita. Fix: añadir where: { weekNumber: currentWeekNum } al include de weeks.' },
          { title: 'PERF-02 — week-sessions mobile: carga plan COMPLETO otra vez para extraer 1 semana — redundante con dashboard', done: true, priority: 'P1', note: 'DONE: Separado en 2 queries: (1) trainingPlan metadata (id, startDate, totalWeeks), (2) prisma.planWeek.findFirst({ where: { planId, weekNumber } }). Solo se carga 1 PlanWeek en vez de todo el plan. api/mobile/dashboard/week-sessions/route.ts.' },
          { title: 'PERF-03 — N+1 gym/routines POST+PATCH: loop de creates serializados (6 días × 8 ejercicios = 54 queries) dentro de $transaction', done: true, priority: 'P1', note: 'DONE: Loop interno de tx.workoutExercise.create() reemplazado con tx.workoutExercise.createMany(). 1 query por día en vez de N. api/athlete/gym/routines/route.ts.' },
          { title: 'PERF-04 — gym/session/complete: 322 LOC de lógica inline — PR detection, progression, 3 paths, setLogs × 3 bloques duplicados', done: true, priority: 'P1', note: 'DONE: Funciones puras extraídas a domain/gym/complete_gym_session.use_case.ts — isPRSet, isPRByName, computeProgressionUpdates, collectPRsByWeId, collectPRsByName, estimateCalories, sanitizeWeId. 16 tests en .use-case.test.ts. GAP-ARCH-02 cerrado.' },
          { title: 'GAP-ARCH-01 — create-wearable-session use-case importaba Prisma directo — violación de arquitectura hexagonal', done: true, priority: 'P1', note: 'DONE: ISessionLogRepository port en domain/ports/session_log.repository.ts. PrismaSessionLogRepository en infrastructure/db/session_log.repository.ts. Use-case recibe repo como dependency injection. Test reescrito con stub puro (sin vi.mock de prisma). Strava webhook inyecta la implementación concreta.' },
          { title: 'PERF-05 — Dashboard web 873 LOC: lógica de getDashboardSummary duplicada inline — mobile ya usa el use case del dominio', done: true, priority: 'P1', note: 'DONE: getDashboardSummary() llamado desde page.tsx con input construido desde queries Prisma. Elimina computo duplicado de streakDays, raceDays, isRecomp, formStatus/formMessage, weeklyWeightChange, weightProgressPct, checkinPending. Web mantiene lógica propia para: todaySession (BUG-056), completedCount/totalTraining (BUG-057+filtro DESCANSO), weekOffset navigation, coachRelation, weekActivities FREE mode, last4WeeksAdherencePct.' },
          { title: 'PERF-06 — DashboardCalendarStrip: fetch HTTP desde cliente duplica data que el server component ya tiene en activePlan.weeks', done: true, priority: 'P2', note: 'DONE: dashboard/page.tsx — buildCalendarWeek(userId, weekOffset) llamado en server y resultado pasado como initialWeek prop. DashboardCalendarStrip inicializa cells y stats desde initialWeek sin fetch. useRef rastrea el weekOffset pre-cargado para saltarse el primer useEffect; navegación a otras semanas sigue haciendo fetch normal.' },
          { title: 'PERF-07 — NutritionPlan lazy-init duplicada en 3 archivos con lógica idéntica (TDEE + macros + upsert)', done: true, priority: 'P2', note: 'DONE: lib/nutrition/compute_plan.ts — computeNutritionPlanData(profile) extrae cálculo TDEE+macros→NutritionPlanData. api/nutrition/init/route.ts y api/nutrition/generate/route.ts reemplazados — eliminado calculateTDEE/calculateMacros inline. mobile/nutrition/route.ts ya no hacía lazy-init (PERSIST-09). Branch: feature/landing-conversion.' },
          { title: 'PERF-08 — coach/dashboard/athletes: plan completo por cada atleta — no escala con número de atletas', done: true, priority: 'P2', note: 'DONE: api/coach/dashboard/athletes/route.ts — añadido where: { startDate: { lte: now } } en la query de weeks. Solo se cargan semanas pasadas/actuales, no todas las semanas futuras del plan.' },
          { title: 'PERF-09 — Nutrition page web: 10 queries en 3 rondas secuenciales — consolidar en 1 Promise.all + paginar allFoods', done: true, priority: 'P2', note: 'DONE: nutrition/page.tsx — pendingAdjustment fusionado en el Promise.all final (2 rondas en lugar de 3). allFoods tiene take:100. Ronda 1 sigue necesaria para obtener tz/activePlan antes de calcular todayDow/currentWeek.' },
          { title: 'PERF-10 — checkin-status mobile: endpoint redundante con GET /api/mobile/checkin que ya devuelve submitted:true/false', done: true, priority: 'P3', note: 'NO-FIX: verificado que MEDALIQ-MOBILE/app/(app)/(tabs)/checkin.tsx:82 llama /api/mobile/checkin-status activamente en producción. Eliminar rompería la app mobile. El endpoint es liviano (28 líneas). Aceptado como deuda menor.' },
          { title: 'PERF-11 — calcAdherencePct definida localmente en 3+ archivos — extraer a lib/core/adherence.ts', done: true, priority: 'P3', note: 'DONE: lib/core/adherence.ts — calcAdherencePct(completed, total) exportado. progress/page.tsx: función local eliminada, import añadido, call site usa inline filter antes de llamar la función compartida. api/mobile/progress/route.ts: función adherencePct local eliminada, reemplazada con calcAdherencePct.' },
          { title: 'PERF-12 — getDailyNutritionTargets en athlete-formulas.ts: posible dead code vs getDailyNutritionTarget de daily-target.ts', done: true, priority: 'P3', note: 'DONE: lib/core/athlete_formulas.ts — función getDailyNutritionTargets y tipo DayLoad eliminados (dead code confirmado, 0 callers fuera del test). lib/core/athlete_formulas.test.ts — todos los tests de getDailyNutritionTargets eliminados. Solo quedan tests de getAccountStatus.' },
          { title: 'NEW-P2-05 — mobile/progress: incluye plan completo con todos los weeks/sessions/logs (mismo antipatrón PERF-01)', done: true, priority: 'P2', note: 'Fix: include {} → select { weeks: { select: { weekNumber, phase, sessions: { where: date<=now, select: { log: { id, distanceKm } } } } } }. Solo carga semanas pasadas y los campos necesarios para adherencia (log id) y volumen (distanceKm). api/mobile/progress/route.ts.' },
          { title: 'CONC-01 — generator.ts llama AI (Haiku) DENTRO de $transaction — bug de concurrencia latente', done: true, priority: 'P1', note: 'Resuelto: src/domain/plan/generator.ts fue reemplazado por generate-plan.use-case.ts que ya implementa correctamente el patrón de 3 fases (Phase 1: reads, Phase 2: $transaction solo con writes, Phase 3: config update). No hay llamada AI dentro del $transaction. Branch: bugfix/mobile-qa-0708.' },
        ],
      },

      // ── E2E QA — Auditoría 2026-07-05 ────────────────────────────────────────
      {
        id: 'bugs-e2e-0705',
        label: 'E2E QA — Auditoría 2026-07-05',
        period: 'Urgente — E2E atleta runner nuevo',
        items: [
          { title: 'BUG-NEW-01 — Typo de marca "Medalliq" (doble L) en subtítulo del onboarding paso 1', done: true, priority: 'P3', note: 'Fix: src/app/onboarding/page.tsx línea 136 — "Medalliq" → "Medaliq". Branch: feature/landing-conversion.' },
          { title: 'BUG-NEW-02 — /new-goal: metas de gym visibles para atleta runner (GOALS no filtra por activityType)', done: true, priority: 'P2', note: 'Resuelto por eliminación: directorio /new-goal eliminado (ARCH-01). Duplicado de BUG-070 y BUG-077.' },
          { title: 'BUG-NEW-03 — Dashboard: capitalización de fecha incorrecta en español ("5 De Julio De 2026")', done: true, priority: 'P3', note: 'Fix parcial: EarlyCheckInScreen.tsx — getNextFriday() ahora capitaliza el primer carácter del string de fecha con .charAt(0).toUpperCase() + .slice(1). El issue del dashboard completo requiere buscar el formateador específico del dashboard — pendiente localizar. Branch: feature/landing-conversion.' },
          { title: 'BUG-NEW-04 — Check-in muestra "ajustar tu plan" a usuario sin plan activo', done: true, priority: 'P2', note: 'DONE: dashboard/page.tsx — banner de check-in ahora condiciona el copy: activePlan ? "Tu plan se ajusta automáticamente según cómo te sientas" : "Registrá cómo te sentís esta semana para ver tu evolución". Sin plan activo el atleta entiende que el check-in sirve para acumular historial, no para ajustar un plan inexistente.' },
          { title: 'BUG-NEW-05 — Nutrición: macros en gramos no suman las calorías totales mostradas (diferencia de 295 kcal)', done: true, priority: 'P1', note: 'Fix 1: daily-target.ts — deriveFatG() calcula grasa como calorías restantes (kcal - protein*4 - carbs*4) / 9 en lugar de usar plan.fatG. Fix 2: nutrition/page.tsx línea 379 — el bloque "Macros rápidos" usaba nutritionPlan.fatG (fat del día duro en DB) en lugar de todayFat (derivado dinámicamente). Ambos fixes necesarios — daily-target.ts calculaba bien pero page.tsx ignoraba el resultado. Tests: daily-target.test.ts 14/14 ✅.' },
          { title: 'BUG-NEW-06 — Módulo Ejercicios (/gym) muestra solo rutinas de fuerza a atleta runner sin contenido relevante', done: true, priority: 'P2', note: 'DONE: gym/page.tsx rama !assigned — 3 queries serializadas → Promise.all([coachRelation, publicTemplates, healthProfile]). Cuando healthProfile.sport === "RUNNING", se muestra banner "Fuerza complementaria para runners" con contexto antes de las plantillas. Runner entiende por qué ve rutinas de pesas.' },
          { title: 'BUG-NEW-07 — Naming inconsistency: nav lateral dice "Ejercicios" pero la ruta es /gym y el contenido es de gym', done: true, priority: 'P3', note: 'DONE: i18n/translations/es.ts, en.ts, pt.ts — sidebar.gym cambiado a "Gym" en los 3 idiomas. La etiqueta del nav lateral coincide ahora con la URL /gym y el contenido del módulo.' },
          { title: 'BUG-NEW-08 — Registro diario en /profile pre-carga peso y FC reposo con valores que no pertenecen al usuario', done: true, priority: 'P1', note: 'Fix: ProfileClient.tsx — placeholders de los inputs de peso y FC reposo ahora usan p?.weightKg y p?.hrResting del HealthProfile en lugar de valores hardcodeados (75.0 kg, 55 bpm). Branch: bugfix/profile-preload.' },
          { title: 'BUG-NEW-09 — Check-in: formulario no pre-carga peso/FC reposo del perfil cuando no hay check-in previo', done: true, priority: 'P2', note: 'Fix: checkin/page.tsx — añadido query de HealthProfile (weightKg, hrResting) al Promise.all; prevMetrics usa ?? healthProfile.weightKg/hrResting como fallback cuando no hay check-in anterior. CheckInClient.tsx — useState inicializado con prevMetrics.weightKg/hrResting en lugar de string vacío. Atleta sin check-ins ve sus valores reales pre-cargados.' },
        ],
      },

      // ── QA API Mobile — Auditoría 2026-07-08 ─────────────────────────────────
      {
        id: 'bugs-e2e-0708',
        label: 'QA API Mobile — Auditoría 2026-07-08',
        period: 'Urgente — QA core loops mobile',
        items: [
          { title: 'BUG-NEW-09 — /api/mobile/nutrition/log: acumulación silenciosa de gramos sin feedback al cliente', done: true, priority: 'P2', note: 'Comportamiento intencional (PERSIST-01) — no es bug. La acumulación de gramos es el diseño correcto para el log de nutrición. Cerrado como no-bug.' },
          { title: 'BUG-NEW-10 — /api/mobile/progress: overallAdherencePct:0 inconsistente con adherencePct por semana', done: true, priority: 'P2', note: 'Código correcto — falso positivo de QA. overallAdherencePct filtra semanas sin sesiones antes de promediar, dietAdherencePct viene de checkIn.dietAdherencePct. Son métricas distintas que miden conceptos distintos. Cerrado como no-bug.' },
          { title: 'BUG-NEW-11 — /api/mobile/gym/week retorna 404 para atletas sin assignedWorkout con sesiones libres de fuerza', done: true, priority: 'P2', note: 'Fix: antes del 404, se consultan SessionLog con freeSessionType=FUERZA y plannedSessionId=null de la semana. Si existen → 200 con { sessions, type:"free" }. Archivo: src/app/api/mobile/gym/week/route.ts. Branch: bugfix/mobile-qa-0708.' },
          { title: 'BUG-NEW-12 — /api/mobile/nutrition GET sin feature gate para atletas B2B inactivos', done: true, priority: 'P3', note: 'Fix: requireFeature(mobile.features, "nutrition") agregado al GET handler después del rate limit. Consistente con POST. Archivo: src/app/api/mobile/nutrition/route.ts. Branch: bugfix/mobile-qa-0708.' },
          { title: 'BUG-NEW-13 — /api/mobile/dashboard/week-sessions: atleta B2C Free sin plan retorna 7 slots vacíos en lugar de sus sesiones reales', done: true, priority: 'P2', note: 'Fix: rama !planMeta && !assignedWorkout ahora consulta SessionLog de la semana solicitada (weekOffset) con fecha lunes–domingo. Mapea completedAt → gymSessions[idx] con done:true, type y weekLabel. Antes: 7 slots null, completedCount:0 aunque el atleta tuviera sesiones registradas. Archivo: src/app/api/mobile/dashboard/week-sessions/route.ts.' },
          { title: 'BUG-NEW-14 — /api/mobile/progress: TS error completedAt no existe en GymSession (campo correcto: date)', done: true, priority: 'P1', note: 'Fix: rawGymSessions query cambió select:{completedAt} → select:{date} y orderBy:{completedAt} → orderBy:{date}. Uso en gymByWeek loop: s.completedAt → s.date. GymSession.date es DateTime, no hay campo completedAt. Archivo: src/app/api/mobile/progress/route.ts.' },
          { title: 'BUG-NEW-15 — /gym (atleta B2C): sección "Explora ejercicios" desaparecía 87% de los renders por skip aleatorio mayor que el total de registros', done: true, priority: 'P2', note: 'Fix: skip: Math.floor(Math.random() * 80) eliminado. Reemplazado por orderBy: { popularityRank: "asc" } + take: 6. Con solo 10 ejercicios en DB (free plan WorkoutX), skip>10 retornaba 0 resultados y la sección se ocultaba (conditionalrender featuredExercises.length>0). Archivo: src/app/(athlete)/gym/page.tsx.' },
          { title: 'BUG-NEW-16 — /gym (atleta B2C): onError en img dentro de Server Component causaba crash React', done: true, priority: 'P1', note: 'Fix: onError={(e) => ...} eliminado del <img> en gym/page.tsx (Server Component). Event handlers no se pueden pasar como props en RSC. Fallback visual ya existe en el bloque else del mismo condicional (Dumbbell icon). Archivo: src/app/(athlete)/gym/page.tsx.' },
          { title: 'BUG-NEW-17 — /gym/exercises: click en card de ejercicio desde "Explora" en gym/page no abría modal del ejercicio específico', done: true, priority: 'P2', note: 'Fix: href="/gym/exercises" → href={`/gym/exercises?open=${ex.id}`}. AthleteExercisesGrid: useSearchParams + useEffect en mount → auto-llama openModal(id) si ?open param presente. Permite deep-link desde el gym page a un ejercicio específico en la biblioteca. Archivos: gym/page.tsx + gym/exercises/_components/AthleteExercisesGrid.tsx.' },
          { title: 'BUG-NEW-18 — NutritionInitClient dispara POST silencioso sin feedback: si falla → pantalla vacía sin mensaje al usuario', done: true, priority: 'P1', note: 'NutritionInitClient.tsx es un componente de 18 líneas que renderiza null y dispara POST /api/nutrition/init en useEffect. Si el POST falla, no hay toast ni mensaje — el atleta ve la pantalla de nutrición completamente vacía. Fix: agregar state loading/error al componente. Durante POST: mostrar spinner o "Generando tu plan...". Si falla: toast "No pudimos inicializar tu plan nutricional. Recarga la página." + botón Reintentar. Si éxito: router.refresh() existente funciona, no tocar. Archivo: src/app/(athlete)/nutrition/_components/NutritionInitClient.tsx.' },
          { title: 'BUG-NEW-19 — /nutrition empty state "Completa el onboarding" aparece para atleta que YA completó onboarding', done: true, priority: 'P1', note: 'Atleta B2C post-onboarding ve "Completa el onboarding" en /nutrition. El atleta SÍ tiene HealthProfile (onboarding completado) pero NO tiene NutritionPlan — lo que debería disparar NutritionInitClient (BUG-NEW-18). El problema raíz es el silent failure del init. Fix secundario: cambiar el mensaje del estado vacío a "Tu plan nutricional se está configurando..." con CTA "Volver al inicio". Verificar que needsNutritionInit en nutrition/page.tsx solo es true cuando healthProfile existe pero nutritionPlan no — nunca cuando healthProfile es null. Archivo: src/app/(athlete)/nutrition/page.tsx.' },
          { title: 'BUG-NEW-20 — Dashboard web: sesiones libres (plannedSessionId=null) no se suman al contador de adherencia semanal', done: true, priority: 'P1', note: 'YA CORREGIDO en dashboard/page.tsx. Líneas 507-516: freeLogsSelectedWeek filtra SessionLog donde freeSessionType !== null y completedAt en [weekStartDate, weekEndDate). completedCount = planCompletedCount + freeLogsSelectedWeek. Comentado con // BUG-057.' },
          { title: 'BUG-NEW-21 — Dashboard web: sesión de hoy puede mostrar sesión incorrecta', done: true, priority: 'P1', note: 'YA CORREGIDO en dashboard/page.tsx. Líneas 356-390: todayPlanned = currentWeekFullSessions.find(s => s.dayOfWeek === todayDow). Fallback BUG-056: si no hay planned session hoy, muestra el SessionLog libre más reciente del día. Lógica correcta verificada en código.' },
        ],
      },

      // ── E2E QA Atleta B2C Autónomo — 2026-07-06 ──────────────────────────────
      {
        id: 'bugs-e2e-0706',
        label: 'E2E QA — Atleta B2C Autónomo (2026-07-06)',
        period: 'Urgente — Flujo atleta sin coach',
        items: [
          {
            title: 'E2E-01 — Dashboard: FreeDashboard muestra CTAs vacíos aunque el atleta ya tiene rutina de gym asignada',
            done: true,
            priority: 'P1',
            note: 'DONE: dashboardMode ahora incluye caso "GYM" — si assignedWorkoutRaw != null y no hay TrainingPlan activo → dashboardMode = "GYM". FreeDashboard solo renderiza cuando dashboardMode === "FREE". DashboardCalendarStrip y DailySessionCard ya manejaban hasGymToday/todayGymDay independientemente del modo. DailySessionCard.tsx actualizado: tipo extendido a "GYM", nuevo bloque de descanso y footer de consistencia semanal para modo GYM. Resuelve también E2E-04 (dos rutinas) — el bloque FREE de DailySessionCard (que mostraba WeeklyRoutine) ya no renderiza en modo GYM.',
          },
          {
            title: 'E2E-02 — Dashboard: CalendarStrip vacío cuando hay AssignedWorkout activo (solo muestra sesiones de TrainingPlan)',
            done: true,
            priority: 'P1',
            note: 'DONE: buildCalendarWeek() en infrastructure/db/calendar.ts ya consulta AssignedWorkout (con sus days) en paralelo con PlannedSession. Construye gymDayByDow y lo mapea a CalendarDay.gym. calendarDaysToWeekCells() maneja el caso gym-only: sessionType=FUERZA, done=gymSession?.completed, label=workoutDay.label. El CalendarStrip muestra correctamente los días de gym incluso sin TrainingPlan activo.',
          },
          {
            title: 'E2E-03 — Dashboard: fecha con capitalización incorrecta ("Miércoles, 8 De Julio De 2026")',
            done: true,
            priority: 'P3',
            note: 'DONE: formatDate() en dashboard/page.tsx ahora retorna s.charAt(0).toUpperCase() + s.slice(1). Clase capitalize eliminada del <p> en línea 561. Resultado: "Miércoles, 9 de julio de 2026" (solo primera letra mayúscula).',
          },
          {
            title: 'E2E-04 — Dos sistemas de rutina coexisten con datos contradictorios (WeeklyRoutine + AssignedWorkout)',
            done: true,
            priority: 'P1',
            note: 'DONE: resuelto como consecuencia de E2E-01. El bloque FREE de DailySessionCard (que mostraba "Según tu rutina semanal" de WeeklyRoutine) solo renderiza cuando dashboardMode === "FREE". Con AssignedWorkout activo, dashboardMode = "GYM" → el bloque FREE no renderiza → WeeklyRoutine desaparece del dashboard. AssignedWorkout se muestra vía hasGymToday/todayGymDay (modo-independiente, línea 133 de DailySessionCard).',
          },
          {
            title: 'E2E-05 — /plan muestra "Sin plan activo" para atleta autónomo con gym y nutrición configurados',
            done: true,
            priority: 'P1',
            note: 'DONE fix rápido: plan/page.tsx — en el bloque if(!plan), antes de mostrar "Sin plan activo", query prisma.assignedWorkout. Si existe → redirect("/gym"). Atleta gym-only llega directamente a su módulo de rutina. Rediseño completo de /plan como hub B2C (E2E-09 + pestaña nutrición) queda pendiente en roadmap como feature mayor.',
          },
          {
            title: 'E2E-06 — Nav "Mensajes" visible para atleta sin coach asignado (sin conversación posible)',
            done: true,
            priority: 'P2',
            note: 'DONE: layout.tsx ahora hace query a CoachAthlete({ athleteId, status:"ACTIVE" }) en paralelo con dbUser y pasa hasCoach={!!coachRelation} a SidebarClient. SidebarClient.tsx: Props incluye hasCoach?:boolean, default false. allNavLinks: show:hasCoach para Mensajes. moreLinks (mobile): spread condicional incluye Mensajes solo si hasCoach. Sin coach → item oculto en desktop sidebar y en menú "Más" mobile.',
          },
          {
            title: 'E2E-07 — /progreso: CTA "Ver mi plan" lleva a /plan vacío para atleta sin TrainingPlan activo',
            done: true,
            priority: 'P2',
            note: 'DONE: progress/page.tsx — estado vacío (sin check-ins). CTA secundario cambiado: ahora siempre apunta a /gym con texto condicional: si hasGymSessions → "Ver historial ejercicios", si no → "Ir a ejercicios". Eliminado el CTA "Ver mi plan" que llevaba a /plan vacío. El botón /checkin sigue siendo el principal.',
          },
          {
            title: 'E2E-08 — Check-in: diferenciación conceptual vs registro diario en /profile no está clara para el usuario',
            done: true,
            priority: 'P2',
            note: 'DONE: (1) CheckInClient.tsx — párrafo explicativo bajo el subtitle: "Acá reportás tu carga subjetiva: energía, estrés, dolor, RPE y motivación. Es distinto al registro diario de peso y FC en tu perfil." (2) ProfileClient.tsx — description del "Registro diario" actualizada: "Métricas objetivas del día: peso, FC reposo y sueño. El check-in semanal complementa esto con tu percepción de carga y es lo que ajusta tu plan de entrenamiento."',
          },
          {
            title: 'E2E-09 — Constructor de rutina propio para atleta autónomo (gap de producto)',
            done: true,
            priority: 'P2',
            note: 'DONE: (1) /gym/builder/page.tsx — servidor, verifica auth + bloquea atletas con coach activo + carga ejercicios globales. (2) /gym/builder/_components/GymRoutineBuilder.tsx — wizard 3 pasos: nombre/objetivo/nivel → selección de días (toggles Lun-Dom) → ejercicios por día (search client-side + sets/reps editables). POST a /api/athlete/gym/routines → POST a /api/gym/assign para activar. (3) /api/gym/assign modificado: acepta templates propios del atleta (athleteId: userId) además de los públicos. (4) gym/page.tsx en estado sin-rutina: botón "+ Crear mi rutina" → /gym/builder para atletas sin coach.',
          },
        ],
      },

      // ── Auditoría UI Módulos Atleta B2C — 2026-07 ────────────────────────────
      {
        id: 'bugs-audit-modules-0706',
        label: 'Auditoría UI Módulos — Atleta B2C (2026-07)',
        period: 'Próximo sprint',
        items: [
          {
            title: 'UI-MOD-01 — Mobile nav: tab "Plan" siempre visible, no respeta features.plan=false',
            done: true,
            priority: 'P2',
            note: 'DONE: SidebarClient.tsx — mobileNavLinks ahora usa `...(features.plan ? [{ href: "/plan", ... }] : [])`. Atleta Free (plan=false) ve 3 tabs principales + "Más" en lugar de ver /plan vacío.',
          },
          {
            title: 'UI-MOD-02 — Mobile nav: "Ejercicios" en menú "Más" en lugar de tab principal para atletas en modo GYM',
            done: true,
            priority: 'P3',
            note: 'DONE (parcial): SidebarClient.tsx — tab Plan oculto en mobile si features.plan=false (atletas GYM sin plan de running). Pendiente: promover "Ejercicios" a tab principal en modo GYM (hoy sigue en menú "Más").',
          },
          {
            title: 'UI-MOD-03 — Check-in: gate "espera al viernes" bloquea a atletas GYM sin sentido',
            done: true,
            priority: 'P3',
            note: 'DONE: checkin/page.tsx — checkInState ahora respeta features.plan. Gate isEarlyInWeek solo aplica cuando hasPlan=true. Atletas GYM-only (features.plan=false) siempre ven estado "open" → formulario directo cualquier día de la semana.',
          },
          {
            title: 'UI-MOD-04 — /progress: sin gráfica de adherencia para atletas GYM-only',
            done: true,
            priority: 'P3',
            note: 'DONE: progress/_components/ProgressClient.tsx — añadido GymAdherencePoint type + gymAdherenceByWeek prop + sección "Adherencia Gym — por semana" con barra de progreso por semana ISO. progress/page.tsx computa gymAdherenceByWeek desde rawGymSessions agrupados por getISOWeekNumber y daysPerWeek del template.',
          },
          {
            title: 'UI-MOD-05 — /nutrition: FoodGuide muestra "0 kcal" cuando no hay NutritionPlan configurado',
            done: true,
            priority: 'P3',
            note: 'DONE: nutrition/page.tsx — FoodGuide ahora solo se renderiza cuando nutritionPlan existe (condición && nutritionPlan). Sin plan → FoodGuide no aparece, evitando targets en 0.',
          },
          {
            title: 'FLOW-01 — Atleta B2C Running: sin ruta para crear plan de entrenamiento',
            done: true,
            priority: 'P1',
            note: 'DONE (fix intermedio): plan/page.tsx — detecta sport=RUNNING via healthProfile y muestra landing diferenciada: ícono 🏃, título "Listo para tu plan de running", 3 feature cards (periodización, zonas Karvonen, check-in adaptativo), CTA "Activar mi plan de running". Atleta GYM-only sin plan sigue viendo estado genérico. Atleta B2C sin plan → buscar coach en marketplace.',
          },
          {
            title: 'GYM-01 — Check-in no tiene impacto en rutina de gym (solo ajusta PlannedSession)',
            done: true,
            priority: 'P2',
            note: 'DONE: process-check-in.use-case.ts — Phase 1 agrega assignedWorkout a Promise.all. Phase 3 step 2b: si triggers incluyen dolor_activo o rpe_excesivo y hay assignedWorkout activo, actualiza warmupNotes de todos los WorkoutDays no-rest con nota [AUTO]. No sobrescribe notas que ya tienen [AUTO] (idempotente).',
          },
          {
            title: 'GYM-02 — suggestedNextWeightKg persiste en WorkoutExercise pero NO se pre-rellena en la siguiente sesión',
            done: true,
            priority: 'P2',
            note: 'DONE: (1) WorkoutExercise type en gym/session/page.tsx añade `suggestedNextWeightKg: number | null`. (2) Inicialización del setsMap usa `we.suggestedNextWeightKg != null ? String(we.suggestedNextWeightKg) : ""` como valor inicial del input de peso. API ya retornaba el campo — solo faltaba consumirlo en el cliente.',
          },
          {
            title: 'GYM-03 — Adherencia gym solo visible localmente en /gym (no en /progress como historial)',
            done: true,
            priority: 'P3',
            note: 'DONE: progress/page.tsx — gymAdherenceByWeek computado desde rawGymSessions agrupados por getISOWeekNumber. progress/_components/ProgressClient.tsx — sección "Adherencia Gym por semana" con barra de progreso coloreada (verde ≥80%, naranja ≥50%, rojo <50%) y fracción completed/total por semana ISO. Solo visible cuando hay > 1 semana de datos.',
          },
        ],
      },

      // ── Inspección Coach Panel — Auditoría 2026-08-07 ─────────────────────────
      {
        id: 'bugs-coach-panel-0807',
        label: 'Inspección Coach Panel — Auditoría 2026-08-07',
        period: 'Urgente',
        items: [
          {
            title: 'COACH-BUG-15 — Tab Sesiones: 500 en atletas gym — muscleGroups ausente en response de /api/coach/gym/athlete/[id]/logs',
            done: true,
            priority: 'P0',
            note: 'FIXED (2 partes): (1) SesionesTab.tsx llama ex.muscleGroups.slice(0,3) pero la API no retornaba el campo → crash 500. (2) ex?.muscleGroups era undefined porque Exercise no tiene ese campo tras migración exercise_rewrite — los campos reales son target + secondaryMuscles[]. Fix en api/coach/gym/athlete/[id]/logs/route.ts: construye muscleGroups como [ex.target, ...ex.secondaryMuscles].filter(Boolean). Tab Sesiones muestra datos correctamente; sesiones libres (sin ejercicio de catálogo) retornan [] sin crash.',
          },
          {
            title: 'COACH-BUG-16 — seed-demo escribía campos incorrectos en WeeklyCheckIn: todos los métricas del coach aparecían como "—"',
            done: true,
            priority: 'P1',
            note: 'FIXED: seed-demo.ts usaba nutritionAdherencePct (campo atleta subjetivo) en lugar de dietAdherencePct (campo que lee el coach), y no incluía sleepScore, stressLevel, motivationLevel, painLevel. Actualizado seed + delete + re-seed. Verificado en DB: sleepScore 6-9, dietAdherencePct 70-88%, stress/motivation/pain con valores reales.',
          },
          {
            title: 'COACH-BUG-17 — Tab Sesiones solo muestra GymSession: SessionLogs de running invisibles para el coach',
            done: true,
            priority: 'P2',
            note: 'FIXED: Creado GET /api/coach/athletes/[id]/running-logs — retorna todos los SessionLogs del atleta (running, cardio, fuerza libre) con fecha, disciplina, duración, distancia, pace, HR avg/max, RPE, notas. SesionesTab.tsx: nueva sección "Sesiones de actividad" con tarjetas por sesión. AthleteDetailClient.tsx: nuevo estado runningLogs/Loading/Loaded + useEffect en tab Sesiones. Felipe ahora muestra sus 7 sesiones de running al coach.',
          },
          {
            title: 'COACH-BUG-18 — Tab Adherencia: título "Adherencia al gym" y 0% para atletas de running',
            done: true,
            priority: 'P2',
            note: 'FIXED: Creado GET /api/coach/athletes/[id]/running-adherence — obtiene TrainingPlan ACTIVE/COMPLETED del atleta, agrupa las últimas 4 semanas, cuenta PlannedSessions vs SessionLogs vinculados. AdherenciaTab.tsx refactorizado: (1) AdherenceGrid extraído como subcomponente reutilizable. (2) Secciones independientes "🏃 Adherencia al plan de running" y "🏋️ Adherencia al gym" con título dinámico. (3) Estado vacío solo si no hay datos de ningún tipo. AthleteDetailClient.tsx: nuevo estado runningAdherence/Loading/Loaded + useEffect en tab Adherencia.',
          },
          {
            title: 'COACH-BUG-19 — Tab Nutrición muestra "No hay plan nutricional asignado" aunque NutritionPlan existe en DB',
            done: true,
            priority: 'P2',
            note: 'FIXED: El banner confundía dos conceptos distintos: assignedTemplate (template de comidas diarias) vs NutritionPlan (TDEE + macros). El atleta SÍ tenía targets calóricos pero no un template de comidas del coach. Fix en NutricionTab.tsx: copy actualizado a "Sin template de comidas asignado" + aclaración contextual + CTA "Asignar template de comidas". El coach ahora entiende el estado real sin confusión.',
          },
          {
            title: 'COACH-UI-FIGMA-01 — Alinear PlanTab completo con Figma (AthleteHeader, TabNav, WeekNav, SessionsCard, PlanProgressTimeline)',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-08-28). Frames Figma: 4594:169 (Running), 4594:461 (Gym), 4767:31 (Sin plan). Cambios: STATUS_RUNNING/STATUS_GYM con colores por disciplina, ZONE_COLORS para pills de zona, OnboardingBanner/ProfileCards/DisciplineCards colores Figma, GymRoutineView badges verdes, GymRoutineProgress (timeline sin datos para gym-only), WeekNav circular arrows, SessionsCard max-h-[400px] scroll + CTAs inline + accent bar, PlanProgressTimeline connector lines + glow current week. AthleteHeader: email bajo nombre + sport badge emoji. TabNav: gap-6 sin scroll, active bold+underline.',
          },
        ],
      },

      // ── AUDITORÍA SISTÉMICA — septiembre 2026 ─────────────────────────────────
      {
        id: 'bugs-audit-0906',
        label: 'Auditoría Sistémica — septiembre 2026',
        period: 'Urgente — Auditoría codebase completa',
        items: [
          { title: 'TZ-CENTRAL — Centralizar timezone: apiFetch auto-inyecta tz en GET, todayInTz default UTC en vez de America/Bogota', done: true, priority: 'P0', note: 'Fix: (1) MEDALIQ-MOBILE/src/api/client.ts apiFetch() auto-appends ?tz=Intl.DateTimeFormat().resolvedOptions().timeZone a todo GET. (2) date_utils.ts todayInTz() default cambiado de America/Bogota a UTC. (3) Eliminado tz manual de getWeekSessions(), getCalendarWeek(), getNutritionPage(). Todo endpoint mobile recibe tz automáticamente.' },
          { title: 'DAT-5 — autoCompleteStrengthSession crea phantom SessionLog en path de assignedWorkout', done: true, priority: 'P1', note: 'Fix: removido autoCompleteStrengthSession() del path assignedWorkout en gym/session/complete/route.ts. Solo se llama en el plan-based path donde tiene sentido (FUERZA plannedSession).' },
          { title: 'DAT-6 — Plan start no forzado a lunes: session dates desalineados con week display', done: true, priority: 'P1', note: 'Fix: forceMonday() en date_utils.ts ajusta al lunes siguiente. Aplicado en 4 puntos: coach/plan/custom, coach/plan/from-template, coach/plan/copy-from, generate_plan.use_case.ts.' },
          { title: 'DAT-8 — Macro formula: fatG negativo para atletas pesados, kcal no recalculado', done: true, priority: 'P1', note: 'Fix: formulas.ts buildDay() ahora recalcula kcal = proteinKcal + carbsG*4 + fatG*9 después de aplicar Math.max(fatG, 0.5g/kg). Macros siempre suman al total reportado.' },
          { title: 'MOB-2 — N+1 query en gym/week: setLogs no incluidos en query inicial', done: true, priority: 'P2', note: 'Fix: gymSession.findMany en ambos paths (assignedWorkout + plan-based) ahora incluye setLogs con workoutExercise.exercise. Eliminadas 2 queries extras (findFirst + findUnique) para selectedDow detail.' },
          { title: 'TZ-SETHOURS — 3 rutas nutrition/apply-template usaban setHours() (server TZ) en vez de setUTCHours()', done: true, priority: 'P1', note: 'Fix: coach/nutrition/apply-template, mobile/nutrition/templates/[id]/apply, athlete/nutrition/templates/[id]/apply — cambiado a UTC explícito. setHours→setUTCHours, new Date(str)→new Date(str+T00:00:00.000Z).' },
          { title: 'TEST-SYNC — 15 tests desincronizados tras cambios de tz y foods sorting', done: true, priority: 'P2', note: 'Fix: agregado mock prisma.user a 5 test files (dailylogs×2, metrics/log, foods×2). Actualizado take 50→80 en foods tests. Corregido test déficit kcal (macros se recalculan). Agregados 26 tests nuevos: todayInTz, forceMonday, invariante macros.' },
          { title: 'NUT-PAGE-TZ — nutrition/page.tsx usaba toLocaleString+setHours+getDay (fragile, inconsistente con dashboard/plan)', done: true, priority: 'P1', note: 'Fix: reemplazado con todayInTz, getWeekMonday, y métodos UTC (getUTCDate/getUTCMonth/setUTCDate). weekMenuDays ahora usa mondayThisWeek en vez de recalcular Monday manualmente. Las 3 páginas atleta ahora usan el mismo patrón timezone-safe.' },
          { title: 'WATER-RACE — POST /api/athlete/nutrition/water tenía race condition (read-then-write no atómico)', done: true, priority: 'P1', note: 'Fix: reemplazado findUnique+upsert por INSERT ON CONFLICT atómico con GREATEST(0, mlLogged + delta). Mismo patrón que ya usaba el endpoint mobile.' },
        ],
      },

    ],
  },

  // ── ARQUITECTURA DE PLANES — PIVOT PRODUCTO ────────────────────────────────
  {
    id: 'arch-planes',
    label: 'Arquitectura de Planes — Pivot',
    color: '#b45309',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
    phases: [
      {
        id: 'arch-planes-pivot',
        label: 'Pivot: planes del coach, no del sistema',
        period: 'P1 — Próxima iteración',
        items: [
          {
            title: 'ARCH-01 — Deprecar /new-goal y generación automática de planes desde templates',
            done: true,
            priority: 'P1',
            note: 'DONE (bugfix/athlete-e2e): onboarding/page.tsx ya no redirige a /new-goal para RUNNING/BOTH — va directo a /dashboard. UX-04 ya hizo que /new-goal solo guarda meta sin generar plan. /new-goal sigue existiendo pero sin acceso desde flujo normal. Sidebar no lo linkea. B2B: coach genera plan. B2C Free: tracking libre.',
          },
          {
            title: 'ARCH-02 — CoachSpecialty: enum + columna DB + adaptación del panel del coach',
            done: true,
            priority: 'P1',
            note: 'enum CoachSpecialty { RUNNING | GYM | NUTRITION | ALL } + CoachProfile.primarySpecialty @default(ALL) + migration SQL 20260703200000. CoachSidebarClient filtra /coach/gym y /coach/nutrition según especialidad. PATCH /api/coach/profile guarda primarySpecialty. ProfileForm tiene selector de especialidad. Layout fetches desde DB (sin JWT change).',
          },
          {
            title: 'ARCH-03 — Vista calendario del atleta (estilo TrainingPeaks) como navegación principal del plan',
            done: true,
            priority: 'P1',
            note: 'PlanCalendarView.tsx: navega semanas via /api/athlete/calendar, badges de color por tipo (sport/gym/freeRun), CheckCircle para días completados, panel de detalle al hacer click. Coexiste con PlanClient como vista principal en /plan. Mobile: pendiente sprint siguiente.',
          },
          {
            title: 'ARCH-04 — Sesión libre con tipado completo por disciplina para atleta sin plan',
            done: false,
            priority: 'P2',
            note: 'Running libre: tipos RODAJE_Z2/FARTLEK/TEMPO/INTERVALOS/TIRADA_LARGA/OTRO con distancia, duración, FC media/máxima, pace, RPE. Gym libre: FUERZA con ejercicios/series/cargas + PR detection activa. Sesiones libres visibles en calendario del atleta y en panel del coach (sección "Sesiones libres"). El registro libre ya existe parcialmente — mejorar tipado y variaciones disponibles en web y mobile.',
          },
          {
            title: 'ARCH-05 — Eliminar RACE_HALF_MARATHON y RACE_MARATHON de todos los selectores UI',
            done: true,
            priority: 'P1',
            note: 'Eliminados de NewGoalClient.tsx, coach/clients/new/page.tsx y AthleteDetailClient.tsx. Schema DB intacto. Planes existentes intactos.',
          },
        ],
      },
      {
        id: 'plan-atleta-autonomo',
        label: 'Plan Builder Autónomo — Atleta B2C sin coach (ELIMINADO)',
        period: 'ELIMINADO — 2026-09-04',
        items: [
          {
            title: 'PLAN-F-03 — /plan: landing B2C con CTA "Buscar entrenador" cuando no hay plan activo',
            done: true,
            priority: 'P1',
            note: 'DONE 2026-07-09: /plan/page.tsx actualizado. Estado vacío sin plan activo → CTA principal "Encontrar mi entrenador" (→ /coaches) + CTA secundario "Volver al dashboard". Eliminado CTA "Activar mi plan → $9.99" que prometía generación automática. El atleta B2C sin plan es redirigido al directorio de coaches.',
          },
          {
            title: 'PLAN-B-01 a PLAN-B-05, PLAN-F-01, PLAN-F-02, PLAN-F-04 — Eliminados',
            done: true,
            priority: 'P3',
            note: 'ELIMINADOS 2026-09-04: 8 items bloqueados por AI removidos. AI eliminada del producto por decisión de producto. Planes los asigna el coach (B2B) o el atleta busca coach en marketplace.',
          },
        ],
      },
    ],
  },
  {
    id: 'db-schema-v2',
    label: 'DB Schema v2 — Correcciones estructurales',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    phases: [
      {
        id: 'db-p0',
        label: 'Fase 1 — Correcciones críticas (P0)',
        period: 'P0 — Hacer antes de conectar Wompi o billing',
        items: [
          {
            title: 'DB-01 — Agregar UserStatus enum + campo status a User',
            done: true,
            priority: 'P0',
            note: 'Migración 20260709000001 aplicada. UserStatus enum: ACTIVE|SUSPENDED|BLOCKED|DELETED. User.status @default(ACTIVE). Ver BACK-01 para el código de middleware correspondiente (también completado en esta sesión).',
          },
          {
            title: 'DB-02 — Agregar identification, phoneWa, showPhoneWa a User (coach identity)',
            done: true,
            priority: 'P0',
            note: 'Migración 20260708000001_identity_notification_food aplicada en Neon prod. identification String? @unique, phoneWa String? @unique, showPhoneWa Boolean @default(false) en User. Indexes únicos en DB. Implementar bloqueo en /api/coach/clients/create y endpoint PATCH /api/coach/profile en worktree feature/coach-identidad.',
          },
          {
            title: 'DB-03 — Agregar campo discipline a SessionLog (unificación de sesiones multi-disciplina)',
            done: true,
            priority: 'P0',
            note: 'Migración 20260709000001 aplicada. SessionDiscipline enum: RUNNING|STRENGTH|CYCLING|SWIMMING|OTHER. SessionLog.discipline nullable. POST /api/log/session y POST /api/mobile/log/session actualizados para recibir y persistir discipline.',
          },
          {
            title: 'DB-04 — Reemplazar modelo Exercise con schema WorkoutX-compatible',
            done: true,
            priority: 'P0',
            note: 'Implementado en worktree medaliq-exercise-rewrite. Schema reescrito: drop muscleGroups/equipment(enum)/category(enum)/isGlobal/imageUrl/tips → add bodyPart/target/equipment(String)/mechanic/gifUrl/gifStoredUrl/source/secondaryMuscles/instructions/etc. Migración SQL combinada (additive+backfill+destructive) en prisma/migrations/20260710000001_exercise_rewrite. Requiere: pnpm prisma migrate deploy → pnpm prisma generate.',
          },
        ],
      },
      {
        id: 'db-p1',
        label: 'Fase 2 — Mejoras de modelo (P1)',
        period: 'P1 — Después de P0 estabilizado',
        items: [
          {
            title: 'DB-05 — Unificar NutritionPlan: agregar campo source (SYSTEM|COACH|ATHLETE)',
            done: true,
            priority: 'P1',
            note: 'Migración 20260709000001 aplicada. NutritionSource enum: SYSTEM|COACH|ATHLETE. NutritionPlan.source @default(SYSTEM). upsertNutrition en plan.repository.ts usa source: SYSTEM en create. Pendiente: cuando coach asigna template → source: COACH (ver /api/coach/athletes/[id]/nutrition cuando exista).',
          },
          {
            title: 'DB-06 — NutritionTemplate: hacer coachId nullable + agregar athleteId FK opcional',
            done: true,
            priority: 'P1',
            note: 'DONE: migración 20260712000001_db06_plansource_athlete. coachId String? (nullable). athleteId String? FK → User con onDelete:Cascade. Index NutritionTemplate_athleteId_idx. Relación "AthleteNutritionTemplates" en User. Patrón XOR (coachId OR athleteId) enforced a nivel app. Desbloquea endpoints de nutrición B2C autónoma.',
          },
          {
            title: 'DB-07 — Agregar modelo FoodProposal (alimentos propuestos por la comunidad)',
            done: true,
            priority: 'P1',
            note: 'Schema + migración aplicados en 20260708000001. FoodProposal model con FoodProposalStatus enum (PENDING|APPROVED|REJECTED) ya en DB. Pendiente: endpoints BACK-07 (NUT-05 y NUT-06).',
          },
          {
            title: 'PLAN-DB-01 — PlanSource enum: agregar valor ATHLETE',
            done: true,
            priority: 'P1',
            note: 'DONE: migración 20260712000001_db06_plansource_athlete. ALTER TYPE "PlanSource" ADD VALUE "ATHLETE". Migración 20260829 limpió enum a solo COACH. Schema.prisma actualizado.',
          },
          {
            title: 'CI-DB-01 — Modelo CheckInSuggestion (sugerencias de ajuste del check-in)',
            done: true,
            priority: 'P1',
            note: 'Implementado en schema.prisma. Enums: SuggestionStatus (PENDING|ACCEPTED|REJECTED|EXPIRED), SuggestionType (PLAN_ADJUSTMENT|RECOVERY_WEEK|NUTRITION_CHANGE|GYM_DELOAD). Model: CheckInSuggestion { id, userId, checkInId, type, status, title, description, payload Json, expiresAt, respondedAt, createdAt }. Relations: User.checkInSuggestions + WeeklyCheckIn.suggestions. Indexes: [userId,status], [checkInId]. Aplicado a Neon via prisma db push (2026-07-09) — shadow DB bloqueada por migration 20260708180057.',
          },
        ],
      },
      {
        id: 'db-p2',
        label: 'Fase 3 — Infraestructura de notificaciones (P2)',
        period: 'P2 — Trigger: 10+ coaches activos',
        items: [
          {
            title: 'DB-08 — Agregar modelo Notification (centro de notificaciones in-app)',
            done: true,
            priority: 'P2',
            note: 'Schema + migración aplicados en 20260708000001. Notification model ya en DB con indexes (userId, read) y (userId, createdAt desc). Pendiente: endpoints BACK-08 (GET /api/notifications, PATCH /api/notifications/[id]/read).',
          },
        ],
      },
      {
        id: 'db-p3',
        label: 'Fase 4 — Retención y wearables (P2-P3)',
        period: 'P2-P3 — después de lanzamiento y primeros clientes activos',
        items: [
          {
            title: 'DB-09 — Modelo ActivityStreak (racha diaria del atleta)',
            done: true,
            priority: 'P2',
            note: 'DONE: ActivityStreak { id, userId @unique, currentStreak Int @default(0), longestStreak Int @default(0), lastActivityAt DateTime?, updatedAt @updatedAt } + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-10 — Modelo UserAchievement (hitos de consistencia compartibles)',
            done: true,
            priority: 'P2',
            note: 'DONE: UserAchievement { id, userId, type String, unlockedAt DateTime } + @@unique([userId, type]) + @@index([userId]) + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-11 — Modelo WearableConnection (OAuth tokens Strava/Garmin)',
            done: true,
            priority: 'P3',
            note: 'DONE: WearableConnection { id, userId, provider String, accessToken, refreshToken?, expiresAt?, scopes String[] } + @@unique([userId, provider]) + @@index([userId]) + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-12 — Modelo PlannedMeal (plan nutricional por fecha y alimento concreto)',
            done: true,
            priority: 'P2',
            note: 'DONE: PlannedMeal { id, userId, date @db.Date, mealType MealType, foodId FK Food, grams Float, createdAt } + @@index([userId, date]) + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
        ],
      },
      {
        id: 'back-safe',
        label: 'Backend Fase 1 — Código para migraciones aditivas (DB-01/02/03/05)',
        period: 'Completado',
        items: [
          {
            title: 'BACK-01 — Middleware: bloquear usuarios SUSPENDED y BLOCKED',
            done: true,
            priority: 'P0',
            note: 'User.status incluido en JWT (auth.ts + auth.config.ts). Middleware redirige a /login con mensaje de error si status !== ACTIVE. Mobile login retorna 403 si status !== ACTIVE. MobileTokenPayload incluye status. Todos los signMobileToken actualizados.',
          },
          {
            title: 'BACK-02 — /api/coach/clients/create: bloquear si identification o phoneWa no están completos',
            done: true,
            priority: 'P0',
            note: 'Ya implementado en feature/coach-identidad (PR #67). Verifica session.user.profileComplete y luego doble-check DB. Retorna 403 con código PROFILE_INCOMPLETE si falta identification o phoneWa.',
          },
          {
            title: 'BACK-03 — Rutas de session log: recibir y persistir campo discipline',
            done: true,
            priority: 'P1',
            note: 'POST /api/log/session y POST /api/mobile/log/session actualizados: aceptan discipline (SessionDiscipline enum) y lo persisten en SessionLog.discipline. Pendiente: incluir discipline en GET responses (historial) cuando se implemente ese endpoint.',
          },
          {
            title: 'BACK-05 — Rutas de NutritionPlan: incluir source en creación y respuesta',
            done: true,
            priority: 'P1',
            note: 'plan.repository.ts → upsertNutrition: create incluye source: SYSTEM. NutritionPlan existentes en DB ya tienen DEFAULT SYSTEM por la migración. Pendiente: cuando coach asigna template → source: COACH; incluir source en GET /api/nutrition y GET /api/mobile/nutrition responses.',
          },
        ],
      },
      {
        id: 'back-exercise',
        label: 'Backend Fase 2 — Sprint Ejercicios: reescritura completa (DB-04)',
        period: 'Completado',
        items: [
          {
            title: 'BACK-04a — Admin ejercicios: reescribir /api/admin/exercises con nuevo schema WorkoutX',
            done: true,
            priority: 'P0',
            note: 'Implementado. /api/admin/exercises/route.ts y [id]/route.ts reescritos con bodyPart/target/equipment/mechanic/gifUrl. ExercisesClient.tsx reescrito (tabla + formulario). admin/exercises/page.tsx actualizado. Tests actualizados.',
          },
          {
            title: 'BACK-04b — Coach gym: reescribir rutas de ejercicios y rutinas',
            done: true,
            priority: 'P0',
            note: 'Implementado. /api/coach/gym/exercises/route.ts, routines, assigned, logs actualizados. coach/gym/exercises/page.tsx + ExerciseForm.tsx reescritos. coach/gym/routines/new y [id]/page.tsx actualizados (ExerciseOption type). coach/gym/page.tsx actualizado. isGlobal→coachId: null en todos los where clauses.',
          },
          {
            title: 'BACK-04c — Atleta gym: reescribir rutas de sesiones y historial',
            done: true,
            priority: 'P0',
            note: 'Implementado. /api/gym/session/today, [id], /api/mobile/gym/week, /api/athlete/gym/routines reescritos con bodyPart/target/gifUrl. athlete/gym/routines isGlobal→coachId: null. gym-labels.ts reescrito con BODY_PART_LABELS+TARGET_LABELS+compat translateMuscleGroup. build-gym-week.ts, plan/session_builder.ts y tests actualizados.',
          },
          {
            title: 'BACK-04d — Seed de ejercicios WorkoutX: script de carga inicial',
            done: true,
            priority: 'P0',
            note: 'Implementado. WorkoutXClient + ExerciseSyncUseCase en infrastructure/exercise_sync/. POST /api/admin/exercises/sync para re-seed manual. GET /api/exercises + /api/mobile/exercises (browse). seed.ts + seed.prod.ts actualizados con string fields. Requiere WORKOUTX_API_KEY en env.',
          },
        ],
      },
      {
        id: 'back-nutrition-platform',
        label: 'Backend Fase 3 — Nutrición y plataforma (DB-06/07/08)',
        period: 'Después de DB-06, DB-07, DB-08',
        items: [
          {
            title: 'BACK-06 — NutritionTemplate: fix null checks en coach nutrition routes',
            done: true,
            priority: 'P1',
            note: 'DONE (no-op) 2026-07-09: los routes de coach ya usan WHERE coachId = session.user.id. Los templates de atleta tienen coachId: null → nunca aparecen en queries del coach. No requirió cambios en código existente. Coach solo ve sus propios templates. Atleta B2C tiene endpoints propios en /api/athlete/nutrition/templates.',
          },
          {
            title: 'BACK-07 — FoodProposal: crear endpoints NUT-05 y NUT-06',
            done: true,
            priority: 'P1',
            note: 'DONE: NUT-03–08 completos. Endpoints backend + admin panel + UI web y mobile. LogFoodModal web y mobile: step "propose" con form nombre/categoría/macros/país/notas. CTA "Proponer alimento →" aparece en búsqueda con ≥2 chars. Success state con checkmark. BACK-07 cerrado.',
          },
          {
            title: 'BACK-08 — Notification: crear endpoints GET /api/notifications y PATCH /api/notifications/[id]/read',
            done: true,
            priority: 'P2',
            note: 'DONE (PLT-07): GET /api/notifications (take 30, unreadCount), PATCH /api/notifications/read-all (marca todas read). GET /api/mobile/notifications + PATCH /api/mobile/notifications/read-all: equivalentes mobile con getMobileUser + rate limit 120/min. Implementados en api/notifications/route.ts, api/notifications/read-all/route.ts, api/mobile/notifications/route.ts, api/mobile/notifications/read-all/route.ts.',
          },
        ],
      },
      {
        id: 'db-fuerza',
        label: 'Fase 5 — Fuerza & Ejercicios (schema)',
        period: 'P0-P3',
        items: [
          {
            title: 'DB-13 — Exercise: agregar nameEs String? + instructionsEs String[] (español del dataset WorkoutX)',
            done: true,
            priority: 'P0',
            note: 'DONE: Exercise.nameEs String? + Exercise.instructionsEs String[] agregados. UI usa nameEs ?? name + instructionsEs.length ? instructionsEs : instructions. Desbloquea EX-05b (seed español). Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-14 — WorkoutExercise: agregar restSeconds Int? (tiempo de descanso entre sets)',
            done: true,
            priority: 'P1',
            note: 'DONE: WorkoutExercise.restSeconds Int? ya existía en el schema antes de esta migración. Verificado en línea 577 del schema.prisma.',
          },
          {
            title: 'DB-15 — SetLog: agregar setType SetType enum (WORK|WARMUP|DROPSET) + rpe Int?',
            done: true,
            priority: 'P2',
            note: 'DONE: SetLogType enum (WORK|WARMUP|DROPSET) y SetLog.setLogType ya existían. SetLog.rpe Int? agregado en esta migración. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-16 — Exercise: agregar videoUrl String? (vídeo de referencia técnica)',
            done: true,
            priority: 'P3',
            note: 'DONE: Exercise.videoUrl String? agregado. Coach asigna YouTube URL o Vercel Blob URL por ejercicio. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
        ],
      },
      {
        id: 'db-nutricion-avanzado',
        label: 'Fase 6 — Nutrición Avanzada (schema)',
        period: 'P2-P3',
        items: [
          {
            title: 'DB-17 — Recipe + RecipeIngredient models (recetas compuestas del atleta)',
            done: true,
            priority: 'P2',
            note: 'DONE: Recipe { id, userId, name, createdAt } + RecipeIngredient { id, recipeId FK Cascade, foodId FK, grams } + índices. Food.recipeIngredients[] y User.recipes[] agregados. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-18 — WaterLog model + NutritionPlan.waterMlTarget Int? (tracking de hidratación)',
            done: true,
            priority: 'P3',
            note: 'DONE: WaterLog { id, userId, date @db.Date, mlLogged Int, createdAt } + @@unique([userId, date]) + @@index([userId]). NutritionPlan.waterMlTarget Int? @default(2000) agregado. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-19 — MealPlanVersion model (historial de cambios del plan nutricional)',
            done: true,
            priority: 'P3',
            note: 'DONE: MealPlanVersion { id, userId, mealPlanId FK Cascade, version Int, planData Json, assignedAt, assignedById? FK SetNull } + @@index([userId, mealPlanId]). MealPlan.versions[] agregado. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
        ],
      },
      {
        id: 'db-atleta-avanzado',
        label: 'Fase 7 — Atleta Avanzado (schema)',
        period: 'P2',
        items: [
          {
            title: 'DB-20 — ProgressPhoto model (fotos de progreso semanales via Vercel Blob)',
            done: true,
            priority: 'P2',
            note: 'DONE: ProgressPhoto { id, userId, url String (Vercel Blob URL), takenAt DateTime, description String?, createdAt } + @@index([userId, takenAt]) + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
        ],
      },
    ],
  },

  // ─── ENGAGEMENT & SHARING ─────────────────────────────────────────────────

  {
    id: 'engagement',
    label: 'Engagement & Sharing',
    period: 'En progreso',
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      {
        title: 'Tarjeta de logro compartible (PR, racha, semana perfecta)',
        done: true,
        priority: 'P3',
        note: 'DONE: ShareMilestoneButton (type: PR|STREAK|PERFECT_WEEK). navigator.share() en mobile, clipboard fallback en desktop. Integrado en PR celebration banner (gym/session) y badge de racha en dashboard (>=7 días vía StreakShareButton wrapper).',
      },
    ],
  },

  // ─── UI-EXPERIENCE ────────────────────────────────────────────────────────────

  {
    id: 'ui-experience',
    label: 'UI-Experience',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#c4b5fd',
    phases: [

      // ── Onboarding ──────────────────────────────────────────────────────────
      {
        id: 'uix-onboarding',
        label: 'Onboarding',
        period: 'Audit 2026-07-09',
        items: [
          {
            title: 'UX-OB-01 — StepGenerating: copy duplicado en título y subtítulo',
            done: true,
            priority: 'P2',
            note: 'Fix: subtítulo cambiado a "Calculando tus objetivos iniciales" (sin repetir "configurando"). Aplicado en redesign onboarding web+mobile.',
          },
          {
            title: 'UX-OB-02 — Botón "Salir" en onboarding sin confirmación: destructivo sin advertencia',
            done: false,
            priority: 'P3',
            note: 'onboarding/page.tsx: el botón "Salir" en el header llama signOut({ callbackUrl: "/login" }) sin modal de confirmación. Si el atleta lo toca por error en el paso 2, pierde la sesión y debe reiniciar. Fix: modal de confirmación "¿Salir del registro? Perderás tu progreso." con dos botones: Cancelar / Confirmar salida.',
          },
          {
            title: 'UX-OB-03 — Género en onboarding: solo 2 opciones, falta "Prefiero no decir"',
            done: true,
            priority: 'P2',
            note: 'Fix 2026-07-29: tercera opción "Prefiero no decir" (gender: "other") en onboarding/page.tsx. TDEE normaliza "other" → "male" (estimación conservadora). HealthProfile.gender acepta cualquier string. No requiere migración DB.',
          },
          {
            title: 'UX-OB-04 — StepGenerating: sin indicador de progreso interno (solo spinner)',
            done: false,
            priority: 'P3',
            note: 'El spinner giratorio no da feedback sobre qué está pasando. Agregar 3 micro-pasos con texto animado: "1/3 Calculando tu metabolismo basal..." → "2/3 Ajustando zonas de entrenamiento..." → "3/3 Configurando nutrición..." — reduce ansiedad de espera y comunica valor del sistema.',
          },
        ],
      },

      // ── Dashboard atleta ─────────────────────────────────────────────────────
      {
        id: 'uix-dashboard',
        label: 'Dashboard atleta',
        period: 'Audit 2026-07-09',
        items: [
          {
            title: 'UX-DASH-01 — FreeDashboard: CTA primario no diferencia GYM vs RUNNING',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-21). FreeDashboard.tsx: nueva prop sport?: string | null. isRunner = sport===RUNNING||BOTH, isGym = sport===STRENGTH. CTA primario bifurcado: RUNNING → /log (🏃 "Registrar sesión"), GYM → /gym (🏋️ "Ir al gym"), default → /log. Ícono de bienvenida diferenciado por deporte. dashboard/page.tsx pasa sport={profile?.sport ?? null}.',
          },
          {
            title: 'UX-DASH-02 — FreeDashboard: sin acceso visible a /nutrition ni /progress desde el inicio',
            done: true,
            priority: 'P2',
            note: 'Fix 2026-07-29: sección "Explora tu espacio" con 4 mini-cards (Nutrición, Progreso, Check-in, Gym/Log) visible cuando isNewUser=true en FreeDashboard.',
          },
          {
            title: 'UX-DASH-03 — PWA install banner compite con onboarding en primera visita',
            done: false,
            priority: 'P3',
            note: 'InstallPWABanner aparece en el dashboard desde la primera visita. Si el atleta acaba de completar onboarding, el banner compite con la pantalla de bienvenida y divide la atención. Fix: mostrar el banner solo después de la tercera visita al dashboard (guardar contador en localStorage) o 24h después del registro.',
          },
          {
            title: 'UX-DASH-04 — Paridad web-mobile FREE: gym completion + InsightsProCard + TodayLogCard + orientación',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-08-25). 4 fixes: (1) getDashboardSummary gym-today completed ahora detecta gymCompletionDates dinámicamente (antes hardcoded false). (2) Mobile nativo: gym zone badge, workout name, completed CTA "Ver resumen →". (3) InsightsProCard + TodayLogCard añadidos al path FREE en mobile nativo (dashboard.tsx). (4) Post-onboarding orientación removida de path no-FREE (solo visible en FREE). Figma: InsightsProCard (5196:44) añadido a frame B2C Free 3404:46. 74 tests pass.',
          },
          {
            title: 'UX-DASH-05 — NutritionProgressCard: reemplazar Banner-Nutricion-HOY con widget de progreso vivo (consumido vs objetivo)',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-08-28). Ver sub-tasks 05a/b/c.',
          },
          {
            title: 'UX-DASH-05a — Backend: agregar todayFoodTotals al endpoint /api/mobile/dashboard',
            done: true,
            priority: 'P1',
            note: 'DONE. /api/mobile/dashboard/route.ts: prisma.foodLog.aggregate(_sum: kcalLogged/proteinLogged/carbsLogged/fatLogged WHERE userId AND date=todayUtc) añadido al Promise.all. todayFoodTotals: {kcal,proteinG,carbsG,fatG} incluido en respuesta. DashboardData type actualizado en MEDALIQ-MOBILE/src/api/dashboard.ts.',
          },
          {
            title: 'UX-DASH-05b — Mobile: crear NutritionProgressCard con CalorieRing + MacroRings (react-native-svg)',
            done: true,
            priority: 'P1',
            note: 'DONE. src/components/dashboard/NutritionProgressCard.tsx — CalorieRing donut SVG 120px naranja #ea5807 (rojo si excede), texto central "X kcal restantes/extra". 3 MiniMacroRing (Prot #3b82f6, Carbs #eab308, Grasas #22c55e), 36px. Props: target+consumed+onPress.',
          },
          {
            title: 'UX-DASH-05c — Mobile: integrar NutritionProgressCard en dashboard y reutilizar en nutrition tab',
            done: true,
            priority: 'P2',
            note: 'DONE. dashboard.tsx: NutritionBanner reemplazado por NutritionProgressCard (target=d.nutritionTarget, consumed=d.todayFoodTotals) en ambos paths (B2B y B2C). nutrition.tsx: query nutrition-log añadida al NutritionScreen level (deduped por React Query). Bloque "Tu objetivo de hoy" (L1033-1073) reemplazado por NutritionProgressCard. gymKcalBurned y TDEE info conservados como elementos separados.',
          },
        ],
      },

      // ── Check-in ─────────────────────────────────────────────────────────────
      {
        id: 'uix-checkin',
        label: 'Check-in',
        period: 'Audit 2026-07-09',
        items: [
          {
            title: 'UX-CI-01 — CheckInResultScreen: sin valores numéricos post-ajuste (CI-F-05)',
            done: true,
            priority: 'P0',
            note: 'DONE (2026-07-19). buildSessionAdjustments() ya retornaba hasRpe. Añadido zonesAdjusted a ProcessCheckInResult.planChanges. planChanges se popula siempre que sessionsAdjusted > 0 (antes requería volumeDeltaPct definido). CheckInResultScreen: tipo PlanChanges actualizado, hasNumericChanges incluye zonesAdjusted, badge "Intensidad de sesiones → Reducida" cuando zonesAdjusted. CheckInClient: tipo del adjustment actualizado.',
          },
          {
            title: 'UX-CI-02 — Post check-in: único CTA es "Volver al dashboard", sin guía al módulo impactado',
            done: true,
            priority: 'P2',
            note: 'Fix 2026-07-29: CTAs contextuales en SubmittedCheckInView según submittedTriggers: rpe_excesivo/dolor_activo → "Ver plan — tómate un día de descanso"; hasAdjustments → "Ver plan ajustado"; nutricion_baja → "Revisa tu guía de nutrición"; sin alertas → "Ver mi progreso".',
          },
          {
            title: 'UX-CI-03 — Estado early (Lun-Jue sin check-in): copy poco motivador',
            done: false,
            priority: 'P3',
            note: 'Cuando el atleta abre /checkin entre lunes y jueves sin haber enviado, ve el estado early con resumen de la semana pasada y un banner informativo. El copy podría ser más activo: en vez de "El check-in está disponible el viernes" mostrar "Esta semana vas X/Y sesiones — el viernes haces tu check-in y el sistema ajusta tu plan". Comunica el valor del ciclo completo.',
          },
        ],
      },

      // ── Plan ─────────────────────────────────────────────────────────────────
      {
        id: 'uix-plan',
        label: 'Plan',
        period: 'Audit 2026-07-09',
        items: [
          {
            title: 'UX-PLAN-01 — Voseo en empty state de /plan: "no tenés" → "no tienes"',
            done: true,
            priority: 'P0',
            note: 'DONE (2026-07-19). plan/page.tsx: "tenés" → "tienes". Grep confirmó que es la única ocurrencia real de voseo en código fuente (los demás "estás/aceptas" son tuteo estándar).',
          },
          {
            title: 'UX-PLAN-02 — Empty state B2C sin plan: grid de 3 beneficios se rompe en mobile',
            done: false,
            priority: 'P2',
            note: 'plan/page.tsx: sección con grid-cols-3 ("📊 Plan a medida", "❤️ Seguimiento real", "💬 Comunicación directa") en max-w-3xl. En pantallas <400px las columnas quedan muy estrechas y el texto se trunca. Fix: cambiar a grid-cols-1 sm:grid-cols-3 o usar flex-wrap.',
          },
          {
            title: 'UX-PLAN-03 — Empty state B2C sin plan: CTA solo apunta a /coaches, sin alternativa para GYM',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-21). plan/page.tsx: profileData hoistado fuera del try (let profileData). Agregado sport: true al select de healthProfile en Promise.all. planPageIsRunner = sport===RUNNING||BOTH. En el segundo empty state (sin lastCompleted): CTA primario bifurcado → RUNNING: /log "Registrar sesión", GYM: /gym/builder "Crear mi rutina".',
          },
          {
            title: 'UX-PLAN-04 — Error silencioso en carga del plan: try-catch no muestra estado de error al usuario',
            done: false,
            priority: 'P2',
            note: 'plan/page.tsx línea 217: el catch hace console.error pero el usuario cae al empty state "Sin plan activo" como si no tuviera plan — cuando en realidad falló la query. Fix: capturar el error en una variable hasError y mostrar un estado diferenciado: "Error cargando tu plan. Recarga la página." con botón de recarga.',
          },
          {
            title: 'UX-PLAN-05 — Componentes de /plan siempre visibles: eliminar return null para evitar layout shifts',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-09-02). PlanClient.tsx: ZonasFC, BodyCompositionCard, CheckInBanner, EstadoSemana y AdherenceChart ya nunca retornan null — muestran empty states con placeholders (— bpm, — kg, — cm, Sin check-ins, bloques grises). page.tsx: query expandida para checkInData (energyLevel, sleepHours, stressLevel, motivationLevel), bodyMeasures (waistCm, hipsCm, armsCm, thighsCm) y hrZones (Karvonen). Verificado visualmente en browser.',
          },
          {
            title: 'UX-PLAN-06 — Alinear componentes de /plan con Figma: NutriciónCard, PhaseBar, layout EstadoSemana+ZonasFC',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-09-02). (1) NutritionCard: donut+rings → layout Figma con "NUTRICIÓN HOY" + kcal grande + label intensidad + 4 columnas con barras de color (Proteína azul, Carbos verde, Grasas naranja, Agua celeste). (2) PhaseBar: ahora muestra siempre las 4 fases (BASE/DESARRO/ESPECIF/AFIN), activa en color, futuras con borde gris. (3) EstadoSemana + ZonasFC: layout side-by-side en grid-cols-2 (antes apilados verticalmente). Verificado en browser vs Figma 5722:31.',
          },
          {
            title: 'UX-PLAN-07 — Alinear todos los frames mobile Figma con código (web + RN): componentes faltantes en active/empty/completed',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-09-02). Comparación completa de 5 frames Figma mobile vs código. Fixes: (1) RN active: creados EstadoSemana.tsx, ZonasFC.tsx, CheckInBanner.tsx — añadidos al plan screen. (2) RN BodyComposition: ya no retorna null, muestra empty state. (3) RN completed: añadidos PhaseBar completado (4 pills all filled), NutritionCard, EstadoSemana, ZonasFC, BodyComposition, CheckInBanner. (4) Web PlanCompletedClient: añadidos PhaseBar completado, NutritionCard, EstadoSemana, ZonasFC, BodyComposition, CheckInBanner — props pasados desde page.tsx. (5) Web PlanEmptyClient: añadidos EstadoSemanaEmpty y ZonasFCEmpty. (6) page.tsx: movida computación de weightData/checkInData/bodyMeasures/hrZones fuera del if(activePlanData) + nutritionTarget REST para estados sin plan. (7) API mobile dashboard: expandido con checkInData (stressLevel, motivationLevel) y hrZones (Karvonen).',
          },
          {
            title: 'UX-PLAN-08 — Mi Plan modo tracking: PlanTrackingClient reemplaza PlanEmptyClient con datos reales del calWeek',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-09-04). Nuevo PlanTrackingClient.tsx reemplaza PlanEmptyClient (ahora huerfano). Atletas sin plan activo ven tracking real: calendario navegable por semana (weekOffset via /api/athlete/calendar), detalle de gym/freeRun/sport por dia, KPIs con sesiones y tiempo real de la semana, nutricion snapshot, composicion corporal. 4 estados de Mi Plan definidos: active (PlanClient), completed (PlanCompletedClient), tracking (PlanTrackingClient con actividad), empty (PlanTrackingClient sin actividad). Mobile + desktop responsive. CTA diferenciado B2B/B2C. Mobile TrackingMode implementado en plan.tsx con getCalendarWeek, day pills interactivos, TrackingDayCard (gym/freeRun/sport/empty).',
          },
          {
            title: 'UX-PLAN-09 — Mobile plan: integración calendario + log data en vista plan activo',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-09-04). plan.tsx (active plan state): fetch calWeek via getCalendarWeek(weekOffset) para cada semana del plan. CalendarStrip muestra gym indicators (💪) en días sin sesión planificada. Días sin sesión de plan pero con gym/freeRun/sport del calendario muestran TrackingDayCard en lugar de "Día de descanso". KPIs (completadas/volumen/adherencia) incluyen gym sessions del calendario. SessionDetailCard: nueva sección "Registro" verde con RPE, duración real, HR, distancia y notas cuando la sesión está completada.',
          },
        ],
      },

      // ── Nutrición ────────────────────────────────────────────────────────────
      {
        id: 'uix-nutricion',
        label: 'Nutrición',
        period: 'Audit 2026-07-09',
        items: [
          {
            title: 'UX-NUT-01 — Macros en 0 cuando atleta B2B tiene plan de coach pero no tiene NutritionPlan',
            done: true,
            priority: 'P0',
            note: 'DONE (2026-07-19). nutrition/page.tsx: sumTemplateDayMacros() calcula kcal/proteinG/carbsG/fatG sumando items de cada día (HARD/EASY/REST) de la plantilla del coach. syntheticNutritionPlan construye el shape NutritionPlanTargets desde esos datos. effectiveNutritionPlan = nutritionPlan ?? syntheticNutritionPlan reemplaza nutritionPlan en todos los guards (TrackingSection, WeeklyNutritionBars, NutritionContent, FoodGuide) y en nt = getDailyNutritionTarget(). targetKcalForBars usa syntheticNutritionPlan.targetKcalEasy como fallback.',
          },
          {
            title: 'UX-NUT-02 — Sin CTA al nutrition builder desde /nutrition para atletas B2C',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-21). nutrition/page.tsx: CTA "Crea tu plan de comidas → /nutrition/builder" agregado condicionalmente cuando !hasMealPlan && effectiveNutritionPlan && !assignedNutritionPlan. Card navy con descripción + botón navy. Solo visible para B2C con macros calculados pero sin plantilla de comidas ni coach activo.',
          },
          {
            title: 'UX-NUT-03 — allFoods con take:100 puede omitir alimentos de la base de datos',
            done: true,
            priority: 'P2',
            note: 'Fix 2026-07-29: LogFoodModal usa /api/nutrition/foods?q= (300ms debounce) cuando hay query activo — supera el límite take:100 de la page. FoodGuide sigue usando los alimentos pre-cargados para el browsing por categoría.',
          },
          {
            title: 'UX-NUT-04 — Adherencia semanal no calcula para atletas B2B (sin NutritionPlan base)',
            done: false,
            priority: 'P2',
            note: 'nutrition/page.tsx: weeklyAdherence solo se calcula si nutritionPlanRaw existe con targetKcalEasy o targetKcalHard. Para atletas B2B cuyo plan nutricional viene de AssignedNutritionPlan (que no tiene estos campos), la adherencia siempre muestra null. Fix: si assignedNutritionPlan existe, calcular el target calórico sumando los kcal de los items del día correspondiente de la plantilla del coach.',
          },
        ],
      },

      // ── Gym ──────────────────────────────────────────────────────────────────
      {
        id: 'uix-gym',
        label: 'Gym',
        period: 'Audit 2026-07-09',
        items: [
          {
            title: 'UX-GYM-01 — Nombres de ejercicios en inglés en detalle de sesión completada',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-21). /api/gym/session/today/route.ts: exercise.name → exercise.nameEs ?? exercise.name en los dos paths (AssignedWorkout y plan-based). gym/history/page.tsx: nameEs: true en el select, exName = sl.exerciseName ?? exercise.nameEs ?? exercise.name ?? "Ejercicio eliminado".',
          },
          {
            title: 'UX-GYM-02 — Verificar existencia de ruta /gym/history (dead link posible)',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-21). gym/history/page.tsx confirmado existente. Página renderiza gymSessions completadas paginadas con fecha, ejercicios (nameEs ?? name), volumen total y RPE. nameEs añadido al select de exercise en la query.',
          },
          {
            title: 'UX-GYM-03 — bg-brand-hero clase CSS: verificar que está definida en Tailwind config',
            done: true,
            priority: 'P2',
            note: 'Verificado 2026-07-29: .bg-brand-hero está definida en globals.css línea 165 como linear-gradient(135deg, #1e3a5f, #2d5a8e). No requiere cambio en tailwind.config.ts.',
          },
          {
            title: 'UX-GYM-04 — Banner post-sesión solo visible via ?completed=1 en URL',
            done: false,
            priority: 'P3',
            note: 'gym/page.tsx: justCompleted = completedParam === "1". Si el atleta navega a /gym directamente después de completar una sesión sin ese query param (ej: recarga, bookmark), no ve el banner de resumen. Considerar persistir el estado del banner en sessionStorage por 30 minutos como alternativa más resiliente al param de URL.',
          },
          {
            title: 'UX-GYM-05 — Estado vacío cuando sesión completada sin sets registrados',
            done: false,
            priority: 'P2',
            note: 'gym/page.tsx: el panel de detalle del día muestra sesión completada solo si selectedExerciseDetail.length > 0. Si el atleta completó la sesión sin registrar sets (edge case: completó directo sin logear), cae al bloque "Planificado" confundiendo completado con pendiente. Fix: verificar selectedSession?.completed independientemente de selectedExerciseDetail y mostrar "Sesión completada sin sets registrados" en ese caso.',
          },
        ],
      },

      // ── Progreso ─────────────────────────────────────────────────────────────
      {
        id: 'uix-progreso',
        label: 'Progreso',
        period: 'Audit 2026-07-09',
        items: [
          {
            title: 'UX-PROG-01 — Verificar existencia de ruta /upgrade (dead link posible)',
            done: true,
            priority: 'P1',
            note: 'DONE (verificado 2026-07-29). src/app/upgrade/page.tsx existe con _components/DowngradeButton. CTA de progress apunta correctamente.',
          },
          {
            title: 'UX-PROG-02 — gymAdherenceByWeek usa daysPerWeek de la rutina más reciente para todas las semanas',
            done: true,
            priority: 'P2',
            note: 'Fix 2026-07-29: cálculo per-semana con moda global como fallback. Sesiones libres (sin assignedWorkout) muestran "X ses." sin %. ProgressClient actualizado para manejar total=0.',
          },
          {
            title: 'UX-PROG-03 — Empty state muestra gymSessionsCount pero sigue ocultando ProgressClient',
            done: true,
            priority: 'P2',
            note: 'Fix 2026-07-29: condición empty state ahora incluye && gymSessionsCount === 0. Atletas con solo gym sessions ven ProgressClient con sus gráficas de PRs, adherencia y actividad mensual.',
          },
        ],
      },

      // ── Coach ────────────────────────────────────────────────────────────────
      {
        id: 'uix-coach',
        label: 'Coach',
        period: 'Audit 2026-07-09',
        items: [
          {
            title: 'UX-COACH-01 — coachRelations carga todos los atletas sin límite (performance)',
            done: true,
            priority: 'P2',
            note: 'Fix 2026-07-29: take: 25 + orderBy createdAt desc. Dashboard muestra alertas y adherencia de los 25 atletas más recientes. Totales y conteos usan queries count() separadas.',
          },
          {
            title: 'UX-COACH-02 — athletesWithAlerts.slice(0, 5) sin link "Ver todos" suficientemente visible',
            done: false,
            priority: 'P3',
            note: 'coach/dashboard/page.tsx: si hay más de 5 atletas con alertas, el coach ve solo 5. El link "Ver todos →" está en el header de la sección pero es pequeño (text-xs text-blue-600). Fix: agregar al final de la lista un botón "Ver {totalAlerts - 5} alertas más →" solo cuando hay más de 5, con mismo estilo que los CTA primarios.',
          },
          {
            title: 'UX-COACH-03 — Feed de actividad reciente: solo muestra check-ins, no sesiones completadas',
            done: false,
            priority: 'P2',
            note: 'coach/dashboard/page.tsx: recentActivity solo contiene weeklyCheckIn. El coach no ve "Ana completó sesión de gym hoy" ni "Carlos registró 14km de rodaje". Para tracking en tiempo real, incluir gymSession y sessionLog recientes en el feed. Fix: query paralela de las últimas 4 sesiones de los atletas del coach (sessionLog + gymSession), mezclarlos con check-ins y ordenar por fecha.',
          },
          {
            title: 'UX-COACH-04 — Atleta B2B sin rutina asignada: empty state sin biblioteca de ejercicios ni plantillas',
            done: false,
            priority: 'P2',
            note: 'gym/page.tsx: cuando coachRelation existe pero el atleta no tiene assigned workout, muestra solo "Tu coach aún no te asignó una rutina" con CTA "Registrar sesión libre →". El B2C sin coach en cambio ve plantillas públicas y biblioteca WorkoutX. El atleta B2B debería tener acceso a la misma exploración mientras espera la rutina del coach.',
          },
          {
            title: 'UX-COACH-05 — Consolidar 9 tabs a 5 en /coach/athletes/[id]: Resumen · Plan · Progreso · Nutrición · Mensajes',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-08-25). Tabs reducidos de 9 a 5. Eliminados: Ejercicios (redundante con Plan Builder), Sesiones (logs movidos a Progreso futuro), Adherencia (fusionada en Progreso), Benchmarks (fusionada en Progreso), Gym (redundante con Plan Builder). Código: TABS const actualizada, imports/types/state/useEffects/handlers/renders eliminados de AthleteDetailClient.tsx. NutricionTab simplificado: eliminadas secciones redundantes con Builder (template activo, targets, macros), conserva solo monitoreo (KPIs, chart kcal 7d, donut macros, food profile, adherencia, food logs). Figma: TabNav actualizado en 17 frames de atleta. Archivos tab obsoletos conservados en disco (no importados).',
          },
        ],
      },

      // ── Transversal ──────────────────────────────────────────────────────────
      {
        id: 'uix-transversal',
        label: 'Transversal',
        period: 'Audit 2026-07-09',
        items: [
          {
            title: 'UX-NAV-01 — Sin nav bar inferior persistente en mobile web (atleta)',
            done: false,
            priority: 'P2',
            note: 'Las páginas del atleta tienen links "← Volver al inicio" individuales pero no hay nav bar inferior fijo en el layout web para mobile. El atleta navega entre módulos usando la URL directamente o el botón back del browser. Fix: agregar BottomNavBar fijo en src/app/(athlete)/layout.tsx con 5 items: Dashboard, Plan, Gym, Nutrición, Progreso. Solo visible en viewport < md.',
          },
          {
            title: 'UX-COPY-01 — Voseo argentino en múltiples páginas: auditar y reemplazar',
            done: false,
            priority: 'P1',
            note: 'Confirmado "no tenés" en plan/page.tsx:50. Grep global por "tenés|hacés|podés|querés|sabés|venís" puede revelar más ocurrencias. El producto usa español colombiano — reemplazar todas las ocurrencias con tuteo. Comando: grep -r "tenés\\|hacés\\|podés\\|querés" src/ --include="*.tsx" --include="*.ts".',
          },
          {
            title: 'UX-COPY-02 — Nombre del módulo Gym inconsistente: "Tu gym" / "Rutina gym" / "Gym"',
            done: false,
            priority: 'P3',
            note: 'gym/page.tsx: sin rutina asignada → h1 "Tu gym". Con rutina asignada → h1 "Rutina gym". El nombre del módulo en nav y breadcrumbs puede variar. Definir nombre canónico: "Gym" (corto, consistente) y usarlo en todos los h1, titles, breadcrumbs y nav items.',
          },
          {
            title: 'UX-EMPTY-01 — Auditar consistencia visual de todos los empty states del producto',
            done: false,
            priority: 'P3',
            note: 'Cada módulo tiene su propio empty state con estructura diferente. /progress: emoji grande + h2 + p + 2 CTAs (bien). /plan: card con 3 beneficios + 1-2 CTAs (bien). /gym sin rutina B2B: banner azul + 1 CTA (pobre). /checkin early: contenido variable. Establecer template canónico de empty state: emoji (texto, no imagen) + título + subtítulo max 2 líneas + máximo 2 CTAs. Auditar y normalizar.',
          },
        ],
      },

    ],
  },

  // ─── DEUDA TÉCNICA ────────────────────────────────────────────────────────────

  {
    id: 'tech-debt',
    label: 'Deuda Técnica',
    color: '#9333ea',
    bgColor: '#faf5ff',
    borderColor: '#c084fc',
    liveList: true,
    phases: [
      {
        id: 'debt-architecture',
        label: 'Arquitectura',
        period: 'Backlog',
        items: [
          {
            title: 'DEBT-01 — completeOnboardingUseCase importa infrastructure directamente (viola hexagonal)',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-22). Eliminados imports de PrismaHealthProfileRepository/UserRepository/PlanRepository del use case. Añadido txRepoFactory: (tx) => { healthProfileRepo, userRepo, planRepo } a deps. Ambos callers (web + mobile onboarding/generate/route.ts) pasan la factory. El dominio ya no depende de infra.',
          },
          {
            title: 'DEBT-02 — WeeklyRoutine upsert fuera del $transaction en onboarding use case',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-22). weeklyRoutine.upsert movido DENTRO del $transaction (usando tx.weeklyRoutine directamente). El bloque "else !isB2B" ahora garantiza atomicidad: si el upsert de WeeklyRoutine falla, el transaction completo hace rollback y el atleta no queda con onboardingCompleted=true sin rutina.',
          },
          {
            title: 'DEBT-03 — Onboarding prefilled .catch(() => {}) silencia errores de prefill B2B',
            done: true,
            priority: 'P3',
            note: 'DONE (2026-07-22). onboarding/page.tsx: .catch(() => {}) → .catch((err) => console.error("[onboarding] prefill fetch failed:", err)). El error es ahora observable en Vercel logs. Defensivo: .then(({ prefilled } = {}) => ...) maneja gracefully el caso donde catch retorna undefined.',
          },
          {
            title: 'DEBT-ARCH-04 — Dashboard queries duplicadas entre web y mobile (13 queries paralelas × 2)',
            done: true,
            priority: 'P1',
            note: 'DONE: Extraído fetchCoreDashboardData() + buildDashboardSummaryInput() + computeFoodTotals/computeMealSlotLogs/buildWaterData a infrastructure/db/dashboard_queries.ts. 11 queries compartidas en un solo lugar. Web (get-dashboard-data.ts) y mobile (api/mobile/dashboard/route.ts) llaman la función compartida + agregan queries platform-specific (web: TrainingPlan all-weeks + calendar; mobile: PERF-01 two-phase plan). Eliminada duplicación de mapping a DashboardInput.',
          },
        ],
      },
      {
        id: 'debt-auth',
        label: 'Auth & Seguridad',
        period: 'Backlog',
        items: [
          {
            title: 'DEBT-04 — Botón "Continuar con Google" en register mobile es no-op (sin onPress)',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-22). register.tsx: botón Google con disabled=true + opacity 0.45 + label "(próximamente)". Ya no es interactivo — el usuario ve que no está disponible en lugar de un botón sin respuesta.',
          },
          {
            title: 'DEBT-05 — Tests faltantes: set-role endpoint sin unit tests',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-22). route.test.ts creado con 5 tests: 401 sin sesión, 400 rol inválido, 400 campo faltante, 200 ATHLETE (verifica needsRoleSelection=false), 200 COACH (verifica featureCoach=true + featurePlan=false + onboardingCompleted=true). 5/5 pasan.',
          },
          {
            title: 'DEBT-06 — Mobile JWT auth: sin tests unitarios para login/refresh/logout',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-22). login/route.test.ts creado con 7 tests: 429 rate limit, 401 email no existe, 401 password incorrecta, 403 usuario bloqueado, 400 email inválido, 200 login exitoso (token + features), signMobileToken llamado con datos correctos. refresh/route.test.ts ya existía (5 tests). 12/12 pasan.',
          },
          {
            title: 'DEBT-07 — B2B post-onboarding mobile redirige a /login en vez de /pending',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-22). onboarding.tsx: router.replace("/(auth)/login") → router.replace("/(app)/pending"). El atleta B2B autenticado ya no es enviado a login tras completar su perfil — va directamente a la pantalla de espera.',
          },
        ],
      },
      {
        id: 'debt-clean-code',
        label: 'Clean Code & i18n Groundwork',
        period: 'Backlog',
        items: [
          {
            title: 'DEBT-08 — SESSION_ICONS/DAY_LABELS duplicados en 4+ pantallas mobile',
            done: true,
            priority: 'P3',
            note: 'DONE (2026-07-29). Creados src/constants/sessions.ts (SESSION_ICONS, SESSION_LABELS) y src/constants/calendar.ts (DAY_LETTERS, DAY_SHORT, DAY_FULL, MONTHS). Constantes centralizadas con TODO(i18n) para futura localización es/en/pt. Eliminadas copias locales en plan.tsx, dashboard.tsx, log.tsx, edit-session.tsx, routine-edit.tsx, nutrition-apply-template.tsx.',
          },
          {
            title: 'DEBT-09 — WizardData definido en app/ layer, importado por domain use case (viola hexagonal)',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-29). Creado src/domain/onboarding/onboarding.types.ts con ActivityType, GymGoal, RunningGoal, ExperienceLevel, WizardData. app/onboarding/_types.ts re-exporta desde dominio — cero breaking changes para capa de presentación. complete-onboarding.use-case.ts ahora importa solo desde su propia capa de dominio.',
          },
          {
            title: 'DEBT-10 — approve route PATCH+POST con 25 líneas de lógica duplicada',
            done: true,
            priority: 'P3',
            note: 'DONE (2026-07-29). src/app/api/coach/plan/[planId]/approve/route.ts: extraída función helper approvePlan(planId, coachId). Eliminado branch muerto "request_adjustment" sin respaldo en DB. Ambos handlers (PATCH + POST) reducidos a ~5 líneas cada uno.',
          },
          {
            title: 'DEBT-11 — getExerciseAlternatives usando raw fetch() en lugar de apiFetch()',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-29). gym-session.tsx usaba raw fetch() con token manual para obtener alternativas. Extraída función getExerciseAlternatives(exerciseId) en src/api/gym.ts usando apiFetch<ExerciseSearchResult[]>. Consistente con el resto del cliente mobile.',
          },
          {
            title: 'DEBT-12 — Múltiples .catch(() => {}) silenciando errores en producción',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-29). Reemplazados en: _layout.tsx (push token + healthkit sync), gym-session.tsx (offline sync crítico), api/coach/clients/create/route.ts (email de bienvenida), src/lib/mobile_auth.ts (token verification). Todos loguean con contexto para Vercel/Expo logs.',
          },
        ],
      },
    ],
  },
  // ─── INTEGRACIONES — Wearables & Plataformas ─────────────────────────────
  {
    id: 'integraciones',
    label: 'Integraciones — Wearables & Plataformas',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    phases: [
      {
        id: 'intg-infra',
        label: 'Infraestructura compartida',
        period: 'P1 — Prerequisito',
        items: [
          {
            title: 'INTG-INFRA-01 — IWearableRepository + PrismaWearableRepository',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). src/domain/ports/wearable.repository.ts + src/infrastructure/db/wearable.repository.ts. Métodos: findByUserAndProvider, findByProviderAccountId, findAllByUser, upsert, updateTokens, delete. providerAccountId agregado al schema y migración 20260729000001.',
          },
          {
            title: 'INTG-INFRA-02 — Deduplicación SessionLog: @@unique parcial por externalId',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). Migración 20260729000001_session_log_external_id_unique: índice único parcial WHERE externalId IS NOT NULL. En DB PostgreSQL NULL != NULL, no colisionan filas sin externalId.',
          },
          {
            title: 'INTG-INFRA-03 — createWearableSession() use case compartido (idempotente)',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). src/domain/wearables/create_wearable_session.use_case.ts. Upsert idempotente por (userId, externalId). Retorna { id, created } — reutilizado por Strava y HealthKit.',
          },
        ],
      },
      {
        id: 'intg-strava',
        label: 'Strava OAuth + Webhook',
        period: 'P1 — Web + Mobile',
        items: [
          {
            title: 'STRA-ENV — Configurar STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN',
            done: false,
            priority: 'P1',
            note: 'Acción manual de Miguel: 1) Crear app en strava.com/settings/api. 2) Agregar STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN (openssl rand -hex 16) a .env.local y Vercel env. Sin esto el OAuth flow no funciona.',
          },
          {
            title: 'STRA-01/02 — OAuth redirect + callback: GET /api/integrations/strava/connect y /callback',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). connect: redirige a strava.com/oauth/authorize con state=userId. callback: intercambia code por tokens, guarda WearableConnection con providerAccountId=athlete.id, redirect a /settings/integrations.',
          },
          {
            title: 'STRA-03 — Token refresh: refreshStravaTokenIfNeeded(userId)',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). src/infrastructure/wearable/strava.service.ts. Renueva si expiresAt < now + 10min. Actualiza WearableConnection con nuevo accessToken + expiresAt. Tokens Strava expiran cada 6h.',
          },
          {
            title: 'STRA-04/05 — Webhook: GET challenge + POST handler en /api/webhooks/strava',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). GET verifica hub.verify_token y responde hub.challenge. POST responde 200 inmediatamente y procesa en background. Mapea owner_id → userId via providerAccountId. Llama fetchStravaActivity → stravaActivityToSessionLog → createWearableSession.',
          },
          {
            title: 'STRA-06/07 — Activity fetcher + mapper: fetchStravaActivity + stravaActivityToSessionLog',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). strava.service.ts: GET /api/v3/activities/{id}. strava.mapper.ts: sport_type→discipline, distance/1000→distanceKm, moving_time/60→durationMin, 1000/average_speed→avgPaceSecPerKm.',
          },
          {
            title: 'STRA-08 — Admin: POST /api/admin/integrations/strava/subscribe (one-time)',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). Solo ADMIN. POST a strava.com/api/v3/push_subscriptions con callback_url y verify_token. Ejecutar UNA vez al deploy en producción. GET lista suscripciones activas.',
          },
          {
            title: 'STRA-09/10 — UI settings web: /settings/integrations + DELETE /api/integrations/strava',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-29). Server component con wearableRepository.findAllByUser. IntegrationsClient muestra estado conectado/no conectado. Botón Conectar → /api/integrations/strava/connect. Botón Desconectar → DELETE + deauthorize best-effort.',
          },
          {
            title: 'STRA-MOB — Strava connect desde mobile via deep link (expo-web-browser)',
            done: false,
            priority: 'P2',
            note: 'Pending. Usar expo-web-browser openAuthSessionAsync() → callback capturado via deep link medaliq://integrations/strava/callback → POST /api/mobile/integrations/strava/callback. Requiere configurar scheme en app.json de Expo. Alternativa MVP: indicar al usuario que conecte desde web.',
          },
        ],
      },
      {
        id: 'intg-hk',
        label: 'Apple HealthKit',
        period: 'P1 — Solo iOS',
        items: [
          {
            title: 'HK-00 — Investigar librería: expo-health vs react-native-health',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). Decisión: react-native-health v3+ (más completa, soporta VO2max, HRV, tiene config plugin para Expo managed workflow). expo-health descartada — cobertura insuficiente de tipos de workout y sin VO2max. Instalar: npm install react-native-health.',
          },
          {
            title: 'HK-01 — Configurar NSHealthShareUsageDescription en app.json',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). app.json: NSHealthShareUsageDescription + NSHealthUpdateUsageDescription en ios.infoPlist. Entitlement com.apple.developer.healthkit: true. Plugin react-native-health añadido a plugins[]. Requiere npm install react-native-health antes de build EAS.',
          },
          {
            title: 'HK-02 — useHealthKit() hook con requestAuthorization',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). MEDALIQ-MOBILE/src/hooks/useHealthKit.ts. Permisos: Workout, HeartRate, RestingHeartRate, SleepAnalysis, VO2Max. Estado: { authorized, loading, error }. HealthKit no informa permisos denegados específicos — manejo de parcialidad.',
          },
          {
            title: 'HK-03/04 — healthkit.service.ts: sync workouts + mapper HKWorkout→SessionLog',
            done: true,
            priority: 'P1',
            note: 'DONE (2026-07-29). MEDALIQ-MOBILE/src/services/healthkit.service.ts. syncRecent(): queryWorkouts desde lastSyncAt (7 días primer sync), importWorkout() POST a /api/mobile/log/session con dataSource=HEALTHKIT + externalId para deduplicación. queryRestingHeartRate() y querySleepHours() para pre-fill check-in.',
          },
          {
            title: 'HK-05 — Pre-fill check-in desde HealthKit (FC reposo + horas sueño)',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-29). checkin.tsx: useEffect en mount → isSyncEnabled() + queryRestingHeartRate() + querySleepHours() en paralelo. Pre-fill hrResting y sleep si HealthKit los tiene. Badge "📲 Apple Health" en rojo junto al label. Campo con borde/fondo rosa mientras no se edita manualmente. Al editar, se limpia el badge.',
          },
          {
            title: 'HK-06 — VO2max sync → PATCH /api/mobile/health-profile',
            done: false,
            priority: 'P3',
            note: 'Pending. queryVO2max() → último HKQuantityTypeIdentifierVO2Max → PATCH HealthProfile.vo2maxEstimate si el valor del wearable es más reciente. Solo si la librería soporta VO2max en managed workflow.',
          },
          {
            title: 'HK-07 — Trigger sync automático al abrir la app',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-29). app/(app)/_layout.tsx: useEffect en user?.id → syncRecent() fire-and-forget con .catch(() => {}). No bloquea UI. syncRecent() ya verifica isSyncEnabled() internamente antes de llamar HealthKit.',
          },
          {
            title: 'HK-08 — UI settings mobile: pantalla /integrations',
            done: true,
            priority: 'P2',
            note: 'DONE (2026-07-29). MEDALIQ-MOBILE/app/(app)/integrations.tsx. Toggle Apple Health con AsyncStorage (hk_sync_enabled). Solicita permisos al activar por primera vez. Card Strava indica conectar desde web. Card Garmin marcada como próximamente.',
          },
        ],
      },
      {
        id: 'intg-pendiente',
        label: 'Pendiente de instalación + migración',
        period: 'Prerequisito de deploy',
        items: [
          {
            title: 'MIGUEL — Crear app en strava.com/settings/api y agregar env vars a Vercel',
            done: false,
            priority: 'P1',
            note: 'Acción de Miguel (no código): 1) Crear app en strava.com/settings/api (requiere suscripción activa de Strava). 2) Copiar Client ID y Client Secret. 3) Generar verify token: openssl rand -hex 16. 4) Agregar STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN a .env.local y a Vercel Settings → Environment Variables. Sin esto el OAuth y el webhook no funcionan.',
          },
          {
            title: 'MIGUEL — pnpm prisma migrate deploy en producción (migración 20260729000001)',
            done: false,
            priority: 'P1',
            note: 'Acción de Miguel: correr pnpm prisma migrate deploy desde MEDALIQ-PROJECT en producción (o via Vercel build command). Aplica migración 20260729000001_session_log_external_id_unique: índice único parcial en SessionLog + columna providerAccountId en WearableConnection.',
          },
          {
            title: 'MIGUEL — POST /api/admin/integrations/strava/subscribe tras deploy (one-time)',
            done: false,
            priority: 'P1',
            note: 'Acción de Miguel: una sola vez tras deploy en producción, hacer POST a https://medaliq.com/api/admin/integrations/strava/subscribe desde sesión con rol ADMIN. Strava verifica el endpoint /api/webhooks/strava y crea la suscripción. Verificar después con GET al mismo endpoint que devuelva subscriptionId.',
          },
          {
            title: 'MIGUEL — npm install react-native-health en MEDALIQ-MOBILE y rebuild EAS',
            done: false,
            priority: 'P1',
            note: 'Acción de Miguel: cd MEDALIQ-MOBILE && npm install react-native-health. Luego rebuild con EAS (eas build --platform ios). El plugin ya está configurado en app.json. Sin instalar la librería el código de HealthKit no compila. HK-00 ya decidió que es react-native-health.',
          },
        ],
      },
      {
        id: 'intg-futura',
        label: 'Integraciones futuras (Garmin, TrainingPeaks)',
        period: 'P2-P3',
        items: [
          {
            title: 'GARMIN-01 — Aplicar a Garmin Health API waitlist',
            done: false,
            priority: 'P3',
            note: 'Acción manual de Miguel: developer.garmin.com → aplicar a Health API. API suspendida para nuevas cuentas — requiere partnership formal. Sin código hasta aprobación. Tiempo estimado: semanas a meses.',
          },
          {
            title: 'TP-01 — Aplicar a TrainingPeaks developer access',
            done: false,
            priority: 'P3',
            note: 'Acción manual de Miguel: api.trainingpeaks.com/request-access. Implementar solo cuando aprueben. Prioridad baja — la mayoría de coaches migrarán desde TP pero no necesitan la integración post-migración.',
          },
        ],
      },
    ],
  },

  // ─── SECURITY & PERFORMANCE — HARDENING ──────────────────────────────────────
  // Auditoría interna agosto 2026. Items SEC-* y PERF-* son correcciones de código
  // (ya aplicadas). Items INFRA-* requieren decisiones de infraestructura/presupuesto.

  {
    id: 'hardening',
    label: 'Security & Performance — Hardening',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    period: 'Agosto 2026',
    phases: [
      {
        id: 'security',
        period: 'Agosto 2026',
        label: 'Security',
        items: [
          { title: 'SEC-01 — Feature gates en checkin + sessions endpoints', done: true, priority: 'P0', note: 'requireFeature(mobile.features, "checkin") en POST /api/mobile/checkin. requireFeature(mobile.features, "plan") en GET/PATCH /api/mobile/sessions/[sessionId]. Usuarios Free bloqueados correctamente.' },
          { title: 'SEC-02 — CoachAthlete status:ACTIVE en 12 rutas coach', done: true, priority: 'P0', note: 'Las rutas nutrition/meals, running-adherence, nutrition/plan/[mealId], nutrition/adherence, nutrition, running-logs, plan, plan/copy-from, invite-link, plan/custom, plan/from-template no verificaban status:ACTIVE. Coach con relación INACTIVE podía seguir accediendo a datos del atleta. Todas corregidas.' },
          { title: 'SEC-03 — Rate limit 200 en lugar de 429 en meal-templates', done: true, priority: 'P1', note: 'api/mobile/nutrition/meal-templates/route.ts y [id]/route.ts retornaban status 200 en lugar de 429 al superar el límite. NextResponse import faltaba. Corregido.' },
          { title: 'SEC-04 — URL incorrecta /api/gym/assign en mobile (→ /api/mobile/gym/assign)', done: true, priority: 'P1', note: 'src/api/gym.ts:assignTemplate llamaba /api/gym/assign (ruta web, requiere Auth.js session). Mobile usa JWT jose → siempre 401 en producción. Corregido a /api/mobile/gym/assign.' },
          { title: 'SEC-05 — PendingSync gym en AsyncStorage → expo-secure-store', done: true, priority: 'P1', note: 'src/store/gymSessionDraft.ts guardaba sesiones pendientes de sincronización en AsyncStorage (sin cifrado). Migrado a SecureStore.setItemAsync/getItemAsync/deleteItemAsync. Datos en reposo cifrados en iOS/Android.' },
          { title: 'SEC-06 — checkin-status devuelve datos sin feature gate', done: true, priority: 'P1', note: 'GET /api/mobile/checkin-status retornaba datos de check-in a usuarios Free sin gate. Ahora retorna { pending: false, locked: true } para usuarios sin featureCheckin. No expone información de estado.' },
          { title: 'SEC-07 — getTodayGymSession y completeGymSession llaman endpoints web (Auth.js) desde mobile → 401', done: true, priority: 'P0', note: 'MEDALIQ-MOBILE/src/api/gym.ts llamaba /api/athlete/gym/session/today y /complete (Auth.js). Creados /api/mobile/gym/today y /api/mobile/gym/complete con getMobileUser(), rateLimitAsync, requireFeature. Mobile client actualizado.' },
          { title: 'SEC-08 — /api/mobile/gym/assign no existe: asignar rutina desde mobile retorna 404', done: true, priority: 'P0', note: 'gym.ts:assignTemplate llamaba /api/mobile/gym/assign que no existia en backend. Creado endpoint con getMobileUser(), rateLimitAsync, $transaction para desactivar rutina anterior.' },
          { title: 'SEC-09 — gym-builder.tsx llama endpoints inexistentes/incorrectos', done: true, priority: 'P0', note: 'ExercisePicker llamaba /api/gym/exercises/search (no existe). handleSave llamaba /api/athlete/gym/routines (web auth). Fix: searchExercises() de gym.ts + /api/mobile/gym/routines (nuevo endpoint mobile).' },
          { title: 'SEC-10 — Dual auth (getMobileUser ?? auth) eliminada de 8 endpoints /api/athlete/gym/*', done: true, priority: 'P2', note: 'Endpoints web ahora usan solo auth(). Mobile tiene sus propios endpoints en /api/mobile/gym/*. Eliminado getMobileUser de: session/today, session/complete, assign, routines, routines/[id], exercises/search, exercises/[id]. Test actualizado.' },
        ],
      },
      {
        id: 'performance',
        period: 'Agosto 2026',
        label: 'Performance',
        items: [
          { title: 'PERF-01 — Limit en weeklyCheckIn query (sin cap = scan completo)', done: true, priority: 'P1', note: 'api/mobile/progress/route.ts: weeklyCheckIn.findMany sin take → scan completo para atletas con 2+ años de datos. Añadido take: 104 (2 años). gymSession.findMany acotado a últimos 365 días.' },
          { title: 'PERF-02 — N+1 en plan/copy-from (create() en loop)', done: true, priority: 'P1', note: 'src/app/api/coach/athletes/[id]/plan/copy-from/route.ts: plannedSession.create() dentro de loop por semana reemplazado por acumulación en allSessionsData[] + un solo createMany() al final. De N queries a 1.' },
          { title: 'PERF-03 — Connection pool max:10 insuficiente para serverless', done: false, priority: 'P2', note: 'DATABASE_URL con max=10. Vercel serverless puede tener 50+ instancias simultáneas → pool exhaustion bajo carga. Requiere Neon pgbouncer en modo transaction + DATABASE_URL?pgbouncer=true. Costo: $69/mes Neon Pro.' },
          { title: 'PERF-04 — Upstash Free rate limiting (10k req/day, sin persistencia entre instancias)', done: false, priority: 'P2', note: 'Plan Free de Upstash tiene límite de 10k requests/día. Bajo carga real con 200+ usuarios activos se agota en horas. Upgrade a Upstash Pro ~$25/mes o usar in-memory con aceptación de no-persistencia entre instancias.' },
          { title: 'PERF-05 — Sin caching en endpoints de alta frecuencia (dashboard, gym-today, plan)', done: false, priority: 'P2', note: 'Endpoints mobile más llamados no tienen cache. Agregar staleTime en queries y/o Redis cache en server. Redis cache (~$15/mes) puede reducir DB queries en 60-70% para /api/mobile/dashboard.' },
          { title: 'PERF-06 — progress endpoint sin paginación (gymSession scan anual)', done: false, priority: 'P2', note: 'PERF-01 puso un límite de 365 días pero gymSession.findMany sigue retornando todos los logs del año. Para usuarios con >200 sesiones/año el payload crece. Agregar paginación por cursor en siguiente iteración.' },
          { title: 'PERF-07 — Ausencia de índices en queries de alta frecuencia', done: false, priority: 'P3', note: 'SessionLog (athleteId, date), GymSession (athleteId, date), PlannedMeal (userId, date) no tienen índices compuestos. Prisma crea índices en FK pero no en combinaciones date+FK. Agregar en siguiente migración cuando el volumen lo justifique (>10k rows por tabla).' },
        ],
      },
      {
        id: 'infraestructura',
        period: 'Agosto 2026',
        label: 'Infraestructura',
        items: [
          { title: 'INFRA-01 — Neon pgbouncer (connection pooling serverless-safe)', done: false, priority: 'P2', note: 'Prerequisito: PERF-03. Cambiar DATABASE_URL a Neon Pro con pgbouncer en modo transaction. Costo: $69/mes. Activar cuando usuarios concurrentes superen 200.' },
          { title: 'INFRA-02 — Upstash Pro (rate limiting persistente multi-instancia)', done: false, priority: 'P2', note: 'Prerequisito: PERF-04. Upgrade a Upstash Pro para persistencia entre instancias Vercel y límite de 100k+ req/día. Costo: ~$25/mes.' },
          { title: 'INFRA-03 — Redis cache para endpoints de alta frecuencia', done: false, priority: 'P2', note: 'Prerequisito: PERF-05. Upstash Redis o Vercel KV para cachear respuestas de /api/mobile/dashboard, /api/mobile/gym/week, /api/mobile/plan. TTL 60-300s según endpoint. Costo: ~$15/mes.' },
          { title: 'INFRA-04 — Vercel Analytics + error monitoring (Sentry)', done: false, priority: 'P3', note: 'Sin observabilidad actual. Vercel Analytics gratuito para métricas de performance. Sentry ~$26/mes para error tracking. Activar antes de lanzamiento público.' },
          { title: 'INFRA-05 — CDN para GIFs de ejercicios (WorkoutX CDN)', done: false, priority: 'P3', note: 'GIFs de ejercicios (gifUrl de WorkoutX) se sirven desde CDN externo sin control. Evaluar mirror en Cloudflare R2 (~$0.015/GB/mes) si el CDN de WorkoutX presenta latencia en LatAm.' },
          { title: 'INFRA-06 — PostgreSQL local para desarrollo (no tocar Neon en dev)', done: false, priority: 'P1', note: 'brew install postgresql@17 + uncomment DATABASE_URL local en .env. Dev local usa PG local, Neon solo producción. Evita consumir compute hours de Neon en desarrollo.' },
        ],
      },
      {
        id: 'crons',
        period: 'Reactivar con usuarios reales',
        label: 'Cron Jobs (desactivados 2026-09-25)',
        items: [
          { title: 'CRON-01 — checkin-reminder: recordatorio check-in semanal (dom 18:00 COT)', done: false, priority: 'P1', note: 'Desactivado 2026-09-25 para ahorrar Neon compute. Schedule: "0 23 * * 0". Email + Push a atletas con plan activo sin check-in esa semana. Reactivar en vercel.json cuando haya atletas reales.' },
          { title: 'CRON-02 — session-reminder: recordatorio sesión del lunes (lun 07:00 COT)', done: false, priority: 'P1', note: 'Desactivado 2026-09-25. Schedule: "0 12 * * 1". Email + Push a atletas con sesión planificada el lunes. Reactivar con usuarios reales.' },
          { title: 'CRON-03 — pending-athlete-reminder: coach con atletas sin activar +48h', done: false, priority: 'P1', note: 'Desactivado 2026-09-25. Schedule: "0 12 * * *". Email + Push al coach. Reactivar cuando haya coaches con atletas.' },
          { title: 'CRON-04 — inactive-athlete-reminder: re-engagement atletas 3+ días sin actividad', done: false, priority: 'P1', note: 'Desactivado 2026-09-25. Schedule: "0 14 * * *". Email + Push. Reactivar con usuarios reales.' },
          { title: 'CRON-05 — streak-risk: push a atletas con racha activa que no entrenaron hoy', done: false, priority: 'P2', note: 'Desactivado 2026-09-25. Schedule: "0 20 * * *". Solo Push. Reactivar con usuarios reales.' },
          { title: 'CRON-06 — nutrition-alert: coach alerta adherencia nutricional <60%', done: false, priority: 'P2', note: 'Desactivado 2026-09-25. Schedule: "0 9 * * *". Solo Push al coach. Reactivar cuando haya coaches con atletas.' },
          { title: 'CRON-07 — expire-suggestions: expirar sugerencias de check-in no aceptadas', done: false, priority: 'P2', note: 'Desactivado 2026-09-25. Schedule: "0 3 * * *". Solo DB, sin notificaciones. Reactivar con usuarios reales.' },
          { title: 'CRON-08 — payment-overdue: coach con pagos vencidos', done: false, priority: 'P2', note: 'Desactivado 2026-09-25. Schedule: "0 14 * * *". Email al coach. Reactivar cuando billing esté live.' },
          { title: 'CRON-09 — billing-check: verificar suscripciones + aplicar downgrades', done: false, priority: 'P2', note: 'Desactivado 2026-09-25. Schedule: "0 2 * * *". Solo DB. Reactivar cuando billing esté live.' },
          { title: 'CRON-10 — billing-renewal-reminder: aviso renovación en 7 días', done: false, priority: 'P2', note: 'Desactivado 2026-09-25. Schedule: "0 13 * * *". Email. Reactivar cuando billing esté live.' },
        ],
      },
    ],
  },

  // ─── SOCIAL SHARING — VIRAL LOOP ────────────────────────────────────────────
  // Análisis competitivo agosto 2026. Inspirado en Strava, Nike Run Club, WHOOP.
  // Objetivo: cada logro compartido = impresión orgánica de MedalIQ. Sin integración
  // con APIs de Meta — share nativo del OS + Instagram Stories URL scheme.

  {
    id: 'social-sharing',
    label: 'Social Sharing — Viral Loop',
    color: '#0891b2',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
    period: 'Sprint agosto 2026',
    phases: [
      {
        id: 'share-diseno',
        period: 'Sprint agosto 2026',
        label: 'Diseño',
        items: [
          { title: 'SHARE-D01 — Share cards en Design System Figma (5 variantes)', done: true, priority: 'P1', note: 'Diseñadas en página Design System (2697:31), sección "Share Cards — Mobile · Variants" (node 5034:31). 6 cards: ① PR Fuerza (navy + trofeo + 1RM hero), ② Sesión Completada (dark navy + stats 3-col), ③ Racha Semanal (warm dark + fire + dot grid), ④ Temporada Completada (extra dark + gold + 2×2 stats), ⑤ Resumen Semanal (7-day activity grid + metric boxes), ⑥ Transparent Mode (glass overlay navy 82% sobre foto del usuario — BlurView expo-blur). Todos los valores son placeholder — el componente RN los recibe como props. Dimensiones: 390×693 en Figma → 1080×1920 en producción (scale 2.77x con ViewShot).' },
        ],
      },
      {
        id: 'share-sprint-1',
        period: 'Sprint agosto 2026',
        label: 'Sprint 1 — Tarjetas',
        items: [
          { title: 'SHARE-01 — ShareCard.tsx — componente con 6 variantes', done: true, priority: 'P1', note: 'src/components/ShareCard.tsx — 6 variantes: pr_gym · session · streak · season · weekly · transparent (glass overlay). Props tipadas en ShareCardProps. Dimensiones 360×640pt (= 1080×1920px en 3x DPI). StyleSheet nativo, fuentes Inter_*. Sub-components compartidos: TopBar, Footer, Pill, StatCell, SeasonStat, MiniStat.' },
          { title: 'SHARE-02 — Captura PNG + share sheet nativo (expo-sharing)', done: true, priority: 'P1', note: 'src/lib/share.ts — captureShareCard(ref) usa react-native-view-shot (v4.0.3) sin width/height explícito → DPI nativo del dispositivo. shareImage(uri) usa expo-sharing. Constantes CARD_W=360, CARD_H=640 exportadas. src/components/SharePreviewModal.tsx — Modal pageSheet con preview escalada (PREVIEW_SCALE = screenW-80/CARD_W), ViewShot ref, botón "Compartir" + "Cancelar". Paquetes instalados: react-native-view-shot expo-sharing expo-blur.' },
          { title: 'SHARE-03 — Instagram Stories URL scheme directo', done: false, priority: 'P2', note: 'react-native-share con Social.INSTAGRAM_STORIES. Requiere Facebook App ID registrado (Meta Developer Portal, gratis, sin review). Sin App ID → fallback a share sheet genérico. No bloqueante para V1.' },
        ],
      },
      {
        id: 'share-sprint-2',
        period: 'Sprint agosto 2026',
        label: 'Sprint 2 — Integración en flujos',
        items: [
          { title: 'SHARE-04 — Integrar en modal post-sesión gym (PR)', done: true, priority: 'P1', note: 'gym-session.tsx: PRModal recibe onShare(pr: PRResult) prop. "Compartir 📤" ahora abre SharePreviewModal con card variant=pr_gym. handleSharePR() mapea PRResult → ShareCardProps (ejercicioNombre, weightKg, estimatedOneRM desde gymPRs query, fecha de hoy). SharePreviewModal se monta sobre el PRModal — al cerrarlo vuelve al PRModal. Imports: SharePreviewModal + ShareCardProps.' },
          { title: 'SHARE-05 — Integrar en modal post-sesión running', done: true, priority: 'P1', note: 'log-run.tsx: success screen rediseñada — elimina auto-navigate, muestra stats (duración, km, RPE) + botón "Compartir corrida" (orange) + "Listo". "Compartir" abre SharePreviewModal con card variant=session, sessionType=RUNNING, durationMin/distanceKm/rpe del formulario, fecha de hoy. shareCardProps construido en handleSubmit() antes de mutate. showShareModal boolean controla visibilidad independiente del success screen.' },
          { title: 'SHARE-06 — Racha semanal — celebración en milestones 4/8/12/16 semanas', done: true, priority: 'P2', note: 'get-dashboard-summary.use-case.ts: weekStreak = semanas consecutivas con ≥1 sesión (SessionLog+GymSession). getMondayKey() normaliza fechas a lunes. DashboardSummary type + return incluyen weekStreak. src/api/dashboard.ts: DashboardData type actualizado. dashboard.tsx: useEffect detecta milestone (STREAK_MILESTONES=[4,8,12,...52]) al cargar data — compara contra AsyncStorage "medaliq:streak_milestone_seen" — muestra Modal celebración con stats días+semanas + botón "Compartir logro" (abre SharePreviewModal variant=streak) + "Cerrar". handleDismissStreak() persiste milestone en AsyncStorage. milestoneCheckedRef evita re-check en re-renders.' },
          { title: 'SHARE-07 — Temporada completada (plan finalizado)', done: true, priority: 'P2', note: 'dashboard/route.ts: cuando planIdToComplete está seteado, fetch paralelo de sessionCount, kmAgg, completedCount → justCompletedPlan ({name, totalWeeks, totalSessions, totalKm, seasonNumber}) incluido en response. dashboard.tsx: useEffect detecta justCompletedPlan, AsyncStorage "medaliq:season_completed_seen:{planName}" garantiza que el modal se muestra solo una vez por plan. Modal navy (#1a2744) con 🏆, Temporada N, stats en fila, botón "Compartir temporada" abre SharePreviewModal variant=season. src/api/dashboard.ts: type DashboardData actualizado con justCompletedPlan.' },
          { title: 'SHARE-08 — Resumen semanal shareable (Sunday card)', done: true, priority: 'P3', note: 'dashboard.tsx: isSunday computed al montar. buildWeekShareProps() construye ShareCardProps variant=weekly desde weekSessions (dayStates=0|1|2|3 según tipo e intensidad) + weekStart/weekEnd calculados desde lunes de la semana. Banner navy con accent orange aparece en ambas secciones (FREE + non-FREE) después de DotWeekStrip/WeeklyStrip, solo domingos con completedCount>0. Tap → setSundayShareProps + setShowSundayShare(true). SharePreviewModal controlado por showSundayShare.' },
        ],
      },
      {
        id: 'share-sprint-3',
        period: 'Sprint agosto 2026',
        label: 'Sprint 3 — Mecanismos de hábito social',
        items: [
          { title: 'SHARE-09 — Racha visible en dashboard (streak counter)', done: true, priority: 'P1', note: 'dashboard.tsx header: pill de racha ahora es TouchableOpacity — muestra "🔥 {streakDays}d · {weekStreak}sem racha". Al tap → abre mismo StreakMilestoneModal con SharePreviewModal. Vacío → pill gris "— sin racha aún" (no tappable). weekStreak se calcula en getDashboardSummary (semanas con ≥1 sesión).' },
          { title: 'SHARE-10 — Narrativa de Temporadas (renombrar plan → temporada en UI)', done: true, priority: 'P2', note: 'plan.tsx: 3 ocurrencias de "Mi Plan" reemplazadas por "Mi Temporada" con replace_all. Solo cambio de copy en UI mobile.' },
          { title: 'SHARE-11 — Coach celebra PR del atleta (1 tap desde panel web)', done: true, priority: 'P2', note: 'src/app/api/coach/athletes/[id]/celebrate-pr/route.ts (nuevo): POST autenticado como COACH, verifica relación coachAthlete, fetch paralelo pushToken+coach name, fire-and-forget sendPushNotification "🏆 {coachName} celebró tu PR en {ejercicio}". SesionesTab.tsx: athleteId prop añadida, handleCelebratePr() llama el endpoint, botón 🏆 por PR con estados loading/celebrado/default. AthleteDetailClient.tsx: pasa athleteId={athleteId} a SesionesTab.' },
          { title: 'SHARE-12 — Perfil público del atleta con logros (opt-in)', done: false, priority: 'P3', note: 'El atleta puede activar un perfil público en medaliq.com/athlete/[slug] que muestra sus temporadas completadas + PRs actuales. El coach puede compartirlo como referencia a nuevos prospectos. Opt-in estricto.' },
        ],
      },
    ],
  },

  // ─── FEATURES DESEADAS — INSPIRACIÓN DE MERCADO ──────────────────────────────
  // No priorizado. Scope futuro identificado tras análisis competitivo (Ladder, 2026-08).
  // NO implementar sin decisión explícita de Miguel.

  {
    id: 'desired',
    label: 'Features Deseadas — Inspiración de Mercado',
    period: 'No priorizado',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#c4b5fd',
    items: [
      {
        title: 'DESIRED-01 — Audio coaching en sesión de gym (cues in-ear con expo-av)',
        done: false,
        priority: 'P3',
        note: 'Inspirado en Ladder: cues de voz guían al atleta ("Descansa 60s", "Empuja") sin mirar la pantalla. Implementación: expo-av + Text-to-Speech nativo o clips de audio del coach. Requiere diseñar la lógica de timing: cuándo disparar el cue según el estado de la sesión (inicio set, fin set, descanso). El coach podría grabar sus propios clips. No implementar sin definir si el audio es generado (TTS) o grabado por el coach.',
      },
      {
        title: 'DESIRED-02 — Identidad de marca del coach en marketplace (/p/[slug])',
        done: false,
        priority: 'P3',
        note: 'Inspirado en Ladder: el coach no solo tiene bio y especialidad — tiene metodología propia, filosofía de entrenamiento, tipo ideal de atleta, resultados típicos ("atletas que completan maratón en 6 meses"). Campos adicionales en CoachProfile: methodology (texto libre), athleteIdealProfile, typicalResults, coachingStyle (ONLINE/PRESENCIAL/HIBRIDO). Diferencia a coaches reales de los genéricos. Requiere rediseño del perfil /p/[slug] y del formulario /coach/profile.',
      },
      {
        title: 'DESIRED-03 — Free trial 7 días sin tarjeta al activar billing B2C',
        done: false,
        priority: 'P3',
        note: 'Inspirado en Ladder: reducir fricción de conversión — el atleta B2C prueba Pro 7 días sin ingresar tarjeta. Al día 7 se solicita pago o revierte a Free. Requiere: columna trialEndsAt en UserSubscription, lógica de gracia en getUserPlan(), UI de cuenta regresiva del trial, email al día 5 ("te quedan 2 días"). No implementar hasta que billing B2C esté activo (Wompi conectado).',
      },
      {
        title: 'DESIRED-04 — Video form feedback: coach revisa clips de levantamientos del atleta',
        done: false,
        priority: 'P3',
        note: 'Inspirado en Ladder: el atleta sube un clip corto de su técnica (sentadilla, peso muerto) y el coach lo comenta. Requiere: almacenamiento de video (Cloudflare R2 o S3), endpoint de upload, visor de video en el panel del coach con campo de nota/feedback, notificación al atleta. Alta complejidad técnica (storage, transcoding, tamaño de archivos). Solo viable con infraestructura de media dedicada. Evaluar primero si hay demanda real antes de construir.',
      },
      {
        title: 'DESIRED-05 — Grupos de accountability entre atletas del mismo coach',
        done: false,
        priority: 'P3',
        note: 'Inspirado en Ladder: los atletas de un mismo coach pueden verse entre sí (adherencia, rachas, PRs) — presión social positiva. El coach crea grupos (ej. "Grupo Maratón Nov"). Los atletas optan por ser visibles en el grupo. Feed de actividad: "Ana completó su sesión", "Carlos batió su PR de sentadilla". Requiere: modelo AthleteCohort, privacidad granular, feed de actividad. Alta complejidad social. Evaluar PMF antes de construir — feature de comunidad, no de coaching.',
      },
      {
        title: 'REFACTOR-08 — Centralizar multiplicadores de periodización nutricional + eliminar hardcoded data en mobile',
        done: true,
        priority: 'P1',
        note: 'DONE (2026-09-14). (1) Creado domain/nutrition/nutrition_constants.ts con LOW_KCAL_MULTIPLIER=0.88, LOW_CARBS_MULTIPLIER=0.75, REST_CARBS_MULTIPLIER=0.7. (2) Refactorizados 4 archivos de dominio: daily_target.ts, calculate_food_log.ts, calculate_nutrition_adjustment.ts, generate_meal_plan.ts — todos importan de nutrition_constants.ts. (3) API /api/mobile/nutrition/today ahora envía dayTargets {hard,easy,rest} precalculados. (4) Mobile: 3 pantallas (nutrition-constructor, nutrition-day-builder, nutrition-week-planner) ya no recalculan con multiplicadores locales — consumen dayTargets del API. Fallbacks cambiados de ?? 2850/165/340/75 a ?? 0 (sin plan = sin targets). 66 tests pass.',
      },
      {
        title: 'NUT-KCAL-01 — Estrategia calórica configurable (kcalAdjustment) para coach y atleta Pro',
        done: true,
        priority: 'P1',
        note: 'DONE (2026-09-14). Reemplaza hasWeightGoal boolean por kcalAdjustment Int (-750 a +500). Schema: NutritionPlan.kcalAdjustment @default(0). Domain: calculateMacros acepta number|boolean (backward compat). APIs: PATCH /api/coach/athletes/[id]/nutrition/targets y PATCH /api/athlete/nutrition/targets soportan kcalAdjustment — recalculan todos los macros desde perfil. Coach UI: KcalStrategySelector en NutritionTab. Atleta UI: AthleteKcalStrategy en nutrition page (solo B2C, B2B bloqueado 403). Opciones: -750/-500/-250/0/+250/+500 kcal.',
      },
      {
        title: 'NUT-FIGMA-WEB-01 — Auditoría completa Figma vs código: 8 frames web nutrición alineados',
        done: true,
        priority: 'P1',
        note: 'DONE (2026-09-14). Comparados 8 frames web Figma (4523:46/185/867/1169/1468/2061/2423/2780) contra codigo. Corregidos 15 gaps + 1 render order fix. GAP-15 Builder empty state, GAP-4 meal type scroll, GAP-7 Recientes header, GAP-8 Mis Menus, GAP-9 Crear alimento, GAP-10 food card, GAP-11 input sin slider, GAP-12 preview macros claro, GAP-13 dropdown, GAP-14 CTA contextual, GAP-5 Merienda, GAP-3 navy btn, GAP-1 MealSummaryCards. ORDER-FIX: desktop sin-plan macroCards antes de phaseBanner (Figma 4523:46). Verificado render order en 5 frames (2 desktop + 3 mobile) — todo alineado.',
      },
      {
        title: 'NUT-FIGMA-WEB-02 — Auditoría visual y consistencia entre frames Figma nutrición web',
        done: true,
        priority: 'P1',
        note: 'DONE (2026-09-17). Auditoría completa Figma↔código mobile. 43 gaps corregidos en 3 archivos. CONSTRUCTOR: (1) descripción fuera hero, (2) borderRadius:20, (24) emoji 48px, (25) quitar paddingHorizontal, (26-29) header consistencia. WEEK-PLANNER: (3-6) ProgressSeg+círculos+empty state. (16-23) nav arrows+selected orange+chevron+btn+align+modal fixes. DAY-BUILDER: (7-10) iconos+chevron+shortcut+✕. ADD-FOOD-MODAL: (11-15) emoji+handle+category+dividers+combo. DAY-BUILDER-2: (30) subtitle marginTop 2→8, (31) macro columns left-align, (32) progress bar h3→4, (33) MealList unificado en UNA card, (34) dividers food items. ADD-FOOD-MODAL-STEP1: (35) header divider, (36) close btn ✕ texto, (37) addBtn + texto, (38) section+footer dividers. ADD-FOOD-MODAL-STEP2: (39) back btn ← texto, (40) close btn ✕ texto, (41) header divider, (42) kcal row layout baseline, (43) footer divider.',
      },
      {
        title: 'NUT-FIGMA-WEB-03 — Auditoría Figma vs código: 3 frames principales web nutrición (sin-plan, con-plan, b2b)',
        done: true,
        priority: 'P1',
        note: 'DONE (2026-09-20). 33 gaps identificados, todos corregidos. MacroTargetCards: Energía→Calorías, Carbos→Carbohidratos. HydrationWidget: eliminado botón -250ml rojo, vertical layout rediseñado (Agua label, Objetivo subtitle, valor derecha, solo 3 botones add). EmptyMealPlanCard: emoji 🥗→🍽️, título con acentos. PhaseBanner: +📅 emoji. Menu links: +✏️📅 emojis. DeficitHeroCard: +border-left naranja 4px, +divider vertical entre columnas, bonus text junto a "Te faltan", +📋 en botón "Ver lo que consumí". CoachNutritionBanner: avatar→👨‍🍳 emoji, texto descriptivo actualizado, CTA "Registrar lo que comí", link "Ver mi historial de comidas →". WeeklyNutritionBars: +summary "X de 7 días en rango calórico", +empty state "Sin registros esta semana". ActivityCard: +título "Sesión de hoy", +label "DÍA DE ENTRENAMIENTO", icon 48×48, +intensidad en details. TrackingSection: +border-left naranja 3px. NutritionSummaryDonut: centro muestra % meta siempre.',
      },
      {
        title: 'UI-TYPO-01 — Estandarización tipográfica: eliminar custom font sizes prohibidos en toda la app',
        done: true,
        priority: 'P1',
        note: 'DONE (2026-09-22). Escala estándar: text-[10px] (único custom permitido), text-xs (12px), text-sm (14px), text-base (16px), text-lg (18px), text-xl (20px), text-2xl (24px), text-3xl (30px), text-4xl (36px). Migrados ~60 archivos en todas las zonas: (athlete), coach, admin, auth (login/register/forgot-password/set-password), landing, components compartidos. Tamaños prohibidos eliminados: 7/8/9/11/12/13/14/15/16/18/20/22/24/28/32px custom → Tailwind estándar. 0 archivos con tamaños prohibidos. Compilación limpia.',
      },
    ],
  },
]
