import Link from 'next/link'
import type { FeedItem, LastWeekSummary } from '@/domain/coach_dashboard/coach_dashboard.types'
import { avatarColor, timeAgo } from '@/domain/coach_dashboard/get_coach_dashboard.use_case'

export function CoachActivityFeed({
  lastWeek,
  feedItems,
  now,
}: {
  lastWeek: LastWeekSummary
  feedItems: FeedItem[]
  now: Date
}) {
  return (
    <>
      {/* Semana pasada — stat blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 mb-5">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 flex items-baseline gap-2 border-b border-gray-100">
            <p className="text-sm font-semibold" style={{ color: '#1f3b5e' }}>Semana pasada</p>
            <span className="text-[10px]" style={{ color: '#808c99' }}>{lastWeek.weekLabel}</span>
          </div>

          {/* 4 stat blocks */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
            <StatBlock
              label="Check-ins"
              value={`${lastWeek.checkInPct}%`}
              sub={lastWeek.prevCheckInPct > 0 ? `vs ${lastWeek.prevCheckInPct}% sem. anterior` : 'sin datos previos'}
              color="#22c35d"
              trend={lastWeek.checkInPct >= lastWeek.prevCheckInPct ? 'up' : 'down'}
            />
            <StatBlock
              label="Cobrados"
              value={lastWeek.revenue > 0 ? `$${lastWeek.revenue.toFixed(0)}` : '—'}
              sub={lastWeek.prevRevenue > 0 ? `${lastWeek.revenue >= lastWeek.prevRevenue ? '+' : ''}$${(lastWeek.revenue - lastWeek.prevRevenue).toFixed(0)} vs sem. anterior` : 'sin pagos previos'}
              color="#1f3b5e"
              trend={lastWeek.revenue >= lastWeek.prevRevenue ? 'up' : 'down'}
            />
            <StatBlock
              label="Sesiones"
              value={`${lastWeek.sessionsCount}`}
              sub="gym + running completadas"
              color="#ea580c"
              trend="up"
            />
            <StatBlock
              label="Inactivos"
              value={`${lastWeek.inactiveCount}`}
              sub="sin actividad >7d"
              color={lastWeek.inactiveCount > 0 ? '#dc2626' : '#22c35d'}
              trend={lastWeek.inactiveCount > 0 ? 'down' : 'up'}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100">
            <Link href="/coach/athletes" className="text-[10px] font-medium hover:underline" style={{ color: '#808c99' }}>
              Ver reporte completo →
            </Link>
          </div>
        </div>

        {/* Card retención */}
        {lastWeek.retentionPct !== null && (
          <div className="bg-white rounded-lg shadow-sm px-4 py-3.5">
            <p className="text-xs font-medium" style={{ color: '#738090' }}>Retención</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold leading-tight" style={{ color: '#22c35d' }}>{lastWeek.retentionPct}%</span>
              <span className="text-[10px]" style={{ color: '#808c99' }}>{now.toLocaleDateString('es', { month: 'long' })}</span>
            </div>
            <div className="flex items-end gap-1.5 mt-3">
              {RETENTION_BARS.map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-5 rounded-sm"
                    style={{ height: h, backgroundColor: '#1e3a5f', opacity: i === RETENTION_BARS.length - 1 ? 1 : 0.3 }}
                  />
                  <span className="text-[10px]" style={{ color: '#808c99' }}>{RETENTION_MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: '#1f3b5e' }}>Actividad reciente</h2>
          <Link href="/coach/athletes" className="text-xs font-medium" style={{ color: '#ea580c' }}>
            Ver todos los atletas →
          </Link>
        </div>
        {feedItems.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: '#808c99' }}>Sin actividad reciente</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
            {feedItems.map((item, i) => (
              <li key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: (item.type === 'checkin' ? '#22c35d' : avatarColor(item.athleteName)) + '1f', color: item.type === 'checkin' ? '#22c35d' : avatarColor(item.athleteName) }}
                >
                  {item.type === 'checkin' ? '✓' : item.athleteName.slice(0, 1).toUpperCase()}
                </div>
                <p className="flex-1 text-xs min-w-0" style={{ color: '#33404d' }}>
                  <span className="font-semibold">{item.athleteName}</span>
                  {' '}{item.detail}
                </p>
                <span className="text-[10px] shrink-0" style={{ color: '#8c99a6' }}>{timeAgo(item.ts, now)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function StatBlock({ label, value, sub, color, trend }: {
  label: string
  value: string
  sub: string
  color: string
  trend: 'up' | 'down'
}) {
  const arrow = trend === 'up' ? '↑' : '↓'
  const arrowColor = trend === 'up' ? '#22c35d' : '#ea580c'
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#738090' }}>{label}</p>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-xl font-bold leading-tight" style={{ color }}>{value}</span>
        <span className="text-xs font-bold" style={{ color: arrowColor }}>{arrow}</span>
      </div>
      <p className="text-[10px] mt-0.5" style={{ color: '#808c99' }}>{sub}</p>
    </div>
  )
}

const RETENTION_BARS = [24, 28, 26, 30, 28, 32]
const RETENTION_MONTHS = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago']
