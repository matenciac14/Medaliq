// NUT-DASH-04 — Cards compactas de comidas planificadas para hoy
// Muestra las primeras 3 comidas del dia (agrupadas por mealType) con alimentos y kcal
// Solo visible cuando hay PlannedMeals para hoy

import Link from 'next/link'
import LogTodayButton from './LogTodayButton'

type PlannedMeal = {
  id: string
  mealType: string
  grams: number
  food: { name: string; kcalPer100g: number }
}

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST:    'Desayuno',
  PRE_WORKOUT:  'Pre-entreno',
  LUNCH:        'Almuerzo',
  SNACK:        'Snack',
  DINNER:       'Cena',
  POST_WORKOUT: 'Post-entreno',
}

const MEAL_ICONS: Record<string, string> = {
  BREAKFAST:    '🍳',
  PRE_WORKOUT:  '⚡',
  LUNCH:        '🥗',
  SNACK:        '🍎',
  DINNER:       '🌙',
  POST_WORKOUT: '💪',
}

const MEAL_ORDER = ['BREAKFAST', 'PRE_WORKOUT', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT']

export default function MealSummaryCards({ meals }: { meals: PlannedMeal[] }) {
  if (meals.length === 0) return null

  const byType: Record<string, PlannedMeal[]> = {}
  for (const m of meals) {
    if (!byType[m.mealType]) byType[m.mealType] = []
    byType[m.mealType].push(m)
  }

  const orderedTypes  = MEAL_ORDER.filter(t => byType[t])
  const visibleTypes  = orderedTypes.slice(0, 3)
  const totalComidas  = orderedTypes.length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estructura de comidas hoy</p>
        <div className="flex items-center gap-2">
          <LogTodayButton mealCount={meals.length} />
          <Link
            href="/nutrition/planner"
            className="text-xs font-semibold text-[#1e3a5f] hover:underline"
          >
            Ver plan ({totalComidas}) &rarr;
          </Link>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Basado en tu plan nutricional -- agrega tus alimentos al registrar
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {visibleTypes.map((mealType) => {
          const items    = byType[mealType]!
          const totalKcal = Math.round(
            items.reduce((s, m) => s + (m.food.kcalPer100g * m.grams / 100), 0)
          )
          const foodsList = items.map(i => `${i.food.name} ${i.grams}g`).join(' - ')
          const icon = MEAL_ICONS[mealType] ?? '🍽️'
          return (
            <div key={mealType} className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-3.5 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {MEAL_LABELS[mealType] ?? mealType}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-orange-600">{totalKcal} kcal</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{foodsList}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
