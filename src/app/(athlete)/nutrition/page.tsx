import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { todayDowInTz, todayInTz, getWeekMonday } from '@/lib/core/date_utils'
import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { intensityToDayType, type DayType } from '@/lib/nutrition/day_type'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily_target'
import { parseMealPlanData } from '@/domain/nutrition/generate_meal_plan'
import NutritionContent, { type MealPlanData } from './_components/NutritionContent'
import FoodGuide from './_components/FoodGuide'
import TrackingSection from './_components/TrackingSection'
import CoachNutritionProposalCard from './_components/CoachNutritionProposalCard'
import NutritionInitClient from './_components/NutritionInitClient'
import WeeklyNutritionBars from './_components/WeeklyNutritionBars'
import WeeklyMenuStrip from './_components/WeeklyMenuStrip'
import ActivityCard from './_components/ActivityCard'
import MacroTargetCards from './_components/MacroTargetCards'
import HydrationWidget from './_components/HydrationWidget'
import MealSummaryCards from './_components/MealSummaryCards'
import TipCard from './_components/TipCard'
import NutritionPageClient from './_components/NutritionPageClient'
import AthleteKcalStrategy from './_components/AthleteKcalStrategy'
import EmptyMealPlanCard from './_components/EmptyMealPlanCard'
import CoachNutritionBanner from './_components/CoachNutritionBanner'
import PendingMealsBanner from './_components/PendingMealsBanner'
import { CoachNutritionProposalRepository } from '@/infrastructure/db/coach_nutrition_proposal.repository'

export default async function NutritionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  // Fetch plan activo + timezone del usuario en paralelo
  const [activePlan, userRecord] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, startDate: true, totalWeeks: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ])
  const tz = userRecord?.timezone ?? undefined
  const todayStart = todayInTz(tz)  // UTC midnight of user's "today"
  const todayDow = todayDowInTz(tz)
  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : null

  // Tomorrow = today + 1 day (for date range queries)
  const tomorrow = new Date(todayStart)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  // Last 7 days
  const weekStart = new Date(todayStart)
  weekStart.setUTCDate(weekStart.getUTCDate() - 6)

  // Semana actual Lun–Dom para PlannedMeals
  const mondayThisWeek = getWeekMonday(0, tz)
  const sundayThisWeek = new Date(mondayThisWeek)
  sundayThisWeek.setUTCDate(mondayThisWeek.getUTCDate() + 6)
  sundayThisWeek.setUTCHours(23, 59, 59, 999)

  const proposalRepo = new CoachNutritionProposalRepository(prisma)

  // Cargar datos en paralelo — una sola ronda
  const [
    nutritionPlanRaw,
    mealPlan,
    todaySession,
    gymToday,
    healthProfile,
    allFoods,
    weekFoodLogs,
    coachProposals,
    currentPlanWeek,
    activeCoachRelation,
    assignedNutritionPlan,
    weekSessions,
    athleteTemplate,
    plannedMealsThisWeek,
    todayFoodLogs,
    todayWaterLog,
  ] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.mealPlan.findUnique({ where: { userId } }),
    activePlan && currentWeek
      ? prisma.plannedSession.findFirst({
          where: {
            week: { planId: activePlan.id, weekNumber: currentWeek },
            dayOfWeek: todayDow,
          },
          select: { intensity: true, type: true, durationMin: true, zoneTarget: true },
        })
      : Promise.resolve(null),
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: {
        template: {
          select: {
            days: {
              where: { dayOfWeek: todayDow },
              select: { isRestDay: true },
            },
          },
        },
      },
    }),
    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, heightCm: true, age: true, gender: true, weightGoalKg: true },
    }),
    prisma.food.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 100,
      select: {
        id: true, name: true, category: true,
        kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
        fiberPer100g: true, calciumMg: true, ironMg: true,
        potassiumMg: true, vitaminCMg: true, magnesiumMg: true,
        servingG: true, servingLabel: true,
      },
    }),
    prisma.foodLog.findMany({
      where: { userId, date: { gte: weekStart } },
      select: { date: true, kcalLogged: true, grams: true, food: { select: { kcalPer100g: true } } },
    }),
    proposalRepo.findPendingForAthlete(userId),
    activePlan && currentWeek
      ? prisma.planWeek.findFirst({
          where: { planId: activePlan.id, weekNumber: currentWeek },
          select: { isRecoveryWeek: true, sessions: { select: { intensity: true } } },
        })
      : Promise.resolve(null),
    prisma.coachAthlete.findFirst({
      where: { athleteId: userId, status: 'ACTIVE' },
      select: { coach: { select: { name: true } } },
    }),
    prisma.assignedNutritionPlan.findUnique({
      where: { athleteId: userId },
      include: {
        template: {
          select: {
            name: true,
            days: {
              include: {
                meals: {
                  orderBy: { order: 'asc' },
                  include: {
                    items: {
                      orderBy: { order: 'asc' },
                      include: { food: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    // NUT-F-02: sesiones de la semana actual (para mapear dayType por día)
    activePlan && currentWeek
      ? prisma.plannedSession.findMany({
          where: { week: { planId: activePlan.id, weekNumber: currentWeek } },
          select: { dayOfWeek: true, intensity: true, type: true },
        })
      : Promise.resolve([]),
    // NUT-FLOW-01: plantilla de nutrición propia del atleta B2C
    prisma.nutritionTemplate.findFirst({
      where: { athleteId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    }),
    // NUT-FLOW-01 + NUT-DASH-04: PlannedMeals semana con datos de alimento
    prisma.plannedMeal.findMany({
      where: { userId, date: { gte: mondayThisWeek, lte: sundayThisWeek } },
      select: {
        id: true,
        mealType: true,
        grams: true,
        date: true,
        food: { select: { name: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } },
      },
      orderBy: { date: 'asc' },
    }),
    // Today's food logs with full macro data (for DeficitHero + consumed totals)
    prisma.foodLog.findMany({
      where: { userId, date: { gte: todayStart, lt: tomorrow } },
      select: {
        id: true, mealType: true, grams: true,
        kcalLogged: true, proteinLogged: true, carbsLogged: true, fatLogged: true,
        food: { select: { name: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } },
      },
    }),
    // Water log for today (pre-fetch to avoid client-side flash)
    prisma.waterLog.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { mlLogged: true },
    }),
  ])

  // Sin lazy-init: no se escribe a DB durante el render (violación REST, race conditions).
  // Si falta NutritionPlan, NutritionInitClient lo crea vía POST /api/athlete/nutrition/init y refresca.
  const nutritionPlan = nutritionPlanRaw
  const needsNutritionInit = !nutritionPlan && !!healthProfile?.weightKg && !!healthProfile?.heightCm && !!healthProfile?.age

  const gymDayToday = gymToday?.template.days[0]
  const hasGymSessionToday = !!gymDayToday && !gymDayToday.isRestDay

  const todayDayType: DayType = todaySession
    ? intensityToDayType(todaySession.intensity)
    : hasGymSessionToday
      ? 'hard'
      : 'rest'

  const DAY_TYPE_LABELS = {
    hard: { label: 'Día duro',   emoji: '🔥', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    easy: { label: 'Día fácil',  emoji: '✅', color: 'bg-green-100 text-green-700 border-green-200' },
    low:  { label: 'Día suave',  emoji: '🟣', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    rest: { label: 'Descanso',   emoji: '😴', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  }
  const badge = DAY_TYPE_LABELS[todayDayType]

  // MealPlan (parsedMealPlan) is deprecated fallback — NutritionTemplate is the primary source
  const parsedMealPlan = mealPlan ? parseMealPlanData(mealPlan.data) : null

  // Transformar plantilla del coach al formato canónico MealPlanData
  const MEAL_TYPE_LABELS: Record<string, string> = {
    BREAKFAST: 'Desayuno', LUNCH: 'Almuerzo', DINNER: 'Cena', SNACK: 'Snack',
  }
  type TemplateDayShape = NonNullable<typeof assignedNutritionPlan>['template']['days'][number]
  function templateDayToMeals(day: TemplateDayShape | undefined) {
    if (!day) return []
    return day.meals.map((m) => {
      const totals = m.items.reduce(
        (acc, i) => ({ kcal: acc.kcal + i.kcal, protein: acc.protein + i.proteinG, carbs: acc.carbs + i.carbsG, fat: acc.fat + i.fatG }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      )
      return {
        time: '',
        label: MEAL_TYPE_LABELS[m.mealType] ?? m.mealType,
        foods: m.items.map((i) => `${i.food.name} ${i.grams}g`).join(', '),
        items: m.items.map((i) => ({ name: i.food.name, g: i.grams, kcal: i.kcal, protein: i.proteinG, carbs: i.carbsG, fat: i.fatG })),
        ...totals,
      }
    })
  }
  const empty = { meals: [], supplements: [], hydrationL: 2, rules: [] }
  const assignedMealPlan: MealPlanData | null = assignedNutritionPlan
    ? {
        hard: { ...empty, meals: templateDayToMeals(assignedNutritionPlan.template.days.find((d) => d.dayType === 'HARD')) },
        easy: { ...empty, meals: templateDayToMeals(assignedNutritionPlan.template.days.find((d) => d.dayType === 'EASY')) },
        rest: { ...empty, meals: templateDayToMeals(assignedNutritionPlan.template.days.find((d) => d.dayType === 'REST')) },
      }
    : null

  const hasMealPlan = !!(assignedMealPlan ?? parsedMealPlan)

  // UX-NUT-01: cuando el atleta B2B tiene plan del coach pero no tiene NutritionPlan,
  // calcular targets desde los ítems de la plantilla para evitar macros en 0.
  function sumTemplateDayMacros(plan: NonNullable<typeof assignedNutritionPlan>, dbDayType: 'HARD' | 'EASY' | 'REST') {
    const day = plan.template.days.find((d) => d.dayType === dbDayType)
    if (!day) return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    let kcal = 0, proteinG = 0, carbsG = 0, fatG = 0
    for (const m of day.meals) {
      for (const i of m.items) {
        kcal += i.kcal; proteinG += i.proteinG; carbsG += i.carbsG; fatG += i.fatG
      }
    }
    return { kcal, proteinG, carbsG, fatG }
  }
  const syntheticNutritionPlan = !nutritionPlan && assignedNutritionPlan
    ? (() => {
        const hard = sumTemplateDayMacros(assignedNutritionPlan, 'HARD')
        const easy = sumTemplateDayMacros(assignedNutritionPlan, 'EASY')
        const rest = sumTemplateDayMacros(assignedNutritionPlan, 'REST')
        return {
          tdee: easy.kcal,
          targetKcalHard: hard.kcal,
          targetKcalEasy: easy.kcal,
          targetKcalRest: rest.kcal,
          proteinG: easy.proteinG,
          carbsHardG: hard.carbsG,
          carbsEasyG: easy.carbsG,
          fatG: easy.fatG,
        }
      })()
    : null
  const effectiveNutritionPlan = nutritionPlan ?? syntheticNutritionPlan
  const hasPlannedMealsThisWeek = plannedMealsThisWeek.length > 0

  // NUT-DASH-04: comidas de HOY (filtramos del array semanal ya cargado)
  const todayStr = todayStart.toISOString().split('T')[0]
  const todayPlannedMeals = plannedMealsThisWeek.filter(m => {
    const d = m.date instanceof Date ? m.date : new Date(m.date)
    return d.toISOString().split('T')[0] === todayStr
  })

  // Adherencia semanal — días donde kcal loggeada >= target * 0.9 (target POR DÍA según intensidad)
  let weeklyAdherence: { daysHit: number; totalDays: number } | null = null
  const kcalByDay: Record<string, number> = {}
  if (effectiveNutritionPlan && weekFoodLogs.length > 0) {
    for (const log of weekFoodLogs) {
      const day = log.date.toISOString().slice(0, 10)
      const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
      kcalByDay[day] = (kcalByDay[day] ?? 0) + kcal
    }

    // Mapear intensidad por fecha usando las sesiones de la semana
    const intensityByDateKey = new Map<string, string>()
    if (activePlan && currentWeek) {
      for (const s of weekSessions) {
        const sessionDate = new Date(mondayThisWeek)
        sessionDate.setUTCDate(mondayThisWeek.getUTCDate() + s.dayOfWeek - 1)
        const key = sessionDate.toISOString().slice(0, 10)
        intensityByDateKey.set(key, s.intensity ?? 'REST')
      }
    }

    let daysHit = 0
    let totalDays = 0
    for (const [day, kcal] of Object.entries(kcalByDay)) {
      const intensity = intensityByDateKey.get(day) ?? 'REST'
      const target = getDailyNutritionTarget(intensity, effectiveNutritionPlan)
      if (target.kcal > 0) {
        totalDays++
        if (kcal >= target.kcal * 0.9) daysHit++
      }
    }
    if (totalDays > 0) weeklyAdherence = { daysHit, totalDays }
  }

  // NUT-F-03: datos de barras de adherencia para los últimos 7 días (target POR DÍA)
  // Construir mapa de intensidad por fecha para los últimos 7 días
  const intensityMapForBars = new Map<string, string>()
  if (activePlan && currentWeek) {
    for (const s of weekSessions) {
      const sessionDate = new Date(mondayThisWeek)
      sessionDate.setUTCDate(mondayThisWeek.getUTCDate() + s.dayOfWeek - 1)
      const key = sessionDate.toISOString().slice(0, 10)
      intensityMapForBars.set(key, s.intensity ?? 'REST')
    }
  }
  const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayStart)
    d.setUTCDate(d.getUTCDate() - 6 + i)
    const key = d.toISOString().slice(0, 10)
    const kcal = kcalByDay[key] ?? null
    const intensity = intensityMapForBars.get(key) ?? 'REST'
    const dayTarget = effectiveNutritionPlan
      ? getDailyNutritionTarget(intensity, effectiveNutritionPlan)
      : null
    const effectiveTargetKcal = dayTarget?.kcal ?? 0
    const pct = (kcal !== null && effectiveTargetKcal > 0)
      ? Math.round((kcal / effectiveTargetKcal) * 100)
      : null
    return {
      label: DOW_LABELS[d.getUTCDay()],
      pct,
      isToday: key === todayStart.toISOString().slice(0, 10),
    }
  })

  // NUT-F-02: datos del menú semanal (días de la semana con dayType del plan)
  const weekMenuDays = Array.from({ length: 7 }, (_, i) => {
    const dow = i  // 0=Lun..6=Dom (nuestro sistema: jsToOurDow offset)
    const session = weekSessions.find(s => s.dayOfWeek === dow)
    const dayType = session && session.type !== 'DESCANSO'
      ? intensityToDayType(session.intensity)
      : 'rest'
    // Fecha real del día (usa mondayThisWeek ya calculado con getWeekMonday)
    const dayDate = new Date(mondayThisWeek)
    dayDate.setUTCDate(mondayThisWeek.getUTCDate() + i)
    const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    const SESSION_LABELS_MENU: Record<string, string> = {
      EASY_RUN: 'Carrera suave', TEMPO_RUN: 'Tempo', INTERVAL: 'Intervalos',
      LONG_RUN: 'Carrera larga', RECOVERY_RUN: 'Recuperacion',
      RACE: 'Carrera', FARTLEK: 'Fartlek', HILL_REPEATS: 'Cuestas',
      STRENGTH: 'Fuerza', GYM: 'Fuerza',
    }
    const sessionLabel = session && session.type !== 'DESCANSO'
      ? (SESSION_LABELS_MENU[session.type as string] ?? 'Entreno')
      : null
    return {
      label: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i],
      date: `${dayDate.getUTCDate()} ${MONTH_SHORT[dayDate.getUTCMonth()]}`,
      dayType: (weekSessions.length > 0 ? dayType : null) as 'hard' | 'easy' | 'rest' | null,
      sessionLabel: weekSessions.length > 0 ? (sessionLabel ?? 'Descanso') : null,
      isToday: dow === todayDow,
      hasSession: !!session && session.type !== 'DESCANSO',
    }
  })

  // Contexto de fase del plan
  let planPhaseText: string | null = null
  if (currentPlanWeek) {
    if (currentPlanWeek.isRecoveryWeek) {
      planPhaseText = 'Semana de descarga — prioriza proteína y descanso'
    } else {
      const intensities = currentPlanWeek.sessions.map((s) => s.intensity)
      const highCount = intensities.filter((i) => i === 'HIGH').length
      const medCount  = intensities.filter((i) => i === 'MODERATE').length
      if (highCount > intensities.length / 2) {
        planPhaseText = 'Semana de carga alta — maximiza carbohidratos'
      } else if (medCount >= intensities.length / 2) {
        planPhaseText = 'Semana de carga moderada — equilibra macros'
      }
    }
  }

  // Targets del día — fuente única de verdad: getDailyNutritionTarget
  const todayIntensity = (todaySession?.intensity as string | null)
    ?? (hasGymSessionToday ? 'MODERATE' : null)
  const nt = effectiveNutritionPlan ? getDailyNutritionTarget(todayIntensity, effectiveNutritionPlan) : null
  const todayKcal    = nt?.kcal ?? 0
  const todayCarbs   = nt?.carbsG ?? 0
  const todayProtein = nt?.proteinG ?? 0
  const todayFat     = nt?.fatG ?? 0

  // Activity kcal bonus: difference between today's target and rest-day target
  const restNt = effectiveNutritionPlan ? getDailyNutritionTarget('REST', effectiveNutritionPlan) : null
  const activityKcalBonus = todayIntensity && todayIntensity !== 'REST' && restNt
    ? Math.max(0, todayKcal - restNt.kcal)
    : 0
  const SESSION_TYPE_LABELS: Record<string, string> = {
    EASY_RUN: 'Carrera suave', TEMPO_RUN: 'Tempo', INTERVAL: 'Intervalos',
    LONG_RUN: 'Carrera larga', RECOVERY_RUN: 'Carrera de recuperacion',
    RACE: 'Carrera', FARTLEK: 'Fartlek', HILL_REPEATS: 'Cuestas',
    STRENGTH: 'Entrenamiento de fuerza', GYM: 'Entrenamiento de fuerza',
  }
  const activityLabel = todaySession?.type
    ? (SESSION_TYPE_LABELS[todaySession.type as string] ?? 'Entrenamiento')
    : hasGymSessionToday ? 'Entrenamiento de fuerza' : null

  // ── Consumed totals (from today's food logs) ──
  const consumed = todayFoodLogs.reduce(
    (acc, log) => {
      const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
      const p = log.proteinLogged ?? (log.grams / 100) * (log.food?.proteinPer100g ?? 0)
      const c = log.carbsLogged ?? (log.grams / 100) * (log.food?.carbsPer100g ?? 0)
      const f = log.fatLogged ?? (log.grams / 100) * (log.food?.fatPer100g ?? 0)
      return { kcal: acc.kcal + Math.round(kcal), proteinG: acc.proteinG + Math.round(p), carbsG: acc.carbsG + Math.round(c), fatG: acc.fatG + Math.round(f) }
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  // ── Meal checklist (planned meals + logged status) ──
  const MEAL_TYPE_LABELS_CHECK: Record<string, string> = {
    BREAKFAST: 'Desayuno', LUNCH: 'Almuerzo', DINNER: 'Cena',
    SNACK: 'Merienda', PRE_WORKOUT: 'Pre-entreno', POST_WORKOUT: 'Post-entreno',
  }
  const loggedMealTypes = new Set(todayFoodLogs.map(l => String(l.mealType)).filter(Boolean))

  // From assigned meal plan template (today's meals)
  const mealChecklist = (() => {
    const effectiveMealPlan = assignedMealPlan ?? parsedMealPlan
    if (!effectiveMealPlan) return []
    const dayKey = todayDayType as keyof typeof effectiveMealPlan
    const dayPlan = effectiveMealPlan[dayKey]
    if (!dayPlan || !('meals' in dayPlan)) return []
    type MealShape = { label: string; foods: string; kcal: number; protein?: number }
    return (dayPlan.meals as MealShape[]).map((m) => {
      const mealType = Object.entries(MEAL_TYPE_LABELS_CHECK).find(([, v]) => v === m.label)?.[0] ?? m.label
      return {
        mealType,
        label: m.label,
        foods: m.foods,
        kcal: m.kcal,
        proteinG: m.protein ?? 0,
        isLogged: loggedMealTypes.has(mealType),
      }
    })
  })()

  const pendingMeals = mealChecklist.filter(m => !m.isLogged).map(m => m.label)

  // ── Next meal (first unlogged planned meal with a time estimate) ──
  const MEAL_TIMES: Record<string, string> = {
    BREAKFAST: '08:00', PRE_WORKOUT: '10:00', LUNCH: '12:30',
    SNACK: '15:30', POST_WORKOUT: '17:00', DINNER: '19:30',
  }
  const nextMealItem = mealChecklist.find(m => !m.isLogged)
  const nextMeal = nextMealItem ? {
    label: nextMealItem.label,
    time: MEAL_TIMES[nextMealItem.mealType] ?? '12:00',
    foods: nextMealItem.foods,
    kcal: nextMealItem.kcal,
    proteinG: nextMealItem.proteinG,
  } : null

  // ── Page state ──
  const isB2B = !!assignedNutritionPlan
  const pageState: 'sin-plan' | 'con-plan' | 'b2b' = isB2B ? 'b2b' : hasMealPlan ? 'con-plan' : 'sin-plan'

  return (
    <>
      {/* Mobile header — gradient navy bar (matches dashboard/plan pattern) */}
      <div className="sm:hidden bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] px-5 pt-[max(env(safe-area-inset-top,0px),20px)] pb-[22px]">
        <h1 className="text-[20px] font-bold text-white leading-tight tracking-[-0.3px]">Nutricion</h1>
        <div className="flex items-center gap-2 mt-3">
          <span className="bg-white/15 text-white text-[12px] font-semibold px-3 py-1.5 rounded-[14px]">
            {todayStart.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
          </span>
          <span className="bg-white/15 text-white text-[11px] font-semibold px-3 py-1.5 rounded-[14px]">
            {pageState === 'b2b' ? 'Coach asigna' : `${badge.emoji} ${badge.label}`}
          </span>
        </div>
      </div>

    <div className="px-4 pt-3 pb-6 sm:py-6 md:px-8 md:py-8 max-w-7xl mx-auto">
      <NutritionPageClient
        state={pageState}
        hasMealPlan={hasMealPlan}
        consumed={consumed}
        target={nt ? { kcal: todayKcal, proteinG: todayProtein, carbsG: todayCarbs, fatG: todayFat } : null}
        nextMeal={nextMeal}
        mealChecklist={mealChecklist}
        planName={assignedNutritionPlan?.template.name ?? null}
        activityKcalBonus={activityKcalBonus}
        activityLabel={activityLabel}

        headerSlot={
          /* Desktop header only — mobile header is outside this wrapper */
          <div className="hidden lg:flex items-start justify-between flex-wrap gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nutricion de hoy</h1>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${badge.color}`}>
              {badge.emoji} {badge.label}
            </span>
          </div>
        }

        proposalSlot={
          <>
            {coachProposals.map((p) => (
              <CoachNutritionProposalCard
                key={p.id}
                id={p.id}
                coachName={p.coach?.name ?? null}
                message={p.message}
                deltaKcal={p.deltaKcal}
                deltaProtein={p.deltaProtein}
                deltaCarbs={p.deltaCarbs}
                deltaFat={p.deltaFat}
              />
            ))}
          </>
        }

        activitySlot={
          (todaySession || hasGymSessionToday) ? (
            <ActivityCard
              sessionType={todaySession?.type ?? null}
              intensity={todaySession?.intensity ?? null}
              durationMin={todaySession?.durationMin ?? null}
              isGymDay={hasGymSessionToday}
              zoneTarget={todaySession?.zoneTarget ?? null}
              weekNumber={currentWeek}
            />
          ) : null
        }

        phaseBannerSlot={
          planPhaseText ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 font-medium">
              {planPhaseText}
            </div>
          ) : null
        }

        macroCardsSlot={
          effectiveNutritionPlan && (todayKcal > 0 || todayProtein > 0) ? (
            <MacroTargetCards kcal={todayKcal} proteinG={todayProtein} carbsG={todayCarbs} fatG={todayFat} />
          ) : null
        }

        emptyMealPlanSlot={
          !hasMealPlan ? (
            <div className="space-y-4">
              <EmptyMealPlanCard tdee={effectiveNutritionPlan?.tdee ?? null} isB2B={isB2B} />

              {/* NUT-FLOW-01 — CTA dinamico segun estado */}
              {!assignedNutritionPlan && nutritionPlan && !mealPlan && (
                !athleteTemplate ? (
                  <div className="bg-[#1e3a5f]/4 border border-[#1e3a5f]/15 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#1e3a5f]">Configura tu plan de comidas</p>
                      <p className="text-xs text-gray-500 mt-0.5">Disena tu menu tipo para dias duros, faciles y de descanso.</p>
                    </div>
                    <Link href="/nutrition/builder" className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#1e3a5f' }}>
                      Crear plantilla &rarr;
                    </Link>
                  </div>
                ) : !hasPlannedMealsThisWeek ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-orange-800">Planifica esta semana</p>
                      <p className="text-xs text-orange-600 mt-0.5">Tu plantilla <strong>{athleteTemplate.name}</strong> esta lista.</p>
                    </div>
                    <Link href={`/nutrition/builder/${athleteTemplate.id}`} className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#ea580c' }}>
                      Planificar semana &rarr;
                    </Link>
                  </div>
                ) : null
              )}

              {/* Plan en DB pero datos invalidos */}
              {mealPlan && !parsedMealPlan && nutritionPlan && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">Tu plan de comidas necesita actualizarse</p>
                  <p className="text-xs text-yellow-600 mb-3">El formato anterior no es compatible.</p>
                  <Link href="/nutrition/builder" className="inline-block text-xs font-bold text-white bg-[#1e3a5f] px-4 py-2 rounded-lg hover:bg-[#162d4a] transition-colors">
                    Crear plantilla &rarr;
                  </Link>
                </div>
              )}

              {/* Sin plan nutricional base */}
              {!nutritionPlan && !needsNutritionInit && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
                  Completa el onboarding para activar tu plan nutricional base.
                </div>
              )}
            </div>
          ) : null
        }

        coachBannerSlot={
          assignedNutritionPlan ? (
            <CoachNutritionBanner
              coachName={activeCoachRelation?.coach?.name ?? null}
              planName={assignedNutritionPlan.template.name}
            />
          ) : null
        }

        weeklyMenuSlot={
          activePlan && weekMenuDays.some(d => d.dayType !== null) ? (
            <WeeklyMenuStrip days={weekMenuDays} />
          ) : null
        }

        pendingBannerSlot={<PendingMealsBanner pendingMeals={pendingMeals} />}

        mealCardsSlot={
          hasMealPlan && todayPlannedMeals.length > 0 ? (
            <MealSummaryCards meals={todayPlannedMeals} />
          ) : null
        }

        mealPlanSlot={
          hasMealPlan && (assignedMealPlan ?? parsedMealPlan) && effectiveNutritionPlan ? (
            <NutritionContent
              mealPlan={(assignedMealPlan ?? parsedMealPlan) as unknown as MealPlanData}
              todayDayType={todayDayType}
            />
          ) : null
        }

        menuLinksSlot={
          hasMealPlan ? (
            <div className="flex gap-4 text-sm">
              <Link href="/nutrition/builder" className="text-[#1e3a5f] font-semibold hover:underline">
                Editar mi menu &rarr;
              </Link>
              <Link href="/nutrition/planner" className="text-[#1e3a5f] font-semibold hover:underline">
                Aplicar menu a esta semana &rarr;
              </Link>
            </div>
          ) : null
        }

        trackingSectionSlot={
          effectiveNutritionPlan && allFoods.length > 0 ? (
            <TrackingSection
              target={{ kcal: todayKcal, proteinG: todayProtein, carbsG: todayCarbs, fatG: todayFat }}
              foods={allFoods}
            />
          ) : null
        }

        hydrationSlot={
          effectiveNutritionPlan ? (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 hidden lg:block">Hidratacion</p>
              <HydrationWidget
                initialMl={todayWaterLog?.mlLogged ?? 0}
                initialTarget={nutritionPlan?.waterMlTarget ?? 2000}
              />
            </div>
          ) : null
        }

        adherenceSlot={
          effectiveNutritionPlan ? (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Adherencia — 7 dias</p>
              <WeeklyNutritionBars days={weekBars} />
            </div>
          ) : null
        }

        tipSlot={
          effectiveNutritionPlan && todayDayType ? (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 hidden lg:block">Consejo del dia</p>
              <TipCard dayType={todayDayType} />
            </div>
          ) : null
        }

        initSlot={needsNutritionInit ? <NutritionInitClient /> : null}

        kcalStrategySlot={
          !isB2B && nutritionPlan ? (
            <AthleteKcalStrategy currentAdjustment={nutritionPlan.kcalAdjustment} />
          ) : null
        }

        foodGuideSlot={
          allFoods.length > 0 && effectiveNutritionPlan ? (
            <div className="pt-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Guia de alimentos</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <FoodGuide foods={allFoods} proteinTarget={todayProtein} carbsTarget={todayCarbs} fatTarget={todayFat} kcalTarget={todayKcal} />
            </div>
          ) : null
        }
      />
    </div>
    </>
  )
}
