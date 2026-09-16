'use client'

import { useState, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Search, Flame, CalendarCheck } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Food = {
  id: string; name: string; category: string
  kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number
  servingG: number; servingLabel: string | null
}

type PlannedMeal = {
  id: string; mealType: string; grams: number
  food: Food
}

type MealsByDate = Record<string, PlannedMeal[]>

type NutritionPlan = {
  targetKcalHard: number; targetKcalEasy: number; targetKcalRest: number
  proteinG: number; carbsHardG: number; carbsEasyG: number; fatG: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_ORDER = ['BREAKFAST', 'PRE_WORKOUT', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT'] as const
type MealType = typeof MEAL_ORDER[number]

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST:    '🍳 Desayuno',
  PRE_WORKOUT:  '⚡ Pre-entreno',
  LUNCH:        '🥗 Almuerzo',
  SNACK:        '🍎 Snack',
  DINNER:       '🍽️ Cena',
  POST_WORKOUT: '💪 Post-entreno',
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const QUICK_GRAMS = [50, 100, 150, 200]

const INTENSITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  HIGH:     { label: 'Día duro',   color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
  MODERATE: { label: 'Día fácil',  color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  LOW:      { label: 'Día suave',  color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200' },
  REST:     { label: 'Descanso',   color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function calcMacros(food: Food, grams: number) {
  const f = grams / 100
  return {
    kcal:     Math.round(food.kcalPer100g    * f),
    proteinG: Math.round(food.proteinPer100g * f * 10) / 10,
    carbsG:   Math.round(food.carbsPer100g   * f * 10) / 10,
    fatG:     Math.round(food.fatPer100g     * f * 10) / 10,
  }
}

function weekTotals(meals: MealsByDate) {
  let kcal = 0, proteinG = 0, carbsG = 0, fatG = 0
  for (const dayMeals of Object.values(meals)) {
    for (const m of dayMeals) {
      const t = calcMacros(m.food, m.grams)
      kcal += t.kcal; proteinG += t.proteinG; carbsG += t.carbsG; fatG += t.fatG
    }
  }
  return { kcal: Math.round(kcal), proteinG: Math.round(proteinG * 10) / 10, carbsG: Math.round(carbsG * 10) / 10, fatG: Math.round(fatG * 10) / 10 }
}

// ── FoodSearchModal ───────────────────────────────────────────────────────────

function FoodSearchModal({ onAdd, onClose }: { onAdd: (food: Food, grams: number) => void; onClose: () => void }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<Food[]>([])
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams]       = useState(100)
  const [loading, setLoading]   = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/athlete/nutrition/foods?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  const macros = selected ? calcMacros(selected, grams) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Agregar alimento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={16} /></button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar alimento…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="px-5 py-4 text-sm text-gray-400">Buscando…</p>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">Sin resultados para "{query}"</p>
          )}
          {!loading && query.length < 2 && (
            <p className="px-5 py-4 text-xs text-gray-400">Escribe al menos 2 caracteres para buscar</p>
          )}
          {results.map(f => (
            <button
              key={f.id}
              onClick={() => { setSelected(f); setGrams(f.servingG || 100) }}
              className={`w-full px-5 py-3 text-left hover:bg-gray-50 border-b border-gray-50 transition-colors ${selected?.id === f.id ? 'bg-orange-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.category}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{Math.round(f.kcalPer100g)} kcal</p>
                  <p className="text-gray-400">por 100g</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">{selected.name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs text-gray-500 shrink-0">Gramos:</label>
                <input
                  type="number"
                  value={grams}
                  onChange={e => setGrams(Math.max(1, Number(e.target.value)))}
                  min={1}
                  className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                />
                {QUICK_GRAMS.map(g => (
                  <button
                    key={g}
                    onClick={() => setGrams(g)}
                    className={`px-2 py-1 text-xs rounded-lg border transition-colors ${grams === g ? 'border-[#ea580c] bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            </div>
            {macros && (
              <div className="flex gap-3 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <span className="flex items-center gap-1"><Flame size={11} className="text-orange-500" /><strong>{macros.kcal}</strong> kcal</span>
                <span><strong>{macros.proteinG}</strong>g P</span>
                <span><strong>{macros.carbsG}</strong>g C</span>
                <span><strong>{macros.fatG}</strong>g G</span>
              </div>
            )}
            <button
              onClick={() => { onAdd(selected, grams); setSelected(null); setQuery(''); setResults([]) }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1e3a5f] hover:bg-[#162d4a] transition-colors"
            >
              Agregar al plan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── GramInput — editable inline con PATCH on blur ─────────────────────────────

function GramInput({ mealId, initialGrams, onUpdate }: { mealId: string; initialGrams: number; onUpdate: (id: string, grams: number) => void }) {
  const [value, setValue] = useState(String(initialGrams))
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function handleBlur() {
    const grams = Number(value)
    if (isNaN(grams) || grams <= 0 || grams === initialGrams) {
      setValue(String(initialGrams))
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/athlete/nutrition/planned-meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grams }),
      })
      if (res.ok) onUpdate(mealId, grams)
      else setValue(String(initialGrams))
    } catch {
      setValue(String(initialGrams))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <input
        ref={ref}
        type="number"
        value={value}
        min={1}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') ref.current?.blur() }}
        className={`w-14 px-1.5 py-0.5 text-xs border rounded text-center focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/40 transition-colors ${saving ? 'opacity-50' : 'border-gray-200 hover:border-gray-300'}`}
      />
      <span className="text-xs text-gray-400">g</span>
    </div>
  )
}

// ── ApplyTemplatePanel ────────────────────────────────────────────────────────

type NutritionDayType = 'HARD' | 'EASY' | 'REST'

const NUTRITION_DAY_OPTIONS: { value: NutritionDayType; label: string; activeClass: string }[] = [
  { value: 'HARD', label: 'Duro',      activeClass: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'EASY', label: 'Fácil',     activeClass: 'border-green-400 bg-green-50 text-green-700' },
  { value: 'REST', label: 'Descanso',  activeClass: 'border-gray-400 bg-gray-100 text-gray-600' },
]

// Maps PlannedSession.intensity → NutritionDayType
function intensityToNutritionDay(intensity: string): NutritionDayType {
  if (intensity === 'HIGH')     return 'HARD'
  if (intensity === 'MODERATE') return 'EASY'
  if (intensity === 'LOW')      return 'EASY'
  return 'REST'
}

function ApplyTemplatePanel({
  templateId,
  weekStart,
  weekDays,
  weekIntensities,
  onApplied,
}: {
  templateId: string
  weekStart: string
  weekDays: string[]
  weekIntensities: Record<string, string>
  onApplied: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [intensityMap, setIntensityMap] = useState<Record<string, NutritionDayType>>(() =>
    Object.fromEntries(
      weekDays.map(d => [d, weekIntensities[d] ? intensityToNutritionDay(weekIntensities[d]) : 'REST'])
    )
  )

  function handleApply() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/athlete/nutrition/templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, intensityMap }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al aplicar la plantilla.')
        return
      }
      onApplied()
    })
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarCheck size={16} className="text-orange-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-orange-800">Asigna la intensidad de cada día</p>
          <p className="text-xs text-orange-600">El sistema cargará las comidas correctas según el tipo de día.</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {weekDays.map((d, i) => {
          const date = new Date(d + 'T12:00:00Z')
          const label = `${DAY_NAMES[i]} ${date.getUTCDate()}`
          const current = intensityMap[d]
          return (
            <div key={d} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-700 w-16 shrink-0">{label}</span>
              <div className="flex gap-1">
                {NUTRITION_DAY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setIntensityMap(prev => ({ ...prev, [d]: opt.value }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      current === opt.value
                        ? opt.activeClass
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-3">{error}</p>
      )}

      <button
        onClick={handleApply}
        disabled={isPending}
        className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#ea580c' }}
      >
        {isPending ? 'Aplicando plantilla…' : 'Aplicar plantilla y planificar semana'}
      </button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  weekStart: string
  initialMeals: MealsByDate
  weekIntensities: Record<string, string>
  nutritionPlan: NutritionPlan | null
  templateId?: string
}

export default function PlannedMealPlannerClient({ weekStart, initialMeals, weekIntensities, nutritionPlan, templateId }: Props) {
  const router = useRouter()
  const [meals, setMeals]           = useState<MealsByDate>(initialMeals)
  const [selectedDay, setSelectedDay] = useState<string>(weekStart)
  const [addingTo, setAddingTo]     = useState<MealType | null>(null)
  const [saving, setSaving]         = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date().toISOString().slice(0, 10)
  const dayMeals = meals[selectedDay] ?? []

  // After applying template, navigate to planner without templateId to reload server data
  function handleTemplateApplied() {
    router.push(`/nutrition/planner?week=${weekStart}`)
  }

  const grouped = MEAL_ORDER.reduce<Record<MealType, PlannedMeal[]>>((acc, t) => {
    acc[t] = dayMeals.filter(m => m.mealType === t)
    return acc
  }, {} as Record<MealType, PlannedMeal[]>)

  // Totales del día seleccionado
  const dayTotals = dayMeals.reduce(
    (acc, m) => {
      const t = calcMacros(m.food, m.grams)
      return { kcal: acc.kcal + t.kcal, proteinG: acc.proteinG + t.proteinG, carbsG: acc.carbsG + t.carbsG, fatG: acc.fatG + t.fatG }
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  // Totales de la semana completa
  const totals = weekTotals(meals)
  const daysPlanned = Object.values(meals).filter(d => d.length > 0).length

  // Target del día según intensidad
  const intensity = weekIntensities[selectedDay] ?? 'REST'
  const dayTarget = nutritionPlan ? (
    intensity === 'HIGH' ? nutritionPlan.targetKcalHard
    : intensity === 'REST' ? nutritionPlan.targetKcalRest
    : nutritionPlan.targetKcalEasy
  ) : null

  async function handleAdd(food: Food, grams: number) {
    if (!addingTo) return
    setSaving(true)
    try {
      const res = await fetch('/api/athlete/planned-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDay, mealType: addingTo, foodId: food.id, grams }),
      })
      if (res.ok) {
        const { meal } = await res.json()
        setMeals(prev => ({
          ...prev,
          [selectedDay]: [...(prev[selectedDay] ?? []), meal],
        }))
        setAddingTo(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(mealId: string) {
    const res = await fetch(`/api/athlete/nutrition/planned-meals/${mealId}`, { method: 'DELETE' })
    if (res.ok) {
      setMeals(prev => ({
        ...prev,
        [selectedDay]: (prev[selectedDay] ?? []).filter(m => m.id !== mealId),
      }))
    }
  }

  function handleUpdateGrams(mealId: string, grams: number) {
    setMeals(prev => ({
      ...prev,
      [selectedDay]: (prev[selectedDay] ?? []).map(m =>
        m.id === mealId ? { ...m, grams } : m
      ),
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/nutrition')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} /> Nutrición
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Planificador semanal</h1>
          <button
            onClick={() => router.push('/nutrition?planned=1')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition-colors"
          >
            Guardar y volver
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 flex gap-5">
        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Apply template panel — visible when coming from Constructor A */}
          {templateId && (
            <ApplyTemplatePanel
              templateId={templateId}
              weekStart={weekStart}
              weekDays={weekDays}
              weekIntensities={weekIntensities}
              onApplied={handleTemplateApplied}
            />
          )}

          {/* Week strip */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((d, i) => {
                const mealCount = meals[d]?.length ?? 0
                const isSelected = d === selectedDay
                const isToday = d === today
                const intensity = weekIntensities[d]
                const intConfig = intensity ? INTENSITY_CONFIG[intensity] : null
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                        : isToday
                          ? 'border-[#ea580c] bg-orange-50/50 hover:bg-orange-50'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                      {DAY_NAMES[i]}
                    </span>
                    <span className={`text-sm font-bold mt-0.5 ${isToday && !isSelected ? 'text-[#ea580c]' : ''}`}>
                      {new Date(d + 'T12:00:00Z').getUTCDate()}
                    </span>
                    {intConfig && !isSelected && (
                      <span className={`text-[8px] font-semibold mt-0.5 ${intConfig.color}`}>
                        {intensity === 'HIGH' ? 'Duro' : intensity === 'REST' ? 'Rest' : 'Fácil'}
                      </span>
                    )}
                    {mealCount > 0 && (
                      <span className={`text-[9px] font-semibold mt-0.5 ${isSelected ? 'text-orange-300' : 'text-[#ea580c]'}`}>
                        {mealCount} items
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Día seleccionado — totales */}
            {dayMeals.length > 0 && (
              <div className={`mt-3 p-3 rounded-xl border flex items-center gap-4 ${
                weekIntensities[selectedDay] ? (INTENSITY_CONFIG[weekIntensities[selectedDay]]?.bg ?? 'bg-gray-50 border-gray-100') : 'bg-gray-50 border-gray-100'
              }`}>
                {weekIntensities[selectedDay] && (
                  <span className={`text-xs font-semibold shrink-0 ${INTENSITY_CONFIG[weekIntensities[selectedDay]]?.color ?? ''}`}>
                    {INTENSITY_CONFIG[weekIntensities[selectedDay]]?.label}
                  </span>
                )}
                <div className="flex items-center gap-4 text-xs flex-wrap">
                  <span className="font-bold text-gray-800">{Math.round(dayTotals.kcal)} kcal</span>
                  {dayTarget && (
                    <span className="text-gray-400">/ {dayTarget} objetivo</span>
                  )}
                  <span className="text-gray-500">P {dayTotals.proteinG}g</span>
                  <span className="text-gray-500">C {dayTotals.carbsG}g</span>
                  <span className="text-gray-500">G {dayTotals.fatG}g</span>
                </div>
              </div>
            )}
          </div>

          {/* Meals por tipo */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {MEAL_ORDER.map(mealType => {
              const items = grouped[mealType]
              return (
                <div key={mealType} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-600">{MEAL_LABELS[mealType]}</span>
                    <button
                      onClick={() => setAddingTo(mealType)}
                      className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:text-[#ea580c] transition-colors font-medium"
                    >
                      <Plus size={13} /> Agregar
                    </button>
                  </div>

                  {items.length > 0 ? (
                    <div className="space-y-2">
                      {items.map(item => {
                        const macros = calcMacros(item.food, item.grams)
                        return (
                          <div key={item.id} className="flex items-center gap-3 py-1.5 px-3 bg-gray-50 rounded-xl group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{item.food.name}</p>
                              <p className="text-xs text-gray-400">{macros.kcal} kcal · P{macros.proteinG}g · C{macros.carbsG}g</p>
                            </div>
                            <GramInput
                              mealId={item.id}
                              initialGrams={item.grams}
                              onUpdate={handleUpdateGrams}
                            />
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Sin alimentos planificados</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Sidebar: resumen semanal ── */}
        <div className="w-64 shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sticky top-20">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumen semanal</p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Días planificados</span>
                <span className="font-semibold text-gray-800">{daysPlanned} / 7</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#1e3a5f] rounded-full transition-all" style={{ width: `${(daysPlanned / 7) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Calorías', value: `${totals.kcal.toLocaleString()} kcal`, color: 'text-orange-600' },
                { label: 'Proteína', value: `${totals.proteinG}g`, color: 'text-blue-600' },
                { label: 'Carbos', value: `${totals.carbsG}g`, color: 'text-yellow-600' },
                { label: 'Grasas', value: `${totals.fatG}g`, color: 'text-green-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            {nutritionPlan && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Objetivo diario</p>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Día duro</span>
                    <span className="font-medium text-gray-700">{nutritionPlan.targetKcalHard} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Día fácil</span>
                    <span className="font-medium text-gray-700">{nutritionPlan.targetKcalEasy} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descanso</span>
                    <span className="font-medium text-gray-700">{nutritionPlan.targetKcalRest} kcal</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/nutrition?planned=1')}
              className="mt-4 w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#162d4a] transition-colors"
            >
              Guardar y volver
            </button>
          </div>
        </div>
      </div>

      {/* Food Search Modal */}
      {addingTo && (
        <FoodSearchModal
          onAdd={handleAdd}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  )
}
