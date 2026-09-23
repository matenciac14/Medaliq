import Link from 'next/link'

type NutritionData = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  label?: string
}

type ConsumedData = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

type Props = {
  data: NutritionData | null
  variant: 'card' | 'compact' | 'banner'
  targetKcalHard?: number | null
  consumed?: ConsumedData | null
}

// ── Shared constants ─────────────────────────────────────────────────
const RING_SIZE = 110
const STROKE_WIDTH = 8
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const MINI_RING_SIZE = 36
const MINI_STROKE = 3
const MINI_RADIUS = (MINI_RING_SIZE - MINI_STROKE) / 2
const MINI_CIRCUM = 2 * Math.PI * MINI_RADIUS

const TRACK_COLOR = '#f3f4f6'

export default function NutritionProgressCard({ data, variant, targetKcalHard, consumed }: Props) {
  if (variant === 'banner') return <BannerVariant data={data} />
  if (variant === 'card') return <CardVariant data={data} targetKcalHard={targetKcalHard ?? null} consumed={consumed} />
  // compact — same design as plan page NutritionCard (mobile view)
  return <CompactVariant data={data} consumed={consumed ?? null} />
}

// ── CalorieRing (shared by compact + card) ───────────────────────────

function CalorieRingSvg({ consumed, target, size = RING_SIZE }: { consumed: number; target: number; size?: number }) {
  const stroke = size === RING_SIZE ? STROKE_WIDTH : 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = target > 0 ? Math.min(1, consumed / target) : 0
  const offset = circumference * (1 - pct)
  const remaining = Math.max(0, target - consumed)
  const over = consumed > target
  const fontSize = size === RING_SIZE ? 18 : 17

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={TRACK_COLOR} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={over ? '#ef4444' : '#ea5807'}
          strokeWidth={stroke} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {consumed === 0 ? (
          <>
            <span className={`text-[${fontSize}px] font-black leading-none text-[#b3b3b3]`}>0</span>
            <span className="text-[10px] font-medium text-[#8c99a6] text-center leading-tight mt-0.5">kcal</span>
          </>
        ) : (
          <>
            <span className={`text-[${fontSize}px] font-black leading-none ${over ? 'text-red-500' : 'text-[#1e3a5f]'}`}>
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

// ── MiniMacroRing (shared) ───────────────────────────────────────────

function MiniMacroRingSvg({ value, max, color, label, bgColor = TRACK_COLOR, size: sizeProp }: { value: number; max: number; color: string; label: string; bgColor?: string; size?: number }) {
  const size = sizeProp ?? MINI_RING_SIZE
  const stroke = size === MINI_RING_SIZE ? MINI_STROKE : 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const offset = circumference * (1 - pct)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
      </div>
      <span className="text-xs font-bold text-[#1e3a5f]">{Math.round(value)}g</span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  )
}

// ── Compact: mobile dashboard ────────────────────────────────────────

function CompactVariant({ data, consumed: consumedData }: { data: NutritionData | null; consumed: ConsumedData | null }) {
  if (!data) return null

  const consumed = consumedData?.kcal ?? 0

  return (
    <Link href="/nutrition" className="block">
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5">
        <div className="flex items-center justify-center gap-5">
          <CalorieRingSvg consumed={consumed} target={data.kcal} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Calorías de hoy</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#1e3a5f] leading-none tracking-tight">{data.kcal.toLocaleString('es')}</span>
              <span className="text-xs text-gray-400">kcal objetivo</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {consumed === 0 ? 'Sin registros hoy' : `${consumed.toLocaleString('es')} kcal consumidas`}
            </p>
            <div className="flex items-center justify-between mt-3 pr-2">
              <MiniMacroRingSvg value={consumedData?.proteinG ?? 0} max={data.proteinG} color="#3b82f6" bgColor="#edf2ff" label="Prot" />
              <MiniMacroRingSvg value={consumedData?.carbsG ?? 0} max={data.carbsG} color="#f59e0b" bgColor="#fef9c3" label="Carbs" />
              <MiniMacroRingSvg value={consumedData?.fatG ?? 0} max={data.fatG} color="#22c55e" bgColor="#dcfce7" label="Grasas" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Card variant (desktop hero — donut chart) ────────────────────────

function CardVariant({ data, targetKcalHard, consumed: consumedData }: { data: NutritionData | null; targetKcalHard: number | null; consumed?: ConsumedData | null }) {
  if (!data) {
    return (
      <Link href="/nutrition" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden block transition-shadow hover:shadow-md">
        <div className="flex h-full">
          <div className="w-1 bg-[#22c55e] shrink-0" />
          <div className="flex-1 px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">NUTRICION HOY</p>
            <p className="text-base font-black text-[#1e3a5f] leading-none mb-0.5">Sin registros</p>
            <p className="text-xs text-gray-500 mb-1.5">nutricionales hoy</p>
            <div className="flex justify-end">
              <span className="text-[10px] font-semibold text-[#22c55e]">Registrar →</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const targetKcal = targetKcalHard ?? data.kcal
  const consumed = consumedData?.kcal ?? 0

  return (
    <Link href="/nutrition" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden block transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 px-5 py-2.5">
        <CalorieRingSvg consumed={consumed} target={targetKcal} size={90} />
        <div className="flex-1 min-w-0 flex flex-col items-center justify-between self-stretch py-0.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.4px]">Calorías de hoy</p>
          <div className="flex items-baseline gap-1 justify-center">
            <span className="text-xl font-black text-[#1e3a5f] leading-none">{targetKcal.toLocaleString('es')}</span>
            <span className="text-[10px] text-gray-400">kcal objetivo</span>
          </div>
          <p className="text-[10px] text-gray-400">
            {consumed === 0 ? 'Sin registros hoy' : `${consumed.toLocaleString('es')} kcal consumidas`}
          </p>
          <div className="flex items-center justify-center gap-5">
            <MiniMacroRingSvg value={consumedData?.proteinG ?? 0} max={data.proteinG} color="#3b82f6" bgColor="#edf2ff" size={28} label="Prot" />
            <MiniMacroRingSvg value={consumedData?.carbsG ?? 0} max={data.carbsG} color="#f59e0b" bgColor="#fef9c3" size={28} label="Carbs" />
            <MiniMacroRingSvg value={consumedData?.fatG ?? 0} max={data.fatG} color="#22c55e" bgColor="#dcfce7" size={28} label="Grasas" />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Banner variant (desktop info row) ────────────────────────────────

function BannerVariant({ data }: { data: NutritionData | null }) {
  return (
    <Link href="/nutrition" className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors block">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">🍎</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Nutricion hoy</span>
        {data?.label && (
          <span className="text-[10px] font-bold text-white bg-[#ea580c] px-1.5 py-0.5 rounded-full uppercase ml-auto">
            {data.label}
          </span>
        )}
      </div>
      {data ? (
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-base font-black text-[#1e3a5f] leading-none">{data.kcal} kcal</p>
          <span className="text-[10px] text-gray-400">ajustado por sesion</span>
          <div className="w-full mt-1">
            <div className="flex gap-2">
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">P {data.proteinG}g</span>
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">C {data.carbsG}g</span>
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">G {data.fatG}g</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-1">Configura tu plan nutricional</p>
      )}
    </Link>
  )
}
