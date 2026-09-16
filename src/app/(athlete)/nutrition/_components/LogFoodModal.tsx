'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

type MealTemplateItem = {
  foodId: string
  grams: number
  food: { id: string; name: string; kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }
}
type MealTemplate = { id: string; name: string; mealType: string | null; items: MealTemplateItem[] }

function calcTemplateKcal(t: MealTemplate) {
  return t.items.reduce((sum, i) => sum + Math.round(i.food.kcalPer100g * i.grams / 100), 0)
}
function calcTemplateMacros(t: MealTemplate) {
  return t.items.reduce((acc, i) => {
    const f = i.grams / 100
    return {
      proteinG: acc.proteinG + Math.round(i.food.proteinPer100g * f),
      carbsG: acc.carbsG + Math.round(i.food.carbsPer100g * f),
      fatG: acc.fatG + Math.round(i.food.fatPer100g * f),
    }
  }, { proteinG: 0, carbsG: 0, fatG: 0 })
}

type FoodItem = {
  id: string
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  servingG: number
  servingLabel: string | null
  [key: string]: unknown
}

const MEAL_TYPES = [
  { key: 'BREAKFAST',    label: 'Desayuno'     },
  { key: 'LUNCH',        label: 'Almuerzo'     },
  { key: 'DINNER',       label: 'Cena'         },
  { key: 'SNACK',        label: 'Merienda'     },
  { key: 'PRE_WORKOUT',  label: 'Pre-entreno'  },
  { key: 'POST_WORKOUT', label: 'Post-entreno' },
]

const CATEGORY_LABELS: Record<string, string> = {
  PROTEIN:   'Proteinas',
  CARB:      'Carbohidratos',
  FAT:       'Grasas',
  VEGETABLE: 'Verduras',
  FRUIT:     'Frutas',
  DAIRY:     'Lacteos',
  LEGUME:    'Legumbres',
}

type Step = 'search' | 'detail' | 'save-template' | 'propose'

type ProposeForm = {
  name: string
  category: string
  kcalPer100g: string
  proteinPer100g: string
  carbsPer100g: string
  fatPer100g: string
  country: string
  notes: string
}

const DEFAULT_PROPOSE: ProposeForm = {
  name: '', category: 'CARB', kcalPer100g: '', proteinPer100g: '',
  carbsPer100g: '', fatPer100g: '', country: '', notes: '',
}

const PROPOSE_CATEGORIES = ['PROTEIN', 'CARB', 'FAT', 'VEGETABLE', 'FRUIT', 'DAIRY', 'LEGUME']
const PROPOSE_COUNTRIES  = [
  { key: '',   label: 'Universal' },
  { key: 'CO', label: 'Colombia'  },
  { key: 'MX', label: 'Mexico'    },
  { key: 'AR', label: 'Argentina' },
  { key: 'PE', label: 'Peru'      },
  { key: 'VE', label: 'Venezuela' },
  { key: 'CL', label: 'Chile'     },
]

type Props = {
  foods: FoodItem[]
  date?: string
  onClose: () => void
}

export default function LogFoodModal({ foods, date, onClose }: Props) {
  const router = useRouter()

  const [step, setStep]               = useState<Step>('search')
  const [query, setQuery]             = useState('')
  const [selected, setSelected]       = useState<FoodItem | null>(null)
  const [grams, setGrams]             = useState('')
  const [mealType, setMealType]       = useState('BREAKFAST')
  const [submitting, setSubmitting]   = useState(false)
  const [templates, setTemplates]     = useState<MealTemplate[]>([])
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [loggingTemplate, setLoggingTemplate] = useState<string | null>(null)
  const [proposeForm, setProposeForm]         = useState<ProposeForm>(DEFAULT_PROPOSE)
  const [proposeSuccess, setProposeSuccess]   = useState(false)
  const [proposing, setProposing]             = useState(false)
  const [searchResults, setSearchResults]     = useState<FoodItem[] | null>(null)
  const [searching, setSearching]             = useState(false)

  // Meal type scroll
  const mealScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/athlete/nutrition/meal-templates')
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.templates && setTemplates(d.templates))
      .catch(() => {})
  }, [])

  const fetchSearchResults = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults(null); return }
    setSearching(true)
    fetch(`/api/athlete/nutrition/foods?q=${encodeURIComponent(q.trim())}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: FoodItem[] | null) => { if (data) setSearchResults(data) })
      .catch(() => {})
      .finally(() => setSearching(false))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSearchResults(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchSearchResults])

  const filtered = useMemo(() => {
    if (!query.trim()) return foods.slice(0, 30)
    if (searchResults !== null) return searchResults
    const q = query.toLowerCase()
    return foods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 40)
  }, [foods, query, searchResults])

  function selectFood(food: FoodItem) {
    setSelected(food)
    setGrams(String(Math.round(food.servingG)))
    setStep('detail')
  }

  async function handleSubmit() {
    if (!selected || !grams) return
    const g = Number(grams)
    if (isNaN(g) || g <= 0) return
    setSubmitting(true)
    try {
      await fetch('/api/athlete/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodId: selected.id, grams: g, mealType, date }),
      })
      router.refresh()
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogTemplate(template: MealTemplate) {
    setLoggingTemplate(template.id)
    try {
      await Promise.all(
        template.items.map(item =>
          fetch('/api/athlete/nutrition/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ foodId: item.foodId, grams: item.grams, mealType, date }),
          })
        )
      )
      router.refresh()
      handleClose()
    } finally {
      setLoggingTemplate(null)
    }
  }

  async function handleSaveTemplate() {
    if (!selected || !grams || !templateName.trim()) return
    setSavingTemplate(true)
    try {
      const res = await fetch('/api/athlete/nutrition/meal-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          mealType,
          items: [{ foodId: selected.id, grams: Number(grams) }],
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setTemplates(prev => [d.template, ...prev])
        setStep('detail')
        setTemplateName('')
      }
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleSubmitPropose() {
    const { name, category, kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g } = proposeForm
    if (!name.trim() || !kcalPer100g || !proteinPer100g || !carbsPer100g || !fatPer100g) return
    setProposing(true)
    try {
      await fetch('/api/athlete/nutrition/foods/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          kcalPer100g:    Number(kcalPer100g),
          proteinPer100g: Number(proteinPer100g),
          carbsPer100g:   Number(carbsPer100g),
          fatPer100g:     Number(fatPer100g),
          country: proposeForm.country || undefined,
          notes:   proposeForm.notes.trim() || undefined,
        }),
      })
      setProposeSuccess(true)
    } finally {
      setProposing(false)
    }
  }

  async function handleDeleteTemplate(id: string) {
    await fetch(`/api/athlete/nutrition/meal-templates/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  function handleClose() {
    setStep('search')
    setQuery('')
    setSelected(null)
    setGrams('')
    setMealType('BREAKFAST')
    setTemplateName('')
    setProposeForm(DEFAULT_PROPOSE)
    setProposeSuccess(false)
    onClose()
  }

  const preview = selected && grams
    ? (() => {
        const r = Number(grams) / 100
        return {
          kcal:     Math.round(selected.kcalPer100g    * r),
          proteinG: Math.round(selected.proteinPer100g * r * 10) / 10,
          carbsG:   Math.round(selected.carbsPer100g   * r * 10) / 10,
          fatG:     Math.round(selected.fatPer100g     * r * 10) / 10,
        }
      })()
    : null

  const mealLabel = MEAL_TYPES.find(m => m.key === mealType)?.label ?? mealType

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {(step === 'detail' || step === 'save-template' || step === 'propose') && (
              <button
                onClick={() => step === 'save-template' ? setStep('detail') : step === 'propose' ? setStep('search') : setStep('search')}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &larr;
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900">
              {step === 'search' ? 'Registrar comida' : step === 'save-template' ? 'Guardar plantilla' : step === 'propose' ? 'Proponer alimento' : selected?.name}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* STEP: search */}
        {step === 'search' && (
          <>
            {/* Meal type selector — horizontal scroll (GAP-4) */}
            <div className="px-5 pt-3 pb-2">
              <div ref={mealScrollRef} className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {MEAL_TYPES.map(mt => (
                  <button
                    key={mt.key}
                    onClick={() => setMealType(mt.key)}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      mealType === mt.key
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="px-5 pb-2">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                <span className="text-gray-400 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </span>
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                  placeholder="Buscar alimento..."
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-gray-400 text-sm">&times;</button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {/* Recientes / templates — solo cuando no hay busqueda (GAP-7/8) */}
              {!query.trim() && templates.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Mis menus</p>
                  <div className="flex flex-col gap-2">
                    {templates.map(t => {
                      const kcal = calcTemplateKcal(t)
                      const macros = calcTemplateMacros(t)
                      return (
                        <div key={t.id} className="flex items-center gap-2">
                          <button
                            onClick={() => handleLogTemplate(t)}
                            disabled={loggingTemplate === t.id}
                            className="flex-1 flex items-center gap-3 px-3.5 py-3 rounded-xl border border-gray-200 hover:border-[#1e3a5f]/30 hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
                          >
                            <div className="w-1 h-10 rounded-full bg-[#1e3a5f] shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {kcal} kcal
                                <span className="ml-1.5">
                                  <span className="text-blue-500">P {macros.proteinG}g</span>
                                  {' '}<span className="text-yellow-500">C {macros.carbsG}g</span>
                                  {' '}<span className="text-green-500">G {macros.fatG}g</span>
                                </span>
                              </p>
                            </div>
                            <div className="shrink-0">
                              {loggingTemplate === t.id ? (
                                <span className="text-xs text-gray-400">...</span>
                              ) : (
                                <div className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                </div>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(t.id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors shrink-0"
                            aria-label="Eliminar plantilla"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-gray-100 mt-4 mb-2" />
                </div>
              )}

              {/* Recientes header */}
              {!query.trim() && (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recientes</p>
              )}

              {searching ? (
                <p className="text-center text-sm text-gray-400 mt-10">Buscando...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 mt-10">Sin resultados para &quot;{query}&quot;</p>
              ) : (
                filtered.map(food => {
                  const r = food.servingG / 100
                  const kcal = Math.round(food.kcalPer100g * r)
                  const prot = Math.round(food.proteinPer100g * r * 10) / 10
                  return (
                    <button
                      key={food.id}
                      onClick={() => selectFood(food)}
                      className="w-full flex items-center justify-between py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">
                          {food.category === 'PROTEIN' ? '🥩' : food.category === 'CARB' ? '🍚' : food.category === 'FRUIT' ? '🍌' : food.category === 'VEGETABLE' ? '🥦' : food.category === 'DAIRY' ? '🥛' : food.category === 'FAT' ? '🥑' : food.category === 'LEGUME' ? '🫘' : '🍽️'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{food.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {food.kcalPer100g} kcal / 100g
                          </p>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      </div>
                    </button>
                  )
                })
              )}

              {/* Crear alimento — siempre visible (GAP-9) */}
              <button
                onClick={() => {
                  setProposeForm(f => ({ ...f, name: query.trim() }))
                  setProposeSuccess(false)
                  setStep('propose')
                }}
                className="w-full mt-4 py-3 rounded-xl bg-[#1e3a5f] text-white text-xs font-bold hover:bg-[#162d4a] transition-colors"
              >
                + Crear alimento personalizado
              </button>
            </div>
          </>
        )}

        {/* STEP: detail (GAP-10, 12, 13, 14) */}
        {step === 'detail' && selected && (
          <>
            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 space-y-5">

              {/* Selected food card (GAP-10) */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3.5 py-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm shrink-0">
                  {selected.category === 'PROTEIN' ? '🥩' : selected.category === 'CARB' ? '🍚' : selected.category === 'FRUIT' ? '🍌' : selected.category === 'VEGETABLE' ? '🥦' : selected.category === 'DAIRY' ? '🥛' : selected.category === 'FAT' ? '🥑' : selected.category === 'LEGUME' ? '🫘' : '🍽️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                  <p className="text-xs text-gray-400">
                    {selected.kcalPer100g} kcal
                    <span className="mx-1">&middot;</span>
                    <span className="text-blue-500">{selected.proteinPer100g}g prot</span>
                    <span className="mx-1">&middot;</span>
                    <span className="text-yellow-500">{selected.carbsPer100g}g carb</span>
                    <span className="mx-1">&middot;</span>
                    <span className="text-green-500">{selected.fatPer100g}g grasa</span>
                    <span className="ml-1 text-gray-300">por 100g</span>
                  </p>
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cantidad (gramos)</p>
                <div className="relative mb-3">
                  <input
                    type="number"
                    value={grams}
                    onChange={e => setGrams(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-2xl font-bold text-gray-900 text-center outline-none focus:border-[#1e3a5f] transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">g</span>
                </div>
                {(() => {
                  const serving = Math.round(selected.servingG)
                  const presets = [
                    ...(serving > 0 ? [{ g: serving, label: selected.servingLabel ? `${selected.servingLabel}` : `${serving}g` }] : []),
                    ...[50, 100, 150, 200]
                      .filter(g => g !== serving)
                      .map(g => ({ g, label: `${g}g` })),
                  ].slice(0, 5)
                  return (
                    <div className="flex gap-2">
                      {presets.map(p => (
                        <button
                          key={p.g}
                          onClick={() => setGrams(String(p.g))}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                            grams === String(p.g)
                              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Preview macros — fondo claro (GAP-12) */}
              {preview && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Total para {grams}g</p>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'kcal',     value: preview.kcal,     color: 'text-orange-600' },
                        { label: 'Proteina', value: `${preview.proteinG}g`, color: 'text-blue-500' },
                        { label: 'Carbos',   value: `${preview.carbsG}g`,   color: 'text-yellow-500' },
                        { label: 'Grasas',   value: `${preview.fatG}g`,     color: 'text-green-500' },
                      ].map(m => (
                        <div key={m.label}>
                          <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                          <p className="text-[10px] text-gray-400">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Agregar a — dropdown style (GAP-13) */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500">Agregar a</span>
                <select
                  value={mealType}
                  onChange={e => setMealType(e.target.value)}
                  className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-[#1e3a5f]"
                >
                  {MEAL_TYPES.map(mt => (
                    <option key={mt.key} value={mt.key}>{mt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer — contextual CTA (GAP-14) */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <button
                onClick={handleSubmit}
                disabled={submitting || !grams || Number(grams) <= 0}
                className="w-full py-3.5 rounded-2xl text-sm font-bold transition-colors disabled:bg-gray-100 disabled:text-gray-400 bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
              >
                {submitting ? 'Registrando...' : `Agregar ${grams || 0}g de ${selected.name} al ${mealLabel}`}
              </button>
              <button
                onClick={() => setStep('save-template')}
                disabled={!grams || Number(grams) <= 0}
                className="w-full py-2.5 rounded-2xl text-xs font-semibold text-gray-500 hover:text-[#1e3a5f] hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                + Guardar como plantilla
              </button>
            </div>
          </>
        )}

        {/* STEP: propose */}
        {step === 'propose' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 space-y-5">
              {proposeSuccess ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">&#10003;</div>
                  <p className="text-base font-bold text-gray-900">Propuesta enviada!</p>
                  <p className="text-sm text-gray-400 text-center">
                    Tu alimento quedo visible mientras el equipo lo revisa.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nombre del alimento</p>
                    <input
                      autoFocus
                      type="text"
                      value={proposeForm.name}
                      onChange={e => setProposeForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ej: Arepa de chocolo"
                      maxLength={100}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#1e3a5f] transition-colors placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoria</p>
                    <div className="flex flex-wrap gap-2">
                      {PROPOSE_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setProposeForm(f => ({ ...f, category: cat }))}
                          className={`px-3.5 py-2 rounded-full border text-xs font-medium transition-colors ${
                            proposeForm.category === cat
                              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {CATEGORY_LABELS[cat] ?? cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Macros por 100g</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: 'kcalPer100g',    label: 'Calorias (kcal)' },
                        { key: 'proteinPer100g', label: 'Proteina (g)'    },
                        { key: 'carbsPer100g',   label: 'Carbos (g)'      },
                        { key: 'fatPer100g',     label: 'Grasas (g)'      },
                      ] as const).map(field => (
                        <div key={field.key}>
                          <p className="text-xs text-gray-400 mb-1">{field.label}</p>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={proposeForm[field.key]}
                            onChange={e => setProposeForm(f => ({ ...f, [field.key]: e.target.value }))}
                            placeholder="0"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#1e3a5f] transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pais (opcional)</p>
                    <div className="flex flex-wrap gap-2">
                      {PROPOSE_COUNTRIES.map(c => (
                        <button
                          key={c.key}
                          onClick={() => setProposeForm(f => ({ ...f, country: c.key }))}
                          className={`px-3.5 py-2 rounded-full border text-xs font-medium transition-colors ${
                            proposeForm.country === c.key
                              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notas (opcional)</p>
                    <textarea
                      value={proposeForm.notes}
                      onChange={e => setProposeForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Marca, presentacion, fuente de los datos..."
                      rows={3}
                      maxLength={300}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#1e3a5f] transition-colors placeholder:text-gray-400 resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              {proposeSuccess ? (
                <button
                  onClick={handleClose}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition-colors"
                >
                  Listo
                </button>
              ) : (
                <button
                  onClick={handleSubmitPropose}
                  disabled={proposing || !proposeForm.name.trim() || !proposeForm.kcalPer100g || !proposeForm.proteinPer100g || !proposeForm.carbsPer100g || !proposeForm.fatPer100g}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold transition-colors disabled:bg-gray-100 disabled:text-gray-400 bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
                >
                  {proposing ? 'Enviando...' : 'Enviar propuesta'}
                </button>
              )}
            </div>
          </>
        )}

        {/* STEP: save-template */}
        {step === 'save-template' && selected && (
          <>
            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Alimento</p>
                <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                {preview && (
                  <p className="text-xs text-gray-400 mt-0.5">{grams}g &middot; {preview.kcal} kcal &middot; P {preview.proteinG}g</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nombre de la plantilla</p>
                <input
                  autoFocus
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="Ej: Desayuno proteico, Snack post-entreno..."
                  maxLength={100}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#1e3a5f] transition-colors placeholder:text-gray-400"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Momento del dia (opcional)</p>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map(mt => (
                    <button
                      key={mt.key}
                      onClick={() => setMealType(mt.key)}
                      className={`px-3.5 py-2 rounded-full border text-xs font-medium transition-colors ${
                        mealType === mt.key
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="w-full py-3.5 rounded-2xl text-sm font-bold transition-colors disabled:bg-gray-100 disabled:text-gray-400 bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
              >
                {savingTemplate ? 'Guardando...' : 'Guardar plantilla'}
              </button>
              <button
                onClick={() => setStep('detail')}
                className="w-full py-2.5 rounded-2xl text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
