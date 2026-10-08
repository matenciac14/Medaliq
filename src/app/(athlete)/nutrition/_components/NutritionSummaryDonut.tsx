'use client'

const SIZE = 160
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type Props = {
  consumed: { kcal: number; proteinG: number; carbsG: number; fatG: number }
  target: { kcal: number; proteinG: number; carbsG: number; fatG: number }
}

export default function NutritionSummaryDonut({ consumed, target }: Props) {
  const pct = target.kcal > 0 ? Math.min(1, consumed.kcal / target.kcal) : 0
  const offset = CIRCUMFERENCE * (1 - pct)
  const over = consumed.kcal > target.kcal
  const displayPct = Math.round(pct * 100)

  const macros = [
    { label: 'Calorias', value: consumed.kcal, max: target.kcal, unit: 'kcal', color: '#ea580c' },
    { label: 'Proteina', value: consumed.proteinG, max: target.proteinG, unit: 'g', color: '#3b82f6' },
    { label: 'Carbos', value: consumed.carbsG, max: target.carbsG, unit: 'g', color: '#f59e0b' },
    { label: 'Grasas', value: consumed.fatG, max: target.fatG, unit: 'g', color: '#22c55e' },
  ]

  // Donut segments for macro distribution (P×4, C×4, G×9)
  const pKcal = consumed.proteinG * 4
  const cKcal = consumed.carbsG * 4
  const gKcal = consumed.fatG * 9
  const totalMacroKcal = pKcal + cKcal + gKcal

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center space-y-3">
      {/* Donut */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="#f3f4f6" strokeWidth={STROKE} fill="none" />
          {totalMacroKcal > 0 ? (
            <>
              {/* Multi-segment donut: protein → carbs → fat */}
              {(() => {
                const segments = [
                  { pct: pKcal / (target.kcal || 1), color: '#3b82f6' },
                  { pct: cKcal / (target.kcal || 1), color: '#f59e0b' },
                  { pct: gKcal / (target.kcal || 1), color: '#22c55e' },
                ]
                let cumulative = 0
                return segments.map((seg, i) => {
                  const segPct = Math.min(seg.pct, 1 - cumulative)
                  const segOffset = CIRCUMFERENCE * (1 - segPct)
                  const rotation = -90 + cumulative * 360
                  cumulative += segPct
                  return (
                    <circle
                      key={i}
                      cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                      stroke={seg.color} strokeWidth={STROKE} fill="none"
                      strokeDasharray={CIRCUMFERENCE} strokeDashoffset={segOffset}
                      transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}
                    />
                  )
                })
              })()}
            </>
          ) : (
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              stroke={over ? '#ef4444' : '#ea580c'}
              strokeWidth={STROKE} fill="none"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-[#1e3a5f]">
            {consumed.kcal > 0 ? `${displayPct}%` : `${displayPct}%`}
          </span>
          <span className="text-[10px] font-medium text-gray-400">
            meta
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full space-y-1.5">
        {macros.slice(1).map((m) => (
          <div key={m.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
              <span className="text-gray-600">{m.label}</span>
            </div>
            <span className="font-semibold text-gray-800">
              {m.value} {m.unit} · {m.max > 0 ? Math.round((m.value / m.max) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
