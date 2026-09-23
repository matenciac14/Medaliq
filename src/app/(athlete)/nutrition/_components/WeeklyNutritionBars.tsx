/**
 * NUT-F-03 — Grafica de adherencia calorica diaria (barras 7 dias).
 * Verde >90%, naranja 70-90%, rojo <70%, gris = sin datos.
 */
type DayBar = {
  label: string  // "Lun", "Mar"...
  pct: number | null  // null = sin logs
  isToday: boolean
}

export default function WeeklyNutritionBars({ days }: { days: DayBar[] }) {
  const daysInRange = days.filter(d => d.pct !== null && d.pct >= 90).length
  const hasAnyData = days.some(d => d.pct !== null)

  return (
    <div className="bg-white border border-[#f0f2f5] rounded-[16px] p-4 shadow-sm">
      <div className="flex items-end justify-between gap-2">
        {days.map((day, i) => {
          const barH = day.pct !== null ? Math.max(4, Math.round((Math.min(day.pct, 100) / 100) * 24)) : 24
          const color = day.pct === null
            ? '#f2f5f7'
            : day.pct >= 90
              ? '#21c25c'
              : day.pct >= 70
                ? '#eb590d'
                : '#1f3b5e'
          return (
            <div key={i} className="flex flex-col items-center gap-1.5" style={{ width: 38 }}>
              {/* barra */}
              <div
                className="w-full rounded-[4px] transition-all"
                style={{
                  height: barH,
                  backgroundColor: day.pct === null ? '#f2f5f7' : color,
                  opacity: day.pct === null ? 0.5 : 1,
                }}
              />
              {/* etiqueta dia */}
              <p className={`text-[10px] ${day.isToday ? 'text-[#1f3b5e] font-bold' : 'text-[#8c99a6] font-medium'}`}>
                {day.label}
              </p>
            </div>
          )
        })}
      </div>
      {/* Summary text */}
      {hasAnyData ? (
        <p className="text-[10px] text-[#8c99a6] text-center mt-2">
          {daysInRange} de 7 dias en rango calorico
        </p>
      ) : (
        <p className="text-[10px] text-[#8c99a6] text-center mt-2">
          Sin registros esta semana
        </p>
      )}
    </div>
  )
}
