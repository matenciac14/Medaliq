import 'dotenv/config'
import { PrismaClient, UserRole, GoalType, GoalStatus, PlanStatus, PlanSource, Phase, SessionType } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { FULL_ATHLETE_CONFIG, COACH_CONFIG, DEFAULT_USER_CONFIG } from '../src/lib/config/user-config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Seeding...')

  // ── Coach ────────────────────────────────────────────────────────────────
  const coachPassword = await bcrypt.hash('coach123', 12)
  const coach = await prisma.user.upsert({
    where: { email: 'coach@medaliq.com' },
    update: { config: COACH_CONFIG },
    create: {
      email: 'coach@medaliq.com',
      name: 'Carlos Entrenador',
      password: coachPassword,
      role: UserRole.COACH,
      config: COACH_CONFIG,
    },
  })

  // ── Atleta 1 (con plan activo) ───────────────────────────────────────────
  const athletePassword = await bcrypt.hash('atleta123', 12)
  const athlete1 = await prisma.user.upsert({
    where: { email: 'miguel@medaliq.com' },
    update: { config: FULL_ATHLETE_CONFIG },
    create: {
      email: 'miguel@medaliq.com',
      name: 'Miguel Atleta',
      password: athletePassword,
      role: UserRole.ATHLETE,
      config: FULL_ATHLETE_CONFIG,
      profile: {
        create: {
          age: 30,
          heightCm: 175,
          weightKg: 75,
          weightGoalKg: 70,
          hrResting: 55,
          hrMax: 185,
          altitudeMeters: 2600,
          injuries: [],
          conditions: [],
          medications: [],
          sleepHoursAvg: 7,
          sleepScoreAvg: 78,
        },
      },
      goals: {
        create: {
          type: GoalType.RACE_HALF_MARATHON,
          raceDate: new Date('2026-10-01'),
          targetTimeSecs: 6300, // 1:45:00
          status: GoalStatus.ACTIVE,
        },
      },
    },
    include: { goals: true },
  })

  // Vincular coach ↔ atleta1
  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach.id, athleteId: athlete1.id } },
    update: {},
    create: { coachId: coach.id, athleteId: athlete1.id },
  })

  // Plan de entrenamiento para atleta1
  const startDate = new Date('2026-06-02')
  const endDate = new Date('2026-10-01')

  const plan = await prisma.trainingPlan.upsert({
    where: { id: 'seed-plan-1' },
    update: {},
    create: {
      id: 'seed-plan-1',
      userId: athlete1.id,
      goalId: athlete1.goals[0].id,
      name: 'Plan Media Maratón — 18 semanas',
      totalWeeks: 18,
      startDate,
      endDate,
      status: PlanStatus.ACTIVE,
      generatedBy: PlanSource.AI,
      hrZones: {
        z1: { min: 95, max: 114 },
        z2: { min: 115, max: 133 },
        z3: { min: 134, max: 152 },
        z4: { min: 153, max: 171 },
        z5: { min: 172, max: 185 },
      },
    },
  })

  // Semana 1 con sesiones de ejemplo
  const week1Start = new Date(startDate)
  const week1End = new Date(startDate)
  week1End.setDate(week1End.getDate() + 6)

  const week1 = await prisma.planWeek.upsert({
    where: { planId_weekNumber: { planId: plan.id, weekNumber: 1 } },
    update: {},
    create: {
      planId: plan.id,
      weekNumber: 1,
      phase: Phase.BASE,
      volumeKm: 30,
      focusDescription: 'Semana de adaptación — rodajes suaves Z2',
      isRecoveryWeek: false,
      startDate: week1Start,
      endDate: week1End,
    },
  })

  const sessions = [
    { dayOfWeek: 1, type: SessionType.RODAJE_Z2, durationMin: 40, zoneTarget: 'Z2', detailText: '40 min fácil Z2 — conversacional todo el tiempo' },
    { dayOfWeek: 3, type: SessionType.FARTLEK, durationMin: 50, zoneTarget: 'Z2-Z3', detailText: '10 min calentamiento + 6×2 min Z3 / 2 min Z2 + 10 min vuelta calma' },
    { dayOfWeek: 5, type: SessionType.RODAJE_Z2, durationMin: 35, zoneTarget: 'Z2', detailText: '35 min rodaje suave de recuperación' },
    { dayOfWeek: 6, type: SessionType.TIRADA_LARGA, durationMin: 75, zoneTarget: 'Z2', detailText: 'Tirada larga 75 min — todo Z2, hidratación cada 20 min' },
  ]

  for (const s of sessions) {
    const sessionDate = new Date(week1Start)
    sessionDate.setDate(sessionDate.getDate() + s.dayOfWeek - 1)

    await prisma.plannedSession.upsert({
      where: { id: `seed-w1-d${s.dayOfWeek}` },
      update: {},
      create: {
        id: `seed-w1-d${s.dayOfWeek}`,
        weekId: week1.id,
        dayOfWeek: s.dayOfWeek,
        type: s.type,
        durationMin: s.durationMin,
        zoneTarget: s.zoneTarget,
        detailText: s.detailText,
        date: sessionDate,
      },
    })
  }

  // Check-in semana 1
  await prisma.weeklyCheckIn.upsert({
    where: { userId_weekNumber: { userId: athlete1.id, weekNumber: 1 } },
    update: {},
    create: {
      userId: athlete1.id,
      weekNumber: 1,
      weightKg: 75.2,
      hrResting: 55,
      sleepHours: 7.5,
      sleepScore: 82,
      hardestSessionRpe: 7,
      dietAdherencePct: 85,
      painFlag: false,
      energyLevel: 4,
      notes: 'Semana bien, las piernas respondieron bien al volumen',
      adjustmentsTriggered: [],
    },
  })

  // ── Atleta 2 (sin coach, directo B2C) ────────────────────────────────────
  const athlete2 = await prisma.user.upsert({
    where: { email: 'ana@medaliq.com' },
    update: {},
    create: {
      email: 'ana@medaliq.com',
      name: 'Ana Runner',
      password: await bcrypt.hash('atleta123', 12),
      role: UserRole.ATHLETE,
      config: DEFAULT_USER_CONFIG,  // recién registrada, sin features aún
      profile: {
        create: {
          age: 27,
          heightCm: 163,
          weightKg: 62,
          weightGoalKg: 60,
          hrResting: 52,
          hrMax: 192,
          altitudeMeters: 0,
          injuries: ['Rodilla derecha (2024)'],
          conditions: [],
          medications: [],
          sleepHoursAvg: 8,
          sleepScoreAvg: 85,
        },
      },
    },
  })

  console.log(`✅ Coach:    coach@medaliq.com    / coach123`)
  console.log(`✅ Atleta 1: miguel@medaliq.com   / atleta123  (con plan + coach)`)
  console.log(`✅ Atleta 2: ana@medaliq.com      / atleta123  (B2C sin coach)`)
  console.log(`\n🎉 Seed completo.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
