import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { mockNutritionPlan, mockMeals, mockSupplements, todaySessionType } from '@/lib/mock/nutrition-data'
import GenerateNutritionButton from './_components/GenerateNutritionButton'

// Determina tipo de día según sesión
function getDayType(sessionType: string): 'hard' | 'easy' | 'rest' {
  if (sessionType === 'DESCANSO') return 'rest'
  if (['FARTLEK', 'TIRADA_LARGA', 'NATACION', 'FUERZA'].includes(sessionType)) return 'hard'
  return 'easy' // RODAJE_Z2, CICLA, etc.
}

const DAY_TYPE_LABELS = {
  hard: { label: 'Día duro', emoji: '🔥', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  easy: { label: 'Día fácil', emoji: '✅', color: 'bg-green-100 text-green-700 border-green-200' },
  rest: { label: 'Descanso', emoji: '😴', color: 'bg-blue-100 text-blue-700 border-blue-200' },
}

const MEAL_ICONS: Record<string, string> = {
  'Pre-entreno': '⚡',
  'Recuperación': '🔄',
  'Desayuno': '🌅',
  'Almuerzo': '☀️',
  'Merienda': '🍎',
  'Cena': '🌙',
}

function getMacrosForType(dayType: 'hard' | 'easy' | 'rest') {
  const kcal = dayType === 'hard'
    ? mockNutritionPlan.targetKcalHard
    : dayType === 'easy'
    ? mockNutritionPlan.targetKcalEasy
    : mockNutritionPlan.targetKcalRest

  const carbs = dayType === 'hard'
    ? mockNutritionPlan.carbsHardG
    : dayType === 'easy'
    ? mockNutritionPlan.carbsEasyG
    : 120 // descanso

  return { kcal, protein: mockNutritionPlan.proteinG, carbs, fat: mockNutritionPlan.fatG }
}

interface MacroBarProps {
  label: string
  value: number
  unit: string
  max: number
  color: string
}

function MacroBar({ label, value, unit, max, color }: MacroBarProps) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}{unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface MealCardProps {
  meal: { time: string; label: string; foods: string; kcal: number; protein: number; carbs: number; fat: number }
}

function MealCard({ meal }: MealCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/5 flex items-center justify-center text-xl shrink-0">
          {MEAL_ICONS[meal.label] ?? '🍽️'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-900">{meal.label}</p>
              <p className="text-xs text-gray-400">{meal.time}</p>
            </div>
            <span className="text-sm font-bold text-[#f97316]">{meal.kcal} kcal</span>
          </div>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">{meal.foods}</p>
          <div className="flex gap-3 mt-2.5 flex-wrap">
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">P {meal.protein}g</span>
            <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded-full">C {meal.carbs}g</span>
            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">G {meal.fat}g</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Tabs component (server-side rendered, highlight via URL not needed for mock)
function DayTabContent({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-[#1e3a5f] text-white'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </span>
  )
}

export default async function NutritionPage() {
  const session = await auth()

  // Feature gating — Free users no tienen nutrición
  if (session?.user?.userPlan === 'FREE') {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6">
          ← Volver al inicio
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">🥗</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nutrición personalizada</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            El plan nutricional con macros adaptados a tus sesiones está disponible en el plan Pro.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Ver planes → Pro $15/mes
          </Link>
        </div>
      </div>
    )
  }

  const hasPlan = session?.user?.id
    ? !!(await prisma.nutritionPlan.findUnique({ where: { userId: session.user.id }, select: { id: true } }))
    : false

  const todayType = getDayType(todaySessionType)
  const badge = DAY_TYPE_LABELS[todayType]
  const macros = getMacrosForType(todayType)
  const todayMeals = mockMeals[todayType]

  // Totales del día
  const totalKcal = todayMeals.reduce((s, m) => s + m.kcal, 0)
  const totalProtein = todayMeals.reduce((s, m) => s + m.protein, 0)
  const totalCarbs = todayMeals.reduce((s, m) => s + m.carbs, 0)
  const totalFat = todayMeals.reduce((s, m) => s + m.fat, 0)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-6">

      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <span>←</span> Volver al inicio
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nutrición de hoy</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plan personalizado según tu sesión</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${badge.color}`}>
          {badge.emoji} {badge.label}
        </span>
      </div>

      {/* Generar plan con AI — solo si no hay plan en DB */}
      {!hasPlan && <GenerateNutritionButton />}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <DayTabContent label="🔥 Día duro" active={todayType === 'hard'} />
        <DayTabContent label="✅ Día fácil" active={todayType === 'easy'} />
        <DayTabContent label="😴 Descanso" active={todayType === 'rest'} />
      </div>

      {/* Card macros */}
      <div className="bg-[#1e3a5f] rounded-2xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-4">Macros objetivo del día</p>
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-[#f97316]">{macros.kcal.toLocaleString()}</p>
            <p className="text-xs text-white/60 mt-0.5">kcal</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">{macros.protein}g</p>
            <p className="text-xs text-white/60 mt-0.5">proteína</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">{macros.carbs}g</p>
            <p className="text-xs text-white/60 mt-0.5">carbos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">{macros.fat}g</p>
            <p className="text-xs text-white/60 mt-0.5">grasas</p>
          </div>
        </div>

        {/* Barras de progreso (tracking futuro) */}
        <div className="space-y-3 bg-white/10 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">Consumido hoy · Tracking disponible próximamente</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/70">
              <span>Calorías</span>
              <span>0 / {macros.kcal.toLocaleString()} kcal</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/70">
              <span>Proteína</span>
              <span>0 / {macros.protein}g</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/70">
              <span>Carbohidratos</span>
              <span>0 / {macros.carbs}g</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/70">
              <span>Grasas</span>
              <span>0 / {macros.fat}g</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Total del menú vs objetivo */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Totales del menú</p>
        <div className="space-y-3">
          <MacroBar label="Calorías" value={totalKcal} unit=" kcal" max={macros.kcal} color="bg-[#f97316]" />
          <MacroBar label="Proteína" value={totalProtein} unit="g" max={macros.protein} color="bg-blue-500" />
          <MacroBar label="Carbohidratos" value={totalCarbs} unit="g" max={macros.carbs} color="bg-yellow-400" />
          <MacroBar label="Grasas" value={totalFat} unit="g" max={macros.fat} color="bg-purple-500" />
        </div>
      </div>

      {/* Menú del día */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Menú del día · {todayMeals.length} comidas
        </h2>
        <div className="space-y-3">
          {todayMeals.map((meal, idx) => (
            <MealCard key={idx} meal={meal} />
          ))}
        </div>
      </section>

      {/* Hidratación */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Hidratación 💧</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">💧</div>
            <div>
              <p className="text-2xl font-bold text-[#1e3a5f]">3.5 L</p>
              <p className="text-xs text-gray-500">Meta diaria</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
              <p className="text-sm text-gray-700">Mañana al levantarte: <span className="font-semibold">500 ml con una pizca de sal</span></p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
              <p className="text-sm text-gray-700">Durante el entreno: <span className="font-semibold">150-200 ml cada 20 minutos</span></p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
              <p className="text-sm text-gray-700">Post-sesión inmediato: <span className="font-semibold">500 ml para recuperación</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Suplementación */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Suplementación</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header tabla */}
          <div className="grid grid-cols-4 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 col-span-1">Suplemento</span>
            <span className="text-xs font-semibold text-gray-500">Dosis</span>
            <span className="text-xs font-semibold text-gray-500">Cuándo</span>
            <span className="text-xs font-semibold text-gray-500">Para qué</span>
          </div>
          {mockSupplements.map((s, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-4 px-4 py-3 text-xs gap-1 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
            >
              <span className="font-medium text-gray-900 col-span-1 pr-2">{s.name}</span>
              <span className="text-gray-600">{s.dose}</span>
              <span className="text-gray-600">{s.when}</span>
              <span className="text-gray-500">{s.purpose}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Reglas no negociables */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reglas no negociables</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {[
            { icon: '🕔', text: 'Última comida a las 5:30 pm sin excepciones' },
            { icon: '🌙', text: 'Ayuno nocturno de 13 horas (6:00 pm – 7:00 am)' },
            { icon: '🚫', text: 'Sin líquidos con calorías — solo agua, café negro o infusiones' },
            { icon: '⚖️', text: 'Pesaje los lunes en ayunas, misma condición siempre' },
          ].map((rule, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-lg shrink-0">{rule.icon}</span>
              <p className="text-sm text-gray-700">{rule.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TDEE info */}
      <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-2xl p-4">
        <p className="text-xs text-gray-500 mb-1">Tu TDEE estimado</p>
        <p className="text-lg font-bold text-[#1e3a5f]">{mockNutritionPlan.tdee.toLocaleString()} kcal / día</p>
        <p className="text-xs text-gray-500 mt-1">
          Déficit: {(mockNutritionPlan.tdee - macros.kcal).toLocaleString()} kcal hoy · Pérdida proyectada ~0.5 kg/semana
        </p>
      </div>

    </div>
  )
}
