'use client'

type MealItem = {
  mealType: string
  label: string
  foods: string
  kcal: number
  isLogged: boolean
}

type Props = {
  meals: MealItem[]
  totalLogged: number
  totalPlanned: number
  onRegister?: (mealType: string) => void
}

const MEAL_ORDER = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'PRE_WORKOUT', 'POST_WORKOUT']

export default function MealListInline({ meals, totalLogged, totalPlanned, onRegister }: Props) {
  const sorted = [...meals].sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType))

  return (
    <div className="bg-white rounded-[16px] border border-[#f0f2f5] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1.5">
        <p className="text-[9px] font-bold text-[#8c99a6] uppercase" style={{ letterSpacing: '0.72px' }}>Comidas de hoy</p>
        <p className="text-[9px] font-semibold text-[#eb590d]">{totalLogged}/{totalPlanned}</p>
      </div>

      {sorted.map((meal, i) => (
        <div key={meal.mealType}>
          <div className="flex items-center gap-2 px-3.5 py-[7px]">
            {/* Check circle */}
            <div className={`w-4 h-4 rounded-[8px] flex items-center justify-center shrink-0 ${
              meal.isLogged
                ? 'bg-[#21c25c]'
                : 'border-2 border-gray-300'
            }`}>
              {meal.isLogged && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#26262b]">{meal.label}</p>
              {meal.foods && <p className="text-[9px] font-normal text-[#8c99a6] truncate">{meal.foods}</p>}
            </div>

            {/* Kcal or register */}
            {meal.isLogged ? (
              <span className="text-[11px] font-semibold text-[#21c25c] shrink-0">{meal.kcal} kcal</span>
            ) : (
              <button
                onClick={() => onRegister?.(meal.mealType)}
                className="text-[10px] font-semibold text-[#eb590d] whitespace-nowrap shrink-0"
              >
                + Registrar
              </button>
            )}
          </div>
          {i < sorted.length - 1 && <div className="h-px bg-[#f2f5f7]" />}
        </div>
      ))}
    </div>
  )
}
