'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Search, Loader2 } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Food = {
  id: string; name: string; category: string
  kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number
  servingG: number; servingLabel: string | null
}

type PlannedMeal = {
  id: string
  mealType: string
  grams: number
  food: Food
  override: {
    overrideFoodId: string
    overrideGrams: number
    overrideFood: Food
  } | null
}

type WeekMeals = Record<string, PlannedMeal[]> // date YYYY-MM-DD → meals

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_TYPES = ['BREAKFAST', 'PRE_WORKOUT', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT'] as const
type MealType = typeof MEAL_TYPES[number]

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST:    'Desayuno',
  PRE_WORKOUT:  'Pre-entreno',
  LUNCH:        'Almuerzo',
  SNACK:        'Snack',
  DINNER:       'Cena',
  POST_WORKOUT: 'Post-entreno',
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const QUICK_GRAMS = [50, 100, 150, 200]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function calcKcal(food: Food, grams: number): number {
  return Math.round((food.kcalPer100g * grams) / 100)
}

function calcMacro(valuePer100: number, grams: number): number {
  return Math.round((valuePer100 * grams) / 100 * 10) / 10
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  athleteId: string
}

export default function CoachPlannedMealPlanner({ athleteId }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))
  const [weekMeals, setWeekMeals] = useState<WeekMeals>({})
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string>(() => toDateStr(new Date()))

  // Food search state
  const [addingMealType, setAddingMealType] = useState<MealType | null>(null)
  const [foodQuery, setFoodQuery] = useState('')
  const [foodResults, setFoodResults] = useState<Food[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [saving, setSaving] = useState(false)

  // Load week
  const loadWeek = useCallback(async (monday: Date) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/coach/athletes/${athleteId}/nutrition/plan?week=${toDateStr(monday)}`
      )
      if (res.ok) {
        const data = (await res.json()) as { meals: WeekMeals }
        setWeekMeals(data.meals)
      }
    } finally {
      setLoading(false)
    }
  }, [athleteId])

  useEffect(() => {
    loadWeek(weekStart)
  }, [weekStart, loadWeek])

  // Food search with debounce
  useEffect(() => {
    if (!foodQuery.trim()) { setFoodResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/athlete/nutrition/foods?q=${encodeURIComponent(foodQuery.trim())}`)
        if (res.ok) {
          const data = (await res.json()) as Food[]
          setFoodResults(data)
        }
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [foodQuery])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function goWeek(delta: number) {
    const next = addDays(weekStart, delta * 7)
    setWeekStart(next)
    setSelectedDay(toDateStr(next))
  }

  function openAdd(mealType: MealType) {
    setAddingMealType(mealType)
    setFoodQuery('')
    setFoodResults([])
    setSelectedFood(null)
    setGrams(100)
  }

  function cancelAdd() {
    setAddingMealType(null)
    setSelectedFood(null)
    setFoodQuery('')
    setFoodResults([])
  }

  async function saveItem() {
    if (!selectedFood || !addingMealType || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/nutrition/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDay,
          mealType: addingMealType,
          foodId: selectedFood.id,
          grams,
        }),
      })
      if (res.ok) {
        const data = (await res.json()) as { meal: PlannedMeal }
        setWeekMeals(prev => {
          const current = prev[selectedDay] ?? []
          return { ...prev, [selectedDay]: [...current, data.meal] }
        })
        cancelAdd()
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(mealId: string) {
    const res = await fetch(`/api/coach/athletes/${athleteId}/nutrition/plan/${mealId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setWeekMeals(prev => {
        const current = prev[selectedDay] ?? []
        return { ...prev, [selectedDay]: current.filter(m => m.id !== mealId) }
      })
    }
  }

  const dayMeals = weekMeals[selectedDay] ?? []

  // Group selected day meals by mealType
  const grouped = MEAL_TYPES.reduce<Record<MealType, PlannedMeal[]>>((acc, t) => {
    acc[t] = dayMeals.filter(m => m.mealType === t)
    return acc
  }, {} as Record<MealType, PlannedMeal[]>)

  // Daily totals — use override food/grams when athlete has swapped
  const totals = dayMeals.reduce(
    (acc, m) => {
      const f = m.override ? m.override.overrideFood : m.food
      const g = m.override ? m.override.overrideGrams : m.grams
      return {
        kcal:    acc.kcal    + calcKcal(f, g),
        protein: acc.protein + calcMacro(f.proteinPer100g, g),
        carbs:   acc.carbs   + calcMacro(f.carbsPer100g,   g),
        fat:     acc.fat     + calcMacro(f.fatPer100g,     g),
      }
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Plan nutricional semanal</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => goWeek(-1)} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-xs text-gray-500 font-medium min-w-[120px] text-center">
            {weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} –{' '}
            {addDays(weekStart, 6).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
          </span>
          <button onClick={() => goWeek(1)} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1 mb-5">
        {weekDays.map((day, i) => {
          const dateStr = toDateStr(day)
          const mealCount = weekMeals[dateStr]?.length ?? 0
          const isSelected = dateStr === selectedDay
          const isToday = toDateStr(new Date()) === dateStr
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(dateStr)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all text-center border ${
                isSelected
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                {DAY_NAMES[i]}
              </span>
              <span className={`text-sm font-bold mt-0.5 ${isToday && !isSelected ? 'text-[#ea580c]' : ''}`}>
                {day.getDate()}
              </span>
              {mealCount > 0 && (
                <span className={`text-[10px] mt-0.5 font-semibold ${isSelected ? 'text-blue-200' : 'text-[#ea580c]'}`}>
                  {mealCount} items
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <>
          {/* Daily totals */}
          {dayMeals.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              {[
                { label: 'kcal', value: totals.kcal.toString() },
                { label: 'Proteína', value: `${totals.protein}g` },
                { label: 'Carbos', value: `${totals.carbs}g` },
                { label: 'Grasas', value: `${totals.fat}g` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-bold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Meals by mealType */}
          <div className="space-y-4">
            {MEAL_TYPES.map((mealType) => {
              const items = grouped[mealType]
              const isAdding = addingMealType === mealType
              return (
                <div key={mealType}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {MEAL_LABELS[mealType]}
                    </span>
                    {!isAdding && (
                      <button
                        onClick={() => openAdd(mealType)}
                        className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:text-[#ea580c] transition-colors font-medium"
                      >
                        <Plus className="w-3 h-3" /> Agregar
                      </button>
                    )}
                  </div>

                  {/* Existing items */}
                  {items.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {items.map((item) => {
                        const hasOverride = item.override !== null
                        const displayFood = hasOverride ? item.override!.overrideFood : item.food
                        const displayGrams = hasOverride ? item.override!.overrideGrams : item.grams
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between py-1.5 px-3 rounded-lg ${hasOverride ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50'}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-gray-800 truncate">{displayFood.name}</p>
                                {hasOverride && (
                                  <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                    swap
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {displayGrams}g · {calcKcal(displayFood, displayGrams)} kcal ·{' '}
                                P{calcMacro(displayFood.proteinPer100g, displayGrams)}g
                                {hasOverride && (
                                  <span className="ml-1 text-orange-500">
                                    (original: {item.food.name})
                                  </span>
                                )}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="ml-2 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Add food inline */}
                  {isAdding && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
                      {/* Food search */}
                      {!selectedFood ? (
                        <div>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Buscar alimento..."
                              value={foodQuery}
                              onChange={e => setFoodQuery(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                            />
                          </div>
                          {searching && (
                            <p className="text-xs text-gray-400 mt-2 text-center">Buscando...</p>
                          )}
                          {!searching && foodResults.length > 0 && (
                            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-white divide-y divide-gray-50">
                              {foodResults.map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => { setSelectedFood(f); setGrams(f.servingG || 100) }}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                                >
                                  <p className="text-sm font-medium text-gray-800">{f.name}</p>
                                  <p className="text-xs text-gray-400">{f.kcalPer100g} kcal/100g · P{f.proteinPer100g}g</p>
                                </button>
                              ))}
                            </div>
                          )}
                          {!searching && foodQuery.trim() && foodResults.length === 0 && (
                            <p className="text-xs text-gray-400 mt-2 text-center">Sin resultados</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-800">{selectedFood.name}</p>
                            <button
                              onClick={() => { setSelectedFood(null); setFoodQuery('') }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Cambiar
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mb-3">
                            {calcKcal(selectedFood, grams)} kcal · P{calcMacro(selectedFood.proteinPer100g, grams)}g ·{' '}
                            C{calcMacro(selectedFood.carbsPer100g, grams)}g · G{calcMacro(selectedFood.fatPer100g, grams)}g
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="number"
                              min={1}
                              max={2000}
                              value={grams}
                              onChange={e => setGrams(Math.max(1, Number(e.target.value)))}
                              className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                            />
                            <span className="text-xs text-gray-400">g</span>
                            <div className="flex gap-1 ml-auto">
                              {QUICK_GRAMS.map(g => (
                                <button
                                  key={g}
                                  onClick={() => setGrams(g)}
                                  className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
                                    grams === g
                                      ? 'bg-[#1e3a5f] text-white'
                                      : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                                  }`}
                                >
                                  {g}g
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelAdd}
                          className="flex-1 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        {selectedFood && (
                          <button
                            onClick={saveItem}
                            disabled={saving}
                            className="flex-1 py-1.5 text-xs font-semibold text-white bg-[#1e3a5f] rounded-lg hover:bg-[#162d4a] transition-colors disabled:opacity-50"
                          >
                            {saving ? 'Guardando...' : 'Agregar'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {items.length === 0 && !isAdding && (
                    <p className="text-xs text-gray-300 italic">Sin alimentos planificados</p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
