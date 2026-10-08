// NUT-DASH-06 — TipCard contextual según tipo de día
// Sin DB — determinista por todayDayType

type DayType = 'hard' | 'easy' | 'low' | 'rest'

const TIPS: Record<DayType, { icon: string; title: string; body: string }> = {
  hard: {
    icon:  '⚡',
    title: 'Carbos antes del gym',
    body:  'Consume avena o arroz 60 min antes del entreno. Máximo rendimiento.',
  },
  easy: {
    icon:  '💪',
    title: 'Proteína post-sesión',
    body:  '30 g en los 30 min post-entreno. Facilita la recuperación muscular.',
  },
  low: {
    icon:  '🌿',
    title: 'Día suave — recarga bien',
    body:  'Prioriza proteína y verduras. Tu cuerpo recupera en los días de baja intensidad.',
  },
  rest: {
    icon:  '💧',
    title: 'Hidratación activa',
    body:  'Mantente en 2 L aunque no entrenes. Activa la recuperación.',
  },
}

export default function TipCard({ dayType }: { dayType: DayType | null }) {
  if (!dayType) return null
  const tip = TIPS[dayType]

  return (
    <div className="bg-[#fffaf0] rounded-[10px] px-3 py-2 flex items-center gap-1.5">
      <span className="text-xs leading-none shrink-0">💡</span>
      <p className="text-xs font-medium text-[#735926] flex-1 min-w-0">
        {tip.title} — {tip.body}
      </p>
    </div>
  )
}
