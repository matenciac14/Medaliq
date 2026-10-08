import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { DuplicateRoutineButton } from './_components/DuplicateRoutineButton'

export default async function GymDashboardPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    redirect('/dashboard')
  }

  const coachId = session.user.id

  const [templates, exerciseCount, activeAssignments] = await Promise.all([
    prisma.workoutTemplate.findMany({
      where: { coachId, isActive: true },
      include: {
        days: { select: { id: true } },
        assignments: {
          where: { isActive: true },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.exercise.count({
      where: { OR: [{ coachId }, { coachId: null }] },
    }),
    prisma.assignedWorkout.count({
      where: { coachId, isActive: true },
    }),
  ])

  const GOAL_LABELS: Record<string, string> = {
    HYPERTROPHY: 'Hipertrofia',
    STRENGTH: 'Fuerza',
    TONING: 'Tonificación',
    FUNCTIONAL: 'Funcional',
    ENDURANCE: 'Resistencia',
  }

  const LEVEL_LABELS: Record<string, string> = {
    BEGINNER: 'Principiante',
    INTERMEDIATE: 'Intermedio',
    ADVANCED: 'Avanzado',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
            Entrenamiento — Rutinas
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Diseña y asigna rutinas de fuerza a tus atletas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/coach/gym/exercises"
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Biblioteca de ejercicios
          </Link>
          <Link
            href="/coach/gym/routines/new"
            className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#ea580c' }}
          >
            + Nueva rutina
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Rutinas creadas" value={templates.length} color="#1e3a5f" />
        <StatCard label="Atletas con rutina activa" value={activeAssignments} color="#ea580c" />
        <StatCard label="Ejercicios en biblioteca" value={exerciseCount} color="#16a34a" />
      </div>

      {/* Templates list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Mis rutinas</h2>
          <span className="text-sm text-gray-400">{templates.length} total</span>
        </div>

        {templates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm mb-4">
              Aún no has creado ninguna rutina
            </p>
            <Link
              href="/coach/gym/routines/new"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#ea580c' }}
            >
              + Crear primera rutina
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {templates.map((t) => (
              <div key={t.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{t.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {t.goal && (
                      <span className="text-xs text-gray-500">
                        {GOAL_LABELS[t.goal] ?? t.goal}
                      </span>
                    )}
                    {t.level && (
                      <span className="text-xs text-gray-400">
                        · {LEVEL_LABELS[t.level] ?? t.level}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      · {t.daysPerWeek} días/semana
                    </span>
                    <span className="text-xs text-gray-400">
                      · {t.assignments.length} atleta{t.assignments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DuplicateRoutineButton templateId={t.id} />
                  <Link
                    href={`/coach/gym/routines/${t.id}/assign`}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors"
                  >
                    Asignar
                  </Link>
                  <Link
                    href={`/coach/gym/routines/${t.id}`}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    Ver / editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}
