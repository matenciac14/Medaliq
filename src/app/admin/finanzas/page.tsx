import { prisma } from '@/lib/db/prisma'
import { coachTierFee, coachTierFeeLabel, mrrAthletes as calcMrrAthletes, mrrCoaches as calcMrrCoaches, ATHLETE_PRO_PRICE_USD } from '@/domain/admin/finanzas'
import type { CoachTier } from '@/domain/subscription/tier_features'
import { formatCurrency as fmt } from '@/lib/utils/format_currency'

export default async function AdminFinanzasPage() {
  const now = new Date()

  const [proAthletes, coaches, paymentGroups, churnAthletes, paidCoaches] = await Promise.all([
    // Atletas con tier PRO en UserSubscription
    prisma.userSubscription.count({
      where: { tier: 'PRO', user: { role: 'ATHLETE', status: 'ACTIVE' } },
    }),

    // Coaches con sus atletas activos y tier de suscripción
    prisma.user.findMany({
      where: { role: 'COACH' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true, createdAt: true,
        coachOf: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
        subscription: { select: { coachTier: true } },
      },
    }),

    // Pagos registrados en plataforma (coach → atleta)
    prisma.payment.findMany({
      select: { amount: true, currency: true, status: true, dueDate: true },
    }),

    // Atletas Pro con cancelación activa (churn en curso)
    prisma.userSubscription.count({
      where: { cancelAtPeriodEnd: true, user: { role: 'ATHLETE' } },
    }),

    // Coaches con tier de pago (Growth, Pro, Scale)
    prisma.userSubscription.count({
      where: { coachTier: { not: 'STARTER' }, user: { role: 'COACH', status: 'ACTIVE' } },
    }),
  ])

  // MRR atletas
  const athletesMrr = calcMrrAthletes(proAthletes)

  // MRR fees coaches (lo que deben pagar a Medaliq)
  const coachesWithFee = coaches.map((c) => {
    const tier = (c.subscription?.coachTier ?? 'STARTER') as CoachTier
    const athleteCount = c.coachOf.length
    return {
      ...c,
      athleteCount,
      tier,
      fee: coachTierFee(tier, athleteCount),
    }
  })
  const coachesMrr = calcMrrCoaches(coachesWithFee.map((c) => c.fee))
  const mrrTotal = athletesMrr + coachesMrr

  // Pagos en plataforma
  const paid    = paymentGroups.filter((p) => p.status === 'PAID')
  const pending = paymentGroups.filter((p) => p.status === 'PENDING' && p.dueDate >= now)
  const overdue = paymentGroups.filter((p) => p.status === 'PENDING' && p.dueDate < now)

  const sumCOP = (items: typeof paid) => items.reduce((s, p) => s + (p.currency === 'COP' ? Number(p.amount) : 0), 0)

  const kpis = [
    {
      label: 'MRR atletas Pro (est.)',
      value: fmt(athletesMrr),
      sub: `${proAthletes} atletas con tier PRO en DB`,
      color: '#7c3aed',
    },
    {
      label: 'Fee coaches (est.)',
      value: fmt(coachesMrr),
      sub: `${coachesWithFee.filter((c) => c.athleteCount > 0).length} coaches con atletas`,
      color: '#ea580c',
    },
    {
      label: 'MRR total estimado',
      value: fmt(mrrTotal),
      sub: 'Atletas Pro + fees de coaches',
      color: '#1e3a5f',
    },
    {
      label: 'Churn en curso',
      value: String(churnAthletes),
      sub: 'atletas con cancelación activa',
      color: '#ef4444',
    },
    {
      label: 'Coaches de pago',
      value: String(paidCoaches),
      sub: 'Growth + Pro + Scale activos',
      color: '#7c3aed',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Revenue estimado de la plataforma — se actualiza en tiempo real desde la DB
        </p>
      </div>

      {/* MRR Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{k.label}</p>
            <p className="text-3xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Pagos en plataforma (coach → atleta) */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pagos recibidos', count: paid.length,    amount: sumCOP(paid),    color: 'text-green-600',  bg: 'bg-green-50  border-green-200' },
          { label: 'Pagos pendientes', count: pending.length, amount: sumCOP(pending), color: 'text-amber-600',  bg: 'bg-amber-50  border-amber-200' },
          { label: 'Pagos vencidos',   count: overdue.length, amount: sumCOP(overdue), color: 'text-red-600',    bg: 'bg-red-50    border-red-200' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-5 ${s.bg}`}>
            <p className="text-xs text-gray-500 mb-1">{s.label} (coach→atleta)</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            {s.amount > 0 && (
              <p className="text-xs text-gray-400 mt-1">{fmt(s.amount, 'COP')} COP</p>
            )}
          </div>
        ))}
      </div>

      {/* Fee por coach */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Fee por coach</h2>
            <p className="text-xs text-gray-400 mt-0.5">Lo que cada coach debe pagar a Medaliq mensualmente</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p className="font-medium text-gray-600">Starter $0 · Growth $59 · Pro $139</p>
            <p>Scale $139/mes · Scale+ $139 + $4/atleta &gt;30</p>
          </div>
        </div>

        {coachesWithFee.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Sin coaches registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Coach</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-right">Atletas activos</th>
                  <th className="px-5 py-3 text-left">Tramo</th>
                  <th className="px-5 py-3 text-right">Fee / mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coachesWithFee
                  .sort((a, b) => b.fee - a.fee)
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{c.name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{c.email}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${c.athleteCount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                          {c.athleteCount}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{coachTierFeeLabel(c.tier, c.athleteCount)}</td>
                      <td className="px-5 py-3 text-right">
                        {c.fee > 0 ? (
                          <span className="font-semibold text-orange-600">{fmt(c.fee)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-700">Total fee coaches</td>
                  <td className="px-5 py-3 text-right font-extrabold text-orange-600">{fmt(coachesMrr)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        * MRR estimado — precios hardcodeados hasta integrar Wompi/Stripe. Pagos coach→atleta en la moneda registrada por el coach.
      </p>
    </div>
  )
}
