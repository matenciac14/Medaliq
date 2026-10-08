'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search, X, Users, Check, Flame, ChevronDown } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Food = {
  id: string; name: string; category: string
  kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number
  servingG: number; servingLabel: string | null
}

type FoodItem = {
  id: string; grams: number; kcal: number; proteinG: number; carbsG: number; fatG: number
  food: Food
}

type Meal = {
  id: string; mealType: string; order: number
  items: FoodItem[]
}

type Day = {
  id: string; dayType: 'HARD' | 'EASY' | 'REST'
  meals: Meal[]
}

type Template = {
  id: string; name: string; description: string | null; goal: string | null
  days: Day[]
}

type Athlete = {
  id: string; name: string | null; email: string
  assignedTemplateId: string | null
  hasActivePlan: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_CONFIG = {
  HARD: { label: 'Día Duro', color: 'border-red-300 bg-red-50', badge: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
  EASY: { label: 'Día Fácil', color: 'border-green-300 bg-green-50', badge: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
  REST: { label: 'Descanso', color: 'border-gray-300 bg-gray-50', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
} as const

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '🍳 Desayuno',
  LUNCH: '🥗 Almuerzo',
  DINNER: '🍽️ Cena',
  SNACK: '🍎 Snack',
  PRE_WORKOUT: '⚡ Pre-entreno',
  POST_WORKOUT: '💪 Post-entreno',
}

const MEAL_ORDER = ['BREAKFAST', 'PRE_WORKOUT', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT']

function calcMacros(food: Food, grams: number) {
  const f = grams / 100
  return {
    kcal:     Math.round(food.kcalPer100g    * f * 10) / 10,
    proteinG: Math.round(food.proteinPer100g * f * 10) / 10,
    carbsG:   Math.round(food.carbsPer100g   * f * 10) / 10,
    fatG:     Math.round(food.fatPer100g     * f * 10) / 10,
  }
}

function dayTotals(day: Day) {
  return day.meals.reduce(
    (acc, m) => {
      for (const item of m.items) {
        acc.kcal     += item.kcal
        acc.proteinG += item.proteinG
        acc.carbsG   += item.carbsG
        acc.fatG     += item.fatG
      }
      return acc
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )
}

// ── Food Search Modal ─────────────────────────────────────────────────────────

function FoodSearchModal({
  onAdd,
  onClose,
}: {
  onAdd: (food: Food, grams: number) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const res = await fetch(`/api/athlete/nutrition/foods?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data.foods ?? [])
    setLoading(false)
  }, [])

  const macros = selected ? calcMacros(selected, grams) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Agregar alimento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
              placeholder="Buscar alimento…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="px-5 py-4 text-sm text-gray-400">Buscando…</div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="px-5 py-4 text-sm text-gray-400">Sin resultados.</div>
          )}
          {results.map((f) => (
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
              <p className="text-xs font-medium text-gray-600 mb-1">
                {selected.name} — {selected.servingLabel ?? `${selected.servingG}g por porción`}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 shrink-0">Gramos:</label>
                <input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(Math.max(1, Number(e.target.value)))}
                  min={1}
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {[50, 100, 150, 200].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrams(g)}
                    className={`px-2 py-1 text-xs rounded-lg border transition-colors ${grams === g ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            </div>

            {macros && (
              <div className="flex gap-4 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <span className="flex items-center gap-1"><Flame size={11} className="text-orange-600" /><strong>{Math.round(macros.kcal)}</strong> kcal</span>
                <span><strong>{Math.round(macros.proteinG)}</strong>g prot</span>
                <span><strong>{Math.round(macros.carbsG)}</strong>g carb</span>
                <span><strong>{Math.round(macros.fatG)}</strong>g gras</span>
              </div>
            )}

            <button
              onClick={() => { onAdd(selected, grams); setSelected(null); setQuery(''); setResults([]) }}
              disabled={isPending}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#ea580c' }}
            >
              Agregar al plan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Assign Modal ──────────────────────────────────────────────────────────────

function AssignModal({
  templateId,
  athletes,
  onClose,
}: {
  templateId: string
  athletes: Athlete[]
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(
    new Set(athletes.filter((a) => a.assignedTemplateId === templateId).map((a) => a.id))
  )
  const [error, setError] = useState<string | null>(null)

  async function handleAssign(athleteId: string, isAssigned: boolean) {
    setAssigningId(athleteId)
    setError(null)
    const athlete = athletes.find((a) => a.id === athleteId)
    startTransition(async () => {
      const res = await fetch(`/api/coach/nutrition/templates/${templateId}/assign`, {
        method: isAssigned ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Error al asignar.')
      } else {
        setDone((prev) => {
          const next = new Set(prev)
          isAssigned ? next.delete(athleteId) : next.add(athleteId)
          return next
        })
        // Also link/unlink template to athlete's active plan
        if (athlete?.hasActivePlan) {
          await fetch(`/api/coach/athletes/${athleteId}/plan/nutrition-template`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nutritionTemplateId: isAssigned ? null : templateId }),
          })
        }
        router.refresh()
      }
      setAssigningId(null)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[70vh]">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Users size={18} className="text-orange-600" /> Asignar a atletas</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={18} /></button>
        </div>

        {error && <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>}

        <div className="flex-1 overflow-y-auto">
          {athletes.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Sin atletas activos.</div>
          )}
          {athletes.map((a) => {
            const assigned = done.has(a.id)
            const loading = assigningId === a.id && isPending
            return (
              <button
                key={a.id}
                onClick={() => handleAssign(a.id, assigned)}
                disabled={loading}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 border-b border-gray-50 transition-colors disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{a.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{a.email}</p>
                  {a.assignedTemplateId && a.assignedTemplateId !== templateId && (
                    <p className="text-xs text-amber-500">Tiene otro plan nutricional asignado</p>
                  )}
                  {a.hasActivePlan && (
                    <p className="text-xs text-blue-500">{assigned ? 'Vinculado al plan activo' : 'Se vinculará al plan activo'}</p>
                  )}
                </div>
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                ) : assigned ? (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ea580c' }}>
                    <Check size={13} color="white" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Builder ──────────────────────────────────────────────────────────────

export default function NutritionBuilderClient({
  template: initialTemplate,
  athletes,
}: {
  template: Template
  athletes: Athlete[]
}) {
  const router = useRouter()
  const [template, setTemplate] = useState<Template>(initialTemplate)
  const [activeDayType, setActiveDayType] = useState<'HARD' | 'EASY' | 'REST'>('HARD')
  const [addingMeal, setAddingMeal] = useState<{ dayId: string; mealType: string } | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [isPending, startTransition] = useTransition()

  const activeDay = template.days.find((d) => d.dayType === activeDayType)!
  const totals = dayTotals(activeDay)

  // Comidas ordenadas + comidas disponibles para agregar
  const usedMealTypes = new Set(activeDay.meals.map((m) => m.mealType))
  const availableMealTypes = MEAL_ORDER.filter((mt) => !usedMealTypes.has(mt))

  function addItemToState(dayType: string, mealType: string, item: FoodItem) {
    setTemplate((prev) => ({
      ...prev,
      days: prev.days.map((d) => {
        if (d.dayType !== dayType) return d
        const mealExists = d.meals.find((m) => m.mealType === mealType)
        if (mealExists) {
          return {
            ...d,
            meals: d.meals.map((m) =>
              m.mealType === mealType ? { ...m, items: [...m.items, item] } : m
            ),
          }
        }
        return {
          ...d,
          meals: [...d.meals, { id: item.id + '-meal', mealType, order: d.meals.length, items: [item] }],
        }
      }),
    }))
  }

  function removeItemFromState(dayType: string, itemId: string) {
    setTemplate((prev) => ({
      ...prev,
      days: prev.days.map((d) => {
        if (d.dayType !== dayType) return d
        return {
          ...d,
          meals: d.meals
            .map((m) => ({ ...m, items: m.items.filter((i) => i.id !== itemId) }))
            .filter((m) => m.items.length > 0),
        }
      }),
    }))
  }

  async function handleAddFood(food: Food, grams: number) {
    if (!addingMeal) return
    const macros = calcMacros(food, grams)
    startTransition(async () => {
      const res = await fetch(`/api/coach/nutrition/templates/${template.id}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayType: activeDayType,
          mealType: addingMeal.mealType,
          foodId: food.id,
          grams,
        }),
      })
      if (!res.ok) return
      const { item } = await res.json()
      addItemToState(activeDayType, addingMeal.mealType, { ...item, food })
      setAddingMeal(null)
    })
  }

  async function handleRemoveItem(itemId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/coach/nutrition/templates/${template.id}/meals`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      if (!res.ok) return
      removeItemFromState(activeDayType, itemId)
    })
  }

  const cfg = DAY_CONFIG[activeDayType]

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push('/coach/nutrition')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">{template.name}</h1>
          {template.goal && <p className="text-xs text-gray-500">{template.goal}</p>}
        </div>
        <button
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#ea580c' }}
        >
          <Users size={15} />
          <span className="hidden sm:inline">Asignar</span>
        </button>
      </header>

      {/* Day tabs */}
      <div className="bg-white border-b border-gray-200 px-4 shrink-0">
        <div className="flex gap-1">
          {(['HARD', 'EASY', 'REST'] as const).map((dt) => {
            const c = DAY_CONFIG[dt]
            const t = dayTotals(template.days.find((d) => d.dayType === dt)!)
            const active = activeDayType === dt
            return (
              <button
                key={dt}
                onClick={() => setActiveDayType(dt)}
                className={`flex-1 sm:flex-none px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5 justify-center">
                  <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span>{c.label}</span>
                </div>
                {t.kcal > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">{Math.round(t.kcal)} kcal</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Totales del día */}
          {totals.kcal > 0 && (
            <div className={`rounded-xl border px-4 py-3 flex items-center gap-4 text-sm ${cfg.color}`}>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>{cfg.label}</span>
              <div className="flex gap-4 text-xs">
                <span><Flame size={12} className="inline mr-0.5" /><strong>{Math.round(totals.kcal)}</strong> kcal</span>
                <span><strong>{Math.round(totals.proteinG)}</strong>g prot</span>
                <span><strong>{Math.round(totals.carbsG)}</strong>g carb</span>
                <span><strong>{Math.round(totals.fatG)}</strong>g gras</span>
              </div>
            </div>
          )}

          {/* Comidas */}
          {MEAL_ORDER.filter((mt) => usedMealTypes.has(mt)).map((mealType) => {
            const meal = activeDay.meals.find((m) => m.mealType === mealType)!
            const mealTotals = meal.items.reduce(
              (acc, i) => ({ kcal: acc.kcal + i.kcal, proteinG: acc.proteinG + i.proteinG, carbsG: acc.carbsG + i.carbsG, fatG: acc.fatG + i.fatG }),
              { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
            )
            return (
              <div key={mealType} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{MEAL_LABELS[mealType]}</p>
                    {mealTotals.kcal > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Math.round(mealTotals.kcal)} kcal · P{Math.round(mealTotals.proteinG)}g · C{Math.round(mealTotals.carbsG)}g · G{Math.round(mealTotals.fatG)}g
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setAddingMeal({ dayId: activeDay.id, mealType })}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-orange-600 hover:bg-orange-50 border border-orange-200 transition-colors"
                  >
                    <Plus size={13} />
                    Agregar
                  </button>
                </div>

                {meal.items.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400">Sin alimentos — agrega uno.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {meal.items.map((item) => (
                      <div key={item.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.food.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.grams}g · {Math.round(item.kcal)} kcal · P{Math.round(item.proteinG)}g · C{Math.round(item.carbsG)}g
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Agregar comida */}
          {availableMealTypes.length > 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 overflow-hidden">
              <details className="group">
                <summary className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer select-none">
                  <Plus size={15} />
                  <span>Agregar tipo de comida</span>
                  <ChevronDown size={14} className="ml-auto group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {availableMealTypes.map((mt) => (
                    <button
                      key={mt}
                      onClick={() => setAddingMeal({ dayId: activeDay.id, mealType: mt })}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-orange-50 hover:text-orange-700 border border-gray-200 hover:border-orange-200 transition-colors"
                    >
                      {MEAL_LABELS[mt]}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {addingMeal && (
        <FoodSearchModal
          onAdd={handleAddFood}
          onClose={() => setAddingMeal(null)}
        />
      )}

      {showAssign && (
        <AssignModal
          templateId={template.id}
          athletes={athletes}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  )
}
