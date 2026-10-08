// NUT-DASH-02 — 4 macro targets del día, siempre visibles cuando hay effectiveNutritionPlan
// Posición: antes de TrackingSection (consumido). Muestra LO QUE EL CUERPO NECESITA HOY.

type Props = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

const MACROS = [
  { key: 'kcal',     label: 'Calorías',       unit: 'kcal', color: 'text-[#ea580c]', bg: 'bg-orange-50', border: 'border-orange-100', borderLeft: 'border-l-[#ea580c]' },
  { key: 'proteinG', label: 'Proteína',      unit: 'g',    color: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-100',   borderLeft: 'border-l-blue-500'  },
  { key: 'carbsG',   label: 'Carbohidratos', unit: 'g',    color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', borderLeft: 'border-l-yellow-500' },
  { key: 'fatG',     label: 'Grasas',    unit: 'g',    color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-100',  borderLeft: 'border-l-green-500' },
] as const

export default function MacroTargetCards({ kcal, proteinG, carbsG, fatG }: Props) {
  const values: Record<string, number> = { kcal, proteinG, carbsG, fatG }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Lo que tu cuerpo necesita hoy</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {MACROS.map(({ key, label, unit, color, bg, border, borderLeft }) => (
          <div key={key} className={`rounded-xl border border-l-3 px-3 py-2.5 ${bg} ${border} ${borderLeft}`}>
            <p className="text-[10px] font-medium text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>
              {values[key]}
              <span className="text-[10px] font-normal text-gray-400 ml-0.5">{unit}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
