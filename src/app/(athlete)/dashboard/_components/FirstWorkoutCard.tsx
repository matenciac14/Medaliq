import Link from 'next/link'

export default function FirstWorkoutCard() {
  return (
    <Link href="/gym" className="block">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center text-lg shrink-0">
            🏋️
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Registra tu primer entrenamiento</p>
            <p className="text-xs text-gray-500 mt-0.5">Gym, running, o cualquier actividad</p>
          </div>
          <span className="text-gray-400 text-sm">→</span>
        </div>
      </div>
    </Link>
  )
}
