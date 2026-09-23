import type { CoachKpis } from '@/domain/coach_dashboard/coach_dashboard.types'

export function CoachKpiRow({ kpis }: { kpis: CoachKpis }) {
  const {
    ingresosMes,
    athletesDisplay,
    tierPct,
    checkInsPct,
    checkInsWeekCount,
    totalCount,
    unreadMessagesCount,
    thisMonthCount,
  } = kpis

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">

      {/* Ingresos */}
      <div className="bg-white rounded-lg border border-gray-100 p-3 relative overflow-hidden h-20">
        <span className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#ea580c' }} />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#738090' }}>Ingresos / mes</p>
            <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: '#ea580c' }}>
              {ingresosMes > 0 ? `$${ingresosMes.toFixed(0)}` : '—'}
            </p>
          </div>
          <div className="flex items-end gap-[5px] mt-1">
            {[20, 28, 35, 42].map((h, i) => (
              <div key={i} className="w-[10px] rounded-sm" style={{ height: h, backgroundColor: '#ea580c', opacity: i === 3 ? 1 : 0.3 }} />
            ))}
          </div>
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: '#808c99' }}>
          {ingresosMes > 0 ? 'pagos registrados este mes' : 'sin pagos este mes'}
        </p>
      </div>

      {/* Atletas activos */}
      <div className="bg-white rounded-lg border border-gray-100 p-3 relative overflow-hidden h-20">
        <span className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#1e3a5f' }} />
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#738090' }}>Atletas activos</p>
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: '#1e3a5f' }}>{athletesDisplay}</p>
          {tierPct !== null && tierPct >= 80 && (
            <a
              href="/coach/settings/plan"
              className="text-[10px] font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#f2f5fa', color: '#1f3b5e' }}
            >
              {tierPct}% · Upgrade →
            </a>
          )}
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: '#808c99' }}>
          {thisMonthCount > 0 ? `+${thisMonthCount} este mes` : 'sin nuevos este mes'}
        </p>
      </div>

      {/* Check-ins semana */}
      <div className="bg-white rounded-lg border border-gray-100 p-3 flex items-start justify-between gap-2 relative overflow-hidden h-20">
        <span className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#22c35d' }} />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#738090' }}>Check-ins semana</p>
          <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: checkInsPct >= 70 ? '#22c35d' : checkInsPct >= 40 ? '#d97706' : '#dc2626' }}>
            {checkInsWeekCount}/{totalCount}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: '#808c99' }}>{checkInsPct}% de adherencia</p>
        </div>
        <div className="shrink-0 relative w-10 h-10">
          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={checkInsPct >= 70 ? '#22c35d' : checkInsPct >= 40 ? '#d97706' : '#dc2626'}
              strokeWidth="3"
              strokeDasharray={`${checkInsPct} ${100 - checkInsPct}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: checkInsPct >= 70 ? '#22c35d' : checkInsPct >= 40 ? '#d97706' : '#dc2626' }}>{checkInsPct}%</span>
        </div>
      </div>

      {/* Mensajes sin leer */}
      <div className="bg-white rounded-lg border border-gray-100 p-3 relative overflow-hidden h-20">
        <span className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#ea580c' }} />
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#738090' }}>Mensajes sin leer</p>
        <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: unreadMessagesCount > 0 ? '#ea580c' : '#9ca3af' }}>
          {unreadMessagesCount > 0 ? unreadMessagesCount : '—'}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: '#808c99' }}>
          {unreadMessagesCount > 0
            ? <a href="/coach/athletes" className="hover:underline" style={{ color: '#808c99' }}>de {unreadMessagesCount} atletas · Responder →</a>
            : 'bandeja al día'
          }
        </p>
      </div>
    </div>
  )
}
