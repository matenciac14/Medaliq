'use client'

type Props = {
  mealLabel: string
  scheduledTime: string
  foods: string
  kcal: number
  proteinG: number
}

export default function ProximaComidaCard({ mealLabel, scheduledTime, foods, kcal, proteinG }: Props) {

  return (
    <div className="bg-[#fffaf5] rounded-[16px] border border-[rgba(235,89,13,0.2)] px-3.5 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-[18px] h-[18px] rounded-[9px] bg-[rgba(235,89,13,0.15)] flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-[#eb590d] leading-none">›</span>
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="bg-[rgba(235,89,13,0.12)] text-[#eb590d] text-[7px] font-bold w-[52px] h-4 flex items-center justify-center rounded-[4px] uppercase shrink-0" style={{ letterSpacing: '0.35px' }}>Proxima</span>
          <span className="text-[13px] font-semibold text-[#26262b]">{mealLabel}</span>
        </div>
        <span className="text-[11px] font-semibold text-[#eb590d] shrink-0">~{kcal} kcal</span>
      </div>
      <div className="flex items-center gap-1.5 pl-[26px]">
        <span className="text-[10px]">🥣</span>
        <p className="text-[10px] font-normal text-[#808791] flex-1 min-w-0">{foods}</p>
      </div>
      {(scheduledTime || proteinG > 0) && (
        <div className="flex items-center gap-2 pl-[26px]">
          {scheduledTime && <span className="text-[9px] text-[#8c99a6]">⏰ {scheduledTime}</span>}
          {proteinG > 0 && <span className="text-[9px] text-[#3b82f6] font-medium">💪 {proteinG}g prot</span>}
        </div>
      )}
      <button
        onClick={() => {
          const el = document.getElementById('tracking-mobile') ?? document.getElementById('tracking')
          el?.scrollIntoView({ behavior: 'smooth' })
        }}
        className="w-full h-8 rounded-[10px] bg-[#eb590d] text-white text-[11px] font-bold hover:opacity-90 transition-opacity"
      >
        + Registrar {mealLabel.toLowerCase()}
      </button>
    </div>
  )
}
