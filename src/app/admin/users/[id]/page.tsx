import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteUserButton } from './_components/DeleteUserButton'
import { ResetPasswordButton } from './_components/ResetPasswordButton'

const ROLE_BADGE: Record<string, string> = {
  ATHLETE: 'bg-blue-100 text-blue-700',
  COACH:   'bg-orange-100 text-orange-700',
  ADMIN:   'bg-red-100 text-red-700',
}

import { GOAL_LABEL, SPORT_LABEL } from '@/lib/labels/enum_labels'

const SOURCE_LABEL: Record<string, string> = {
  COACH: 'Coach',
}

export default async function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      onboardingCompleted: true, onboardingCompletedAt: true,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
      profile: {
        select: {
          sport: true, sportGoal: true, age: true, weightKg: true,
          heightCm: true, hrResting: true, hrMax: true,
        },
      },
      trainingPlans: {
        where: { status: 'ACTIVE' },
        select: { id: true, goalType: true, startDate: true, status: true, generatedBy: true, weeks: { select: { weekNumber: true } } },
        take: 1,
      },
      checkIns: {
        orderBy: { recordedAt: 'desc' },
        take: 1,
        select: {
          hardestSessionRpe: true, energyLevel: true, sleepHours: true,
          weightKg: true, recordedAt: true,
        },
      },
      coachedBy: {
        select: { coach: { select: { id: true, name: true, email: true } } },
      },
    },
  })

  if (!user) notFound()

  const activePlan = user.trainingPlans[0] ?? null
  const lastCheckIn = user.checkIns[0] ?? null
  const coach = user.coachedBy[0]?.coach ?? null

  const features = [
    { key: 'featurePlan',      label: 'Plan' },
    { key: 'featureCheckin',   label: 'Check-in' },
    { key: 'featureNutrition', label: 'Nutrición' },
    { key: 'featureProgress',  label: 'Progreso' },
    { key: 'featureLog',       label: 'Log' },
    { key: 'featureGym',       label: 'Entrenamiento' },
    { key: 'featureCoach',     label: 'Coach' },
  ] as const

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/users" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Usuarios
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-gray-900">{user.name ?? '—'}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
              {user.role}
            </span>
          </div>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="text-xs text-gray-400 mt-1">
            Registrado el {new Date(user.createdAt).toLocaleDateString('es-CO')}
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>Onboarding</p>
          <p className={`font-semibold mt-0.5 ${user.onboardingCompleted ? 'text-green-600' : 'text-gray-400'}`}>
            {user.onboardingCompleted ? '✓ Completado' : 'Pendiente'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Perfil de salud */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Perfil de salud</h2>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Deporte',    value: SPORT_LABEL[user.profile?.sport ?? ''] ?? user.profile?.sport ?? '—' },
              { label: 'Objetivo',   value: GOAL_LABEL[user.profile?.sportGoal ?? ''] ?? user.profile?.sportGoal ?? '—' },
              { label: 'Edad',       value: user.profile?.age ? `${user.profile.age} años` : '—' },
              { label: 'Peso',       value: user.profile?.weightKg ? `${user.profile.weightKg} kg` : '—' },
              { label: 'Talla',      value: user.profile?.heightCm ? `${user.profile.heightCm} cm` : '—' },
              { label: 'FC reposo',  value: user.profile?.hrResting ? `${user.profile.hrResting} bpm` : '—' },
              { label: 'FC máxima',  value: user.profile?.hrMax ? `${user.profile.hrMax} bpm` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-400">{label}</span>
                <span className="font-medium text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan activo + coach */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3 text-sm">Plan activo</h2>
            {activePlan ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Objetivo</span>
                  <span className="font-medium text-gray-700">
                    {activePlan.goalType ? (GOAL_LABEL[activePlan.goalType] ?? activePlan.goalType) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Inicio</span>
                  <span className="font-medium text-gray-700">
                    {activePlan.startDate ? new Date(activePlan.startDate).toLocaleDateString('es-CO') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Semanas</span>
                  <span className="font-medium text-gray-700">{activePlan.weeks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fuente</span>
                  <span className="font-medium text-gray-700">
                    {SOURCE_LABEL[activePlan.generatedBy] ?? activePlan.generatedBy}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin plan activo</p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3 text-sm">Coach asignado</h2>
            {coach ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-gray-700">{coach.name ?? '—'}</p>
                <p className="text-gray-400">{coach.email}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin coach (B2C)</p>
            )}
          </div>
        </div>
      </div>

      {/* Último check-in */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3 text-sm">Último check-in</h2>
        {lastCheckIn ? (
          <div className="grid grid-cols-4 gap-4 text-sm">
            {[
              { label: 'RPE',     value: lastCheckIn.hardestSessionRpe ?? '—' },
              { label: 'Energía', value: lastCheckIn.energyLevel ?? '—' },
              { label: 'Sueño',   value: lastCheckIn.sleepHours ? `${lastCheckIn.sleepHours}h` : '—' },
              { label: 'Peso',    value: lastCheckIn.weightKg ? `${lastCheckIn.weightKg} kg` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="font-bold text-gray-800 text-lg mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Sin check-ins registrados</p>
        )}
        {lastCheckIn && (
          <p className="text-xs text-gray-400 mt-3">
            {new Date(lastCheckIn.recordedAt).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>

      {/* Feature flags */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3 text-sm">Features activas</h2>
        <div className="flex flex-wrap gap-2">
          {features.map(({ key, label }) => {
            const active = user[key as keyof typeof user] as boolean
            return (
              <span
                key={key}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${active ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400 line-through'}`}
              >
                {label}
              </span>
            )
          })}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 text-sm">Acciones</h2>
        <ResetPasswordButton email={user.email} />
      </div>

      {/* Zona peligrosa */}
      <div className="border border-red-100 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-red-700 text-sm">Zona peligrosa</h2>
        <p className="text-xs text-gray-500">
          Eliminar este usuario borrará en cascada todos sus datos. La acción quedará registrada
          en el log de actividad.
        </p>
        <DeleteUserButton userId={user.id} userName={user.name} />
      </div>
    </div>
  )
}
