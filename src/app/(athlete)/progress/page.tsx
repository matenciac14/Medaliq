import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getISOWeekNumber } from '@/lib/core/week_number'
import { calcAdherencePct } from '@/lib/core/adherence'
import ProgressClient, {
  type WeightPoint,
  type HrPoint,
  type WeekData,
  type WellbeingPoint,
  type BenchmarkPoint,
  type GymPR,
  type HistoryItem,
  type MeasurementPoint,
  type GymAdherencePoint,
  type MonthlyActivity,
  type DailyWeightPoint,
  type NutritionAdherencePoint,
  type GymPRHistorySeries,
} from './_components/ProgressClient'


export default async function ProgressPage() {
  const session = await auth()

  if (!session?.user?.id) return null

  if (!session.user.features?.progress) {
    // Mostrar cuántos registros tiene el atleta como incentivo
    const weightCount = await prisma.dailyLog.count({
      where: { userId: session.user.id, weightKg: { not: null } },
    })
    const gymCount = await prisma.gymSession.count({
      where: { athleteId: session.user.id, completed: true },
    })
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-5">
        <span className="text-5xl">📊</span>
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f]">Progreso disponible en Pro</h2>
          <p className="text-gray-500 text-sm max-w-xs mt-1">Visualiza tu evolución de peso, FC y adherencia semana a semana.</p>
        </div>
        {(weightCount > 0 || gymCount > 0) && (
          <div className="flex gap-4 text-center">
            {weightCount > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                <p className="text-2xl font-bold text-[#1e3a5f]">{weightCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">registros de peso</p>
              </div>
            )}
            {gymCount > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                <p className="text-2xl font-bold text-[#ea580c]">{gymCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">sesiones completadas</p>
              </div>
            )}
          </div>
        )}
        {(weightCount > 0 || gymCount > 0) && (
          <p className="text-sm text-gray-500 max-w-xs">Ya tienes datos acumulados. Activa Pro para ver tu tendencia completa.</p>
        )}
        <a href="/upgrade" className="inline-block rounded-xl bg-[#ea580c] text-white px-6 py-3 text-sm font-semibold hover:bg-[#ea6c0a] transition-colors">Activar Pro → $9.99/mes</a>
      </div>
    )
  }

  // ── Fetch check-ins ──────────────────────────────────────────────────────
  const rawCheckIns = await prisma.weeklyCheckIn.findMany({
    where: { userId: session.user.id },
    orderBy: { weekNumber: 'asc' },
    select: {
      weekNumber: true,
      weightKg: true,
      hrResting: true,
      energyLevel: true,
      stressLevel: true,
      motivationLevel: true,
      recordedAt: true,
      waistCm: true,
      armsCm: true,
      hipsCm: true,
      thighsCm: true,
    },
  })

  // ── Fetch plan activo con semanas y sesiones ─────────────────────────────
  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: session.user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: {
            include: { log: true },
          },
        },
      },
    },
  })

  // ── Peso del objetivo (perfil) ───────────────────────────────────────────
  const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [profile, gymSessionsCount, rawBenchmarks, rawGymPRs, rawSessionLogs, rawGymSessions, rawDailyWeights, nutritionPlanProg, foodLogs30d, rawSetHistory] = await Promise.all([
    prisma.healthProfile.findUnique({
      where: { userId: session.user.id },
      select: { weightGoalKg: true },
    }),
    prisma.gymSession.count({
      where: { athleteId: session.user.id, completed: true },
    }),
    prisma.performanceBenchmark.findMany({
      where: { userId: session.user.id },
      orderBy: { testedAt: 'desc' },
      select: { id: true, sport: true, metric: true, value: true, unit: true, testedAt: true, notes: true },
    }),
    prisma.setLog.findMany({
      where: {
        isPR: true,
        session: { athleteId: session.user.id, completed: true },
      },
      orderBy: { session: { date: 'desc' } },
      take: 20,
      select: {
        id: true,
        exerciseName: true,
        weightKg: true,
        repsCompleted: true,
        session: { select: { date: true } },
      },
    }),
    prisma.sessionLog.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: 'desc' },
      take: 120,
      select: {
        id: true,
        completedAt: true,
        durationMin: true,
        distanceKm: true,
        rpe: true,
        plannedSession: { select: { type: true } },
      },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: session.user.id, completed: true },
      orderBy: { date: 'desc' },
      take: 120,
      select: {
        id: true,
        date: true,
        durationMin: true,
        rpe: true,
        assignedWorkout: { select: { template: { select: { name: true, daysPerWeek: true } } } },
        plannedSession: { select: { workoutDay: { select: { label: true } } } },
      },
    }),
    prisma.dailyLog.findMany({
      where: { userId: session.user.id, date: { gte: ninetyDaysAgo }, weightKg: { not: null } },
      orderBy: { date: 'asc' },
      select: { date: true, weightKg: true },
    }),
    prisma.nutritionPlan.findUnique({
      where: { userId: session.user.id },
      select: { targetKcalEasy: true, targetKcalHard: true },
    }),
    prisma.foodLog.findMany({
      where: { userId: session.user.id, date: { gte: thirtyDaysAgo } },
      select: { date: true, kcalLogged: true, grams: true, food: { select: { kcalPer100g: true } } },
      orderBy: { date: 'asc' },
    }),
    // FUERZA-PROG-01: historial 1RM — últimas 24 semanas, completadas
    prisma.setLog.findMany({
      where: {
        session: { athleteId: session.user.id, completed: true },
        completed: true,
        weightKg: { not: null },
        repsCompleted: { gte: 1, lte: 15 },
      },
      orderBy: { session: { date: 'asc' } },
      take: 600,
      select: {
        exerciseName: true,
        weightKg: true,
        repsCompleted: true,
        session: { select: { date: true } },
        workoutExercise: {
          select: { exercise: { select: { name: true, nameEs: true } } },
        },
      },
    }),
  ])

  const weightGoal = profile?.weightGoalKg ?? null

  // Adherencia nutricional — últimos 30 días
  const nutritionTargetKcal = nutritionPlanProg?.targetKcalEasy ?? nutritionPlanProg?.targetKcalHard ?? 0
  const nutritionAdherence: NutritionAdherencePoint[] = []
  if (nutritionTargetKcal > 0 && foodLogs30d.length > 0) {
    const kcalByDay: Record<string, number> = {}
    for (const log of foodLogs30d) {
      const day = log.date.toISOString().slice(0, 10)
      const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
      kcalByDay[day] = (kcalByDay[day] ?? 0) + kcal
    }
    for (const [date, kcal] of Object.entries(kcalByDay).sort()) {
      nutritionAdherence.push({ date, adherencePct: kcal / nutritionTargetKcal })
    }
  }

  const dailyWeightPoints: DailyWeightPoint[] = rawDailyWeights
    .filter((d): d is typeof d & { weightKg: number } => d.weightKg !== null)
    .map(d => ({ date: d.date.toISOString(), kg: d.weightKg }))

  const RUN_TYPE_LABELS: Record<string, string> = {
    RODAJE_Z2: 'Rodaje Z2', FARTLEK: 'Fartlek', TEMPO: 'Tempo',
    INTERVALOS: 'Intervalos', TIRADA_LARGA: 'Tirada larga', OTRO: 'Sesión libre', DESCANSO: 'Descanso',
    FUERZA: 'Fuerza', TEST: 'Test', SIMULACRO: 'Simulacro',
  }

  const runItems: HistoryItem[] = rawSessionLogs.map(sl => ({
    id: `run-${sl.id}`,
    date: sl.completedAt.toISOString(),
    type: 'run' as const,
    label: sl.plannedSession?.type ? (RUN_TYPE_LABELS[sl.plannedSession.type] ?? sl.plannedSession.type) : 'Sesión libre',
    durationMin: sl.durationMin ?? null,
    distanceKm: sl.distanceKm ?? null,
    rpe: sl.rpe ?? null,
  }))

  const gymItems: HistoryItem[] = rawGymSessions.map(gs => ({
    id: `gym-${gs.id}`,
    date: gs.date.toISOString(),
    type: 'gym' as const,
    label: gs.plannedSession?.workoutDay?.label ?? gs.assignedWorkout?.template.name ?? 'Sesión de gym',
    durationMin: gs.durationMin ?? null,
    rpe: gs.rpe ?? null,
  }))

  const recentActivity: HistoryItem[] = [...runItems, ...gymItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)

  const benchmarks: BenchmarkPoint[] = rawBenchmarks.map(b => ({
    ...b,
    testedAt: b.testedAt.toISOString(),
  }))

  const gymPRs: GymPR[] = rawGymPRs.map(r => ({
    id: r.id,
    exerciseName: r.exerciseName ?? 'Ejercicio',
    weightKg: r.weightKg,
    repsCompleted: r.repsCompleted,
    date: r.session.date.toISOString(),
  }))

  // ── Construir arrays de datos ────────────────────────────────────────────

  const weightCheckins: WeightPoint[] = rawCheckIns
    .filter((c): c is typeof c & { weightKg: number } => c.weightKg !== null)
    .map((c) => ({ week: c.weekNumber, kg: c.weightKg }))

  const hrCheckins: HrPoint[] = rawCheckIns
    .filter((c): c is typeof c & { hrResting: number } => c.hrResting !== null)
    .map((c) => ({ week: c.weekNumber, bpm: c.hrResting }))

  const wellbeingData: WellbeingPoint[] = rawCheckIns
    .filter((c) => c.energyLevel != null || c.stressLevel != null || c.motivationLevel != null)
    .map((c) => ({
      week: c.weekNumber,
      energyLevel: c.energyLevel ?? null,
      stressLevel: c.stressLevel ?? null,
      motivationLevel: c.motivationLevel ?? null,
    }))

  const measurementCheckins: MeasurementPoint[] = rawCheckIns
    .filter((c) => c.waistCm != null || c.armsCm != null || c.hipsCm != null || c.thighsCm != null)
    .map((c) => ({
      week: c.weekNumber,
      waistCm: c.waistCm ?? null,
      armsCm: c.armsCm ?? null,
      hipsCm: c.hipsCm ?? null,
      thighsCm: c.thighsCm ?? null,
    }))

  const weeks: WeekData[] = plan
    ? plan.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        phase: w.phase as string,
        volumeKm: w.volumeKm ?? 0,
        adherencePct: (() => {
          const training = w.sessions.filter(s => s.type !== 'DESCANSO')
          return calcAdherencePct(training.filter(s => s.log !== null).length, training.length)
        })(),
      }))
    : []

  // ── Actividad mensual (EJ-05) ───────────────────────────────────────────
  const MONTH_LABELS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const monthlyMap = new Map<string, { gymCount: number; runCount: number }>()

  for (const gs of rawGymSessions) {
    const d = new Date(gs.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const curr = monthlyMap.get(key) ?? { gymCount: 0, runCount: 0 }
    monthlyMap.set(key, { ...curr, gymCount: curr.gymCount + 1 })
  }
  for (const sl of rawSessionLogs) {
    const d = new Date(sl.completedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const curr = monthlyMap.get(key) ?? { gymCount: 0, runCount: 0 }
    monthlyMap.set(key, { ...curr, runCount: curr.runCount + 1 })
  }

  const monthlyActivity: MonthlyActivity[] = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, counts]) => {
      const [year, month] = key.split('-')
      return {
        yearMonth: key,
        label: `${MONTH_LABELS_ES[parseInt(month) - 1]} ${year}`,
        ...counts,
      }
    })

  // ── Sin datos: estado vacío honesto ─────────────────────────────────────
  // UX-PROG-03: solo mostrar empty state si no hay absolutamente ningún dato (ni gym)
  if (weightCheckins.length === 0 && hrCheckins.length === 0 && weeks.length === 0 && gymSessionsCount === 0) {
    const hasGymSessions = gymSessionsCount > 0
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-6">
        {/* Estado vacío con contexto */}
        <div className="text-center space-y-3 py-4">
          <span className="text-5xl">{hasGymSessions ? '💪' : '📈'}</span>
          <h2 className="text-xl font-bold text-[#1e3a5f]">
            {hasGymSessions ? `${gymSessionsCount} sesiones completadas` : 'Aquí verás tu evolución'}
          </h2>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            {hasGymSessions
              ? 'Haz tu primer check-in semanal para ver tu evolución de peso y FC.'
              : 'Registra check-ins semanales y sesiones para ver tus gráficas aquí.'}
          </p>
          <div className="flex gap-3 mt-2 flex-wrap justify-center">
            <a href="/checkin" className="inline-block rounded-xl bg-[#ea580c] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#ea6c0a] transition-colors">Hacer check-in →</a>
            <a href="/gym" className="inline-block rounded-xl border border-gray-300 text-gray-700 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              {hasGymSessions ? 'Ver historial' : 'Ir a ejercicios'}
            </a>
          </div>
        </div>

        {/* Preview de las métricas que se acumularán */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Lo que vas a ver aquí</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: '⚖️', label: 'Evolución de peso', desc: 'Curva semana a semana vs tu meta' },
              { icon: '❤️', label: 'FC reposo', desc: 'Tendencia de recuperación cardiovascular' },
              { icon: '💪', label: 'PRs de gym', desc: 'Tus mejores levantamientos por ejercicio' },
              { icon: '📊', label: 'Adherencia', desc: 'Porcentaje de sesiones completadas' },
              { icon: '😴', label: 'Bienestar', desc: 'Energía, estrés y motivación semanal' },
              { icon: '🏃', label: 'Actividad mensual', desc: 'Sesiones de gym y running por mes' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-2xl mb-2">{item.icon}</p>
                <p className="text-xs font-semibold text-[#1e3a5f] leading-tight mb-1">{item.label}</p>
                <p className="text-xs text-gray-400 leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    )
  }

  // ── 1RM history by exercise (FUERZA-PROG-01) ────────────────────────────
  const epley = (kg: number, reps: number) => Math.round(kg * (1 + reps / 30) * 10) / 10
  const byExerciseKey = new Map<string, { displayName: string; points: { date: string; oneRmKg: number }[] }>()

  for (const log of rawSetHistory) {
    if (log.weightKg === null || log.repsCompleted === null) continue
    const displayName = log.workoutExercise?.exercise?.nameEs
      ?? log.workoutExercise?.exercise?.name
      ?? log.exerciseName
      ?? 'Ejercicio'
    const key = log.exerciseName ?? log.workoutExercise?.exercise?.name ?? displayName
    if (!byExerciseKey.has(key)) byExerciseKey.set(key, { displayName, points: [] })
    byExerciseKey.get(key)!.points.push({
      date: log.session.date.toISOString().slice(0, 10),
      oneRmKg: epley(log.weightKg, log.repsCompleted),
    })
  }

  // Keep best 1RM per day per exercise, then top 5 exercises by data points
  const gymPRHistory: GymPRHistorySeries[] = [...byExerciseKey.values()]
    .map(({ displayName, points }) => {
      const byDay = new Map<string, number>()
      for (const p of points) {
        if (!byDay.has(p.date) || p.oneRmKg > byDay.get(p.date)!) {
          byDay.set(p.date, p.oneRmKg)
        }
      }
      return {
        exerciseName: displayName,
        points: [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, oneRmKg]) => ({ date, oneRmKg })),
      }
    })
    .filter((s) => s.points.length >= 2)
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, 5)

  // ── Gym adherence by week (UX-PROG-02 fix) ──────────────────────────────
  // UX-PROG-02: el bug anterior tomaba daysPerWeek solo de rawGymSessions[0] (más reciente)
  // y si ese no tenía assignedWorkout devolvía 0 → chart vacío.
  // Fix: por semana, tomar daysPerWeek de cualquier sesión de esa semana.
  // Fallback global: moda de daysPerWeek entre todas las sesiones.
  // Si no hay ningún target, total = 0 → ProgressClient muestra "X ses." sin %.
  const dpwFreq = new Map<number, number>()
  for (const gs of rawGymSessions) {
    const dpw = gs.assignedWorkout?.template.daysPerWeek
    if (dpw) dpwFreq.set(dpw, (dpwFreq.get(dpw) ?? 0) + 1)
  }
  const globalDpw = dpwFreq.size > 0
    ? [...dpwFreq.entries()].sort(([, a], [, b]) => b - a)[0][0]
    : 0

  const gymSessionsByWeek = new Map<number, { count: number; daysPerWeek: number }>()
  for (const gs of rawGymSessions) {
    const week = getISOWeekNumber(new Date(gs.date))
    const dpw = gs.assignedWorkout?.template.daysPerWeek ?? 0
    const existing = gymSessionsByWeek.get(week)
    if (existing) {
      existing.count += 1
      if (existing.daysPerWeek === 0 && dpw > 0) existing.daysPerWeek = dpw
    } else {
      gymSessionsByWeek.set(week, { count: 1, daysPerWeek: dpw })
    }
  }

  const gymAdherenceByWeek: GymAdherencePoint[] = [...gymSessionsByWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([isoWeek, { count, daysPerWeek }]) => ({
      isoWeek,
      completed: count,
      total: daysPerWeek > 0 ? daysPerWeek : globalDpw,
    }))

  return (
    <ProgressClient
      weightCheckins={weightCheckins}
      hrCheckins={hrCheckins}
      wellbeingData={wellbeingData}
      weeks={weeks}
      weightGoal={weightGoal}
      benchmarks={benchmarks}
      gymPRs={gymPRs}
      gymPRHistory={gymPRHistory}
      recentActivity={recentActivity}
      measurementCheckins={measurementCheckins}
      gymAdherenceByWeek={gymAdherenceByWeek}
      monthlyActivity={monthlyActivity}
      dailyWeightPoints={dailyWeightPoints}
      nutritionAdherence={nutritionAdherence}
      nutritionTargetKcal={nutritionTargetKcal}
    />
  )
}
