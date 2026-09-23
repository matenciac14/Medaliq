import Link from 'next/link'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import TodayLogCard from '../../_components/TodayLogCard'
import NutritionProgressCard from '../../_components/ui/NutritionProgressCard'
import HydrationWidget from '../../nutrition/_components/HydrationWidget'
import MealSlotsWidget from './MealSlotsWidget'
import type { DashboardMode } from '../_lib/get_dashboard_data'
import type { DashboardSummary } from '@/domain/dashboard/get_dashboard_summary.use_case'

type Props = {
  dashboardMode: DashboardMode
  dashSummary: DashboardSummary

  // Weight
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null

  // Volume
  currentVolume: number | null
  volumeDeltaPct: number | null

  // Check-in (B2B/Pro)
  lastCheckIn: { hardestSessionRpe: number | null; energyLevel: number | null; weightKg: number | null; sleepHours: number | null } | null
  formCheckInDate: string | null
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  isRecomp: boolean
  raceDays: number | null

  // Today log
  todayLogRaw: { weightKg: number | null; energyLevel: number | null } | null

  // Weekly activity (FREE mode)
  weekSessionCount: number
  weekSessionTarget: number
  streakDays: number

  // Nutrition consumed
  todayConsumed: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null

  // Water (pre-fetched from server)
  initialWater: { mlLogged: number; waterMlTarget: number }

  // Meal slot logs (pre-fetched from server)
  initialMealSlotLogs: { mealType: string; kcal: number }[]

  // Coach (B2B)
  coach: { name: string; headline: string | null; initial: string } | null

  // Check-in pending
  checkinPending: boolean
  hasActivePlan: boolean

  // Flags
  hasEverLogged: boolean
}

export default function MobileCardsSection(props: Props) {
  return (
    <div className="sm:hidden space-y-3">
      {props.dashboardMode === 'FREE' || props.dashboardMode === 'GYM' ? (
        <FreeMobileCards {...props} />
      ) : (
        <ProMobileCards {...props} />
      )}
    </div>
  )
}

// -- FREE / GYM Mode --------------------------------------------------------

function FreeMobileCards(props: Props) {
  const { dashSummary, hasEverLogged, currentWeight, targetWeight, weeklyWeightChange, weightProgressPct, todayLogRaw, todayConsumed } = props

  return (
    <>
      {/* Nutricion */}
      {dashSummary.nutritionTarget && (
        <NutritionProgressCard
          data={{ kcal: dashSummary.nutritionTarget.kcal, proteinG: dashSummary.nutritionTarget.proteinG, carbsG: dashSummary.nutritionTarget.carbsG, fatG: dashSummary.nutritionTarget.fatG }}
          variant="compact"
          consumed={todayConsumed}
        />
      )}

      {/* Hidratación */}
      <HydrationWidget initialMl={props.initialWater.mlLogged} initialTarget={props.initialWater.waterMlTarget} />

      {/* Alimentación */}
      <MealSlotsWidget initialLogs={props.initialMealSlotLogs} />

      {/* Metricas — peso */}
      <FreeMetricsCard
        currentWeight={currentWeight}
        targetWeight={targetWeight}
        weeklyWeightChange={weeklyWeightChange}
        weightProgressPct={weightProgressPct}
      />

      {/* Registro diario */}
      <TodayLogCard initial={todayLogRaw ?? null} />

      {/* Actividad reciente */}
      <RecentActivityCard recentActivity={dashSummary.recentActivity} hasEverLogged={hasEverLogged} streakDays={props.streakDays} />

      {/* CTAs */}
      <UpsellBannerPro />
      <FindCoachBanner />
    </>
  )
}

// -- Pro / B2B Mode ----------------------------------------------------------

function ProMobileCards(props: Props) {
  const {
    formStatus, formMessage, lastCheckIn, formCheckInDate,
    isRecomp, currentWeight, targetWeight, raceDays,
    weeklyWeightChange, weightProgressPct, currentVolume, volumeDeltaPct,
    dashSummary, todayLogRaw, todayConsumed,
  } = props

  return (
    <>
      {/* Nutricion */}
      {dashSummary.nutritionTarget && (
        <NutritionProgressCard
          data={{ kcal: dashSummary.nutritionTarget.kcal, proteinG: dashSummary.nutritionTarget.proteinG, carbsG: dashSummary.nutritionTarget.carbsG, fatG: dashSummary.nutritionTarget.fatG, label: dashSummary.nutritionTarget.label }}
          variant="compact"
          consumed={todayConsumed}
        />
      )}

      {/* Hidratación */}
      <HydrationWidget initialMl={props.initialWater.mlLogged} initialTarget={props.initialWater.waterMlTarget} />

      {/* Alimentación */}
      <MealSlotsWidget initialLogs={props.initialMealSlotLogs} />

      {/* MetricsCard consolidado */}
      <ProMetricsCard
        formStatus={formStatus}
        formMessage={formMessage}
        lastCheckIn={lastCheckIn}
        formCheckInDate={formCheckInDate}
        currentWeight={currentWeight}
        targetWeight={targetWeight}
        weeklyWeightChange={weeklyWeightChange}
        weightProgressPct={weightProgressPct}
        currentVolume={currentVolume}
        volumeDeltaPct={volumeDeltaPct}
        isRecomp={isRecomp}
        raceDays={raceDays}
      />

      {/* Registro diario */}
      <TodayLogCard initial={todayLogRaw ?? null} />

      {/* Actividad reciente */}
      <RecentActivityCard recentActivity={dashSummary.recentActivity} hasEverLogged={true} streakDays={props.streakDays} />

      {/* Coach card (B2B) */}
      {props.coach && (
        <Link href="/messages" className="flex items-center overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="w-1 self-stretch bg-[#f97316] shrink-0" />
          <div className="flex-1 flex items-center gap-3 px-3 py-2.5">
            <div className="w-[34px] h-[34px] rounded-full bg-[#f97316] flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">{props.coach.initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1e3a5f]">Coach {props.coach.name.split(' ')[0]}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{props.coach.headline || 'Entrenador personal'}</p>
            </div>
            <span className="text-sm text-gray-300 shrink-0">›</span>
          </div>
        </Link>
      )}

      {/* Check-in semanal pendiente */}
      {props.checkinPending && (
        <Link href="/checkin" className="flex overflow-hidden bg-[#fff7ed] rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="w-1 bg-[#f97316] shrink-0" />
          <div className="flex-1 px-3.5 py-3.5">
            <p className="text-xs font-semibold text-[#9a3412]">Check-in semanal pendiente</p>
            <p className="text-[10px] text-[#c2410c] mt-1">
              {props.hasActivePlan
                ? 'Registra métricas · recibe sugerencias de ajuste →'
                : 'Registra cómo te sientes esta semana →'}
            </p>
          </div>
        </Link>
      )}
    </>
  )
}

// -- MetricsCard Pro/B2B (consolidado: forma + checkin + peso + carga + race) -

function ProMetricsCard({ formStatus, formMessage, lastCheckIn, formCheckInDate, currentWeight, targetWeight, weeklyWeightChange, weightProgressPct, currentVolume, volumeDeltaPct, isRecomp, raceDays }: {
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  lastCheckIn: { hardestSessionRpe: number | null; energyLevel: number | null; weightKg: number | null; sleepHours: number | null } | null
  formCheckInDate: string | null
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
  currentVolume: number | null
  volumeDeltaPct: number | null
  isRecomp: boolean
  raceDays: number | null
}) {
  const accentColor = formStatus === 'good' ? 'bg-green-500' : formStatus === 'moderate' ? 'bg-amber-500' : 'bg-red-500'
  const statusColor = formStatus === 'good' ? 'text-green-800' : formStatus === 'moderate' ? 'text-amber-800' : 'text-red-800'
  const chipBg = formStatus === 'good' ? 'bg-green-100 text-green-700' : formStatus === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'

  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className={`h-[3px] ${accentColor}`} />
      <div className="px-4 pt-3 pb-3.5 space-y-2.5">

        {/* Row 1: status + chip + ago */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-bold ${statusColor}`}>{formMessage}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${chipBg}`}>
              {formStatus === 'good' ? 'Buena forma' : formStatus === 'moderate' ? 'Moderado' : 'Descanso'}
            </span>
          </div>
          {formCheckInDate && <p className="text-[10px] text-gray-400">{formCheckInDate}</p>}
        </div>

        {/* Row 2: 4 metrics */}
        <div className="grid grid-cols-4 gap-1">
          <MetricCol label="Peso" value={currentWeight ? currentWeight.toFixed(1) : '--'} unit="kg" color="text-[#1e3a5f]" />
          <MetricCol label="RPE" value={lastCheckIn?.hardestSessionRpe != null ? String(lastCheckIn.hardestSessionRpe) : '--'} unit="/10" color="text-[#ea580c]" />
          <MetricCol label="Energia" value={lastCheckIn?.energyLevel != null ? `${lastCheckIn.energyLevel}/5` : '--'} unit="" color="text-[#22c55e]" />
          <MetricCol label="Carga" value={currentVolume != null ? String(currentVolume) : '--'} unit="km" color="text-[#1e3a5f]" />
        </div>

        {/* Row 3: race countdown or weight progress (conditional) */}
        {raceDays != null && raceDays > 0 && !isRecomp && (
          <div className="flex items-center gap-1.5 bg-blue-50 rounded-[10px] px-2.5 py-1.5">
            <span className="text-xs">🏁</span>
            <p className="text-xs font-semibold text-[#1e3a5f] flex-1">{raceDays} dias para tu carrera</p>
            {weightProgressPct != null && (
              <p className="text-[10px] text-gray-400">Peso {weightProgressPct}%</p>
            )}
          </div>
        )}

        {isRecomp && currentWeight && targetWeight && (
          <div className="flex items-center gap-1.5 bg-blue-50 rounded-[10px] px-2.5 py-1.5">
            <span className="text-xs">🎯</span>
            <p className="text-xs font-semibold text-[#1e3a5f] flex-1">
              {Math.abs(currentWeight - targetWeight).toFixed(1)} kg restantes
            </p>
            {weeklyWeightChange != null && (
              <p className={`text-[10px] ${weeklyWeightChange < 0 ? 'text-green-600' : 'text-red-500'}`}>
                {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange.toFixed(1)} kg/sem
              </p>
            )}
          </div>
        )}

        {volumeDeltaPct != null && (
          <p className={`text-[10px] ${volumeDeltaPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {volumeDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(volumeDeltaPct)}% carga vs sem. anterior
          </p>
        )}
      </div>
    </div>
  )
}

// -- MetricsCard FREE (solo peso) --------------------------------------------

function FreeMetricsCard({ currentWeight, targetWeight, weeklyWeightChange, weightProgressPct }: {
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
}) {
  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[3px] bg-[#1e3a5f]" />
      <div className="px-4 pt-3 pb-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#1e3a5f]">Tu progreso</p>
          {weeklyWeightChange != null && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${weeklyWeightChange < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
              {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange.toFixed(1)} kg/sem
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1">
          <MetricCol label="Peso" value={currentWeight ? currentWeight.toFixed(1) : '--'} unit="kg" color="text-[#1e3a5f]" />
          <MetricCol label="Meta" value={targetWeight ? String(targetWeight) : '--'} unit="kg" color="text-[#22c55e]" />
          <MetricCol label="Progreso" value={weightProgressPct != null ? String(weightProgressPct) : '--'} unit="%" color="text-[#1e3a5f]" />
        </div>
      </div>
    </div>
  )
}

// -- MetricCol (reusable) ----------------------------------------------------

function MetricCol({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-lg font-bold ${color}`}>{value}</span>
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  )
}

// -- RecentActivityCard (4 items max, scrollbar, no CTA) ---------------------

function RecentActivityCard({ recentActivity, hasEverLogged, streakDays }: {
  recentActivity: { type: string; completedAt: string; durationMin: number | null; rpe: number | null }[]
  hasEverLogged: boolean
  streakDays: number
}) {
  if (!hasEverLogged || recentActivity.length === 0) return null

  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[3px] bg-[#ea580c]" />
      <div className="px-3.5 pt-3 pb-1 flex justify-between items-center">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Actividad reciente</p>
        {streakDays > 0 && (
          <span className="text-xs font-semibold text-[#ea580c]">🔥 {streakDays} dias de racha</span>
        )}
      </div>
      <div className="max-h-[205px] overflow-y-auto">
        {recentActivity.slice(0, 4).map((a, i) => (
          <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
            <span className="text-xl">{SESSION_ICONS[a.type] ?? '🏅'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{SESSION_NAMES[a.type] ?? a.type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                {a.durationMin ? ` · ${a.durationMin} min` : ''}
              </p>
            </div>
            {a.rpe != null && (
              <span className="text-xs font-semibold text-[#1e3a5f] bg-gray-100 rounded-lg px-2 py-1">RPE {a.rpe}</span>
            )}
            <Link href="/progress" className="text-xs font-semibold text-[#ea580c]">Ver →</Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// -- Shared banners ----------------------------------------------------------

function UpsellBannerPro() {
  return (
    <Link href="/pricing" className="flex items-center gap-3 bg-[#fff7ed] border border-[rgba(234,89,9,0.3)] rounded-xl overflow-hidden px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">⚡</span>
          <p className="text-sm font-semibold text-[#993300]">Desbloquea Plan Pro</p>
        </div>
        <p className="text-xs text-[#8c4d1a] mt-0.5">Check-in · zonas · progreso</p>
      </div>
      <span className="text-xs font-semibold text-white bg-[#ea580c] px-3 py-2 rounded-lg shrink-0">Ver Pro</span>
    </Link>
  )
}

function FindCoachBanner() {
  return (
    <Link href="/find-coach" className="flex items-center gap-2.5 bg-[#1e3a5f] rounded-lg overflow-hidden pr-3.5">
      <div className="w-1 self-stretch bg-[#ea580c] shrink-0" />
      <div className="flex-1 min-w-0 py-2.5">
        <p className="text-sm font-semibold text-white">🎯  Encuentra tu entrenador</p>
        <p className="text-xs text-[#b2cce5] mt-0.5">Planes personalizados con un experto</p>
      </div>
      <span className="text-xs font-semibold text-[#ea580c] shrink-0">Ver coaches →</span>
    </Link>
  )
}
