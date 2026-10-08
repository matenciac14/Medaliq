import { prisma } from '@/lib/db/prisma'

const FEATURE_LABEL: Record<string, string> = {
  plan:       'Plan',
  checkin:    'Check-in',
  nutrition:  'Nutrición',
  progress:   'Progreso',
  log:        'Log',
  coach:      'Coach',
  gym:        'Entrenamiento',
}

function tier(role: string, featureCoach: boolean, featurePlan: boolean, featureLog: boolean): { label: string; color: string } {
  if (role === 'ADMIN')  return { label: 'Admin',    color: 'bg-red-100 text-red-700' }
  if (role === 'COACH' || featureCoach) return { label: 'Coach', color: 'bg-orange-100 text-orange-700' }
  if (featurePlan) return { label: 'Pro',      color: 'bg-purple-100 text-purple-700' }
  if (featureLog)  return { label: 'Free',     color: 'bg-gray-100 text-gray-600' }
  return { label: 'Inactivo', color: 'bg-red-50 text-red-500' }
}

export default async function AdminSubscriptionsPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
      onboardingCompleted: true,
    },
  })

  const parsed = users.map((u) => ({
    ...u,
    features: {
      plan: u.featurePlan, checkin: u.featureCheckin, nutrition: u.featureNutrition,
      progress: u.featureProgress, log: u.featureLog, coach: u.featureCoach, gym: u.featureGym,
    },
    tier: tier(u.role, u.featureCoach, u.featurePlan, u.featureLog),
  }))

  const counts = {
    Pro:      parsed.filter((u) => u.tier.label === 'Pro').length,
    Free:     parsed.filter((u) => u.tier.label === 'Free').length,
    Inactivo: parsed.filter((u) => u.tier.label === 'Inactivo').length,
    Coach:    parsed.filter((u) => u.tier.label === 'Coach').length,
    Admin:    parsed.filter((u) => u.tier.label === 'Admin').length,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suscripciones</h1>
        <p className="text-sm text-gray-500 mt-1">Distribución de usuarios por plan</p>
      </div>

      {/* Tier summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-extrabold text-gray-900">{count}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* User table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Detalle por usuario</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Features activas</th>
                <th className="px-5 py-3 text-left">Onboarding</th>
                <th className="px-5 py-3 text-left">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parsed.map((u) => {
                const activeFeatures = Object.entries(u.features)
                  .filter(([, v]) => v)
                  .map(([k]) => k)

                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{u.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.tier.color}`}>
                        {u.tier.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {activeFeatures.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {activeFeatures.map((f) => (
                            <span key={f} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                              {FEATURE_LABEL[f] ?? f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">ninguna</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {u.onboardingCompleted
                        ? <span className="text-green-600 text-xs">✓ Sí</span>
                        : <span className="text-gray-400 text-xs">No</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        * Los tiers se infieren del rol y las features activas en columnas del usuario. Cuando se integre billing, este dato vendrá de UserSubscription.
      </p>
    </div>
  )
}
