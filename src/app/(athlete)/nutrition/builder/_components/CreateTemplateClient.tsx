'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, UtensilsCrossed, BarChart3, CalendarDays, Lightbulb } from 'lucide-react'

type Props = {
  targets: { hard: number; easy: number; rest: number } | null
}

const STEPS = [
  { icon: CalendarDays, title: 'Elige un tipo de dia', desc: 'Dia duro, facil o descanso -- cada uno tiene distintas calorias.' },
  { icon: UtensilsCrossed, title: 'Agrega tus alimentos', desc: 'Busca en tu catalogo y arma cada comida del dia.' },
  { icon: BarChart3, title: 'Revisa tus macros', desc: 'El sistema calcula proteina, carbohidratos y grasa en tiempo real.' },
  { icon: ClipboardList, title: 'Aplica a tu semana', desc: 'Cuando este listo, aplicalo y cada dia se ajustara a tu entrenamiento.' },
]

const FEATURES = [
  { label: 'Calorias por tipo de dia' },
  { label: 'Ajuste automatico' },
  { label: 'Macros balanceados' },
]

export default function CreateTemplateClient({ targets }: Props) {
  const router = useRouter()
  const [name, setName] = useState('Mi Plan Nutricional')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) { setError('El nombre es requerido.'); return }
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/athlete/nutrition/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Error al crear la plantilla.')
        return
      }
      const { template } = await res.json()
      router.push(`/nutrition/builder/${template.id}`)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Link href="/nutrition" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1e3a5f] hover:underline mb-1">
          <ClipboardList size={13} />
          Mi Plan Nutricional
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Menu por tipo de dia</h1>
      </div>

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        {/* Main column */}
        <div className="space-y-5">
          {/* Step indicator */}
          <div className="bg-[#1e3a5f] rounded-2xl px-5 py-3.5">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Paso 1 de 2</p>
            <p className="text-sm font-semibold text-white mt-0.5">Configura tu menu por tipo de dia</p>
            <p className="text-xs text-white/60 mt-0.5">Define que comer en dias duros, faciles y de descanso. El sistema ajustara calorias segun tu actividad.</p>
          </div>

          {/* Hero empty state */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-10 text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center">
                <UtensilsCrossed size={40} className="text-orange-300" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">Planifica que comer cada dia</h2>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
                Crea un menu para cada tipo de dia y el sistema calculara automaticamente
                tus calorias y macros segun la intensidad del entrenamiento.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {FEATURES.map(f => (
                <span key={f.label} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
                  {f.label}
                </span>
              ))}
            </div>

            {/* Name input (hidden in Figma but needed for create) */}
            <div className="max-w-sm mx-auto text-left">
              <label className="text-xs font-medium text-gray-500 block mb-1">Nombre del plan</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                placeholder="Mi Plan Nutricional"
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold text-white bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Creando...' : '+ Crear menu desde cero'}
              </button>
              <Link
                href="/mensajes"
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 text-center transition-colors"
              >
                Pedir plan a mi coach
              </Link>
            </div>

            {targets && (
              <p className="text-xs text-gray-400">
                Tu TDEE calculado: {targets.hard.toLocaleString('es')} kcal/dia -- Ajustado segun intensidad de cada sesion
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block space-y-5 mt-0">
          {/* How it works */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Como funciona?</h3>
            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-[#1e3a5f]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tip */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start gap-2.5">
              <Lightbulb size={16} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-600">Consejo</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Empieza con el "Dia duro" -- es el que mas calorias requiere.
                  Luego copia y ajusta para los demas tipos de dia.
                </p>
              </div>
            </div>
          </div>

          {/* Daily targets */}
          {targets && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Tus metas diarias</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Dia duro', kcal: targets.hard, color: 'border-l-red-500' },
                  { label: 'Dia facil', kcal: targets.easy, color: 'border-l-green-500' },
                  { label: 'Descanso', kcal: targets.rest, color: 'border-l-gray-400' },
                ].map(t => (
                  <div key={t.label} className={`flex items-center justify-between border-l-[3px] ${t.color} pl-3 py-1`}>
                    <span className="text-sm font-medium text-gray-700">{t.label}</span>
                    <span className="text-sm font-bold text-gray-900">{t.kcal.toLocaleString('es')} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
