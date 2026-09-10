'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import CalorieDonutHero from './CalorieDonutHero'
import ConsumedModal from './ConsumedModal'
import DeficitHeroCard from './DeficitHeroCard'
import NutritionSummaryDonut from './NutritionSummaryDonut'
import ProximaComidaCard from './ProximaComidaCard'
import MealListInline from './MealListInline'

type ConsumedData = { kcal: number; proteinG: number; carbsG: number; fatG: number }
type TargetData = { kcal: number; proteinG: number; carbsG: number; fatG: number }
type NextMealData = { label: string; time: string; foods: string; kcal: number; proteinG: number } | null
type MealCheckItem = { mealType: string; label: string; foods: string; kcal: number; isLogged: boolean }

type Props = {
  // Slots rendered by server
  headerSlot: ReactNode
  proposalSlot: ReactNode
  activitySlot: ReactNode
  phaseBannerSlot: ReactNode
  macroCardsSlot: ReactNode
  mealPlanSlot: ReactNode
  pendingBannerSlot: ReactNode
  mealCardsSlot: ReactNode
  menuLinksSlot: ReactNode
  trackingSectionSlot: ReactNode
  hydrationSlot: ReactNode
  adherenceSlot: ReactNode
  tipSlot: ReactNode
  emptyMealPlanSlot: ReactNode
  coachBannerSlot: ReactNode
  weeklyMenuSlot: ReactNode
  initSlot: ReactNode
  foodGuideSlot: ReactNode
  // Data for client-only components
  consumed: ConsumedData | null
  target: TargetData | null
  nextMeal: NextMealData
  mealChecklist: MealCheckItem[]
  hasMealPlan: boolean
  state: 'sin-plan' | 'con-plan' | 'b2b'
  planName: string | null
  activityKcalBonus: number
  activityLabel: string | null
}

export default function NutritionPageClient({
  headerSlot, proposalSlot, activitySlot, phaseBannerSlot, macroCardsSlot,
  mealPlanSlot, pendingBannerSlot, mealCardsSlot, menuLinksSlot, trackingSectionSlot,
  hydrationSlot, adherenceSlot, tipSlot, emptyMealPlanSlot, coachBannerSlot,
  weeklyMenuSlot, initSlot, foodGuideSlot,
  consumed, target, nextMeal, mealChecklist, hasMealPlan, state, planName,
  activityKcalBonus, activityLabel,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const consumedSafe = consumed ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  const targetSafe = target ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }

  // ── Sidebar content (reused in desktop right column + mobile inline) ──
  const sidebarContent = (
    <div className="space-y-4">
      {/* Hydration */}
      {hydrationSlot}

      {/* Why track — only sin-plan */}
      {state === 'sin-plan' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-sm font-bold text-[#1e3a5f]">¿Por que registrar comidas?</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Conocer tus macros te ayuda a optimizar energia y rendimiento.
            </p>
          </div>
        </div>
      )}

      {/* Adherence */}
      {adherenceSlot}

      {/* Activity card in sidebar — only sin-plan */}
      {state === 'sin-plan' && activitySlot}

      {/* Distribution donut (only with consumed data) */}
      {target && state !== 'sin-plan' && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Distribucion hoy</p>
          <NutritionSummaryDonut consumed={consumedSafe} target={targetSafe} />
        </div>
      )}

      {/* Tip */}
      {tipSlot}

      {/* Next meal */}
      {nextMeal && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Proxima comida</p>
          <ProximaComidaCard
            mealLabel={nextMeal.label}
            scheduledTime={nextMeal.time}
            foods={nextMeal.foods}
            kcal={nextMeal.kcal}
            proteinG={nextMeal.proteinG}
          />
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* ─── Desktop: 2-column layout ─── */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        {/* LEFT — Main column */}
        <div className="space-y-5">
          {headerSlot}
          {proposalSlot}
          {/* Activity in main column only for con-plan and b2b (sin-plan shows it in sidebar) */}
          {state !== 'sin-plan' && activitySlot}
          {phaseBannerSlot}

          {state === 'b2b' && planName && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-lg">🏆</span>
              <p className="text-sm font-semibold text-amber-800">Plan asignado: {planName}</p>
            </div>
          )}

          {macroCardsSlot}
          {initSlot}

          {/* State-specific content */}
          {state === 'sin-plan' && emptyMealPlanSlot}

          {state === 'con-plan' && target && (
            <DeficitHeroCard
              consumed={consumedSafe}
              target={targetSafe}
              onViewConsumed={() => setModalOpen(true)}
              onRegister={() => {
                const el = document.getElementById('tracking')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              activityKcalBonus={activityKcalBonus}
              activityLabel={activityLabel}
            />
          )}

          {state === 'b2b' && coachBannerSlot}

          {weeklyMenuSlot}
          {pendingBannerSlot}
          {mealCardsSlot}
          {mealPlanSlot}
          {menuLinksSlot}

          <div id="tracking">{trackingSectionSlot}</div>

          {foodGuideSlot}
        </div>

        {/* RIGHT — Sidebar (320px fixed) */}
        <div className="min-w-0">
          {sidebarContent}
        </div>
      </div>

      {/* ─── Mobile: single column (matches Figma mobile frames) ─── */}
      {/* Order per Figma: sin-plan 4523:550 · con-plan 4523:633 · b2b 4523:753 */}
      <div className="lg:hidden space-y-3">
        {/* b2b: CoachBanner first (Figma #2) */}
        {state === 'b2b' && coachBannerSlot}

        {/* Proposal — all states (sin-plan: empty, con-plan: #2, b2b: #3) */}
        {proposalSlot}

        {/* con-plan only: Activity before donut (Figma #3) */}
        {state === 'con-plan' && activitySlot}

        {phaseBannerSlot}

        {state === 'b2b' && planName && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg">🏆</span>
            <p className="text-sm font-semibold text-amber-800">Plan asignado: {planName}</p>
          </div>
        )}

        {/* Donut hero (sin-plan: #2, con-plan: #4, b2b: #4) */}
        {target ? (
          <CalorieDonutHero consumed={consumedSafe} target={targetSafe} state={state} />
        ) : (
          macroCardsSlot
        )}

        {initSlot}

        {/* Hydration — right after donut in all states */}
        {hydrationSlot}

        {/* sin-plan & b2b: Activity after hydration (Figma sin-plan #4, b2b #6) */}
        {state !== 'con-plan' && activitySlot}

        {/* sin-plan: EmptyState (Figma #5) */}
        {state === 'sin-plan' && emptyMealPlanSlot}

        {/* Meal checklist (con-plan #6, b2b #7) */}
        {hasMealPlan && mealChecklist.length > 0 && (
          <MealListInline
            meals={mealChecklist}
            totalLogged={mealChecklist.filter(m => m.isLogged).length}
            totalPlanned={mealChecklist.length}
          />
        )}

        {/* Next meal highlight (con-plan #7, b2b #8) */}
        {nextMeal && (
          <ProximaComidaCard
            mealLabel={nextMeal.label}
            scheduledTime={nextMeal.time}
            foods={nextMeal.foods}
            kcal={nextMeal.kcal}
            proteinG={nextMeal.proteinG}
          />
        )}

        {/* Tip/Weekly order varies by state:
            con-plan: Weekly → Tip (Figma #8 → #9)
            sin-plan & b2b: Tip → Weekly (Figma sin-plan #6→#7, b2b #9→#11) */}
        {state === 'con-plan' ? (
          <>
            {adherenceSlot}
            {tipSlot}
          </>
        ) : (
          <>
            {tipSlot}
            {/* b2b: CoachCTA between Tip and Weekly (Figma #10) */}
            {state === 'b2b' && (
              <Link
                href="/mensajes"
                className="flex items-center justify-center gap-2 h-10 rounded-full border border-[#d0d7e1] bg-white text-sm font-semibold text-[#1e3a5f] hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm">📩</span>
                Mensaje al coach
              </Link>
            )}
            {adherenceSlot}
          </>
        )}

        {weeklyMenuSlot}
        {pendingBannerSlot}
        {mealCardsSlot}
        {mealPlanSlot}
        {menuLinksSlot}

        <div id="tracking-mobile">{trackingSectionSlot}</div>

        {foodGuideSlot}
      </div>

      {/* Consumed modal */}
      <ConsumedModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
