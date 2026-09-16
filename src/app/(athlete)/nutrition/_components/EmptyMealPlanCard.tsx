import Link from 'next/link'

type Props = {
  tdee: number | null
  isB2B: boolean
}

export default function EmptyMealPlanCard({ tdee, isB2B }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
      {/* Illustration */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <span className="text-3xl">🥗</span>
        </div>
        {/* Mobile: simple message per Figma 4523:550 */}
        <h2 className="text-xl font-bold text-[#1e3a5f] mb-2 md:hidden">Sin plan de comidas</h2>
        <p className="text-sm text-gray-500 max-w-md md:hidden">
          Disena tu menu para dias duros, faciles y de descanso desde el constructor.
        </p>
        {/* Desktop: detailed message with feature pills */}
        <h2 className="text-xl font-bold text-[#1e3a5f] mb-2 hidden md:block">Disena tu menu</h2>
        <p className="text-sm text-gray-500 max-w-md hidden md:block">
          Tus macros ya estan calculados. Elige como distribuirlos en comidas reales.
        </p>
      </div>

      {/* Feature pills — desktop only */}
      <div className="hidden md:grid md:grid-cols-3 gap-3 mb-6">
        {[
          { emoji: '🎯', title: 'Por tipo de dia', desc: 'Ajusta calorias segun entreno, descanso o competencia' },
          { emoji: '🥗', title: 'Alimentos reales', desc: 'Elige de nuestra base de +500 alimentos LatAm' },
          { emoji: '📋', title: 'Plan semanal', desc: 'Organiza L-D con comidas distribuidas automaticamente' },
        ].map((f) => (
          <div key={f.title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <span className="text-lg">{f.emoji}</span>
            <p className="text-sm font-bold text-[#1e3a5f] mt-2">{f.title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/nutrition/builder"
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#ea580c] text-white text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Crear mi menu →
        </Link>
        {!isB2B && (
          <Link
            href="/coaches"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Pedir plan a mi coach
          </Link>
        )}
      </div>

      {tdee && (
        <p className="text-xs text-gray-400 text-center mt-4">
          Tu TDEE calculado: {tdee.toLocaleString('es')} kcal/dia · Ajustado segun intensidad de cada sesion
        </p>
      )}
    </div>
  )
}
