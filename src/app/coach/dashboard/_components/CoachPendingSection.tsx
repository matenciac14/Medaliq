import type { MappedAthlete } from '@/infrastructure/db/coach_athlete.mapper'
import type { OverduePayment, PendingOnboarding } from '@/domain/coach_dashboard/coach_dashboard.types'
import { SPORT_LABELS } from '@/domain/coach_dashboard/get_coach_dashboard.use_case'

interface Props {
  overduePayments: OverduePayment[]
  overdueTotal: number
  pendingOnboarding: PendingOnboarding[]
  athletesWithoutPlan: MappedAthlete[]
  now: Date
}

export function CoachPendingSection({ overduePayments, overdueTotal, pendingOnboarding, athletesWithoutPlan, now }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

      {/* Pagos vencidos — siempre visible */}
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: '#1f3b5e' }}>Pagos vencidos</h2>
          {overduePayments.length > 0 && (
            <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: '#22c35d' }}>
              {overduePayments.length}
            </span>
          )}
        </div>
        {overduePayments.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: '#808c99' }}>Sin pagos vencidos</p>
          </div>
        ) : (
          <>
            <p className="px-4 pt-2 text-[10px]" style={{ color: '#808c99' }}>${overdueTotal.toFixed(0)} USD pendientes</p>
            <ul className="divide-y divide-gray-50 max-h-[170px] overflow-y-auto">
              {overduePayments.map((p) => {
                const daysOverdue = Math.floor((now.getTime() - p.dueDate.getTime()) / 86_400_000)
                const isUrgent = daysOverdue >= 10
                return (
                  <li key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: '#1f3b5e' }}>{p.athlete?.name ?? 'Asesorado eliminado'}</p>
                      <p className="text-[10px]" style={{ color: '#808c99' }}>${Number(p.amount)} USD · {daysOverdue}d vencido</p>
                    </div>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
                      style={isUrgent
                        ? { backgroundColor: '#ea580c1a', color: '#ea580c' }
                        : { backgroundColor: '#f9fafb', color: '#6b7280' }
                      }
                    >
                      {isUrgent ? 'Urgente' : 'Pendiente'}
                    </span>
                    {p.athleteId && (
                      <a
                        href={`/coach/athletes/${p.athleteId}`}
                        className="shrink-0 text-[10px] font-semibold text-white px-2.5 py-1 rounded-md"
                        style={{ backgroundColor: '#ea580c' }}
                      >
                        Cobrar →
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <div className="px-4 py-2 border-t border-gray-50">
          <a href="/coach/finanzas" className="text-[10px] font-medium" style={{ color: '#808c99' }}>Ver finanzas →</a>
        </div>
      </div>

      {/* Pendientes (onboarding + sin plan) */}
      {(pendingOnboarding.length > 0 || athletesWithoutPlan.length > 0) && (
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold" style={{ color: '#1f3b5e' }}>Pendientes</h2>
          </div>

          {pendingOnboarding.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-[10px] font-semibold mb-2" style={{ color: '#738090' }}>Pendientes onboarding</p>
              <div className="space-y-2 max-h-[120px] overflow-y-auto">
                {pendingOnboarding.map((rel) => {
                  const daysAgo = Math.floor((now.getTime() - rel.createdAt.getTime()) / 86_400_000)
                  const isLate = daysAgo >= 2
                  return (
                    <div key={rel.athleteId} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#1f3b5e' }}>{rel.athlete.name ?? rel.athlete.email}</p>
                        <p className="text-[10px]" style={{ color: '#808c99' }}>Invitada hace {daysAgo}d · Sin acceso</p>
                      </div>
                      {isLate && <span className="text-[10px] font-medium shrink-0" style={{ color: '#ea580c' }}>Más de 48h</span>}
                      <a
                        href={`/coach/athletes/${rel.athleteId}`}
                        className="text-[10px] font-medium shrink-0"
                        style={{ color: '#ea580c' }}
                      >
                        Reenviar link
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {athletesWithoutPlan.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold mb-2" style={{ color: '#738090' }}>Sin plan asignado</p>
              <div className="space-y-2 max-h-[120px] overflow-y-auto">
                {athletesWithoutPlan.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <p className="flex-1 text-xs truncate" style={{ color: '#4d5966' }}>{a.name}</p>
                    <p className="text-[10px] shrink-0" style={{ color: '#808c99' }}>{a.sport ? SPORT_LABELS[a.sport] ?? a.sport : 'Sin deporte'}</p>
                    <a href={`/coach/athletes/${a.id}`} className="text-[10px] font-medium shrink-0" style={{ color: '#ea580c' }}>
                      Asignar plan →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
