'use client'

import { cn } from '@/lib/utils'

// ── Ring size constants ────────────────────────────────────────────────

const RING_SIZE = 110
const STROKE_WIDTH = 8
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const MINI_RING_SIZE = 36
const MINI_STROKE = 3
const MINI_RADIUS = (MINI_RING_SIZE - MINI_STROKE) / 2
const MINI_CIRCUM = 2 * Math.PI * MINI_RADIUS

// ── CalorieRingSvg ────────────────────────────────────────────────────

function CalorieRingSvg({ consumed, target }: { consumed: number; target: number }) {
  const pct = target > 0 ? Math.min(1, consumed / target) : 0
  const offset = CIRCUMFERENCE * (1 - pct)
  const remaining = Math.max(0, target - consumed)
  const over = consumed > target

  return (
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0">
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke="#f3f4f6" strokeWidth={STROKE_WIDTH} fill="none" />
        <circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={over ? '#ef4444' : '#ea5807'}
          strokeWidth={STROKE_WIDTH} fill="none"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {consumed === 0 ? (
          <>
            <span className="text-lg font-black leading-none text-[#b3b3b3]">0</span>
            <span className="text-[10px] font-medium text-[#8c99a6] text-center leading-tight mt-0.5">kcal</span>
          </>
        ) : (
          <>
            <span className={cn('text-lg font-black leading-none', over ? 'text-red-500' : 'text-[#1e3a5f]')}>
              {(remaining > 0 ? remaining : Math.round(consumed - target)).toLocaleString('es')}
            </span>
            <span className="text-[10px] font-medium text-gray-400 text-center leading-tight mt-0.5">
              {remaining > 0 ? 'kcal\nrestantes' : 'kcal\nextra'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// ── MiniMacroRingSvg ──────────────────────────────────────────────────

function MiniMacroRingSvg({ value, max, color, label, bgColor = '#f3f4f6' }: { value: number; max: number; color: string; label: string; bgColor?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const offset = MINI_CIRCUM * (1 - pct)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: MINI_RING_SIZE, height: MINI_RING_SIZE }}>
        <svg width={MINI_RING_SIZE} height={MINI_RING_SIZE} viewBox={`0 0 ${MINI_RING_SIZE} ${MINI_RING_SIZE}`}>
          <circle cx={MINI_RING_SIZE / 2} cy={MINI_RING_SIZE / 2} r={MINI_RADIUS} stroke={bgColor} strokeWidth={MINI_STROKE} fill="none" />
          <circle
            cx={MINI_RING_SIZE / 2} cy={MINI_RING_SIZE / 2} r={MINI_RADIUS}
            stroke={color} strokeWidth={MINI_STROKE} fill="none"
            strokeDasharray={MINI_CIRCUM} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${MINI_RING_SIZE / 2} ${MINI_RING_SIZE / 2})`}
          />
        </svg>
      </div>
      <span className="text-xs font-bold text-[#1e3a5f]">{Math.round(value)}g</span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  )
}

// ── NutritionCard ─────────────────────────────────────────────────────

export default function NutritionCard({ nt, consumed }: { nt: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string }; consumed?: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null }) {
  const c = consumed ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  const hasConsumed = c.kcal > 0
  const macros = [
    { label: 'Proteína', value: `${nt.proteinG} g`, color: '#3b82f6' },
    { label: 'Carbos', value: `${nt.carbsG} g`, color: '#22c55e' },
    { label: 'Grasas', value: `${nt.fatG} g`, color: '#f97316' },
    { label: 'Agua', value: '2.5 L', color: '#06b6d4' },
  ]

  return (
    <a href="/nutrition" className="block bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 hover:shadow-lg transition-shadow">
      {/* Desktop: barras de color (Figma web) */}
      <div className="hidden sm:block">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Nutrición hoy</p>
        <div className="flex items-end gap-6">
          <div className="shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#1e3a5f] leading-none">
                {nt.kcal.toLocaleString('es')}
              </span>
              <span className="text-xs text-gray-400">kcal</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{nt.label}</p>
          </div>
          <div className="flex flex-1 gap-3">
            {macros.map(m => (
              <div key={m.label} className="flex-1 text-center">
                <p className="text-[10px] font-semibold mb-1" style={{ color: m.color }}>{m.label}</p>
                <p className="text-sm font-bold text-gray-900">{m.value}</p>
                <div className="w-full h-[3px] rounded-full mt-1.5" style={{ backgroundColor: m.color }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Mobile: donut + mini rings */}
      <div className="sm:hidden">
        <div className="flex items-center justify-center gap-5">
          <CalorieRingSvg consumed={c.kcal} target={nt.kcal} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Calorías de hoy</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#1e3a5f] leading-none tracking-tight">
                {nt.kcal.toLocaleString('es')}
              </span>
              <span className="text-xs text-gray-400">kcal objetivo</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {hasConsumed ? `${c.kcal.toLocaleString('es')} kcal registradas` : 'Sin registros hoy'}
            </p>
            <div className="flex items-center justify-between mt-3 pr-2">
              <MiniMacroRingSvg value={c.proteinG} max={nt.proteinG} color="#3b82f6" bgColor="#edf2ff" label="Prot" />
              <MiniMacroRingSvg value={c.carbsG} max={nt.carbsG} color="#eab308" bgColor="#fef9c3" label="Carbs" />
              <MiniMacroRingSvg value={c.fatG} max={nt.fatG} color="#22c55e" bgColor="#dcfce7" label="Grasas" />
            </div>
          </div>
        </div>
      </div>
    </a>
  )
}
