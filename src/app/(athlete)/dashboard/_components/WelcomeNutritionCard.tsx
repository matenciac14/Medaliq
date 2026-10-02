import Link from 'next/link'

type Props = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export default function WelcomeNutritionCard({ kcal, proteinG, carbsG, fatG }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">✅</span>
        <h2 className="text-sm font-bold text-[#1e3a5f]">Tus metas nutricionales</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Calculamos la distribución de calorías y macros para tu objetivo. Se ajustan según la intensidad del día.
      </p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#1e3a5f]">{kcal.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-medium">kcal/día</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#1e3a5f]">{proteinG}g</p>
          <p className="text-[10px] text-gray-500 font-medium">proteína</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#1e3a5f]">{carbsG}g</p>
          <p className="text-[10px] text-gray-500 font-medium">carbs</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#1e3a5f]">{fatG}g</p>
          <p className="text-[10px] text-gray-500 font-medium">grasa</p>
        </div>
      </div>
      <Link
        href="/nutrition"
        className="block w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#ea580c' }}
      >
        Registrar lo que comí hoy →
      </Link>
    </div>
  )
}
