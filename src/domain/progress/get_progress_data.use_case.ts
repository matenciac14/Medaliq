/**
 * Domain use case — get progress data for mobile.
 *
 * Pure orchestration: receives userId + prisma, returns complete progress data.
 * No auth, no rate limiting, no Next.js — those belong in the route layer.
 */
import type { PrismaClient } from '../../generated/prisma/client'
import { calcAdherencePct } from '@/lib/core/adherence'

export async function getProgressData(userId: string, prisma: PrismaClient) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const [checkIns, plan, profile, gymCount, rawGymSessions, rawBenchmarks, rawGymPRs, rawSetHistory, rawFoodLogs, nutritionPlan, rawRunSessions] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { weekNumber: 'asc' },
      take: 104,
      select: {
        weekNumber: true, weightKg: true, hrResting: true,
        energyLevel: true, stressLevel: true, motivationLevel: true,
        sleepHours: true, recordedAt: true, dietAdherencePct: true,
        waistCm: true, armsCm: true, hipsCm: true, thighsCm: true,
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          select: {
            weekNumber: true,
            phase: true,
            sessions: {
              where: { date: { lte: new Date() } },
              select: { log: { select: { id: true, distanceKm: true } } },
            },
          },
        },
      },
    }),
    prisma.healthProfile.findUnique({ where: { userId }, select: { weightGoalKg: true } }),
    prisma.gymSession.count({ where: { athleteId: userId, completed: true } }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true, date: { gte: oneYearAgo } },
      select: { date: true },
      orderBy: { date: 'asc' },
    }),
    prisma.performanceBenchmark.findMany({
      where: { userId },
      orderBy: { testedAt: 'desc' },
      select: { id: true, sport: true, metric: true, value: true, unit: true, testedAt: true, notes: true },
    }),
    prisma.setLog.findMany({
      where: { isPR: true, session: { athleteId: userId, completed: true } },
      orderBy: { session: { date: 'desc' } },
      take: 20,
      select: {
        id: true, exerciseName: true, weightKg: true, repsCompleted: true,
        session: { select: { date: true } },
      },
    }),
    prisma.setLog.findMany({
      where: {
        session: { athleteId: userId, completed: true },
        weightKg: { not: null },
        repsCompleted: { gte: 1, lte: 15 },
      },
      select: {
        exerciseName: true, weightKg: true, repsCompleted: true,
        session: { select: { date: true } },
      },
      orderBy: { session: { date: 'desc' } },
      take: 600,
    }),
    prisma.foodLog.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      select: { date: true, kcalLogged: true, grams: true, food: { select: { kcalPer100g: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.nutritionPlan.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { targetKcalEasy: true },
    }),
    prisma.sessionLog.findMany({
      where: { userId, completedAt: { gte: oneYearAgo } },
      select: { completedAt: true },
    }),
  ])

  const weightPoints = checkIns
    .filter(c => c.weightKg !== null)
    .map(c => ({ week: c.weekNumber, kg: c.weightKg as number }))

  const hrPoints = checkIns
    .filter(c => c.hrResting !== null)
    .map(c => ({ week: c.weekNumber, bpm: c.hrResting as number }))

  const wellbeingPoints = checkIns
    .filter(c => c.energyLevel !== null || c.stressLevel !== null || c.motivationLevel !== null)
    .map(c => ({
      week: c.weekNumber,
      energyLevel: c.energyLevel ?? null,
      stressLevel: c.stressLevel ?? null,
      motivationLevel: c.motivationLevel ?? null,
      sleepHours: c.sleepHours ?? null,
    }))

  const measurementPoints = checkIns
    .filter(c => c.waistCm !== null || c.armsCm !== null || c.hipsCm !== null || c.thighsCm !== null)
    .map(c => ({
      week: c.weekNumber,
      waistCm: c.waistCm ?? null,
      armsCm: c.armsCm ?? null,
      hipsCm: c.hipsCm ?? null,
      thighsCm: c.thighsCm ?? null,
    }))

  const weeks = plan?.weeks.map(w => {
    const checkIn = checkIns.find(c => c.weekNumber === w.weekNumber)
    return {
      weekNumber: w.weekNumber,
      phase: w.phase,
      adherencePct: checkIn?.dietAdherencePct ?? calcAdherencePct(w.sessions.filter(s => s.log !== null).length, w.sessions.length),
      volumeKm: w.sessions.reduce((acc, s) => acc + (s.log?.distanceKm ?? 0), 0),
    }
  }) ?? []

  // Gym adherence by ISO week
  const gymByWeek = new Map<string, number>()
  for (const s of rawGymSessions) {
    if (!s.date) continue
    const d = s.date
    const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
    const monday = new Date(d)
    monday.setUTCDate(d.getUTCDate() - dow + 1)
    const key = monday.toISOString().split('T')[0]
    gymByWeek.set(key, (gymByWeek.get(key) ?? 0) + 1)
  }

  const benchmarks = rawBenchmarks.map(b => ({
    ...b,
    testedAt: b.testedAt.toISOString(),
  }))

  // 1RM history — Epley formula, top 5 exercises
  const gymPRHistory = build1RMHistory(rawSetHistory)

  const nutTarget = nutritionPlan?.targetKcalEasy ?? null
  const nutritionAdherence = buildNutritionAdherence(rawFoodLogs, nutTarget)

  const gymPRs = rawGymPRs.map(r => ({
    id: r.id,
    exerciseName: r.exerciseName ?? 'Ejercicio',
    weightKg: r.weightKg,
    repsCompleted: r.repsCompleted,
    date: r.session.date.toISOString(),
  }))

  const gymAdherenceByWeek = [...gymByWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([weekLabel, sessions]) => ({ weekLabel, sessions }))

  const totalSessions = checkIns.length
  const weeksWithPastSessions = plan?.weeks.filter(w => w.sessions.length > 0) ?? []
  const overallAdherence = weeksWithPastSessions.length > 0
    ? Math.round(weeksWithPastSessions.reduce((acc, w) => acc + calcAdherencePct(w.sessions.filter(s => s.log !== null).length, w.sessions.length), 0) / weeksWithPastSessions.length)
    : 0

  // Activity heatmap
  const activityGrid = buildActivityGrid(rawGymSessions, rawRunSessions)

  return {
    weightPoints,
    hrPoints,
    wellbeingPoints,
    measurementPoints,
    weeks,
    weightGoal: profile?.weightGoalKg ?? null,
    gymSessionsCompleted: gymCount,
    gymAdherenceByWeek,
    nutritionAdherence,
    benchmarks,
    gymPRs,
    gymPRHistory,
    activityGrid,
    totalCheckIns: totalSessions,
    overallAdherencePct: overallAdherence,
  }
}

// ── Helpers (exported for testing) ──

export function build1RMHistory(rawSetHistory: { exerciseName: string | null; weightKg: number | null; repsCompleted: number | null; session: { date: Date } }[]) {
  const epley = (kg: number, reps: number) => Math.round(kg * (1 + reps / 30) * 10) / 10
  const historyMap = new Map<string, Map<string, number>>()
  for (const sl of rawSetHistory) {
    if (!sl.exerciseName || !sl.weightKg || !sl.repsCompleted) continue
    const dateKey = sl.session.date.toISOString().split('T')[0]
    const oneRm = epley(sl.weightKg, sl.repsCompleted)
    const exMap = historyMap.get(sl.exerciseName) ?? new Map<string, number>()
    if ((exMap.get(dateKey) ?? 0) < oneRm) exMap.set(dateKey, oneRm)
    historyMap.set(sl.exerciseName, exMap)
  }
  return [...historyMap.entries()]
    .map(([exerciseName, dateMap]) => ({
      exerciseName,
      points: [...dateMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, oneRmKg]) => ({ date, oneRmKg })),
    }))
    .filter(s => s.points.length >= 2)
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, 5)
}

export function buildNutritionAdherence(
  rawFoodLogs: { date: Date; kcalLogged: number | null; grams: number; food: { kcalPer100g: number } }[],
  nutTarget: number | null,
) {
  if (!nutTarget) return []
  const byDate = new Map<string, number>()
  for (const fl of rawFoodLogs) {
    const dateKey = (fl.date as Date).toISOString().split('T')[0]
    const kcal = fl.kcalLogged ?? (fl.food.kcalPer100g * fl.grams / 100)
    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + kcal)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, kcalLogged]) => ({
      date,
      kcalLogged: Math.round(kcalLogged),
      targetKcal: nutTarget,
      pct: Math.min(100, Math.round((kcalLogged / nutTarget) * 100)),
    }))
}

export function buildActivityGrid(
  rawGymSessions: { date: Date }[],
  rawRunSessions: { completedAt: Date | null }[],
) {
  const activityGrid: Record<string, { sessionCount: number; types: string[] }> = {}
  for (const s of rawGymSessions) {
    if (!s.date) continue
    const key = s.date.toISOString().split('T')[0]
    const entry = activityGrid[key] ?? { sessionCount: 0, types: [] }
    entry.sessionCount += 1
    if (!entry.types.includes('gym')) entry.types.push('gym')
    activityGrid[key] = entry
  }
  for (const s of rawRunSessions) {
    if (!s.completedAt) continue
    const key = s.completedAt.toISOString().split('T')[0]
    const entry = activityGrid[key] ?? { sessionCount: 0, types: [] }
    entry.sessionCount += 1
    if (!entry.types.includes('running')) entry.types.push('running')
    activityGrid[key] = entry
  }
  return activityGrid
}
