import Link from 'next/link'
import type { DashboardMode } from '../_lib/get_dashboard_data'
import type { DashboardSummary } from '@/domain/dashboard/get_dashboard_summary.use_case'
import ProgressBar from '../../_components/ui/ProgressBar'
import NutritionProgressCard from '../../_components/ui/NutritionProgressCard'

type Props = {
  dashboardMode: DashboardMode
  weekSessionCount: number
  weekSessionTarget: number
  streakDays: number
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
  dashSummary: DashboardSummary
  todayConsumed: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null
}

export default function HeroCardsRow(props: Props) {
  const {
    dashboardMode, weekSessionCount, weekSessionTarget, streakDays,
    currentWeight, targetWeight, weeklyWeightChange, weightProgressPct,
    dashSummary, todayConsumed,
  } = props

  return (
    <div className="hidden sm:grid sm:grid-cols-3 gap-3">
      <ActivityCard weekSessionCount={weekSessionCount} weekSessionTarget={weekSessionTarget} streakDays={streakDays} />
      <WeightCard currentWeight={currentWeight} targetWeight={targetWeight} weeklyWeightChange={weeklyWeightChange} weightProgressPct={weightProgressPct} dashboardMode={dashboardMode} />
      <NutritionProgressCard
        data={dashSummary.nutritionTarget ? { kcal: dashSummary.nutritionTarget.kcal, proteinG: dashSummary.nutritionTarget.proteinG, carbsG: dashSummary.nutritionTarget.carbsG, fatG: dashSummary.nutritionTarget.fatG } : null}
        variant="card"
        consumed={todayConsumed}
      />
    </div>
  )
}

// -- Activity Card (Figma: "TU ACTIVIDAD") -----------------------------------

function ActivityCard({ weekSessionCount, weekSessionTarget, streakDays }: { weekSessionCount: number; weekSessionTarget: number; streakDays: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex h-full">
        <div className="w-1 bg-[#ea580c] shrink-0" />
        <div className="flex-1 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">📊 TU ACTIVIDAD</p>
          {weekSessionCount > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-2xl font-black text-[#1e3a5f] leading-none">{weekSessionCount}</span>
                <span className="text-sm text-gray-400">sesiones</span>
              </div>
              <p className="text-xs text-gray-500 mb-1.5">registradas · ultimo mes</p>
            </>
          ) : (
            <>
              <span className="text-2xl font-black text-[#1e3a5f] leading-none block mb-0.5">&mdash;</span>
              <p className="text-xs text-gray-500 mb-1.5">Sin sesiones registradas aun</p>
            </>
          )}
          <ProgressBar pct={Math.round((weekSessionCount / Math.max(weekSessionTarget, 1)) * 100)} className="mb-1" />
          <div className="flex justify-between items-center">
            {weekSessionCount > 0 && streakDays >= 2 ? (
              <p className="text-[10px] text-[#ea580c]">Racha activa: {streakDays} dias</p>
            ) : <p className="text-[10px] text-gray-400" />}
            <Link href="/log" className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">{weekSessionCount > 0 ? 'Ver log →' : 'Registrar →'}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// -- Weight Card (Figma: "TU META DE PESO") ----------------------------------

function WeightCard({ currentWeight, targetWeight, weeklyWeightChange, weightProgressPct, dashboardMode }: { currentWeight: number | null; targetWeight: number | null; weeklyWeightChange: number | null; weightProgressPct: number | null; dashboardMode: DashboardMode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex h-full">
        <div className="w-1 bg-[#3b6fdd] shrink-0" />
        <div className="flex-1 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{targetWeight ? '⚖️ TU META DE PESO' : '⚖️ TU PESO'}</p>
          {currentWeight && targetWeight ? (
            <>
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-2xl font-black text-[#1e3a5f] leading-none">{currentWeight.toFixed(1)}</span>
                <span className="text-sm text-gray-400">kg</span>
                <span className="text-sm text-gray-300 mx-1">&rarr;</span>
                <span className="text-lg font-semibold text-[#3b6fdd]">{targetWeight} kg</span>
              </div>
              <p className="text-xs text-gray-500 mb-1.5">
                {dashboardMode === 'FREE'
                  ? 'Meta configurada en tu perfil'
                  : weeklyWeightChange != null
                    ? `~${weeklyWeightChange > 0 ? '+' : ''}${weeklyWeightChange.toFixed(1)} kg/sem`
                    : 'Meta configurada en tu perfil'}
              </p>
              <ProgressBar pct={weightProgressPct ?? 0} color="bg-[#3b6fdd]" className="mb-1" />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-gray-400">
                  {dashboardMode === 'FREE' ? 'Sin proyeccion · registra tu peso' : `${weightProgressPct ?? 0}% completado`}
                </p>
                <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd]">
                  {dashboardMode === 'FREE' ? 'Actualizar peso →' : 'Ver progreso →'}
                </Link>
              </div>
            </>
          ) : currentWeight ? (
            <>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-2xl font-black text-[#1e3a5f] leading-none">{currentWeight.toFixed(1)}</span>
                <span className="text-sm text-gray-400">kg</span>
              </div>
              <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd] mt-3 block">Define tu meta →</Link>
            </>
          ) : (
            <>
              <span className="text-2xl font-black text-[#1e3a5f] leading-none block mb-0.5">&mdash;</span>
              <p className="text-xs text-gray-500 mb-1.5">Sin datos de peso registrados</p>
              <ProgressBar pct={0} color="bg-gray-100" className="mb-1" />
              <div className="flex justify-end">
                <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd]">Registrar peso →</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
