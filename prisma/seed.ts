/**
 * seed.ts — Seed unificado (prod + dev)
 *
 * Crea:
 *   1. Admin
 *   2. Coach Carlos (coach@medaliq.com) + invite code
 *   3. Coach Demo Carlos Medina (coach_demo@medaliq.com)
 *   4. Atleta Miguel (miguel@medaliq.com) — B2B de Carlos, running+gym, data completa
 *   5. Atleta Ana (ana@medaliq.com) — B2C Free sin onboarding (empty state, sin rutinas)
 *   6. Atleta Laura (pro@medaliq.com) — B2C Pro, gym-focused autónoma, data completa
 *   7. Atleta Diego (pending@medaliq.com) — B2B pendiente de activación
 *   8. Ejercicios globales
 *   9. Rutinas públicas del sistema
 *  10. Alimentos LatAm
 *  11. Template de nutrición del coach + asignación a atletas
 *
 * Idempotente — usa upsert. Safe re-run.
 * Uso: pnpm prisma db seed   (o:  tsx prisma/seed.ts)
 *
 * Credenciales:
 *   admin@medaliq.com        / admin123!
 *   coach@medaliq.com        / coach123
 *   coach_demo@medaliq.com   / Coach2026!
 *   miguel@medaliq.com       / atleta123
 *   ana@medaliq.com          / atleta123
 *   pro@medaliq.com          / atleta123
 *   pending@medaliq.com      / atleta123
 */
import 'dotenv/config'
import {
  PrismaClient, UserRole, SubscriptionTier, CoachSubscriptionTier,
  GoalType, PlanStatus, PlanSource, Phase, SessionType, SessionIntensity,
  SessionDiscipline, MealType, NutritionSource, SetLogType, NutritionDayType,
} from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(6, 0, 0, 0)
  return d
}

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function mondayOf(d: Date): Date {
  const dt = new Date(d)
  const day = dt.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setUTCDate(dt.getUTCDate() + diff)
  dt.setUTCHours(0, 0, 0, 0)
  return dt
}

async function main() {
  console.log('🌱 Seeding...')

  // ── 0. Cleanup data residual de seeds anteriores ─────────────────────────
  const seedEmails = ['miguel@medaliq.com', 'ana@medaliq.com', 'pro@medaliq.com', 'pending@medaliq.com']
  const seedUsers = await prisma.user.findMany({ where: { email: { in: seedEmails } }, select: { id: true } })
  const seedIds = seedUsers.map(u => u.id)

  if (seedIds.length > 0) {
    // Orden de borrado respeta FKs (hijos primero)
    await prisma.setLog.deleteMany({ where: { session: { athleteId: { in: seedIds } } } })
    await prisma.gymSession.deleteMany({ where: { athleteId: { in: seedIds } } })
    await prisma.assignedWorkout.deleteMany({ where: { athleteId: { in: seedIds } } })
    await prisma.foodLog.deleteMany({ where: { userId: { in: seedIds } } })
    await prisma.waterLog.deleteMany({ where: { userId: { in: seedIds } } })
    await prisma.dailyLog.deleteMany({ where: { userId: { in: seedIds } } })
    await prisma.weeklyCheckIn.deleteMany({ where: { userId: { in: seedIds } } })
    await prisma.sessionLog.deleteMany({ where: { userId: { in: seedIds } } })
    await prisma.plannedSession.deleteMany({ where: { week: { plan: { userId: { in: seedIds } } } } })
    await prisma.planWeek.deleteMany({ where: { plan: { userId: { in: seedIds } } } })
    await prisma.trainingPlan.deleteMany({ where: { userId: { in: seedIds } } })
    await prisma.assignedNutritionPlan.deleteMany({ where: { athleteId: { in: seedIds } } })
    await prisma.nutritionPlan.deleteMany({ where: { userId: { in: seedIds } } })
  }

  // ── 1. Admin ───────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@medaliq.com' },
    update: { role: UserRole.ADMIN },
    create: {
      email: 'admin@medaliq.com',
      name: 'Admin Medaliq',
      password: await bcrypt.hash('admin123!', 12),
      role: UserRole.ADMIN,
      onboardingCompleted: true,
    },
  })
  console.log('✅ Admin:         admin@medaliq.com')

  // ── 2. Coach Carlos ────────────────────────────────────────────────────────
  const coachPassword = await bcrypt.hash('coach123', 12)
  const coach1 = await prisma.user.upsert({
    where: { email: 'coach@medaliq.com' },
    update: { featureCoach: true, onboardingCompleted: true, needsRoleSelection: false },
    create: {
      email: 'coach@medaliq.com',
      name: 'Carlos Entrenador',
      password: coachPassword,
      role: UserRole.COACH,
      featureCoach: true,
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureGym: false,
      onboardingCompleted: true, needsRoleSelection: false,
    },
  })

  await prisma.userSubscription.upsert({
    where: { userId: coach1.id },
    update: {},
    create: { userId: coach1.id, tier: SubscriptionTier.PRO, coachTier: CoachSubscriptionTier.GROWTH },
  })

  await prisma.coachProfile.upsert({
    where: { coachId: coach1.id },
    update: {},
    create: {
      coachId: coach1.id,
      slug: 'carlos-entrenador',
      headline: 'Especialista en running y fuerza',
      bio: 'Entrenador certificado con 8 años de experiencia.',
      specialties: ['RUNNING', 'GYM'],
      city: 'Bogotá', country: 'CO',
      yearsExp: 8,
      certifications: ['IAAF Level 1'],
      isPublic: true,
    },
  })

  await prisma.inviteCode.upsert({
    where: { code: 'CARLOS2026' },
    update: {},
    create: {
      code: 'CARLOS2026',
      coachId: coach1.id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('✅ Coach:         coach@medaliq.com')

  // ── 3. Coach Demo ──────────────────────────────────────────────────────────
  const coachDemo = await prisma.user.upsert({
    where: { email: 'coach_demo@medaliq.com' },
    update: { featureCoach: true, onboardingCompleted: true, needsRoleSelection: false },
    create: {
      email: 'coach_demo@medaliq.com',
      name: 'Carlos Medina',
      password: await bcrypt.hash('Coach2026!', 12),
      role: UserRole.COACH,
      featureCoach: true,
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureGym: false,
      onboardingCompleted: true, needsRoleSelection: false,
    },
  })

  await prisma.userSubscription.upsert({
    where: { userId: coachDemo.id },
    update: {},
    create: { userId: coachDemo.id, tier: SubscriptionTier.PRO, coachTier: CoachSubscriptionTier.GROWTH },
  })

  await prisma.coachProfile.upsert({
    where: { coachId: coachDemo.id },
    update: {},
    create: {
      coachId: coachDemo.id,
      slug: 'carlos-medina-demo',
      headline: 'Coach demo para presentaciones',
      bio: 'Cuenta de demostración.',
      specialties: ['RUNNING', 'GYM'],
      city: 'Medellín', country: 'CO',
      yearsExp: 5,
      isPublic: true,
    },
  })

  await prisma.inviteCode.upsert({
    where: { code: 'DEMO2026' },
    update: {},
    create: {
      code: 'DEMO2026',
      coachId: coachDemo.id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('✅ Coach Demo:    coach_demo@medaliq.com')

  // ── 4. Atleta Miguel (B2B de Carlos — running + gym completo) ─────────────
  const athletePassword = await bcrypt.hash('atleta123', 12)
  const miguel = await prisma.user.upsert({
    where: { email: 'miguel@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'miguel@medaliq.com',
      name: 'Miguel',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 30, heightCm: 175, weightKg: 75, weightGoalKg: 70,
          hrResting: 55, hrMax: 185, altitudeMeters: 2600,
          gender: 'male', sport: 'RUNNING', sportGoal: 'RACE_10K', experienceLevel: 'INTERMEDIATE',
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 7, sleepScoreAvg: 78,
        },
      },
    },
  })

  await prisma.userSubscription.upsert({
    where: { userId: miguel.id },
    update: {},
    create: { userId: miguel.id, tier: SubscriptionTier.PRO },
  })

  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach1.id, athleteId: miguel.id } },
    update: {},
    create: { coachId: coach1.id, athleteId: miguel.id },
  })
  console.log('✅ Atleta:        miguel@medaliq.com (B2B running+gym → Carlos)')

  // ── 5. Atleta Ana (B2C Free sin onboarding — sin rutinas) ─────────────────
  await prisma.user.upsert({
    where: { email: 'ana@medaliq.com' },
    update: { featurePlan: false, featureCheckin: false, featureNutrition: false, featureProgress: false, featureLog: false, featureGym: false, onboardingCompleted: false },
    create: {
      email: 'ana@medaliq.com',
      name: 'Ana Runner',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureGym: false,
      onboardingCompleted: false,
      profile: {
        create: {
          age: 27, heightCm: 163, weightKg: 62, weightGoalKg: 60,
          hrResting: 52, hrMax: 192, altitudeMeters: 0,
          injuries: ['Rodilla derecha (2024)'], conditions: [], medications: [],
          sleepHoursAvg: 8, sleepScoreAvg: 85,
        },
      },
    },
  })
  console.log('✅ Atleta:        ana@medaliq.com (B2C Free — sin onboarding, sin rutinas)')

  // ── 6. Atleta Laura (B2C Pro — gym-focused autónoma, sin coach) ───────────
  const pro = await prisma.user.upsert({
    where: { email: 'pro@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'pro@medaliq.com',
      name: 'Laura Fitness',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 25, heightCm: 165, weightKg: 58, weightGoalKg: 56,
          hrResting: 50, hrMax: 195, altitudeMeters: 0,
          gender: 'female', sport: 'RUNNING', sportGoal: 'GENERAL_FITNESS', experienceLevel: 'INTERMEDIATE',
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 8, sleepScoreAvg: 82,
        },
      },
    },
  })

  await prisma.userSubscription.upsert({
    where: { userId: pro.id },
    update: {},
    create: { userId: pro.id, tier: SubscriptionTier.PRO },
  })

  // Limpiar CoachAthlete si existía de un seed anterior
  await prisma.coachAthlete.deleteMany({ where: { athleteId: pro.id } })
  console.log('✅ Atleta:        pro@medaliq.com (B2C Pro gym — autónoma, sin coach)')

  // ── 7. Atleta Pending (B2B sin activar) ───────────────────────────────────
  const pending = await prisma.user.upsert({
    where: { email: 'pending@medaliq.com' },
    update: {},
    create: {
      email: 'pending@medaliq.com',
      name: 'Diego Nuevo',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureGym: false,
      onboardingCompleted: false,
    },
  })

  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach1.id, athleteId: pending.id } },
    update: {},
    create: { coachId: coach1.id, athleteId: pending.id },
  })
  console.log('✅ Atleta:        pending@medaliq.com (B2B pendiente)')

  // ── 8. Ejercicios globales ────────────────────────────────────────────────
  await seedExercises()

  // ── 9. Rutinas públicas del sistema ───────────────────────────────────────
  await seedPublicTemplates()

  // ── 10. Alimentos LatAm ───────────────────────────────────────────────────
  await seedLatamFoods()

  // ── 11. Data histórica de atletas ─────────────────────────────────────────
  await seedMiguelData(miguel.id, coach1.id)
  await seedLauraData(pro.id)

  // ── 12. Template de nutrición del coach + asignación a Miguel ─────────────
  await seedCoachNutritionTemplate(coach1.id, miguel.id)

  console.log('\n🎉 Seed completado.')
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIGUEL — B2B running + gym, 4 semanas completadas + semana actual con futuras
// ═══════════════════════════════════════════════════════════════════════════════

async function seedMiguelData(userId: string, coachId: string) {
  // ── Nutrition Plan ─────────────────────────────────────────────────────────
  await prisma.nutritionPlan.upsert({
    where: { userId },
    update: {},
    create: {
      userId, source: NutritionSource.COACH, tdee: 2750,
      targetKcalHard: 2900, targetKcalEasy: 2500, targetKcalRest: 2200,
      proteinG: 150, carbsHardG: 350, carbsEasyG: 280, fatG: 80, waterMlTarget: 3000,
    },
  })

  // ── Training Plan (8 semanas, hoy = semana 5) ─────────────────────────────
  // planStart = lunes de hace 4 semanas
  const today = new Date()
  const thisMon = mondayOf(today)
  const planStart = new Date(thisMon)
  planStart.setUTCDate(planStart.getUTCDate() - 28) // 4 semanas atrás

  const planEnd = new Date(planStart)
  planEnd.setUTCDate(planEnd.getUTCDate() + 8 * 7 - 1) // 8 semanas totales

  const hrZones = {
    z1: { min: 104, max: 120 }, z2: { min: 120, max: 140 },
    z3: { min: 140, max: 155 }, z4: { min: 155, max: 170 },
    z5: { min: 170, max: 185 },
  }

  await prisma.trainingPlan.deleteMany({ where: { userId } })
  const plan = await prisma.trainingPlan.create({
    data: {
      id: 'seed-plan-miguel', userId,
      name: 'Plan 10K — Base a Específico',
      goalType: GoalType.RACE_10K, totalWeeks: 8,
      startDate: planStart, endDate: planEnd,
      status: PlanStatus.ACTIVE, hrZones, generatedBy: PlanSource.COACH,
    },
  })

  // Sessions blueprint (dayOfWeek 1=Mon ... 7=Sun)
  const sessions: Array<{ day: number; type: SessionType; intensity: SessionIntensity; dur: number; zone?: string; structure?: string; detail?: string }> = [
    { day: 1, type: SessionType.RODAJE_Z2,   intensity: SessionIntensity.LOW,      dur: 45, zone: 'Z2', structure: '45 min Z2 continuo', detail: 'Rodaje suave Z2' },
    { day: 2, type: SessionType.FUERZA,       intensity: SessionIntensity.MODERATE, dur: 50, structure: 'Rutina tren inferior + core', detail: 'Fuerza complementaria' },
    { day: 3, type: SessionType.FARTLEK,      intensity: SessionIntensity.MODERATE, dur: 40, zone: 'Z3-Z4', structure: '10min Z2 + 6×3min Z3-Z4 / 2min Z1 + 10min Z2', detail: 'Fartlek Z3-Z4' },
    { day: 4, type: SessionType.DESCANSO,     intensity: SessionIntensity.REST,     dur: 0, detail: 'Descanso' },
    { day: 5, type: SessionType.TEMPO,        intensity: SessionIntensity.MODERATE, dur: 50, zone: 'Z3', structure: '10min Z2 + 20min Z3 + 10min Z2', detail: 'Tempo Z3' },
    { day: 6, type: SessionType.TIRADA_LARGA, intensity: SessionIntensity.HIGH,     dur: 70, zone: 'Z2', structure: '70 min Z2 progresivo', detail: 'Tirada larga Z2' },
    { day: 7, type: SessionType.DESCANSO,     intensity: SessionIntensity.REST,     dur: 0, detail: 'Descanso' },
  ]

  const weekConfigs: Array<{ wn: number; phase: Phase; volKm: number; focus: string; recovery: boolean }> = [
    { wn: 1, phase: Phase.BASE,       volKm: 25, focus: 'Adaptación aeróbica, ritmo Z2', recovery: false },
    { wn: 2, phase: Phase.BASE,       volKm: 28, focus: 'Volumen Z2, fartlek suave', recovery: false },
    { wn: 3, phase: Phase.BASE,       volKm: 30, focus: 'Base aeróbica + tempo corto', recovery: false },
    { wn: 4, phase: Phase.DESARROLLO, volKm: 22, focus: 'Recuperación activa', recovery: true },
    { wn: 5, phase: Phase.DESARROLLO, volKm: 32, focus: 'Intervalos + tirada larga', recovery: false },
  ]

  const todayDow = today.getUTCDay() === 0 ? 7 : today.getUTCDay() // 1=Mon...7=Sun

  for (const wc of weekConfigs) {
    const weekStart = new Date(planStart)
    weekStart.setUTCDate(weekStart.getUTCDate() + (wc.wn - 1) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

    const week = await prisma.planWeek.upsert({
      where: { planId_weekNumber: { planId: plan.id, weekNumber: wc.wn } },
      update: { phase: wc.phase, volumeKm: wc.volKm, startDate: weekStart, endDate: weekEnd },
      create: {
        id: `seed-pw-miguel-w${wc.wn}`, planId: plan.id, weekNumber: wc.wn,
        phase: wc.phase, volumeKm: wc.volKm, focusDescription: wc.focus,
        isRecoveryWeek: wc.recovery, startDate: weekStart, endDate: weekEnd,
      },
    })

    for (const s of sessions) {
      const sessionDate = new Date(weekStart)
      sessionDate.setUTCDate(sessionDate.getUTCDate() + s.day - 1)

      const sId = `seed-ps-miguel-w${wc.wn}-d${s.day}`
      await prisma.plannedSession.upsert({
        where: { id: sId },
        update: {},
        create: {
          id: sId, weekId: week.id, dayOfWeek: s.day,
          type: s.type, intensity: s.intensity, durationMin: s.dur,
          zoneTarget: s.zone ?? null, structure: s.structure ?? null,
          detailText: s.detail ?? null, date: sessionDate,
        },
      })

      // Logs: semanas 1-4 completadas. Semana 5: solo sesiones PASADAS (dow < todayDow)
      const isPastWeek = wc.wn < 5
      const isPastDayThisWeek = wc.wn === 5 && s.day < todayDow
      const isTraining = s.type !== SessionType.DESCANSO

      if ((isPastWeek || isPastDayThisWeek) && isTraining) {
        await prisma.sessionLog.upsert({
          where: { plannedSessionId: sId },
          update: {},
          create: {
            userId, plannedSessionId: sId,
            completedAt: sessionDate, sessionDate: dateOnly(sessionDate),
            rpe: s.intensity === SessionIntensity.HIGH ? 8 : s.intensity === SessionIntensity.MODERATE ? 6 : 4,
            hrAvg: s.intensity === SessionIntensity.HIGH ? 162 : s.intensity === SessionIntensity.MODERATE ? 145 : 128,
            hrMax: s.intensity === SessionIntensity.HIGH ? 178 : s.intensity === SessionIntensity.MODERATE ? 160 : 142,
            distanceKm: s.type === SessionType.FUERZA ? null : +(((s.dur / 60) * 9.5).toFixed(1)),
            durationMin: s.dur + Math.floor(Math.random() * 6) - 3,
            energyState: 'NORMAL', discomfort: 'NONE',
            discipline: s.type === SessionType.FUERZA ? SessionDiscipline.STRENGTH : SessionDiscipline.RUNNING,
            dataSource: 'MANUAL',
          },
        })
      }
    }
  }

  // ── Weekly Check-ins (semanas 1-4) ────────────────────────────────────────
  for (let wn = 1; wn <= 4; wn++) {
    const recordDate = new Date(planStart)
    recordDate.setUTCDate(recordDate.getUTCDate() + wn * 7 - 1) // domingo de cada semana
    await prisma.weeklyCheckIn.upsert({
      where: { id: `seed-ci-miguel-w${wn}` },
      update: {},
      create: {
        id: `seed-ci-miguel-w${wn}`, userId, planId: plan.id, weekNumber: wn,
        recordedAt: recordDate,
        weightKg: 75 - wn * 0.3, hrResting: 55 - wn,
        sleepHours: 7 + (wn % 2 === 0 ? 0.5 : 0), sleepScore: 78 + wn,
        hardestSessionRpe: 7 + (wn % 2), dietAdherencePct: 80 + wn * 3,
        painLevel: wn === 3 ? 4 : 1, painFlag: false,
        energyLevel: 7, stressLevel: 4, motivationLevel: 8,
        nutritionAdherencePct: 75 + wn * 4, adjustmentsTriggered: [],
      },
    })
  }

  // ── Daily Logs (últimos 14 días) ──────────────────────────────────────────
  for (let d = 0; d < 30; d++) {
    const date = dateOnly(daysAgo(d))
    await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date } },
      update: {},
      create: { userId, date, weightKg: 73.8 + Math.random() * 0.8, hrResting: 52 + Math.floor(Math.random() * 4), sleepHours: 6.5 + Math.random() * 2, energyLevel: 3 + Math.floor(Math.random() * 3) },
    })
  }

  // ── Water Logs (últimos 30 días) ──────────────────────────────────────────
  for (let d = 0; d < 30; d++) {
    const date = dateOnly(daysAgo(d))
    await prisma.waterLog.upsert({
      where: { userId_date: { userId, date } },
      update: {},
      create: { userId, date, mlLogged: 2000 + Math.floor(Math.random() * 1500) },
    })
  }

  // ── Food Logs (últimos 30 días, 3 comidas/día) ───────────────────────────
  await seedFoodLogs(userId, 30)

  // ── Assigned Workout PPL + GymSessions (4 semanas de gym) ─────────────────
  const templateId = 'public-template-ppl-3x'
  const awId = 'seed-aw-miguel'
  await prisma.assignedWorkout.upsert({
    where: { id: awId },
    update: {},
    create: { id: awId, templateId, athleteId: userId, coachId, startDate: planStart, isActive: true },
  })

  // Gym sessions: martes de cada semana pasada (4 semanas) — coincide con sesión FUERZA del plan
  for (let w = 0; w < 4; w++) {
    const gymDate = new Date(planStart)
    gymDate.setUTCDate(gymDate.getUTCDate() + w * 7 + 1) // martes = día 2 = offset +1
    const gsId = `seed-gs-miguel-w${w + 1}`
    const exists = await prisma.gymSession.findFirst({ where: { id: gsId } })
    if (!exists) {
      await prisma.gymSession.create({
        data: {
          id: gsId, athleteId: userId, assignedWorkoutId: awId,
          dayOfWeek: 2, date: dateOnly(gymDate), durationMin: 55,
          rpe: 6 + (w % 2), energyState: 'NORMAL', discomfort: 'NONE', completed: true,
        },
      })
      const exercises = [
        { name: 'sentadilla frontal', weight: 75 + w * 2.5 },
        { name: 'prensa', weight: 120 + w * 5 },
        { name: 'hip thrust', weight: 70 + w * 2.5 },
      ]
      for (let ei = 0; ei < exercises.length; ei++) {
        for (let s = 1; s <= 4; s++) {
          await prisma.setLog.create({
            data: {
              sessionId: gsId, exerciseName: exercises[ei].name,
              setNumber: s, weightKg: exercises[ei].weight,
              repsCompleted: 10 - s + 1, completed: true,
              isPR: w === 3 && s === 1 && ei === 0, // PR en la última semana, primer set de sentadilla
              setLogType: SetLogType.WORK,
            },
          })
        }
      }
    }
  }

  console.log('   📊 Miguel: plan 10K sem 5/8 + 4 sem gym + nutrición + check-ins')
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAURA — B2C Pro gym-focused autónoma, 4 semanas de gym completadas
// ═══════════════════════════════════════════════════════════════════════════════

async function seedLauraData(userId: string) {
  // ── Nutrition Plan (system — sin coach) ──────────────────────────────────
  await prisma.nutritionPlan.upsert({
    where: { userId },
    update: {},
    create: {
      userId, source: NutritionSource.SYSTEM, tdee: 2100,
      targetKcalHard: 2250, targetKcalEasy: 1950, targetKcalRest: 1800,
      proteinG: 115, carbsHardG: 260, carbsEasyG: 210, fatG: 60, waterMlTarget: 2500,
    },
  })

  // ── Assigned Workout Upper/Lower + 4 semanas de GymSessions ───────────────
  const templateId = 'public-template-upper-lower-4x'
  const awId = 'seed-aw-laura'
  const startDate = daysAgo(28)
  await prisma.assignedWorkout.upsert({
    where: { id: awId },
    update: {},
    create: { id: awId, templateId, athleteId: userId, startDate, isActive: true },
  })

  // Upper/Lower 4x: Lun, Mar, Jue, Vie → dayOfWeek 1,2,4,5
  const gymDows = [1, 2, 4, 5]
  const exercisesByDay: Record<number, Array<{ name: string; weight: number }>> = {
    1: [{ name: 'press plano con barra', weight: 35 }, { name: 'remo con barra', weight: 30 }, { name: 'press arnold', weight: 10 }],
    2: [{ name: 'sentadilla frontal', weight: 45 }, { name: 'peso muerto', weight: 50 }, { name: 'hip thrust', weight: 40 }],
    4: [{ name: 'press inclinado con barra', weight: 30 }, { name: 'jalón polea alta', weight: 35 }, { name: 'flexión de codo con barra z', weight: 15 }],
    5: [{ name: 'sentadilla hack', weight: 50 }, { name: 'avanzadas (lunges)', weight: 20 }, { name: 'extensión de rodillas', weight: 30 }],
  }

  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(startDate)
    weekStart.setUTCDate(weekStart.getUTCDate() + w * 7)
    const weekMon = mondayOf(weekStart)

    for (const dow of gymDows) {
      const gymDate = new Date(weekMon)
      gymDate.setUTCDate(gymDate.getUTCDate() + dow - 1)

      // No crear sesiones futuras
      if (gymDate > new Date()) continue

      const gsId = `seed-gs-laura-w${w + 1}-d${dow}`
      const exists = await prisma.gymSession.findFirst({ where: { id: gsId } })
      if (!exists) {
        await prisma.gymSession.create({
          data: {
            id: gsId, athleteId: userId, assignedWorkoutId: awId,
            dayOfWeek: dow, date: dateOnly(gymDate), durationMin: 50 + Math.floor(Math.random() * 15),
            rpe: 5 + Math.floor(Math.random() * 3), energyState: w < 2 ? 'NORMAL' : 'ENERGIZED',
            discomfort: 'NONE', completed: true,
          },
        })
        const exercises = exercisesByDay[dow] || exercisesByDay[1]
        for (let ei = 0; ei < exercises.length; ei++) {
          for (let s = 1; s <= 3; s++) {
            await prisma.setLog.create({
              data: {
                sessionId: gsId, exerciseName: exercises[ei].name,
                setNumber: s, weightKg: exercises[ei].weight + w * 2.5,
                repsCompleted: 12 - s, completed: true,
                isPR: w === 3 && s === 1 && ei === 0,
                setLogType: SetLogType.WORK,
              },
            })
          }
        }
      }
    }
  }

  // ── Weekly Check-ins (4 semanas) ──────────────────────────────────────────
  // Partial index: (userId, weekNumber) WHERE planId IS NULL — can't upsert by id
  await prisma.weeklyCheckIn.deleteMany({ where: { userId, planId: null } })
  for (let wn = 1; wn <= 4; wn++) {
    await prisma.weeklyCheckIn.create({
      data: {
        id: `seed-ci-laura-w${wn}`, userId, planId: null, weekNumber: wn,
        recordedAt: daysAgo(28 - wn * 7 + 6),
        weightKg: 58.5 - wn * 0.15, hrResting: 50 - Math.floor(wn / 2),
        sleepHours: 7.5 + (wn % 2 === 0 ? 0.5 : 0), sleepScore: 82 + wn,
        hardestSessionRpe: 6 + (wn % 2), dietAdherencePct: 85 + wn * 2,
        painLevel: 1, painFlag: false,
        energyLevel: 8, stressLevel: 3, motivationLevel: 9,
        nutritionAdherencePct: 80 + wn * 3, adjustmentsTriggered: [],
      },
    })
  }

  // ── Daily Logs (últimos 14 días) ──────────────────────────────────────────
  for (let d = 0; d < 14; d++) {
    const date = dateOnly(daysAgo(d))
    await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date } },
      update: {},
      create: { userId, date, weightKg: 58.2 - d * 0.01 + Math.random() * 0.3, hrResting: 49 + Math.floor(Math.random() * 3), sleepHours: 7 + Math.random() * 1.5, energyLevel: 3 + Math.floor(Math.random() * 3) },
    })
  }

  // ── Water Logs (últimos 7 días) ───────────────────────────────────────────
  for (let d = 0; d < 7; d++) {
    const date = dateOnly(daysAgo(d))
    await prisma.waterLog.upsert({
      where: { userId_date: { userId, date } },
      update: {},
      create: { userId, date, mlLogged: 1800 + Math.floor(Math.random() * 1200) },
    })
  }

  // ── Food Logs (últimos 5 días) ────────────────────────────────────────────
  await seedFoodLogs(userId, 5)

  console.log('   📊 Laura (B2C Pro): 4 sem gym (Upper/Lower 4x) + nutrición system + check-ins')
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUTRITION TEMPLATE del coach — asignado a Miguel y Laura
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCoachNutritionTemplate(coachId: string, miguelId: string) {
  const foods = await prisma.food.findMany({ take: 9, where: { isActive: true }, select: { id: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } })
  if (foods.length < 9) {
    console.log('   ⚠️  No hay suficientes alimentos para crear template de nutrición')
    return
  }

  // Template del coach
  const tmplId = 'seed-nt-carlos'
  const tmpl = await prisma.nutritionTemplate.upsert({
    where: { id: tmplId },
    update: {},
    create: { id: tmplId, coachId, name: 'Plan Rendimiento LatAm', description: 'Plan nutricional adaptado para atletas en entrenamiento activo.', goal: 'RENDIMIENTO' },
  })

  // 3 días: HARD, EASY, REST — 3 comidas cada uno (BREAKFAST, LUNCH, DINNER)
  const dayTypes: NutritionDayType[] = [NutritionDayType.HARD, NutritionDayType.EASY, NutritionDayType.REST]
  const mealTypes: MealType[] = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]

  for (let di = 0; di < dayTypes.length; di++) {
    const dayId = `seed-ntd-${dayTypes[di].toLowerCase()}`
    const day = await prisma.nutritionTemplateDay.upsert({
      where: { templateId_dayType: { templateId: tmpl.id, dayType: dayTypes[di] } },
      update: {},
      create: { id: dayId, templateId: tmpl.id, dayType: dayTypes[di] },
    })

    for (let mi = 0; mi < mealTypes.length; mi++) {
      const mealId = `seed-ntm-${dayTypes[di].toLowerCase()}-${mealTypes[mi].toLowerCase()}`
      const meal = await prisma.nutritionTemplateMeal.upsert({
        where: { dayId_mealType: { dayId: day.id, mealType: mealTypes[mi] } },
        update: {},
        create: { id: mealId, dayId: day.id, mealType: mealTypes[mi], order: mi },
      })

      // 1 alimento por comida (3 alimentos distintos por día = 9 total)
      const food = foods[di * 3 + mi]
      const grams = mealTypes[mi] === MealType.BREAKFAST ? 150 : 250
      const factor = grams / 100
      const itemId = `seed-ntfi-${dayTypes[di].toLowerCase()}-${mealTypes[mi].toLowerCase()}`
      const existing = await prisma.nutritionTemplateFoodItem.findFirst({ where: { id: itemId } })
      if (!existing) {
        await prisma.nutritionTemplateFoodItem.create({
          data: {
            id: itemId, mealId: meal.id, foodId: food.id, grams, order: 0,
            kcal: Math.round(food.kcalPer100g * factor),
            proteinG: Math.round(food.proteinPer100g * factor * 10) / 10,
            carbsG: Math.round(food.carbsPer100g * factor * 10) / 10,
            fatG: Math.round(food.fatPer100g * factor * 10) / 10,
          },
        })
      }
    }
  }

  // Asignar solo a Miguel (Laura es B2C Pro — sin coach)
  await prisma.assignedNutritionPlan.upsert({
    where: { athleteId: miguelId },
    update: {},
    create: { templateId: tmpl.id, athleteId: miguelId, coachId },
  })

  // Limpiar asignación de Laura si existía de seed anterior
  await prisma.assignedNutritionPlan.deleteMany({ where: { athleteId: { not: miguelId }, coachId } })

  console.log('   📊 Nutrición: template "Plan Rendimiento LatAm" asignado a Miguel')
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS COMPARTIDOS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedFoodLogs(userId: string, days: number) {
  const foods = await prisma.food.findMany({ take: 6, where: { isActive: true }, select: { id: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } })
  if (foods.length < 3) return

  const meals: MealType[] = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
  for (let d = 0; d < days; d++) {
    const date = dateOnly(daysAgo(d))
    for (let m = 0; m < meals.length; m++) {
      const food = foods[(m + d) % foods.length]
      const grams = 150 + Math.floor(Math.random() * 100)
      const factor = grams / 100
      await prisma.foodLog.upsert({
        where: { userId_foodId_date_mealType: { userId, foodId: food.id, date, mealType: meals[m] } },
        update: {},
        create: {
          userId, foodId: food.id, date, mealType: meals[m], grams,
          kcalLogged: Math.round(food.kcalPer100g * factor),
          proteinLogged: Math.round(food.proteinPer100g * factor * 10) / 10,
          carbsLogged: Math.round(food.carbsPer100g * factor * 10) / 10,
          fatLogged: Math.round(food.fatPer100g * factor * 10) / 10,
        },
      })
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJERCICIOS GLOBALES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedExercises() {
  const globalExercises = [
    { id: 'global-exercise-sentadilla-frontal',         name: 'Sentadilla frontal',              bodyPart: 'upper legs', target: 'quads',      equipment: 'barbell',    mechanic: 'compound'  },
    { id: 'global-exercise-sentadilla-sumo',            name: 'Sentadilla sumo',                 bodyPart: 'upper legs', target: 'quads',      equipment: 'barbell',    mechanic: 'compound'  },
    { id: 'global-exercise-prensa',                     name: 'Prensa',                          bodyPart: 'upper legs', target: 'quads',      equipment: 'machine',    mechanic: 'compound'  },
    { id: 'global-exercise-extension-rodillas',         name: 'Extensión de rodillas',           bodyPart: 'upper legs', target: 'quads',      equipment: 'machine',    mechanic: 'isolation' },
    { id: 'global-exercise-avanzadas',                  name: 'Avanzadas (Lunges)',               bodyPart: 'upper legs', target: 'quads',      equipment: 'barbell',    mechanic: 'compound'  },
    { id: 'global-exercise-sentadilla-hack',            name: 'Sentadilla hack',                 bodyPart: 'upper legs', target: 'quads',      equipment: 'machine',    mechanic: 'compound'  },
    { id: 'global-exercise-flexion-rodillas-acostado',  name: 'Flexión de rodillas acostado',    bodyPart: 'upper legs', target: 'hamstrings', equipment: 'machine',    mechanic: 'isolation' },
    { id: 'global-exercise-flexion-rodillas-sentado',   name: 'Flexión de rodillas sentado',     bodyPart: 'upper legs', target: 'hamstrings', equipment: 'machine',    mechanic: 'isolation' },
    { id: 'global-exercise-peso-muerto',                name: 'Peso muerto',                     bodyPart: 'upper legs', target: 'hamstrings', equipment: 'barbell',    mechanic: 'compound'  },
    { id: 'global-exercise-hip-thrust',                 name: 'Hip Thrust',                      bodyPart: 'upper legs', target: 'glutes',     equipment: 'barbell',    mechanic: 'compound'  },
    { id: 'global-exercise-patada-gluteos-maquina',     name: 'Patada de glúteos en máquina',    bodyPart: 'upper legs', target: 'glutes',     equipment: 'machine',    mechanic: 'isolation' },
    { id: 'global-exercise-abduccion-maquina',          name: 'Abducción en máquina',            bodyPart: 'upper legs', target: 'glutes',     equipment: 'machine',    mechanic: 'isolation' },
    { id: 'global-exercise-aduccion-maquina',           name: 'Aducción en máquina',             bodyPart: 'upper legs', target: 'glutes',     equipment: 'machine',    mechanic: 'isolation' },
    { id: 'global-exercise-press-plano-barra',          name: 'Press plano con barra',           bodyPart: 'chest',      target: 'pectorals',  equipment: 'barbell',    mechanic: 'compound'  },
    { id: 'global-exercise-press-inclinado-barra',      name: 'Press inclinado con barra',       bodyPart: 'chest',      target: 'pectorals',  equipment: 'barbell',    mechanic: 'compound'  },
    { id: 'global-exercise-press-declinado-mancuernas', name: 'Press declinado con mancuernas',  bodyPart: 'chest',      target: 'pectorals',  equipment: 'dumbbell',   mechanic: 'compound'  },
    { id: 'global-exercise-cruces-polea-alta',          name: 'Cruces en polea alta',            bodyPart: 'chest',      target: 'pectorals',  equipment: 'cable',      mechanic: 'isolation' },
    { id: 'global-exercise-remo-barra',                 name: 'Remo con barra',                  bodyPart: 'back',       target: 'upper back', equipment: 'barbell',    mechanic: 'compound'  },
    { id: 'global-exercise-remo-mancuernas',            name: 'Remo con mancuernas',             bodyPart: 'back',       target: 'upper back', equipment: 'dumbbell',   mechanic: 'compound'  },
    { id: 'global-exercise-jalon-polea-alta',           name: 'Jalón polea alta',                bodyPart: 'back',       target: 'lats',       equipment: 'cable',      mechanic: 'compound'  },
    { id: 'global-exercise-dominadas',                  name: 'Dominadas',                       bodyPart: 'back',       target: 'lats',       equipment: 'body weight', mechanic: 'compound' },
    { id: 'global-exercise-press-militar-barra',        name: 'Press militar con barra',         bodyPart: 'shoulders',  target: 'delts',      equipment: 'barbell',    mechanic: 'compound'  },
    { id: 'global-exercise-press-arnold',               name: 'Press Arnold',                    bodyPart: 'shoulders',  target: 'delts',      equipment: 'dumbbell',   mechanic: 'compound'  },
    { id: 'global-exercise-elevacion-lateral',          name: 'Elevación lateral',               bodyPart: 'shoulders',  target: 'delts',      equipment: 'dumbbell',   mechanic: 'isolation' },
    { id: 'global-exercise-elevacion-frontal',          name: 'Elevación frontal',               bodyPart: 'shoulders',  target: 'delts',      equipment: 'dumbbell',   mechanic: 'isolation' },
    { id: 'global-exercise-pajaros',                    name: 'Pájaros (Reverse Fly)',            bodyPart: 'shoulders',  target: 'delts',      equipment: 'dumbbell',   mechanic: 'isolation' },
    { id: 'global-exercise-flexion-barra-z',            name: 'Flexión de codo con barra Z',     bodyPart: 'upper arms', target: 'biceps',     equipment: 'barbell',    mechanic: 'isolation' },
    { id: 'global-exercise-martillo-mancuernas',        name: 'Martillo con mancuernas',         bodyPart: 'upper arms', target: 'biceps',     equipment: 'dumbbell',   mechanic: 'isolation' },
    { id: 'global-exercise-concentrado-mancuernas',     name: 'Concentrado con mancuernas',      bodyPart: 'upper arms', target: 'biceps',     equipment: 'dumbbell',   mechanic: 'isolation' },
    { id: 'global-exercise-predicador',                 name: 'Predicador',                      bodyPart: 'upper arms', target: 'biceps',     equipment: 'barbell',    mechanic: 'isolation' },
    { id: 'global-exercise-press-frances',              name: 'Press francés',                   bodyPart: 'upper arms', target: 'triceps',    equipment: 'barbell',    mechanic: 'isolation' },
    { id: 'global-exercise-push-down',                  name: 'Push down en polea',              bodyPart: 'upper arms', target: 'triceps',    equipment: 'cable',      mechanic: 'isolation' },
    { id: 'global-exercise-extension-codo',             name: 'Extensión de codo',               bodyPart: 'upper arms', target: 'triceps',    equipment: 'cable',      mechanic: 'isolation' },
    { id: 'global-exercise-patada-triceps',             name: 'Patada de tríceps',               bodyPart: 'upper arms', target: 'triceps',    equipment: 'dumbbell',   mechanic: 'isolation' },
    { id: 'global-exercise-extension-triceps-polea',    name: 'Extensión de tríceps en polea',   bodyPart: 'upper arms', target: 'triceps',    equipment: 'cable',      mechanic: 'isolation' },
    { id: 'global-exercise-elevacion-talones-maquina',  name: 'Elevación de talones en máquina', bodyPart: 'lower legs', target: 'calves',     equipment: 'machine',    mechanic: 'isolation' },
    { id: 'global-exercise-extension-plantar-prensa',   name: 'Extensión plantar en prensa',     bodyPart: 'lower legs', target: 'calves',     equipment: 'machine',    mechanic: 'isolation' },
    { id: 'global-exercise-elevacion-talones-sentado',  name: 'Elevación de talones sentado',    bodyPart: 'lower legs', target: 'calves',     equipment: 'machine',    mechanic: 'isolation' },
    { id: 'global-exercise-elevacion-piernas-colgado',  name: 'Elevación de piernas colgado',    bodyPart: 'waist',      target: 'abs',        equipment: 'body weight', mechanic: 'isolation' },
    { id: 'global-exercise-abs-roller',                 name: 'Abs roller',                      bodyPart: 'waist',      target: 'abs',        equipment: 'other',      mechanic: 'isolation' },
  ]

  for (const ex of globalExercises) {
    await prisma.exercise.upsert({
      where: { id: ex.id },
      update: { name: ex.name, bodyPart: ex.bodyPart, target: ex.target, equipment: ex.equipment, mechanic: ex.mechanic },
      create: { id: ex.id, coachId: null, name: ex.name, bodyPart: ex.bodyPart, target: ex.target, equipment: ex.equipment, mechanic: ex.mechanic, source: 'manual', secondaryMuscles: [], instructions: [], instructionsEs: [] },
    })
  }
  console.log(`✅ Ejercicios:    ${globalExercises.length} globales`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTINAS PUBLICAS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPublicTemplates() {
  type PT = {
    id: string; name: string; description: string; goal: string; level: string
    daysPerWeek: number; category: string
    days: Array<{ dayOfWeek: number; label: string; muscleGroups: string[]; isRestDay: boolean; exercises?: Array<{ exerciseId: string; order: number; sets: number; repsScheme: string; restSeconds: number }> }>
  }

  const templates: PT[] = [
    {
      id: 'public-template-ppl-3x', name: 'Push Pull Legs — 3 días',
      description: 'Divide los músculos en empuje, jalón y piernas. Ideal para ganar músculo con 3 días/semana.',
      goal: 'HYPERTROPHY', level: 'INTERMEDIATE', daysPerWeek: 3, category: 'PPL',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Push (Pecho, Hombros, Tríceps)', muscleGroups: ['CHEST', 'SHOULDERS', 'TRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-plano-barra', order: 1, sets: 4, repsScheme: '8-10', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold', order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-elevacion-lateral', order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-extension-triceps-polea', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Pull (Espalda, Bíceps)', muscleGroups: ['BACK', 'BICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-dominadas', order: 1, sets: 4, repsScheme: '6-8', restSeconds: 120 },
          { exerciseId: 'global-exercise-remo-barra', order: 2, sets: 4, repsScheme: '8-10', restSeconds: 120 },
          { exerciseId: 'global-exercise-jalon-polea-alta', order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-barra-z', order: 4, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-remo-mancuernas', order: 5, sets: 3, repsScheme: '12', restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Legs (Cuádriceps, Isquios, Glúteos)', muscleGroups: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 4, repsScheme: '8-10', restSeconds: 180 },
          { exerciseId: 'global-exercise-prensa', order: 2, sets: 3, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-peso-muerto', order: 3, sets: 3, repsScheme: '8-10', restSeconds: 180 },
          { exerciseId: 'global-exercise-extension-rodillas', order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 90 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 4, label: 'Jueves — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-fullbody-3x', name: 'Full Body — 3 días',
      description: 'Trabaja todo el cuerpo en cada sesión. Perfecto para principiantes o quienes buscan eficiencia.',
      goal: 'HYPERTROPHY', level: 'BEGINNER', daysPerWeek: 3, category: 'FULL_BODY',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Full Body A', muscleGroups: ['CHEST', 'BACK', 'QUADRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 3, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-plano-barra', order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-remo-barra', order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold', order: 4, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Full Body B', muscleGroups: ['CHEST', 'BACK', 'HAMSTRINGS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-peso-muerto', order: 1, sets: 3, repsScheme: '8-10', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-jalon-polea-alta', order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-elevacion-lateral', order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-avanzadas', order: 5, sets: 3, repsScheme: '12 c/lado', restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Full Body C', muscleGroups: ['QUADRICEPS', 'CHEST', 'BACK'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-prensa', order: 1, sets: 4, repsScheme: '12-15', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-declinado-mancuernas', order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-remo-mancuernas', order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-militar-barra', order: 4, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-rodillas-acostado', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 4, label: 'Jueves — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-upper-lower-4x', name: 'Upper / Lower — 4 días',
      description: 'Alterna tren superior e inferior. Mayor frecuencia por músculo con 4 sesiones semanales.',
      goal: 'HYPERTROPHY', level: 'INTERMEDIATE', daysPerWeek: 4, category: 'UPPER_LOWER',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Upper (fuerza)', muscleGroups: ['CHEST', 'BACK', 'SHOULDERS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-plano-barra', order: 1, sets: 4, repsScheme: '5-6', restSeconds: 180 },
          { exerciseId: 'global-exercise-remo-barra', order: 2, sets: 4, repsScheme: '5-6', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 3, sets: 3, repsScheme: '8-10', restSeconds: 120 },
          { exerciseId: 'global-exercise-dominadas', order: 4, sets: 3, repsScheme: '6-8', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-militar-barra', order: 5, sets: 3, repsScheme: '8-10', restSeconds: 90 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Lower (fuerza)', muscleGroups: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 4, repsScheme: '5-6', restSeconds: 180 },
          { exerciseId: 'global-exercise-peso-muerto', order: 2, sets: 4, repsScheme: '5-6', restSeconds: 180 },
          { exerciseId: 'global-exercise-prensa', order: 3, sets: 3, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-hip-thrust', order: 4, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-rodillas-acostado', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 4, label: 'Jueves — Upper (volumen)', muscleGroups: ['CHEST', 'BACK', 'BICEPS', 'TRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 1, sets: 4, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-jalon-polea-alta', order: 2, sets: 4, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold', order: 3, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-flexion-barra-z', order: 4, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-extension-triceps-polea', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Lower (volumen)', muscleGroups: ['QUADRICEPS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-hack', order: 1, sets: 4, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-avanzadas', order: 2, sets: 3, repsScheme: '12 c/lado', restSeconds: 90 },
          { exerciseId: 'global-exercise-extension-rodillas', order: 3, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust', order: 4, sets: 3, repsScheme: '12-15', restSeconds: 90 },
          { exerciseId: 'global-exercise-abduccion-maquina', order: 5, sets: 3, repsScheme: '15-20', restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-fuerza-5x5', name: 'Fuerza 5×5',
      description: 'Protocolo clásico para ganar fuerza máxima. 3 días, 5 series de 5 repeticiones en los grandes movimientos.',
      goal: 'STRENGTH', level: 'INTERMEDIATE', daysPerWeek: 3, category: 'STRENGTH',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Día A', muscleGroups: ['CHEST', 'BACK', 'QUADRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-plano-barra', order: 2, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-remo-barra', order: 3, sets: 5, repsScheme: '5', restSeconds: 180 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Día B', muscleGroups: ['BACK', 'SHOULDERS', 'HAMSTRINGS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-militar-barra', order: 2, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-peso-muerto', order: 3, sets: 1, repsScheme: '5', restSeconds: 300 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Día A (repetir)', muscleGroups: ['CHEST', 'BACK', 'QUADRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-plano-barra', order: 2, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-remo-barra', order: 3, sets: 5, repsScheme: '5', restSeconds: 180 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 4, label: 'Jueves — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
  ]

  for (const tmpl of templates) {
    await prisma.workoutTemplate.upsert({
      where: { id: tmpl.id },
      update: {},
      create: { id: tmpl.id, name: tmpl.name, description: tmpl.description, goal: tmpl.goal, level: tmpl.level, daysPerWeek: tmpl.daysPerWeek, isPublic: true, category: tmpl.category },
    })
    for (const day of tmpl.days) {
      const dayId = `${tmpl.id}-day-${day.dayOfWeek}`
      await prisma.workoutDay.upsert({
        where: { id: dayId },
        update: {},
        create: { id: dayId, templateId: tmpl.id, dayOfWeek: day.dayOfWeek, label: day.label, muscleGroups: day.muscleGroups, isRestDay: day.isRestDay, order: day.dayOfWeek },
      })
      if (!day.isRestDay && day.exercises) {
        for (const ex of day.exercises) {
          const exId = `${dayId}-ex-${ex.exerciseId}`
          await prisma.workoutExercise.upsert({
            where: { id: exId },
            update: {},
            create: { id: exId, dayId, exerciseId: ex.exerciseId, order: ex.order, sets: ex.sets, repsScheme: ex.repsScheme, restSeconds: ex.restSeconds },
          })
        }
      }
    }
  }
  console.log(`✅ Rutinas:       ${templates.length} públicas del sistema`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALIMENTOS LATAM
// ═══════════════════════════════════════════════════════════════════════════════

async function seedLatamFoods() {
  const foods = [
    { name: 'Milanesa de res (rebozada)', category: 'PROTEIN', kcalPer100g: 250, proteinPer100g: 18.0, carbsPer100g: 18.0, fatPer100g: 10.0, fiberPer100g: 0.8, calciumMg: 40, ironMg: 2.4, potassiumMg: 290, vitaminCMg: 0, magnesiumMg: 20, servingG: 200, servingLabel: '1 milanesa grande', country: 'AR' },
    { name: 'Milanesa de pollo (rebozada)', category: 'PROTEIN', kcalPer100g: 220, proteinPer100g: 20.0, carbsPer100g: 15.0, fatPer100g: 8.0, fiberPer100g: 0.7, calciumMg: 30, ironMg: 1.0, potassiumMg: 260, vitaminCMg: 0, magnesiumMg: 22, servingG: 180, servingLabel: '1 milanesa mediana', country: 'AR' },
    { name: 'Empanada criolla (carne)', category: 'CARB', kcalPer100g: 268, proteinPer100g: 9.0, carbsPer100g: 27.0, fatPer100g: 14.0, fiberPer100g: 1.2, calciumMg: 22, ironMg: 1.8, potassiumMg: 180, vitaminCMg: 0, magnesiumMg: 15, servingG: 90, servingLabel: '1 empanada', country: 'AR' },
    { name: 'Empanada de queso', category: 'CARB', kcalPer100g: 290, proteinPer100g: 10.0, carbsPer100g: 28.0, fatPer100g: 16.0, fiberPer100g: 1.0, calciumMg: 120, ironMg: 1.0, potassiumMg: 120, vitaminCMg: 0, magnesiumMg: 12, servingG: 90, servingLabel: '1 empanada', country: 'AR' },
    { name: 'Choripán (chorizo + pan)', category: 'CARB', kcalPer100g: 285, proteinPer100g: 11.0, carbsPer100g: 22.0, fatPer100g: 17.0, fiberPer100g: 1.0, calciumMg: 40, ironMg: 2.0, potassiumMg: 250, vitaminCMg: 1, magnesiumMg: 18, servingG: 200, servingLabel: '1 choripán completo', country: 'AR' },
    { name: 'Dulce de leche', category: 'FAT', kcalPer100g: 321, proteinPer100g: 6.6, carbsPer100g: 54.0, fatPer100g: 8.7, fiberPer100g: 0, calciumMg: 200, ironMg: 0.2, potassiumMg: 290, vitaminCMg: 1, magnesiumMg: 18, servingG: 30, servingLabel: '2 cucharadas', country: 'AR' },
    { name: 'Asado (costillas res)', category: 'PROTEIN', kcalPer100g: 291, proteinPer100g: 19.0, carbsPer100g: 0.0, fatPer100g: 23.0, fiberPer100g: 0, calciumMg: 15, ironMg: 2.0, potassiumMg: 290, vitaminCMg: 0, magnesiumMg: 20, servingG: 250, servingLabel: '1 porción asado', country: 'AR' },
    { name: 'Facturas / medialunas', category: 'CARB', kcalPer100g: 380, proteinPer100g: 7.0, carbsPer100g: 48.0, fatPer100g: 17.0, fiberPer100g: 1.0, calciumMg: 30, ironMg: 1.5, potassiumMg: 90, vitaminCMg: 0, magnesiumMg: 10, servingG: 60, servingLabel: '2 medialunas', country: 'AR' },
    { name: 'Yerba mate (cebada)', category: 'OTHER', kcalPer100g: 3, proteinPer100g: 0.0, carbsPer100g: 0.5, fatPer100g: 0.0, fiberPer100g: 0, calciumMg: 5, ironMg: 0.1, potassiumMg: 30, vitaminCMg: 0, magnesiumMg: 3, servingG: 250, servingLabel: '1 mate (250ml)', country: 'AR' },
    { name: 'Lomo saltado', category: 'PROTEIN', kcalPer100g: 190, proteinPer100g: 15.0, carbsPer100g: 13.0, fatPer100g: 9.0, fiberPer100g: 1.5, calciumMg: 20, ironMg: 2.5, potassiumMg: 380, vitaminCMg: 12, magnesiumMg: 24, servingG: 300, servingLabel: '1 plato (sin arroz)', country: 'PE' },
    { name: 'Ceviche de pescado', category: 'PROTEIN', kcalPer100g: 88, proteinPer100g: 14.0, carbsPer100g: 5.0, fatPer100g: 1.5, fiberPer100g: 0.8, calciumMg: 22, ironMg: 0.8, potassiumMg: 310, vitaminCMg: 18, magnesiumMg: 30, servingG: 300, servingLabel: '1 porción mediana', country: 'PE' },
    { name: 'Bandeja paisa (plato completo)', category: 'PROTEIN', kcalPer100g: 175, proteinPer100g: 13.0, carbsPer100g: 16.0, fatPer100g: 6.5, fiberPer100g: 3.5, calciumMg: 50, ironMg: 3.5, potassiumMg: 450, vitaminCMg: 8, magnesiumMg: 55, servingG: 500, servingLabel: '1 bandeja paisa', country: 'CO' },
    { name: 'Pandebono', category: 'CARB', kcalPer100g: 290, proteinPer100g: 8.0, carbsPer100g: 38.0, fatPer100g: 11.0, fiberPer100g: 0.5, calciumMg: 120, ironMg: 0.8, potassiumMg: 80, vitaminCMg: 0, magnesiumMg: 8, servingG: 60, servingLabel: '1 pandebono (60g)', country: 'CO' },
    { name: 'Ajiaco bogotano (por porción)', category: 'PROTEIN', kcalPer100g: 68, proteinPer100g: 6.0, carbsPer100g: 8.0, fatPer100g: 1.5, fiberPer100g: 1.5, calciumMg: 20, ironMg: 0.8, potassiumMg: 290, vitaminCMg: 12, magnesiumMg: 18, servingG: 400, servingLabel: '1 plato mediano', country: 'CO' },
    { name: 'Tortilla de maíz', category: 'CARB', kcalPer100g: 218, proteinPer100g: 5.7, carbsPer100g: 46.0, fatPer100g: 2.5, fiberPer100g: 4.6, calciumMg: 46, ironMg: 2.4, potassiumMg: 157, vitaminCMg: 0, magnesiumMg: 56, servingG: 60, servingLabel: '2 tortillas medianas', country: 'MX' },
    { name: 'Guacamole casero', category: 'FAT', kcalPer100g: 150, proteinPer100g: 2.0, carbsPer100g: 8.5, fatPer100g: 13.0, fiberPer100g: 5.0, calciumMg: 12, ironMg: 0.6, potassiumMg: 410, vitaminCMg: 10, magnesiumMg: 25, servingG: 80, servingLabel: '4 cucharadas (80g)', country: 'MX' },
    { name: 'Frijoles refritos', category: 'LEGUME', kcalPer100g: 120, proteinPer100g: 6.5, carbsPer100g: 16.5, fatPer100g: 2.5, fiberPer100g: 5.5, calciumMg: 38, ironMg: 1.8, potassiumMg: 300, vitaminCMg: 0, magnesiumMg: 38, servingG: 100, servingLabel: '½ taza', country: 'MX' },
    { name: 'Tacos de bistec (2 tacos)', category: 'PROTEIN', kcalPer100g: 210, proteinPer100g: 14.0, carbsPer100g: 18.0, fatPer100g: 8.0, fiberPer100g: 2.0, calciumMg: 35, ironMg: 2.0, potassiumMg: 270, vitaminCMg: 5, magnesiumMg: 22, servingG: 200, servingLabel: '2 tacos medianos', country: 'MX' },
  ]

  const names = foods.map(f => f.name)
  const existing = await prisma.food.findMany({ where: { name: { in: names } }, select: { name: true } })
  const existingNames = new Set(existing.map(f => f.name))

  const toCreate = foods.filter(f => !existingNames.has(f.name)).map(f => ({
    ...f, source: 'system' as const, isActive: true, isVerified: true,
  }))

  if (toCreate.length === 0) {
    console.log('✅ Alimentos:     todos ya existen')
    return
  }

  await prisma.food.createMany({ data: toCreate })
  console.log(`✅ Alimentos:     ${toCreate.length} LatAm insertados (${existingNames.size} ya existían)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
