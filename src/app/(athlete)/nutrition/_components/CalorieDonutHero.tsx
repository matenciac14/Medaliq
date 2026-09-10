'use client'

const DONUT_SIZE = 120
const DONUT_STROKE = 10
const DONUT_R = (DONUT_SIZE - DONUT_STROKE) / 2
const DONUT_C = 2 * Math.PI * DONUT_R

const MINI_SIZE = 40
const MINI_STROKE = 4
const MINI_R = (MINI_SIZE - MINI_STROKE) / 2
const MINI_C = 2 * Math.PI * MINI_R

type Props = {
  consumed: { kcal: number; proteinG: number; carbsG: number; fatG: number }
  target: { kcal: number; proteinG: number; carbsG: number; fatG: number }
  state?: 'sin-plan' | 'con-plan' | 'b2b'
}

const STATE_LABELS: Record<string, string> = {
  'sin-plan': 'Objetivo diario',
  'con-plan': 'Calorias de hoy',
  'b2b': 'Plan del coach',
}

export default function CalorieDonutHero({ consumed, target, state = 'con-plan' }: Props) {
  const remaining = Math.max(0, target.kcal - consumed.kcal)
  const pct = target.kcal > 0 ? Math.min(1, consumed.kcal / target.kcal) : 0
  const hasConsumed = consumed.kcal > 0

  const headerLabel = STATE_LABELS[state] ?? STATE_LABELS['con-plan']

  const macros = [
    { label: 'Prot', value: consumed.proteinG, max: target.proteinG, color: '#3b82f6', bgColor: '#edf2ff' },
    { label: 'Carbs', value: consumed.carbsG, max: target.carbsG, color: '#eab308', bgColor: '#fef9c3' },
    { label: 'Grasas', value: consumed.fatG, max: target.fatG, color: '#22c55e', bgColor: '#dcfce7' },
  ]

  return (
    <div className="bg-white rounded-[20px] border border-[#f0f2f5] shadow-sm p-4 sm:p-5" style={{ minHeight: 180 }}>
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Main donut */}
        <div className="relative shrink-0" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
          <svg width={DONUT_SIZE} height={DONUT_SIZE}>
            <circle
              cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={DONUT_R}
              stroke="#fef3e2" strokeWidth={DONUT_STROKE} fill="none"
            />
            {pct > 0 && (
              <circle
                cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={DONUT_R}
                stroke="#f97316" strokeWidth={DONUT_STROKE} fill="none"
                strokeDasharray={DONUT_C}
                strokeDashoffset={DONUT_C * (1 - pct)}
                strokeLinecap="round"
                transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] font-bold text-[#1f3b5e] leading-none">
              {hasConsumed
                ? remaining.toLocaleString('es')
                : target.kcal.toLocaleString('es')}
            </span>
            <span className="text-[10px] text-[#8c99a6] font-medium mt-0.5">
              {hasConsumed ? 'restantes' : 'kcal'}
            </span>
          </div>
        </div>

        {/* Right info */}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-[#8c99a6] uppercase" style={{ letterSpacing: '0.72px' }}>
            {headerLabel}
          </p>
          <div className="flex items-end gap-1 mt-0.5">
            <span className="text-[24px] font-bold text-[#1f3b5e] leading-none">
              {target.kcal.toLocaleString('es')}
            </span>
            <span className="text-[11px] font-normal text-[#8c99a6]">kcal objetivo</span>
          </div>
          <p className="text-[10px] text-[#8c99a6] font-medium mt-0.5">
            {hasConsumed
              ? `${consumed.kcal.toLocaleString('es')} kcal consumidas`
              : 'Sin registros hoy'}
          </p>

          {/* Macro rings inline */}
          <div className="flex gap-2 sm:gap-3 mt-2.5">
            {macros.map((m) => {
              const mPct = m.max > 0 ? Math.min(1, m.value / m.max) : 0
              return (
                <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative" style={{ width: MINI_SIZE, height: MINI_SIZE }}>
                    <svg width={MINI_SIZE} height={MINI_SIZE}>
                      <circle
                        cx={MINI_SIZE / 2} cy={MINI_SIZE / 2} r={MINI_R}
                        stroke={m.bgColor} strokeWidth={MINI_STROKE} fill="none"
                      />
                      {mPct > 0 && (
                        <circle
                          cx={MINI_SIZE / 2} cy={MINI_SIZE / 2} r={MINI_R}
                          stroke={m.color} strokeWidth={MINI_STROKE} fill="none"
                          strokeDasharray={MINI_C}
                          strokeDashoffset={MINI_C * (1 - mPct)}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${MINI_SIZE / 2} ${MINI_SIZE / 2})`}
                        />
                      )}
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[#1f3b5e]">{m.value}g</span>
                  <span className="text-[9px] text-[#8c99a6] font-medium">{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
