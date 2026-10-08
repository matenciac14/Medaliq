import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { getCoachDashboardData } from './_lib/get_coach_dashboard_data'
import { CoachKpiRow } from './_components/CoachKpiRow'
import { CoachAlertsList } from './_components/CoachAlertsList'
import { CoachPendingSection } from './_components/CoachPendingSection'
import { CoachActivityFeed } from './_components/CoachActivityFeed'

export default async function CoachDashboardPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    redirect('/dashboard')
  }

  const data = await getCoachDashboardData(session.user.id, session)

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Banner: perfil incompleto */}
      {!data.profileComplete && (
        <div className="mb-5 rounded-md px-3 py-2.5 h-8 flex items-center" style={{ backgroundColor: '#fff2e0' }}>
          <p className="text-[10px] font-medium" style={{ color: '#995900' }}>
            ⚠ Completa tu perfil profesional — registra tu cédula y WhatsApp para invitar asesorados.{' '}
            <Link href="/coach/profile" className="underline hover:opacity-80">
              Completar ahora →
            </Link>
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold leading-tight" style={{ color: '#1f3b5e' }}>
            {data.greeting}, {data.firstName} 👋
          </h1>
          <p className="text-xs mt-1" style={{ color: '#738090' }}>{data.subLineParts.join(' · ')}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {data.saludScore !== null && (
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center border-[3px]"
                style={{ backgroundColor: '#1f3b5e', borderColor: '#22c35d' }}
              >
                <span className="text-base font-bold text-white">{data.saludScore}</span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: '#738090' }}>Salud negocio</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <a
              href="/coach/invite"
              className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-medium border hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#ccd1d9', color: '#1f3b5e' }}
            >
              Compartir link
            </a>
            <a
              href="/coach/clients/new"
              className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#1f3b5e' }}
            >
              + Nuevo
            </a>
          </div>
        </div>
      </div>

      {/* First-time experience */}
      {data.totalCount === 0 && (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-[#1e3a5f]/20 bg-gradient-to-br from-[#1e3a5f]/5 to-orange-50 p-8">
          <div className="max-w-lg">
            <div className="text-4xl mb-3">🎯</div>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">Bienvenido a Medaliq</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Tu panel está listo. El siguiente paso es agregar a tus primeros asesorados para empezar a gestionar sus planes, check-ins y progreso.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/coach/clients/new" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#ea580c' }}>
                + Agregar primer asesorado
              </a>
              <a href="/coach/invite" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors">
                Compartir link de invitación
              </a>
            </div>
          </div>
        </div>
      )}

      <CoachKpiRow kpis={data.kpis} />
      <CoachAlertsList athletesWithAlerts={data.athletesWithAlerts} totalAlerts={data.totalAlerts} />
      <CoachPendingSection
        overduePayments={data.overduePayments}
        overdueTotal={data.overdueTotal}
        pendingOnboarding={data.pendingOnboarding}
        athletesWithoutPlan={data.athletesWithoutPlan}
        now={new Date()}
      />
      <CoachActivityFeed
        feedItems={data.feedItems}
        lastWeek={data.lastWeek}
        now={new Date()}
      />
    </div>
  )
}
