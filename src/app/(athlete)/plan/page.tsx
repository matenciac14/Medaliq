import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import { mockPlan, mockWeeks } from '@/lib/mock/dashboard-data'
import PlanClient, { type PlanClientPlan, type PlanClientWeek } from './_components/PlanClient'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default async function PlanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Feature gating — Free users no tienen plan
  if (session.user.userPlan === 'FREE') {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Plan de entrenamiento</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            El plan adaptativo con periodización y sesiones semanales está disponible en el plan Pro.
          </p>
          <a
            href="/upgrade"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Ver planes → Pro $15/mes
          </a>
        </div>
      </div>
    )
  }

  const userId = session.user.id

  let plan: PlanClientPlan = {
    name: mockPlan.name,
    currentWeek: mockPlan.currentWeek,
    totalWeeks: mockPlan.totalWeeks,
    startDate: mockPlan.startDate,
  }

  let weeks: PlanClientWeek[] = mockWeeks.map((w) => ({
    weekNumber: w.weekNumber,
    phase: w.phase,
    volumeKm: w.volumeKm,
    isRecoveryWeek: w.isRecoveryWeek,
    hasTest: w.hasTest,
    focusDescription: w.focusDescription,
    sessions: w.sessions.map((s) => ({
      day: s.day,
      type: s.type,
      label: s.label,
      done: s.done,
    })),
  }))

  try {
    const activePlan = await prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { dayOfWeek: 'asc' },
              include: { log: true },
            },
          },
        },
      },
    })

    if (activePlan) {
      // Calcular semana actual
      const now = new Date()
      const start = new Date(activePlan.startDate)
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const currentWeek = Math.max(1, Math.min(activePlan.totalWeeks, Math.floor(diffDays / 7) + 1))

      plan = {
        name: activePlan.name,
        currentWeek,
        totalWeeks: activePlan.totalWeeks,
        startDate: activePlan.startDate.toISOString().split('T')[0],
      }

      weeks = activePlan.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        phase: w.phase,
        volumeKm: w.volumeKm ?? 0,
        isRecoveryWeek: w.isRecoveryWeek,
        hasTest: w.sessions.some((s) => s.type === 'TEST' || s.type === 'SIMULACRO'),
        focusDescription: w.focusDescription ?? '',
        sessions: w.sessions.map((s) => ({
          day: DAY_LABELS[s.dayOfWeek] ?? String(s.dayOfWeek),
          type: s.type,
          label: s.detailText?.slice(0, 40) ?? s.type,
          done: !!s.log,
        })),
      }))
    }
  } catch {
    // Fallback silencioso — se usan los mock values ya asignados
  }

  return <PlanClient plan={plan} weeks={weeks} />
}
