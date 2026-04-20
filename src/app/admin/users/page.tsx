import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'
import { ChangeRoleButton } from './_components/ChangeRoleButton'
import { PlanSelector } from './_components/PlanSelector'

type PlanTier = 'FREE' | 'PRO' | 'COACH'

function inferPlanTier(role: string, cfg: ReturnType<typeof parseUserConfig>): PlanTier {
  if (role === 'COACH') return 'COACH'
  const f = cfg.features
  if (f.plan && f.checkin && f.log && f.progress && f.nutrition) return 'PRO'
  return 'FREE'
}

const ROLE_BADGE: Record<string, string> = {
  ATHLETE: 'bg-blue-100 text-blue-700',
  COACH:   'bg-orange-100 text-orange-700',
  ADMIN:   'bg-red-100 text-red-700',
}

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      config: true,
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios ({users.length})</h1>
        <p className="text-sm text-gray-500 mt-1">Todos los usuarios registrados en la plataforma</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Rol</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Onboarding</th>
                <th className="px-5 py-3 text-left">Deporte / Objetivo</th>
                <th className="px-5 py-3 text-left">Registrado</th>
                <th className="px-5 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const cfg = parseUserConfig(u.config)
                const sport = cfg.sport.type ?? '—'
                const goal  = cfg.sport.goal ?? '—'
                const planTier = inferPlanTier(u.role, cfg)

                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {u.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <PlanSelector userId={u.id} currentTier={planTier} />
                    </td>
                    <td className="px-5 py-3">
                      {cfg.onboarding.completed ? (
                        <span className="text-green-600 text-xs font-medium">✓ Completado</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Pendiente</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {sport !== '—' ? `${sport} · ${goal}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-5 py-3">
                      <ChangeRoleButton userId={u.id} currentRole={u.role} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
