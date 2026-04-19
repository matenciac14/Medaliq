import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'
import { ActivateButton } from './_components/ActivateButton'

export default async function ActivacionesPage() {
  const allAthletes = await prisma.user.findMany({
    where: { role: 'ATHLETE' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      config: true,
    },
  })

  // Free tier: plan=false OR checkin=false (DEFAULT_USER_CONFIG defaults)
  const pendingUsers = allAthletes.filter((u) => {
    const cfg = parseUserConfig(u.config)
    return !cfg.features.plan || !cfg.features.checkin
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activaciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Usuarios registrados pendientes de activación manual
        </p>
      </div>

      {/* Summary card */}
      <div className="mb-6 inline-flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg">
          {pendingUsers.length}
        </div>
        <div>
          <p className="font-semibold text-amber-900">
            {pendingUsers.length === 1
              ? '1 usuario pendiente de activación'
              : `${pendingUsers.length} usuarios pendientes de activación`}
          </p>
          <p className="text-xs text-amber-700">Tier Free — sin plan ni check-in habilitados</p>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
          No hay usuarios pendientes de activación.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Deporte</th>
                  <th className="px-5 py-3 text-left">Onboarding</th>
                  <th className="px-5 py-3 text-left">Registrado</th>
                  <th className="px-5 py-3 text-left">Activar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingUsers.map((u) => {
                  const cfg = parseUserConfig(u.config)
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {u.name ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{u.email}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {cfg.sport.type ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        {cfg.onboarding.completed ? (
                          <span className="text-green-600 text-xs font-medium">✓ Completado</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Pendiente</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-5 py-3">
                        <ActivateButton userId={u.id} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
