import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { mockWeeks } from '@/lib/mock/dashboard-data'
import ProgressClient, {
  type WeightPoint,
  type HrPoint,
  type WeekData,
} from './_components/ProgressClient'

// Mock fallback arrays (antes hardcodeados en el componente)
const MOCK_WEIGHT: WeightPoint[] = [
  { week: 1, kg: 78.0 }, { week: 2, kg: 77.6 }, { week: 3, kg: 77.2 },
  { week: 4, kg: 76.9 }, { week: 5, kg: 76.5 }, { week: 6, kg: 76.1 },
  { week: 7, kg: 75.8 }, { week: 8, kg: 75.4 }, { week: 9, kg: 75.1 },
  { week: 10, kg: 74.8 }, { week: 11, kg: 74.5 }, { week: 12, kg: 74.1 },
]

const MOCK_HR: HrPoint[] = [
  { week: 1, bpm: 58 }, { week: 2, bpm: 57 }, { week: 3, bpm: 58 },
  { week: 4, bpm: 56 }, { week: 5, bpm: 56 }, { week: 6, bpm: 55 },
  { week: 7, bpm: 55 }, { week: 8, bpm: 54 }, { week: 9, bpm: 54 },
  { week: 10, bpm: 53 }, { week: 11, bpm: 53 }, { week: 12, bpm: 52 },
]

const MOCK_WEEKS: WeekData[] = mockWeeks.map((w) => ({
  weekNumber: w.weekNumber,
  phase: w.phase,
  volumeKm: w.volumeKm,
  adherencePct: 75, // placeholder mock
}))

const MOCK_WEIGHT_GOAL = 74.0

// Adherencia real: sesiones con log / sesiones planificadas
function calcAdherencePct(
  sessions: { log: { id: string } | null }[]
): number {
  if (sessions.length === 0) return 0
  const completed = sessions.filter((s) => s.log !== null).length
  return Math.round((completed / sessions.length) * 100)
}

export default async function ProgressPage() {
  const session = await auth()

  if (!session?.user?.id) {
    // El layout ya protege esta ruta, pero por si acaso
    return null
  }

  // ── Fetch check-ins ──────────────────────────────────────────────────────
  const rawCheckIns = await prisma.weeklyCheckIn.findMany({
    where: { userId: session.user.id },
    orderBy: { weekNumber: 'asc' },
    select: {
      weekNumber: true,
      weightKg: true,
      hrResting: true,
      recordedAt: true,
    },
  })

  // ── Fetch plan activo con semanas y sesiones ─────────────────────────────
  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
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
  const profile = await prisma.healthProfile.findUnique({
    where: { userId: session.user.id },
    select: { weightGoalKg: true },
  })

  const weightGoal = profile?.weightGoalKg ?? MOCK_WEIGHT_GOAL

  // ── Construir arrays de datos ────────────────────────────────────────────

  // Check-ins → weight y hr (solo incluir semanas con datos)
  const weightFromDB: WeightPoint[] = rawCheckIns
    .filter((c) => c.weightKg !== null)
    .map((c) => ({ week: c.weekNumber, kg: c.weightKg as number }))

  const hrFromDB: HrPoint[] = rawCheckIns
    .filter((c) => c.hrResting !== null)
    .map((c) => ({ week: c.weekNumber, bpm: c.hrResting as number }))

  // Semanas del plan → adherencia real por semana
  const weeksFromDB: WeekData[] = plan
    ? plan.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        phase: w.phase as string,
        volumeKm: w.volumeKm ?? 0,
        adherencePct: calcAdherencePct(w.sessions),
      }))
    : []

  // ── Fallback a mock si no hay datos suficientes ──────────────────────────
  const weightCheckins = weightFromDB.length >= 2 ? weightFromDB : MOCK_WEIGHT
  const hrCheckins     = hrFromDB.length >= 2     ? hrFromDB     : MOCK_HR
  const weeks          = weeksFromDB.length > 0   ? weeksFromDB  : MOCK_WEEKS

  return (
    <ProgressClient
      weightCheckins={weightCheckins}
      hrCheckins={hrCheckins}
      weeks={weeks}
      weightGoal={weightGoal}
    />
  )
}
