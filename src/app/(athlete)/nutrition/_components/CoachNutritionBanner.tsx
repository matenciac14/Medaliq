import Link from 'next/link'

type Props = {
  coachName: string | null
  planName: string | null
}

export default function CoachNutritionBanner({ coachName, planName }: Props) {
  return (
    <div className="bg-white rounded-[16px] border border-[#f0f2f5] shadow-sm p-4 space-y-3">
      {/* Coach info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[18px] bg-[#fff7ed] flex items-center justify-center text-lg shrink-0">
          👨‍🍳
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1f3b5e]">
            {coachName ? `${coachName} gestiona tu nutricion` : 'Tu coach gestiona tu nutricion'}
          </p>
          <p className="text-xs text-[#8c99a6]">Sigue el plan que te asigno y registra lo que comes</p>
        </div>
      </div>

      {planName && (
        <div className="bg-[#fff7ed] rounded-[10px] px-3 py-2">
          <p className="text-xs font-semibold text-[#735926]">Plan: {planName}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          href="/nutrition#tracking"
          className="flex-1 flex items-center justify-center h-9 rounded-[12px] bg-[#eb590d] text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          + Registrar lo que comi
        </Link>
        <Link
          href="/nutrition/history"
          className="flex items-center justify-center h-9 rounded-[12px] border-[1.5px] border-[#1f3b5e] text-xs font-semibold text-[#1f3b5e] px-3 hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Ver mi historial de comidas →
        </Link>
      </div>
    </div>
  )
}
