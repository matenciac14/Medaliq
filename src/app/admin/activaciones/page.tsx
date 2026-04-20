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

  const pendingUsers = allAthletes.filter((u) => {
    const cfg = parseUserConfig(u.config)
    return !cfg.features.plan
  })

  const activeUsers = allAthletes.filter((u) => {
    const cfg = parseUserConfig(u.config)
    return cfg.features.plan
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activaciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestión manual de acceso — atletas pendientes y cuentas activas
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="inline-flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg">
            {pendingUsers.length}
          </div>
          <div>
            <p className="font-semibold text-amber-900">
              {pendingUsers.length === 1
                ? '1 usuario pendiente'
                : `${pendingUsers.length} usuarios pendientes`}
            </p>
            <p className="text-xs text-amber-700">Sin activar</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
            {activeUsers.length}
          </div>
          <div>
            <p className="font-semibold text-emerald-900">
              {activeUsers.length === 1
                ? '1 cuenta activa'
                : `${activeUsers.length} cuentas activas`}
            </p>
            <p className="text-xs text-emerald-700">Con acceso completo</p>
          </div>
        </div>
      </div>

      {/* --- PENDIENTES --- */}
      <h2 className="text-base font-semibold text-gray-700 mb-3">
        Pendientes de activación
      </h2>

      {pendingUsers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm mb-8">
          No hay usuarios pendientes de activación.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Deporte</th>
                  <th className="px-5 py-3 text-left">Onboarding</th>
                  <th className="px-5 py-3 text-left">Registrado</th>
                  <th className="px-5 py-3 text-left">Acción</th>
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
                          <span className="text-green-600 text-xs font-medium">Completado</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Pendiente</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-5 py-3">
                        <ActivateButton userId={u.id} isActive={false} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ACTIVOS --- */}
      <h2 className="text-base font-semibold text-gray-700 mb-3">
        Cuentas activas
      </h2>

      {activeUsers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          No hay cuentas activas aún.
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
                  <th className="px-5 py-3 text-left">Plan</th>
                  <th className="px-5 py-3 text-left">Registrado</th>
                  <th className="px-5 py-3 text-left">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeUsers.map((u) => {
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
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                          Activo
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-5 py-3">
                        <ActivateButton userId={u.id} isActive={true} />
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
