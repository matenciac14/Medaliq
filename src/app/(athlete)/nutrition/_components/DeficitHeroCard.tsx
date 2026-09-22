'use client'

const COLORS = { protein: '#3b82f6', carbs: '#f59e0b', fat: '#22c55e' }

type Props = {
  consumed: { kcal: number; proteinG: number; carbsG: number; fatG: number }
  target: { kcal: number; proteinG: number; carbsG: number; fatG: number }
  onViewConsumed: () => void
  onRegister: () => void
  activityKcalBonus?: number
  activityLabel?: string | null
}

export default function DeficitHeroCard({ consumed, target, onViewConsumed, onRegister, activityKcalBonus = 0, activityLabel }: Props) {
  const remaining = Math.max(0, target.kcal - consumed.kcal)
  const pct = target.kcal > 0 ? Math.min(100, Math.round((consumed.kcal / target.kcal) * 100)) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 border-l-[4px] border-l-[#ea580c] shadow-sm p-5 space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lo que te falta hoy</p>

      {/* Two-column hero with divider */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        <div>
          <p className="text-xs text-gray-500 mb-1">Consumido</p>
          <p className="text-[32px] font-black leading-none text-[#1e3a5f]">
            {consumed.kcal.toLocaleString('es')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">kcal</p>
        </div>
        <div className="w-px h-12 bg-gray-200" />
        <div>
          <div className="flex items-baseline gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Te faltan</p>
              <p className="text-[32px] font-black leading-none text-[#ea580c]">
                {remaining.toLocaleString('es')}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">kcal para completar tu objetivo</p>
            </div>
            {activityKcalBonus > 0 && activityLabel && (
              <p className="text-[10px] text-gray-400 whitespace-nowrap">
                +{activityKcalBonus} kcal ({activityLabel})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: '#ea580c' }}
          />
        </div>
        <p className="text-xs font-semibold text-[#ea580c] mt-1">{pct}% completado</p>
      </div>

      {/* Macro pills */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {([
          { label: 'Proteina', value: consumed.proteinG, max: target.proteinG, unit: 'g', color: COLORS.protein },
          { label: 'Carbos', value: consumed.carbsG, max: target.carbsG, unit: 'g', color: COLORS.carbs },
          { label: 'Grasas', value: consumed.fatG, max: target.fatG, unit: 'g', color: COLORS.fat },
        ] as const).map((m) => (
          <div key={m.label} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
            <span className="text-[11px] text-gray-600">{m.label}</span>
            <span className="text-[11px] font-bold text-gray-800">{m.value} / {m.max} {m.unit}</span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onViewConsumed}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          📋 Ver lo que consumi
        </button>
        <button
          onClick={onRegister}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#ea580c] text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          + Registrar comida
        </button>
      </div>
    </div>
  )
}
