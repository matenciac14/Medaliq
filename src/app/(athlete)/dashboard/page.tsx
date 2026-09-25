import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import InstallPWABanner from '@/app/_components/InstallPWABanner'
import DashboardCalendarStrip from '../_components/DashboardCalendarStrip'
import InfoBannerRow from '../_components/InfoBannerRow'
import WeeklySummaryCard from '../_components/WeeklySummaryCard'
import DailySessionCard from '../_components/DailySessionCard'
import PlanCompletionCard from '../_components/PlanCompletionCard'
import { getDashboardData } from './_lib/get_dashboard_data'
import { MobileHeader, DesktopHeader } from './_components/HeaderRow'
import HeroCardsRow from './_components/HeroCardsRow'
import MobileCardsSection from './_components/MobileCardsSection'
import DesktopRecentActivity from './_components/DesktopRecentActivity'
import MealSlotsWidget from './_components/MealSlotsWidget'
import HydrationWidget from '../nutrition/_components/HydrationWidget'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ weekOffset?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { weekOffset: weekOffsetParam } = await searchParams
  const rawWeekOffset = parseInt(weekOffsetParam ?? '0') || 0

  const d = await getDashboardData(session.user.id, rawWeekOffset, session.user.isB2B ?? false)

  return (
    <div className="sm:py-5 lg:px-8 lg:py-6 max-w-7xl mx-auto sm:space-y-5">

      {/* Mobile gradient header */}
      <MobileHeader
        firstName={d.firstName}
        timezone={d.timezone}
        weekLabel={d.dashboardMode === 'TRAINING' ? `Semana ${d.selectedWeekNum || d.planData.currentWeek} · ${d.weekDateLabel}` : d.weekDateLabel}
        weekOffset={d.weekOffset}
        canGoPrev={d.dashboardMode === 'TRAINING' ? d.selectedWeekNum > 1 : true}
        canGoNext={true}
        streakDays={d.streakDays}
      />

      {/* PWA install banner — mobile + tablet (hidden on desktop) */}
      <div className="lg:hidden">
        <InstallPWABanner />
      </div>

      <div className="px-4 lg:px-0 sm:space-y-5 space-y-4">

      {/* Pending check-in suggestions banner */}
      {d.pendingSuggestionsCount > 0 && (
        <Link href="/checkin" className="block rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 hover:bg-blue-100 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💡</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {d.pendingSuggestionsCount === 1
                    ? '1 sugerencia de ajuste pendiente'
                    : `${d.pendingSuggestionsCount} sugerencias de ajuste pendientes`}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">Tu coach propone cambios en tu plan basados en el check-in</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-blue-400 shrink-0" />
          </div>
        </Link>
      )}

      {/* Mobile: flat CalendarStrip before TodaySession per Figma */}
      <div className="sm:hidden">
        <DashboardCalendarStrip
          weekOffset={d.weekOffset}
          dashboardMode={d.dashboardMode}
          firstName={d.firstName}
          weekLabel={d.dashboardMode === 'TRAINING' ? `Semana ${d.selectedWeekNum || d.planData.currentWeek} · ${d.weekDateLabel}` : d.weekDateLabel}
          mobileCount={d.dashboardMode === 'TRAINING' && d.totalTraining > 0 ? `${d.completedCount}/${d.totalTraining} sesiones` : d.dashboardMode === 'FREE' ? `${d.weekSessionCount} registros` : ''}
          isB2B={d.isB2B}
          planPhase={d.phaseDisplay}
          planWeekNum={d.selectedWeekNum || d.planData.currentWeek}
          planTotalWeeks={d.planData.totalWeeks}
        />
      </div>

      {/* Week section — desktop: TopBar + CalendarStrip + Session in one card (Figma "Card — Esta Semana") */}
      <section className="hidden sm:block">
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <DesktopHeader
            firstName={d.firstName}
            timezone={d.timezone}
            streakDays={d.streakDays}
            weekLabel={d.dashboardMode === 'TRAINING' ? `Semana ${d.selectedWeekNum || d.planData.currentWeek} · ${d.weekDateLabel}` : d.weekDateLabel}
            weekOffset={d.weekOffset}
            canGoPrev={d.dashboardMode === 'TRAINING' ? d.selectedWeekNum > 1 : true}
            canGoNext={true}
          />
          <div className="px-3 pb-3">
              {d.dashboardMode === 'RECOVERY' && d.lastCompletedPlanInfo && (
                <div className="mb-4">
                  <PlanCompletionCard
                    planName={d.lastCompletedPlanInfo.name}
                    totalWeeks={d.lastCompletedPlanInfo.totalWeeks}
                    sessionsLogged={d.lastCompletedPlanInfo.sessionsLogged}
                    sessionsTotal={d.lastCompletedPlanInfo.sessionsTotal}
                    recoveryDaysSinceEnd={d.recoveryDaysSinceEnd ?? 0}
                    isB2B={d.isB2B}
                  />
                </div>
              )}

              <DashboardCalendarStrip
                weekOffset={d.weekOffset}
                dashboardMode={d.dashboardMode}
                firstName={d.firstName}
                weekLabel={d.dashboardMode === 'TRAINING' ? `Semana ${d.selectedWeekNum || d.planData.currentWeek} · ${d.weekDateLabel}` : d.weekDateLabel}
                mobileCount={d.dashboardMode === 'TRAINING' && d.totalTraining > 0 ? `${d.completedCount}/${d.totalTraining} sesiones` : d.dashboardMode === 'FREE' ? `${d.weekSessionCount} registros` : ''}
                isB2B={d.isB2B}
                planPhase={d.phaseDisplay}
                planWeekNum={d.selectedWeekNum || d.planData.currentWeek}
                planTotalWeeks={d.planData.totalWeeks}
                coachName={d.coachRelation?.coach.name ?? null}
                initialCalendarWeek={d.initialCalendarWeek}
              />

              {d.dashboardMode !== 'FREE' && (
                <DailySessionCard
                  dashboardMode={d.dashboardMode}
                  isCurrentWeek={d.isCurrentWeek}
                  hasGymToday={d.hasGymToday}
                  gymDoneToday={d.gymDoneToday}
                  todayGymDay={d.todayGymDay ? { label: d.todayGymDay.label ?? '', exercises: d.todayGymDay.exercises } : null}
                  weekSessionCount={d.weekSessionCount}
                  weekSessionTarget={d.weekSessionTarget}
                />
              )}
          </div>
        </div>
      </section>

      {/* Desktop: Hero KPI cards — below week section per Figma */}
      <HeroCardsRow
        dashboardMode={d.dashboardMode}
        weekSessionCount={d.weekSessionCount}
        weekSessionTarget={d.weekSessionTarget}
        streakDays={d.streakDays}
        currentWeight={d.currentWeight}
        targetWeight={d.targetWeight}
        weeklyWeightChange={d.weeklyWeightChange}
        weightProgressPct={d.weightProgressPct}
        dashSummary={d.dashSummary}
        todayConsumed={d.todayConsumed}
      />

      <div className="space-y-5">
        <div className="space-y-4">

          {/* Mobile: TodaySession — now rendered inside CalendarStrip (synced with selected day) */}

          {/* Mobile cards */}
          <MobileCardsSection
            dashboardMode={d.dashboardMode}
            dashSummary={d.dashSummary}
            hasEverLogged={d.hasEverLogged}
            currentWeight={d.currentWeight}
            targetWeight={d.targetWeight}
            weeklyWeightChange={d.weeklyWeightChange}
            weightProgressPct={d.weightProgressPct}
            currentVolume={d.currentWeekVolumeKm}
            volumeDeltaPct={d.volumeDeltaPct}
            lastCheckIn={d.lastCheckIn}
            formCheckInDate={d.formCheckInDate}
            formStatus={d.formStatus}
            formMessage={d.formMessage}
            isRecomp={d.isRecomp}
            raceDays={d.raceDays}
            todayLogRaw={d.todayLogRaw}
            weekSessionCount={d.weekSessionCount}
            weekSessionTarget={d.weekSessionTarget}
            streakDays={d.streakDays}
            todayConsumed={d.todayConsumed}
            initialWater={d.initialWater}
            initialMealSlotLogs={d.initialMealSlotLogs}
            coach={d.coachRelation ? {
              name: d.coachRelation.coach.name ?? 'Tu coach',
              headline: d.coachRelation.coach.coachProfile?.headline ?? d.coachRelation.coach.coachProfile?.specialties?.[0] ?? null,
              initial: (d.coachRelation.coach.name ?? 'C').charAt(0).toUpperCase(),
            } : null}
            checkinPending={d.checkinPending}
            hasActivePlan={!!d.activePlanId}
          />

          {/* Desktop: Info banner row */}
          {d.dashboardMode !== 'FREE' && (
            <div className="hidden sm:block">
              <InfoBannerRow
                coach={d.coachRelation ? {
                  name: d.coachRelation.coach.name ?? 'Tu coach',
                  headline: d.coachRelation.coach.coachProfile?.headline ?? d.coachRelation.coach.coachProfile?.specialties?.[0] ?? null,
                  initial: (d.coachRelation.coach.name ?? 'C').charAt(0).toUpperCase(),
                } : null}
                checkinPending={d.checkinPending}
                hasActivePlan={!!d.activePlanId}
              />
            </div>
          )}

          {/* Desktop: FREE upsell banner */}
          {d.dashboardMode === 'FREE' && (
            <Link href="/find-coach" className="hidden sm:block">
              <div className="flex bg-orange-50 rounded-2xl border border-orange-200/60 overflow-hidden">
                <div className="w-1 bg-[#ea580c] shrink-0" />
                <div className="flex-1 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#ea580c]/10 flex items-center justify-center text-base shrink-0">
                      🔓
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Desbloquea el potencial de Medaliq</p>
                      <p className="text-xs text-gray-500 mt-0.5">Check-in adaptativo, ajustes automáticos y métricas — con un entrenador o Plan Pro</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-[#1e3a5f] border border-gray-200 bg-white px-3 py-1.5 rounded-lg whitespace-nowrap">
                      Buscar entrenador
                    </span>
                    <span className="text-xs font-semibold text-white bg-[#ea580c] px-3 py-1.5 rounded-lg whitespace-nowrap">
                      Activar Pro →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Desktop: Meal slots + Water widget (per Figma "Tu alimentacion hoy") */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_220px] gap-3">
            <MealSlotsWidget initialLogs={d.initialMealSlotLogs} />
            <HydrationWidget initialMl={d.initialWater.mlLogged} initialTarget={d.initialWater.waterMlTarget} vertical />
          </div>

          {/* Desktop: Resumen Semanal + Actividad Reciente — side by side per Figma */}
          <div className="hidden sm:grid sm:grid-cols-2 gap-3">
            <WeeklySummaryCard
              lastCheckIn={d.lastCheckIn ? {
                hardestSessionRpe: d.lastCheckIn.hardestSessionRpe ?? null,
                energyLevel: d.lastCheckIn.energyLevel ?? null,
                weightKg: d.lastCheckIn.weightKg ?? null,
              } : null}
              formCheckInDate={d.formCheckInDate}
              currentVolume={d.currentWeekVolumeKm ?? null}
              volumeDeltaPct={d.volumeDeltaPct ?? null}
              completedCount={d.completedCount}
              totalTraining={d.totalTraining}
              variant={d.dashboardMode === 'FREE' ? 'free' : 'default'}
              weekSessionCount={d.weekSessionCount}
              weekSessionTarget={d.weekSessionTarget}
              weekSessionDelta={d.weekSessionDelta}
              avgKcalPerDay={d.avgKcalPerDay}
            />
            <DesktopRecentActivity
              recentActivity={d.dashSummary.recentActivity}
              hasEverLogged={d.dashSummary.hasEverLogged}
              streakDays={d.streakDays}
            />
          </div>

        </div>
      </div>
      </div>
    </div>
  )
}
